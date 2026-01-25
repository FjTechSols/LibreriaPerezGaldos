import { supabase } from '../lib/supabase';
import { Pedido, EstadoPedido, Usuario, Libro, TipoPedido } from '../types';
import { createAdminOrderNotification, createOrderNotification } from './notificationService';
import { sendOrderConfirmationEmail } from './emailService';
import { settingsService } from './settingsService';

export interface CrearPedidoInput {
  usuario_id: string;
  cliente_id?: string;
  tipo?: string;
  metodo_pago?: string;
  direccion_envio?: string;
  transportista?: string;
  coste_envio?: number;
  tracking?: string;
  observaciones?: string;
  taxRate?: number; // Tax rate as decimal (e.g., 0.21 for 21%)
  detalles: ({
    libro_id: number;
    cantidad: number;
    precio_unitario: number;
  } | {
    cantidad: number;
    precio_unitario: number;
    nombre_externo?: string;
    url_externa?: string;
  })[];
}

export interface CalculoPedido {
  subtotal: number;
  iva: number;
  total: number;
}

export const calcularTotalesPedido = (
  detalles: { cantidad: number; precio_unitario: number }[],
  taxRate: number
): CalculoPedido => {
  // Prices already include VAT, so we need to extract the VAT amount
  // Total WITH tax (what we have)
  const totalWithTax = detalles.reduce((sum, detalle) => {
    return sum + (detalle.cantidad * detalle.precio_unitario);
  }, 0);

  // Calculate subtotal WITHOUT tax
  // Formula: subtotal = total / (1 + tax_rate)
  const subtotalWithoutTax = totalWithTax / (1 + taxRate);
  
  // Calculate VAT amount
  const iva = totalWithTax - subtotalWithoutTax;

  return {
    subtotal: Number(subtotalWithoutTax.toFixed(2)),
    iva: Number(iva.toFixed(2)),
    total: Number(totalWithTax.toFixed(2))
  };
};

export const calcularTotalesPedidoConEnvio = (
  detalles: { cantidad: number; precio_unitario: number }[],
  taxRate: number,
  costeEnvio: number = 0
): CalculoPedido => {
  const { subtotal, iva, total: totalProductos } = calcularTotalesPedido(detalles, taxRate);
  
  return {
    subtotal,
    iva,
    total: Number((totalProductos + costeEnvio).toFixed(2))
  };
};

export const obtenerPedidos = async (filtros?: {
  estado?: EstadoPedido;
  usuario_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo?: TipoPedido;
  page?: number;
  limit?: number;
}): Promise<{ data: Pedido[]; count: number }> => {
  const page = filtros?.page || 1;
  const limit = filtros?.limit || 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('pedidos')
    .select(`
      *,
      usuario:usuarios(*),
      cliente:clientes(*),
      detalles:pedido_detalles(
        *,
        libro:libros(*)
      )
    `, { count: 'exact' })
    .order('fecha_pedido', { ascending: false });

  if (filtros?.estado) {
    query = query.eq('estado', filtros.estado);
  }

  if (filtros?.usuario_id) {
    query = query.eq('usuario_id', filtros.usuario_id);
  }

  if (filtros?.tipo) {
    query = query.eq('tipo', filtros.tipo);
  }

  if (filtros?.fecha_desde) {
    query = query.gte('fecha_pedido', filtros.fecha_desde);
  }

  if (filtros?.fecha_hasta) {
    query = query.lte('fecha_pedido', filtros.fecha_hasta);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error('Error al obtener pedidos:', error);
    return { data: [], count: 0 };
  }

  return { data: (data && Array.isArray(data)) ? data : [], count: count || 0 };
};

export const obtenerPedidoPorId = async (id: number): Promise<Pedido | null> => {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      usuario:usuarios(*),
      cliente:clientes(*),
      detalles:pedido_detalles(
        *,
        libro:libros(*)
      ),
      envio:envios(*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener pedido:', error);
    return null;
  }

  return data;
};

