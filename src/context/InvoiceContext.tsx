import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Invoice, InvoiceFormData, InvoiceContextType } from '../types';
import { supabase } from '../lib/supabase';

import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage only if no user to show something, 
    // BUT for admin data relying on RLS, better to wait for user.
    // If we want to show cached data while loading, we can keep the LS check but triggering fetch is key.
    
    // Initial load from LS if available (optional for offline support but risk of stale data)
    const savedInvoices = localStorage.getItem('invoices');
    if (savedInvoices) {
      try {
        const parsed = JSON.parse(savedInvoices);
        setInvoices(parsed);
      } catch (error) {
        console.error('Error parsing saved invoices:', error);
        localStorage.removeItem('invoices');
      }
    }

    if (user) {
        fetchInvoices();

        // Realtime subscription for invoices - Only when user is logged in
        const channel = supabase
        .channel('invoices-db-changes')
        .on(
            'postgres_changes',
            {
            event: '*',
            schema: 'public',
            table: 'invoices' 
            },
            () => {
            fetchInvoices();
            }
        )
        .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    } else {
        // If logged out, maybe clear invoices?
        // setInvoices([]); 
    }
  }, [user]);

  useEffect(() => {
    if (invoices.length > 0) {
      localStorage.setItem('invoices', JSON.stringify(invoices));
    }
  }, [invoices]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch invoices without the broken pedidos relation
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (*)
        `)
        .order('issue_date', { ascending: false });

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
        setLoading(false);
        return;
      }

      // Extract all order IDs from invoices
      const orderIds = (invoicesData || [])
        .map(inv => parseInt(inv.order_id || '0'))
        .filter(id => id > 0);

      // Fetch all related orders in one query
      let ordersMap = new Map();
      if (orderIds.length > 0) {
        const { data: orders, error: ordersError } = await supabase
          .from('pedidos')
          .select('*')
          .in('id', orderIds);

        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
        } else if (orders) {
          ordersMap = new Map(orders.map(o => [o.id, o]));
        }
      }

      // Merge invoices with their orders
      const invoicesResult = (invoicesData || []).map(invoice => {
        const orderId = parseInt(invoice.order_id || '0');
        const pedido = ordersMap.get(orderId);

        return {
          ...invoice,
          items: invoice.invoice_items || [],
          pedido: pedido || null
        };
      });

      setInvoices(invoicesResult);
      localStorage.setItem('invoices_v3', JSON.stringify(invoicesResult));
    } catch (err) {
      console.error('❌ Error fetching invoices:', err);
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

      // Prices in formData.items include tax
      // Calculate total with tax first
      const totalWithTax = formData.items.reduce((sum, item) => sum + item.line_total, 0);
      
      // Calculate subtotal without tax (base price)
      // Formula: subtotal = total / (1 + (tax_rate / 100))
      const subtotalWithoutTax = totalWithTax / (1 + (formData.tax_rate / 100));
      
      // Calculate tax amount
      const taxAmount = totalWithTax - subtotalWithoutTax;
      
      const shippingCost = formData.shipping_cost || 0;
      const total = totalWithTax + shippingCost;

      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_name: formData.customer_name,
        customer_address: formData.customer_address,
        customer_nif: formData.customer_nif,
        issue_date: new Date().toISOString(),
        status: 'Pendiente' as const,
        subtotal: Number(subtotalWithoutTax.toFixed(2)), // Subtotal WITHOUT tax
        tax_rate: formData.tax_rate,
        tax_amount: Number(taxAmount.toFixed(2)), // Tax amount
        total: Number(total.toFixed(2)), // Total WITH tax + shipping
        payment_method: formData.payment_method || null,
        // shipping_cost: shippingCost, // Commented out until DB migration provided
        language: formData.language,
        order_id: formData.order_id || null
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // For invoice items, calculate unit price without tax
      const itemsToInsert = formData.items.map(item => {
        const unitPriceWithTax = item.unit_price;
        const unitPriceWithoutTax = unitPriceWithTax / (1 + (formData.tax_rate / 100));
        const lineTotalWithoutTax = unitPriceWithoutTax * item.quantity;
        
        return {
          invoice_id: invoice.id,
          book_id: item.book_id || null, // Allow null
          book_title: item.book_title,
          description: item.description || null, // New field map
          quantity: item.quantity,
          unit_price: Number(unitPriceWithoutTax.toFixed(2)), // Unit price WITHOUT tax
          line_total: Number(lineTotalWithoutTax.toFixed(2)) // Line total WITHOUT tax
        };
      });

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
