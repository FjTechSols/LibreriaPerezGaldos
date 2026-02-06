import { supabase } from '../lib/supabase';
import { Pedido, Invoice } from '../types';

export const invoiceRepairService = {
  /**
   * Scans all invoices. If an invoice has missing/placeholder client data ("Cliente General" or empty NIF),
   * it looks up the original Order (Pedido) and tries to update the Invoice with accurate Client data.
   * Returns details about the operation.
   */
  async repairAllInvoices(): Promise<{ 
    totalScanned: number; 
    updatedCount: number; 
    errors: string[] 
  }> {
    const errors: string[] = [];
    let updatedCount = 0;

    try {
      // 1. Fetch ALL invoices
      //    We select relevant fields. Order by date desc to fix recent ones first visually if we were streaming, but we'll do all.
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select(`
            id, 
            order_id, 
            customer_name, 
            customer_nif, 
            customer_address
        `)
        .not('order_id', 'is', null); // Only invoices linked to orders

      if (invError) throw new Error(`Error fetching invoices: ${invError.message}`);
      if (!invoices) return { totalScanned: 0, updatedCount: 0, errors };

      // 2. Iterate and check candidates for repair
      for (const inv of invoices) {
        // Condition to consider "broken":
        // - Name is "Cliente General"
        // - OR Name contains "undefined"
        // - OR Name is empty
        // - OR NIF is empty (though some customers might not have NIF, but for Internal orders usually we want it if they have it)
        const name = inv.customer_name || '';
        const isSuspicious = 
             name === 'Cliente General' 
          || name.toLowerCase().includes('undefined')
          || name.trim() === '';

        if (!isSuspicious) {
           // If it has a name, maybe check if address is missing?
           // For now, let's focus on the main issue: Name/NIF missing because of the 'Cliente General' fallback.
           continue; 
        }

        const orderId = parseInt(inv.order_id);
        if (isNaN(orderId)) continue;

        // 3. Fetch the Order WITH Client data
        //    (We repeat the query logic we just fixed in GenerarFactura, but for a single order)
        const { data: pedido, error: ordError } = await supabase
          .from('pedidos')
          .select(`
            *,
            usuario:usuarios(*),
            cliente:clientes(*)
          `)
          .eq('id', orderId)
          .single();

        if (ordError || !pedido) {
           // errors.push(`Order ${orderId} not found for Invoice ${inv.id}`);
           continue;
        }

        // 4. Determine Correct Data
        let newName = '';
        let newNif = '';
        let newAddress = '';

        if (pedido.cliente) {
           // Priority: Client Table
           newName = pedido.cliente.tipo === 'empresa' 
              ? pedido.cliente.nombre 
              : `${pedido.cliente.nombre} ${pedido.cliente.apellidos}`;
           
           newNif = pedido.cliente.nif || '';
           newAddress = pedido.cliente.direccion || pedido.direccion_envio || '';
        } else if (pedido.usuario) {
           // Fallback: User Table
           newName = pedido.usuario.nombre_completo || pedido.usuario.username || 'Cliente';
           // User usually doesn't have NIF or specific address in auth table, so we use order shipping address
           newAddress = pedido.direccion_envio || '';
        }

        // Clean up
        newName = newName.trim();
        newNif = newNif.trim();
        newAddress = newAddress.trim();

        // 5. Update Invoice if we found better data
        //    Only update if we actually have a Name better than "Cliente General"
        if (newName && newName !== 'Cliente General' && newName !== 'undefined undefined') {
            const { error: updateError } = await supabase
              .from('invoices')
              .update({
                customer_name: newName,
                customer_nif: newNif,
                customer_address: newAddress
              })
              .eq('id', inv.id);

            if (updateError) {
              errors.push(`Failed to update Invoice ${inv.id}: ${updateError.message}`);
            } else {
              updatedCount++;
            }
        }
      }

      return {
        totalScanned: invoices.length,
        updatedCount,
        errors
      };

    } catch (err: any) {
      console.error("Critical error in repairAllInvoices:", err);
      return { totalScanned: 0, updatedCount: 0, errors: [err.message] };
    }
  }
};