export const crearPedido = async (input: CrearPedidoInput): Promise<Pedido | null> => {
  try {
    if (!input.detalles || input.detalles.length === 0) {
      throw new Error('El pedido debe tener al menos un detalle');
    }

    let taxRate = input.taxRate || 0.21;
    
    // If taxRate was not explicitly provided, try to fetch from settings
    if (!input.taxRate) {
        try {
           const settings = await settingsService.getAllSettings();
           if (settings?.billing?.taxRate) {
               taxRate = settings.billing.taxRate / 100;
           }
        } catch(e) {
           console.warn("Could not fetch tax settings, using default 0.21", e);
        }
    }

    const { subtotal, iva, total } = calcularTotalesPedidoConEnvio(
      input.detalles, 
      taxRate, 
      input.coste_envio || 0
    );

    const pedidoData = {
      usuario_id: input.usuario_id,
      cliente_id: input.cliente_id,
      // Logic: Web orders ('interno') go to 'pending_verification' for stock check.
      // Manual/External orders ('perez_galdos', etc) are assumed verified/trusted -> 'pendiente' (or process directly)
      estado: (input.tipo && input.tipo !== 'interno') ? 'pendiente' : 'pending_verification' as EstadoPedido,
      tipo: input.tipo || 'interno',
      subtotal,
      iva,
      total,
      metodo_pago: input.metodo_pago || 'tarjeta',
      direccion_envio: input.direccion_envio,
      transportista: input.transportista,
      coste_envio: input.coste_envio || 0,
      tracking: input.tracking,
      observaciones: input.observaciones
    };

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert(pedidoData)
      .select()
      .single();

    if (pedidoError) {
      console.error('Error al crear pedido:', pedidoError);
      throw pedidoError;
    }

    const detallesConPedidoId = input.detalles.map(detalle => {
      if ('libro_id' in detalle) {
        return {
          pedido_id: pedido.id,
          libro_id: detalle.libro_id,
          cantidad: detalle.cantidad,
          precio_unitario: detalle.precio_unitario
        };
      } else {
        return {
          pedido_id: pedido.id,
          libro_id: null,
          cantidad: detalle.cantidad,
          precio_unitario: detalle.precio_unitario,
          nombre_externo: detalle.nombre_externo,
          url_externa: detalle.url_externa
        };
      }
    });

    const { error: detallesError } = await supabase
      .from('pedido_detalles')
      .insert(detallesConPedidoId);

    if (detallesError) {
      console.error('❌ Error al crear detalles:', detallesError);
      await supabase.from('pedidos').delete().eq('id', pedido.id);
      throw detallesError;
    }

    // 4. Update: Fetch FULL order first to get User details for Notification
    const fullOrder = await obtenerPedidoPorId(pedido.id);

    if (fullOrder) {
        // Send notification to admins with detailed info
        const userObj = fullOrder.usuario;
        const username = userObj?.username || 'Desconocido';
        const clientName = userObj?.nombre_completo || username;
        // User ID Display: Prefer Legacy ID if exists, otherwise Supabase UUID (shortened?) or just 'ID'
        const userIdDisplay = userObj?.legacy_id ? `ID: ${userObj.legacy_id}` : `ID: ${userObj?.id?.slice(0, 8)}...`;
        
        // Generate Items Summary: "Título (Code)"
        // "solicitud de la compra (titulo y legacy_id) del libro"
        const itemsSummary = fullOrder.detalles?.map(d => {
            const title = d.libro?.titulo || d.nombre_externo || 'Producto';
            const code = d.libro?.legacy_id || 'S/C';
            return `${title} (${code})`;
        }).join(', ') || 'varios artículos';
        
        createAdminOrderNotification(
            pedido.id, 
            clientName,
            username,
            pedido.tipo || 'interno',
            pedido.estado || 'pendiente',
            userIdDisplay,
            itemsSummary
        ).catch(err => 
            console.error('Error sending admin notification:', err)
        );

        // Send notification to USER
        createOrderNotification(pedido.usuario_id, pedido.id, pedido.estado || 'pendiente').catch(err =>
            console.error('Error sending user notification:', err)
        );
        
        // Enviar notificación al usuario (Confirmación de pedido por Email)
        const customerEmail = fullOrder.cliente?.email || 'pedidos@perezgaldos.com';
        
        if (customerEmail) {
           const emailItems = fullOrder.detalles?.map(d => ({
              title: d.libro?.titulo || d.nombre_externo || 'Producto',
              quantity: d.cantidad,
              price: d.precio_unitario
           })) || [];

           // Fetch Settings for Correct Tax Rate display if not provided
           // We re-fetch here to ensure email says the correct % even if defaults were used logic-side
           // Although logic-side used input.taxRate or 0.21.
           // Ideally we should have used settings for logic too if input was missing.
           // But changing logic might affect total calculation which is dangerous to change on fly if frontend calculated it.
           // However, for the EMAIL display, we want to show the rate that was actually used? 
           // Or the system rate? 
           // If we used 0.21 in logic, we should show 21%.
           // But the USER says platform is at 4%.
           // If we fix logic to use 0.04, then we show 4%.

           // Let's rely on what was actually used in calculation if possible.
           // But we don't store taxRate in DB (only Amounts). 
           // We can infer it: taxRate = iva / (total - iva) approximately.
           // precise: taxRate = iva / subtotal.
           
           let usedTaxRate = input.taxRate ? input.taxRate * 100 : 21;
           
           // If we trust the calculation was done with the intended rate, we can try to back-calculate?
           // No, floating point issues.
           
           // BETTER FIX: The user says "platform is at 4%". Use that for the EMAIL text.
           // AND ideally use it for calculation too.
           
           // Fetch settings to be sure what we SHOULD typically be using/showing.
           let displayTaxRate = usedTaxRate; 
           
           try {
             // We only fetch if we didn't have an explicit input
             if (!input.taxRate) {
                 const settings = await settingsService.getAllSettings();
                 if (settings?.billing?.taxRate) {
                     displayTaxRate = settings.billing.taxRate;
                 }
             }
           } catch(e) { console.error("Error fetching tax settings for email", e); }


           sendOrderConfirmationEmail({
              orderId: fullOrder.id.toString(),
              customerEmail,
              customerName: fullOrder.cliente?.nombre || fullOrder.usuario?.nombre_completo || 'Cliente',
              items: emailItems,
              subtotal: fullOrder.subtotal ?? 0,
              tax: fullOrder.iva ?? 0,
              taxRate: displayTaxRate, 
              shipping: fullOrder.coste_envio ?? 0,
              total: fullOrder.total ?? 0,
              shippingAddress: fullOrder.direccion_envio || 'Dirección no especificada',
              orderType: fullOrder.tipo || 'interno'
           }).catch(err => console.error('Error sending confirmation email:', err));
        }

        return fullOrder;
    }

    return await obtenerPedidoPorId(pedido.id); // Fallback if first fetch failed (unlikely)
  } catch (error) {
    console.error('❌ Error en crearPedido:', error);
    return null;
  }
};

