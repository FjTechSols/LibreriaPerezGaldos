import { supabase } from '../lib/supabase';
import { Pedido, PedidoDetalle, EstadoPedido, Usuario, Libro } from '../types';

const IVA_RATE = 0.21;

export interface CrearPedidoInput {
  usuario_id: string;
  cliente_id?: string;
  tipo?: string;
  metodo_pago?: string;
  direccion_envio?: string;
  transportista?: string;
  tracking?: string;
  observaciones?: string;
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

export const calcularTotalesPedido = (detalles: { cantidad: number; precio_unitario: number }[]): CalculoPedido => {
  const subtotal = detalles.reduce((sum, detalle) => {
    return sum + (detalle.cantidad * detalle.precio_unitario);
  }, 0);

  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    iva: Number(iva.toFixed(2)),
    total: Number(total.toFixed(2))
  };
};

export const obtenerPedidos = async (filtros?: {
  estado?: EstadoPedido;
  usuario_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}): Promise<Pedido[]> => {
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
    `)
    .order('fecha_pedido', { ascending: false });

  if (filtros?.estado) {
    query = query.eq('estado', filtros.estado);
  }

  if (filtros?.usuario_id) {
    query = query.eq('usuario_id', filtros.usuario_id);
  }

  if (filtros?.fecha_desde) {
    query = query.gte('fecha_pedido', filtros.fecha_desde);
  }

  if (filtros?.fecha_hasta) {
    query = query.lte('fecha_pedido', filtros.fecha_hasta);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error al obtener pedidos:', error);
    return [];
  }

  return data || [];
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
      factura:facturas(*),
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

    const { subtotal, iva, total } = calcularTotalesPedido(input.detalles);

    const pedidoData = {
      usuario_id: input.usuario_id,
      cliente_id: input.cliente_id || null,
      estado: 'pendiente' as EstadoPedido,
      tipo: input.tipo || 'interno',
      subtotal,
      iva,
      total,
      metodo_pago: input.metodo_pago || 'tarjeta',
      direccion_envio: input.direccion_envio,
      transportista: input.transportista,
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

    const detallesConPedidoId = input.detalles.map(detalle => ({
      pedido_id: pedido.id,
      libro_id: detalle.libro_id,
      cantidad: detalle.cantidad,
      precio_unitario: detalle.precio_unitario
    }));

    const { error: detallesError } = await supabase
      .from('pedido_detalles')
      .insert(detallesConPedidoId);

    if (detallesError) {
      console.error('Error al crear detalles:', detallesError);
      await supabase.from('pedidos').delete().eq('id', pedido.id);
      throw detallesError;
    }

    return await obtenerPedidoPorId(pedido.id);
  } catch (error) {
    console.error('Error en crearPedido:', error);
    return null;
  }
};

export const actualizarEstadoPedido = async (
  id: number,
  estado: EstadoPedido
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado })
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar estado:', error);
      return false;
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

    return true;
  } catch (error) {
    console.error('Error en actualizarEstadoPedido:', error);
    return false;
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

export const agregarDetallePedido = async (
  pedidoId: number,
  libroId: number,
  cantidad: number,
  precioUnitario: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('pedido_detalles')
      .insert({
        pedido_id: pedidoId,
        libro_id: libroId,
        cantidad,
        precio_unitario: precioUnitario
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
  let query = supabase
    .from('libros')
    .select('*')
    .eq('activo', true)
    .order('titulo');

  if (filtro) {
    query = query.or(`titulo.ilike.%${filtro}%,isbn.ilike.%${filtro}%`);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error('Error al obtener libros:', error);
    return [];
  }

  return data || [];
};

export const obtenerEstadisticasPedidos = async () => {
  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select('estado, total');

  if (error) {
    console.error('Error al obtener estadísticas:', error);
    return null;
  }

  const estadisticas = {
    total: pedidos.length,
    pendientes: pedidos.filter(p => p.estado === 'pendiente').length,
    procesando: pedidos.filter(p => p.estado === 'procesando').length,
    enviados: pedidos.filter(p => p.estado === 'enviado').length,
    completados: pedidos.filter(p => p.estado === 'completado').length,
    cancelados: pedidos.filter(p => p.estado === 'cancelado').length,
    totalVentas: pedidos
      .filter(p => p.estado !== 'cancelado')
      .reduce((sum, p) => sum + (p.total || 0), 0)
  };

  return estadisticas;
};
