import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Invoice, InvoiceFormData, InvoiceContextType, InvoiceItem } from '../types';
import { supabase } from '../lib/supabase';

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const useInvoice = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoice must be used within InvoiceProvider');
  }
  return context;
};

interface InvoiceProviderProps {
  children: ReactNode;
}

export const InvoiceProvider: React.FC<InvoiceProviderProps> = ({ children }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedInvoices = localStorage.getItem('invoices');
    if (savedInvoices) {
      setInvoices(JSON.parse(savedInvoices));
    }
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (invoices.length > 0) {
      localStorage.setItem('invoices', JSON.stringify(invoices));
    }
  }, [invoices]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('issue_date', { ascending: false });

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
        setError(invoicesError.message);
        setLoading(false);
        return;
      }

      const invoicesWithItems = await Promise.all(
        (invoicesData || []).map(async (invoice) => {
          const { data: itemsData } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoice.id);

          return {
            ...invoice,
            items: itemsData || []
          };
        })
      );

      setInvoices(invoicesWithItems);
      localStorage.setItem('invoices', JSON.stringify(invoicesWithItems));
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };

  const getNextInvoiceNumber = async (): Promise<string> => {
    const currentYear = new Date().getFullYear();

    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${currentYear}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting next invoice number:', error);
    }

    if (data && data.invoice_number) {
      const parts = data.invoice_number.split('-');
      const lastNumber = parseInt(parts[1]);
      const nextNumber = lastNumber + 1;
      return `${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
    }

    return `${currentYear}-0001`;
  };

  const createInvoice = async (formData: InvoiceFormData): Promise<Invoice | null> => {
    setLoading(true);
    setError(null);
    try {
      const invoiceNumber = await getNextInvoiceNumber();

      const subtotal = formData.items.reduce((sum, item) => sum + item.line_total, 0);
      const taxAmount = subtotal * (formData.tax_rate / 100);
      const total = subtotal + taxAmount;

      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_name: formData.customer_name,
        customer_address: formData.customer_address,
        customer_nif: formData.customer_nif,
        issue_date: new Date().toISOString(),
        status: 'Pendiente' as const,
        subtotal,
        tax_rate: formData.tax_rate,
        tax_amount: taxAmount,
        total,
        payment_method: formData.payment_method || null,
        order_id: formData.order_id || null
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const itemsToInsert = formData.items.map(item => ({
        invoice_id: invoice.id,
        book_id: item.book_id,
        book_title: item.book_title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total
      }));

      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert)
        .select();

      if (itemsError) throw itemsError;

      const newInvoice = { ...invoice, items };
      setInvoices(prev => [newInvoice, ...prev]);

      return newInvoice;
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err instanceof Error ? err.message : 'Error al crear factura');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setInvoices(prev =>
        prev.map(invoice =>
          invoice.id === id ? { ...invoice, status } : invoice
        )
      );
    } catch (err) {
      console.error('Error updating invoice status:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar estado');
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInvoices(prev => prev.filter(invoice => invoice.id !== id));
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar factura');
    } finally {
      setLoading(false);
    }
  };

  const value: InvoiceContextType = {
    invoices,
    loading,
    error,
    fetchInvoices,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    getNextInvoiceNumber
  };

  return (
    <InvoiceContext.Provider value={value}>
      {children}
    </InvoiceContext.Provider>
  );
};