// Wrapper for Force Deduction RPC
export const deductStockForce = async (pedidoId: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('deduct_stock_force', {
      p_pedido_id: pedidoId
    });

    if (error) throw error;
    return { success: data as boolean };
  } catch (err: any) {
    console.error('Error deductStockForce:', err);
    return { success: false, error: err.message };
  }
};

// Wrapper for Restoration RPC
export const restoreStockForce = async (pedidoId: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('restore_stock_force', {
      p_pedido_id: pedidoId
    });

    if (error) throw error;
    return { success: data as boolean };
  } catch (err: any) {
    console.error('Error restoreStockForce:', err);
    return { success: false, error: err.message };
  }
};

export const actualizarEstadoPedido = async (
  id: number,
  estado: EstadoPedido
): Promise<{ success: boolean; error?: string }> => {
  try {
      const { data: currentOrder } = await supabase
          .from('pedidos')
          .select('estado, tipo')
          .eq('id', id)
          .single();
      
      if (!currentOrder) throw new Error("Pedido no encontrado");

      // LOGIC 1: Unified Stock Deduction
      // Deduct stock when order moves to detailed 'committed' states (Processing, Shipped, Completed)
      // Trigger ONLY if we are transitioning FROM a state where stock was NOT deducted.
      // Assumed deducted states: procesando, enviado, completado.
      // Assumed NOT deducted states: pending_verification, payment_pending, pendiente.

      const statesImpliesDeduction: EstadoPedido[] = ['procesando', 'enviado', 'completado'];
      
      if (statesImpliesDeduction.includes(estado)) {
          // Check if we are coming from a state that is NOT in the deducted list
          if (!statesImpliesDeduction.includes(currentOrder.estado)) {
               // EXCEPTION: Express and Flash orders deduct stock ON CREATION.
               // So we should NOT deduct again when moving from 'pendiente' to 'procesando/enviado'.
               const typesWithImmediateDeduction: Partial<TipoPedido>[] = ['express', 'flash'];
               
               if (typesWithImmediateDeduction.includes(currentOrder.tipo)) {
                   console.log(`[Stock] Skipping deduction for ${currentOrder.tipo} order ${id} (Used immediate deduction)`);
               } else {
                   console.log(`[Stock] Deducting stock for order ${id} (Transition: ${currentOrder.estado} -> ${estado})`);
                   const res = await deductStockForce(id);
                   if (!res.success) {
                       return { success: false, error: "Error al descontar stock (insuficiente): " + res.error };
                   }
               }
          }
      }

      // LOGIC 2: Stock Restoration for Cancellation or Returns
      if (estado === 'devolucion' || estado === 'cancelado') {
           let shouldRestore = false;

           // Case A: Immediate Deduction Types (Express, Flash)
           // They effectively ALWAYS have stock deducted unless they are already cancelled/returned.
           const typesWithImmediateDeduction: Partial<TipoPedido>[] = ['express', 'flash'];
           if (typesWithImmediateDeduction.includes(currentOrder.tipo)) {
               // If we are NOT already in a restored state, we must restore.
               // (Prevent double restoration if for some reason we re-cancel)
               if (currentOrder.estado !== 'devolucion' && currentOrder.estado !== 'cancelado') {
                   shouldRestore = true;
               }
           } 
           // Case B: Standard Deduction Types (Interno, Web, etc.)
           // Only restore if we are coming from a state that implied deduction.
           else {
               if (statesImpliesDeduction.includes(currentOrder.estado)) {
                   shouldRestore = true;
               }
           }

           if (shouldRestore) {
               console.log(`[Stock] Restoring stock for ${currentOrder.tipo} order ${id} (Transition: ${currentOrder.estado} -> ${estado})`);
               const res = await restoreStockForce(id);
               if (!res.success) {
                    return { success: false, error: "Error al restaurar stock: " + res.error };
               }
           }
      }

    const { error } = await supabase
      .from('pedidos')
      .update({ estado })
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar estado:', error);
      return { success: false, error: error.message };
    }

    const { error: auditoriaError } = await supabase
      .from('auditoria')
      .insert({
        tabla: 'pedidos',
        registro_id: id,
        accion: 'UPDATE',
        datos_nuevos: { estado }
      });

    if (auditoriaError) {
      console.error('Error en auditoría:', auditoriaError);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error en actualizarEstadoPedido:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
};

export const actualizarPedido = async (
  id: number,
  datos: Partial<Pedido>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('pedidos')
      .update(datos)
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar pedido:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en actualizarPedido:', error);
    return false;
  }
};

export const confirmOrderAndDeductStock = async (pedidoId: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('confirm_order_and_deduct_stock', {
      p_pedido_id: pedidoId
    });

    if (error) {
      console.error('Error RPC confirm_order_and_deduct_stock:', error);
      return { success: false, error: error.message };
    }

    return { success: data as boolean };
  } catch (err) {
    console.error('Exception in confirmOrderAndDeductStock:', err);
    return { success: false, error: 'Error inesperado al confirmar pedido' };
  }
};

export const eliminarDetallePedido = async (detalleId: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('pedido_detalles')
      .delete()
      .eq('id', detalleId);

    if (error) {
      console.error('Error al eliminar detalle:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en eliminarDetallePedido:', error);
    return false;
  }
};

export const actualizarDetallePedido = async (
  detalleId: number,
  datos: { cantidad?: number; precio_unitario?: number }
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('pedido_detalles')
      .update(datos)
      .eq('id', detalleId);

    if (error) {
      console.error('Error al actualizar detalle:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en actualizarDetallePedido:', error);
    return false;
  }
};

export const agregarDetallePedido = async (
  pedidoId: number,
  libroId: number | null,
  cantidad: number,
  precioUnitario: number,
  nombreExterno?: string,
  urlExterna?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('pedido_detalles')
      .insert({
        pedido_id: pedidoId,
        libro_id: libroId, // Can be null now
        cantidad,
        precio_unitario: precioUnitario,
        nombre_externo: nombreExterno,
        url_externa: urlExterna
      });

    if (error) {
      console.error('Error al agregar detalle:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en agregarDetallePedido:', error);
    return false;
  }
};

export const obtenerUsuarios = async (): Promise<Usuario[]> => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('username');

  if (error) {
    console.error('Error al obtener usuarios:', error);
    return [];
  }

  return data || [];
};

export const obtenerLibros = async (filtro?: string): Promise<Libro[]> => {
  if (!filtro) {
    const { data, error } = await supabase
      .from('libros')
      .select('*, editorial:editoriales(nombre)')
      .eq('activo', true)
      .order('titulo')
      .limit(20); // Reduced limit for initial load optimization
    
    if (error) console.error('Error al obtener libros:', error);
    return data || [];
  }

  const isNumeric = /^\d+$/.test(filtro);

  try {
    if (isNumeric) {
      // Parallel execution: Exact Match (Priority) + Fuzzy Search
      const [exactMatch, fuzzyMatch] = await Promise.all([
        // 1. Exact Priority Search (ID or Legacy ID)
        supabase
          .from('libros')
          .select('*, editorial:editoriales(nombre)')
          .eq('activo', true)
          .or(`id.eq.${filtro},legacy_id.eq.${filtro}`),
        
        // 2. Standard Fuzzy Search (limit 20 to be faster)
        supabase
          .from('libros')
          .select('*, editorial:editoriales(nombre)')
          .eq('activo', true)
          .or(`titulo.ilike.%${filtro}%,autor.ilike.%${filtro}%,isbn.ilike.%${filtro}%`)
          .limit(20)
      ]);

      const exactData = exactMatch.data || [];
      const fuzzyData = fuzzyMatch.data || [];

      // Combine: Exact matches first, then fuzzy matches (filtering duplicates)
      const exactIds = new Set(exactData.map(b => b.id));
      const filteredFuzzy = fuzzyData.filter(b => !exactIds.has(b.id));

      return [...exactData, ...filteredFuzzy];
    } else {
      // Non-numeric search: Standard fuzzy search
      const { data, error } = await supabase
        .from('libros')
        .select('*, editorial:editoriales(nombre)')
        .eq('activo', true)
        .or(`titulo.ilike.%${filtro}%,autor.ilike.%${filtro}%,isbn.ilike.%${filtro}%,legacy_id.ilike.%${filtro}%`)
        .order('titulo')
        .limit(20);

      if (error) throw error;
      return data || [];
    }
  } catch (error) {
    console.error('Error al obtener libros:', error);
    return [];
  }
};

export const obtenerEstadisticasPedidos = async () => {
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('estado, total');

  if (error) {
    console.error('Error al obtener estadísticas:', error);
    return null;
  }

  if (!pedidos || !Array.isArray(pedidos)) {
    console.error('Error: pedidos no es un array', pedidos);
    return null;
  }

  const estadisticas = {
    total: pedidos.length,
    pendientes: pedidos.filter(p => p.estado === 'pendiente').length,
    procesando: pedidos.filter(p => p.estado === 'procesando').length,
    enviados: pedidos.filter(p => p.estado === 'enviado').length,
    completados: pedidos.filter(p => p.estado === 'completado').length,
    cancelados: pedidos.filter(p => p.estado === 'cancelado').length,
    devoluciones: pedidos.filter(p => p.estado === 'devolucion').length,
    totalVentas: pedidos
      .filter(p => p.estado !== 'cancelado' && p.estado !== 'devolucion')
      .reduce((sum, p) => sum + (p.total || 0), 0)
  };

  return estadisticas;
};

export const obtenerLibrosMasVendidos = async (): Promise<{ titulo: string; cantidad: number }[]> => {
  try {
    const { data, error } = await supabase
      .from('pedido_detalles')
      .select(`
        cantidad,
        libro:libros (
          titulo
        ),
        nombre_externo
      `);

    if (error) throw error;

    const ventasPorLibro = new Map<string, number>();

    data?.forEach((detalle: any) => {
      // Prioritize internal book title, fallback to external name, or "Unknown"
      const titulo = detalle.libro?.titulo || detalle.nombre_externo || 'Producto desconocido';
      const current = ventasPorLibro.get(titulo) || 0;
      ventasPorLibro.set(titulo, current + detalle.cantidad);
    });

    // Convert to array, sort, and slice
    return Array.from(ventasPorLibro.entries())
      .map(([titulo, cantidad]) => ({ titulo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
      
  } catch (error) {
    console.error('Error al obtener libros más vendidos:', error);
    return [];
  }
};

export const getPendingOrdersCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('pedidos')
    .select('*', { count: 'exact', head: true })
    .in('estado', ['pendiente', 'pending_verification', 'payment_pending']);

  if (error) throw error;
  return count || 0;
};

// Express Order Creation
export interface ExpressOrderInput {
  clientName: string;
  clientPhone: string;
  clientEmail?: string; // Added email field
  pickupLocation: string;
  bookId: number;
  quantity: number;
  adminUserId: string;
  clientId?: string; 
  isDeposit?: boolean;
  depositAmount?: number;
}

export const crearPedidoExpress = async (input: ExpressOrderInput) => {
  try {
    let clienteId: string;
    
    // Sanitize phone number (remove spaces/dashes)
    const sanitizedPhone = input.clientPhone.replace(/[\s-]/g, '');

    // If clientId was provided (selected from autocomplete), use it directly
    if (input.clientId) {
      clienteId = input.clientId;
    } else {
      // Otherwise, search for existing client by phone or create new one
      const { data: existingClient } = await supabase
        .from('clientes')
        .select('id, email') // Select email too
        .eq('telefono', sanitizedPhone)
        .maybeSingle(); 
      
      if (existingClient) {
        // Client exists, use it
        clienteId = existingClient.id;
        
        // Update email if provided and missing
        if (input.clientEmail && !existingClient.email) {
           await supabase
             .from('clientes')
             .update({ email: input.clientEmail })
             .eq('id', clienteId);
        }
      } else {
        // Create new client
        const nameParts = input.clientName.trim().split(' ');
        const nombre = nameParts[0];
        const apellidos = nameParts.slice(1).join(' ') || '.'; 

        const { data: newClient, error: clientError } = await supabase
          .from('clientes')
          .insert({
            nombre: nombre,
            apellidos: apellidos,
            telefono: sanitizedPhone,
            email: input.clientEmail || null, // Use provided email
            direccion: null,
            tipo: 'particular',
            notas: 'Cliente creado desde Pedido Express'
          })
          .select()
          .single();
        
        if (clientError || !newClient) {
          throw new Error('Error al crear cliente: ' + clientError?.message);
        }
        
        clienteId = newClient.id;
      }
    }
    
    // 2. Get book details for price
    const { data: book, error: bookError } = await supabase
      .from('libros')
      .select('precio')
      .eq('id', input.bookId)
      .single();
    
    if (bookError || !book) {
      throw new Error('Libro no encontrado');
    }
    
    // 3. Calculate totals
    // Fetch tax rate from settings
    const settings = await settingsService.getAllSettings();
    const taxPercentage = settings?.billing?.taxRate ?? 21; // Default to 21% if not found
    const taxRate = taxPercentage / 100;

    const precioUnitario = book.precio;
    const subtotal = precioUnitario * input.quantity;
    
    // Calculate IVA from the total amount (assuming book.precio is VAT inclusive)
    const iva = subtotal - (subtotal / (1 + taxRate));
    const total = subtotal;
    
    // 4. Create order
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: clienteId,
        usuario_id: input.adminUserId,
        tipo: 'express', // Fixed column name from tipo_pedido to tipo
        estado: 'pendiente',
        punto_recogida: input.pickupLocation,
        metodo_pago: 'efectivo', // Default for express orders
        subtotal,
        iva,
        total,
        fecha_pedido: new Date().toISOString()
      })
      .select()
      .single();
    
    if (pedidoError || !pedido) {
      throw new Error('Error al crear pedido: ' + pedidoError?.message);
    }
    
    // 5. Add order line
    const { error: detalleError } = await supabase
      .from('pedido_detalles')
      .insert({
        pedido_id: pedido.id,
        libro_id: input.bookId,
        cantidad: input.quantity,
        precio_unitario: precioUnitario
      });
    
    if (detalleError) {
      // Rollback: delete the order
      await supabase.from('pedidos').delete().eq('id', pedido.id);
      throw new Error('Error al añadir detalle del pedido: ' + detalleError.message);
    }

    // 5b. Update Stock Immediately (Decrement)
    const { error: stockError } = await supabase.rpc('decrement_stock', {
      row_id: Number(input.bookId),
      amount: input.quantity
    });

    if (stockError) {
       console.error('Error decrementing stock for express order:', stockError);
       // Optional: Rollback or just warn? For now warn, as order is created.
    }
    
    // 6. Handle Deposit (Señal)
    if (input.isDeposit && input.depositAmount && input.depositAmount > 0) {
        // Option A: Update order with signal metadata (simplest and consistent with CrearPedido)
        const { error: depositError } = await supabase
            .from('pedidos')
            .update({
                es_senal: true,
                importe_senal: input.depositAmount,
                // If deposit covers full amount, should we mark as paid? Usually signal is partial.
                // We leave status as 'pendiente' but with signal info.
            })
            .eq('id', pedido.id);

        if (depositError) {
             console.error('Error recording deposit:', depositError);
             // We don't rollback the whole order for this, but worth logging.
        }
    }

    // 7. Create notification for admin
    await createAdminOrderNotification(pedido.id, input.adminUserId);
    
    // 8. Send confirmation email
    const fullOrder = await obtenerPedidoPorId(pedido.id);
    
    if (fullOrder) {
      const customerEmail = fullOrder.cliente?.email || 'pedidos@perezgaldos.com';
      
      const emailItems = fullOrder.detalles?.map(d => ({
        title: d.libro?.titulo || 'Producto',
        quantity: d.cantidad,
        price: d.precio_unitario
      })) || [];
      
      const displayTaxRate = taxPercentage; // Already fetched above
      
      sendOrderConfirmationEmail({
        orderId: fullOrder.id.toString(),
        customerEmail,
        customerName: fullOrder.cliente?.nombre || 'Cliente',
        items: emailItems,
        subtotal: fullOrder.subtotal ?? 0,
        tax: fullOrder.iva ?? 0,
        taxRate: displayTaxRate,
        shipping: fullOrder.coste_envio ?? 0,
        total: fullOrder.total ?? 0,
        shippingAddress: fullOrder.punto_recogida || 'Recogida en tienda',
        orderType: 'express'
      }).catch(err => console.error('Error sending confirmation email:', err));
    }
    
    return pedido;
  } catch (error) {
    console.error('Error in crearPedidoExpress:', error);
    throw error;
  }
};


export interface CrearPedidoFlashInput {
  detalles: Array<{
    bookId: number;
    quantity: number;
    price: number;
  }>;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  pickupLocation: 'Galeón' | 'Pérez Galdós';
  adminUserId: string;
  clientId?: string;
  isDeposit?: boolean;
  depositAmount?: number;
}

export const crearPedidoFlash = async (input: CrearPedidoFlashInput): Promise<Pedido | null> => {
  try {
    // 1. Create or Update Client
    let clienteId = input.clientId;
    if (!clienteId) {
      const { data: newClient, error: clientError } = await supabase
        .from('clientes')
        .insert([{
          nombre: input.clientName,
          apellidos: '', // Flat name for flash
          telefono: input.clientPhone,
          email: input.clientEmail,
          tipo: 'particular',
          activo: true,
          notas: 'Creado vía Pedido Flash'
        }])
        .select()
        .single();

      if (clientError) throw clientError;
      clienteId = newClient.id;
    }

    // 2. Calculate Totals with Tax (FIXED: Added IVA calculation)
    const settings = await settingsService.getAllSettings();
    const taxPercentage = settings?.billing?.taxRate ?? 21;
    const taxRate = taxPercentage / 100;

    const totalWithTax = input.detalles.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );

    const subtotalWithoutTax = totalWithTax / (1 + taxRate);
    const iva = totalWithTax - subtotalWithoutTax;

    // 3. Create Order (FIXED: Added subtotal and iva fields)
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert([{
        usuario_id: input.adminUserId,
        cliente_id: clienteId,
        tipo: 'flash',
        estado: 'pendiente',
        fecha_pedido: new Date().toISOString(),
        metodo_pago: 'efectivo',
        subtotal: Number(subtotalWithoutTax.toFixed(2)),
        iva: Number(iva.toFixed(2)),
        total: Number(totalWithTax.toFixed(2)),
        punto_recogida: input.pickupLocation,
        es_senal: input.isDeposit,
        importe_senal: input.depositAmount || 0,
        observaciones: 'Pedido Flash'
      }])
      .select()
      .single();

    if (pedidoError) throw pedidoError;

    // 4. Create Details (FIXED: Corrected table name from 'pedidos_detalles' to 'pedido_detalles')
    const detallesData = input.detalles.map(item => ({
      pedido_id: pedido.id,
      libro_id: item.bookId,
      cantidad: item.quantity,
      precio_unitario: item.price,
      subtotal: item.quantity * item.price
    }));

    const { error: detallesError } = await supabase
      .from('pedido_detalles')  // ✅ FIXED: Was 'pedidos_detalles'
      .insert(detallesData);

    if (detallesError) {
      // FIXED: Added rollback mechanism
      await supabase.from('pedidos').delete().eq('id', pedido.id);
      throw new Error('Error al crear detalles del pedido flash: ' + detallesError.message);
    }

    // 5. Update Stock with Error Handling (FIXED: Added error handling)
    for (const item of input.detalles) {
      const { error: stockError } = await supabase.rpc('decrement_stock', { 
        row_id: Number(item.bookId), 
        amount: item.quantity 
      });
      
      if (stockError) {
        console.error(`Error decrementing stock for book ${item.bookId}:`, stockError);
        // Note: We don't rollback here as the order is already confirmed
        // Admin will need to manually adjust stock if necessary
      }
    }

    // 6. Fetch Full Order for Notifications (FIXED: Improved notification system)
    const fullOrder = await obtenerPedidoPorId(pedido.id);
    
    if (fullOrder) {
      // Notification to Admins with detailed info
      const clientName = fullOrder.cliente?.nombre || input.clientName;
      const userObj = fullOrder.usuario;
      const username = userObj?.username || 'Admin';
      const userIdDisplay = userObj?.legacy_id ? `ID: ${userObj.legacy_id}` : `ID: ${userObj?.id?.slice(0, 8)}...`;
      
      const itemsSummary = fullOrder.detalles?.map(d => {
        const title = d.libro?.titulo || 'Producto';
        const code = d.libro?.legacy_id || 'S/C';
        return `${title} (${code})`;
      }).join(', ') || 'varios artículos';
      
      createAdminOrderNotification(
        pedido.id,
        clientName,
        username,
        'flash',
        'pendiente',
        userIdDisplay,
        itemsSummary
      ).catch(err => console.error('Error sending admin notification:', err));

      // Notification to User
      createOrderNotification(
        input.adminUserId, 
        pedido.id, 
        'pendiente'
      ).catch(err => console.error('Error sending user notification:', err));
      
      // 7. Send confirmation email
      const customerEmail = fullOrder.cliente?.email || 'pedidos@perezgaldos.com';
      
      const emailItems = fullOrder.detalles?.map(d => ({
        title: d.libro?.titulo || 'Producto',
        quantity: d.cantidad,
        price: d.precio_unitario
      })) || [];
      
      const displayTaxRate = settings?.billing?.taxRate || 21;
      
      sendOrderConfirmationEmail({
        orderId: fullOrder.id.toString(),
        customerEmail,
        customerName: fullOrder.cliente?.nombre || 'Cliente',
        items: emailItems,
        subtotal: fullOrder.subtotal ?? 0,
        tax: fullOrder.iva ?? 0,
        taxRate: displayTaxRate,
        shipping: fullOrder.coste_envio ?? 0,
        total: fullOrder.total ?? 0,
        shippingAddress: fullOrder.punto_recogida || 'Recogida en tienda',
        orderType: 'flash'
      }).catch(err => console.error('Error sending confirmation email:', err));

      return fullOrder;
    }

    return pedido;

  } catch (error) {
    console.error('Error creating Flash Order:', error);
    throw error;
  }
};

export const hardDeleteOrder = async (orderId: number): Promise<{ success: boolean; message?: string }> => {
  try {
    const { data, error } = await supabase.rpc('hard_delete_order', {
      p_order_id: orderId
    });

    if (error) throw error;

    return {
      success: data.success,
      message: data.message
    };
  } catch (error: any) {
    console.error('Error in hardDeleteOrder:', error);
    return {
      success: false,
      message: error.message || 'Error desconocido al eliminar el pedido permanentemente'
    };
  }
};
