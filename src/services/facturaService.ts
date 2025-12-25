import { supabase } from '../lib/supabase';
import { Factura, Pedido, PedidoDetalle } from '../types';
import { generarPDFFactura } from '../utils/pdfGenerator';
import { settingsService } from './settingsService';

export interface CrearFacturaInput {
  pedido_id: number;
  tipo?: 'normal' | 'rectificativa';
  factura_original_id?: number;
  motivo_anulacion?: string;
}

export interface CalculoFactura {
  subtotal: number;
  iva: number;
  total: number;
}

export const calcularTotalesFactura = async (detalles: PedidoDetalle[]): Promise<CalculoFactura> => {
  const subtotal = detalles.reduce((sum, detalle) => {
    return sum + (detalle.cantidad * detalle.precio_unitario);
  }, 0);

  const settings = await settingsService.getAllSettings();
  const ivaRate = settings ? settings.billing.taxRate / 100 : 0.21;
  const iva = subtotal * ivaRate;
  const total = subtotal + iva;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    iva: Number(iva.toFixed(2)),
    total: Number(total.toFixed(2))
  };
};

export const obtenerPedidoCompleto = async (pedidoId: number): Promise<Pedido | null> => {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      usuario:usuarios(*),
      detalles:pedido_detalles(
        *,
        libro:libros(*)
      )
    `)
    .eq('id', pedidoId)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener pedido:', error);
    return null;
  }

  return data;
};

export const crearFactura = async (input: CrearFacturaInput): Promise<Factura | null> => {
  try {
    const pedido = await obtenerPedidoCompleto(input.pedido_id);

    if (!pedido || !pedido.detalles || pedido.detalles.length === 0) {
      throw new Error('Pedido no encontrado o sin detalles');
    }

    const { subtotal, iva, total } = await calcularTotalesFactura(pedido.detalles);

    const facturaData: Partial<Factura> = {
      pedido_id: input.pedido_id,
      subtotal,
      iva,
      total,
      tipo: input.tipo || 'normal',
      factura_original_id: input.factura_original_id,
      motivo_anulacion: input.motivo_anulacion,
      anulada: false
      // Note: 'status' field removed - column doesn't exist in facturas table
    };

    const { data, error } = await supabase
      .from('facturas')
      .insert(facturaData)
      .select()
      .single();

    if (error) {
      console.error('Error al crear factura:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error en crearFactura:', error);
    return null;
  }
};

export const obtenerFacturas = async (filtros?: {
  desde?: string;
  hasta?: string;
  tipo?: 'normal' | 'rectificativa';
  anulada?: boolean;
}): Promise<Factura[]> => {
  let query = supabase
    .from('facturas')
    .select(`
      *,
      pedido:pedidos(
        *,
        usuario:usuarios(*),
        detalles:pedido_detalles(
          *,
          libro:libros(*)
        )
      )
    `)
    .order('fecha', { ascending: false });

  if (filtros?.desde) {
    query = query.gte('fecha', filtros.desde);
  }

  if (filtros?.hasta) {
    query = query.lte('fecha', filtros.hasta);
  }

  if (filtros?.tipo) {
    query = query.eq('tipo', filtros.tipo);
  }

  if (filtros?.anulada !== undefined) {
    query = query.eq('anulada', filtros.anulada);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error al obtener facturas:', error);
    return [];
  }

  return data || [];
};

export const obtenerFacturaPorId = async (id: number): Promise<Factura | null> => {
  const { data, error } = await supabase
    .from('facturas')
    .select(`
      *,
      pedido:pedidos(
        *,
        usuario:usuarios(*),
        detalles:pedido_detalles(
          *,
          libro:libros(*)
        )
      ),
      factura_original:facturas(*),
      reembolsos(*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener factura:', error);
    return null;
  }

  return data;
};

export const anularFactura = async (
  facturaId: number,
  motivo: string
): Promise<Factura | null> => {
  try {
    const facturaOriginal = await obtenerFacturaPorId(facturaId);

    if (!facturaOriginal) {
      throw new Error('Factura no encontrada');
    }

    if (facturaOriginal.anulada) {
      throw new Error('La factura ya está anulada');
    }

    const { error: updateError } = await supabase
      .from('facturas')
      .update({
        anulada: true,
        motivo_anulacion: motivo
      })
      .eq('id', facturaId);

    if (updateError) {
      throw updateError;
    }

    const facturaRectificativa = await crearFactura({
      pedido_id: facturaOriginal.pedido_id,
      tipo: 'rectificativa',
      factura_original_id: facturaId,
      motivo_anulacion: motivo
    });

    return facturaRectificativa;
  } catch (error) {
    console.error('Error al anular factura:', error);
    return null;
  }
};

export const generarFacturaPDF = async (facturaId: number): Promise<string | null> => {
  try {
    const factura = await obtenerFacturaPorId(facturaId);

    if (!factura) {
      throw new Error('Factura no encontrada');
    }

    const settings = await settingsService.getAllSettings();
    const pdfBlob = await generarPDFFactura(factura, settings || undefined);
    const pdfUrl = URL.createObjectURL(pdfBlob);

    return pdfUrl;
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return null;
  }
};

export const descargarFacturaPDF = async (facturaId: number): Promise<void> => {
  const pdfUrl = await generarFacturaPDF(facturaId);

  if (pdfUrl) {
    const factura = await obtenerFacturaPorId(facturaId);
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${factura?.numero_factura || `factura-${facturaId}`}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(pdfUrl);
  }
};

export const crearReembolso = async (
  facturaId: number,
  importe: number,
  motivo: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('reembolsos')
      .insert({
        factura_id: facturaId,
        importe,
        motivo,
        estado: 'pendiente'
      });

    if (error) {
      console.error('Error al crear reembolso:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en crearReembolso:', error);
    return false;
  }
};

export const obtenerEstadisticasFacturacion = async (anio?: number) => {
  const anioActual = anio || new Date().getFullYear();

  const { data: facturas, error } = await supabase
    .from('facturas')
    .select('*')
    .gte('fecha', `${anioActual}-01-01`)
    .lte('fecha', `${anioActual}-12-31`)
    .eq('anulada', false);

  if (error) {
    console.error('Error al obtener estadísticas:', error);
    return null;
  }

  const totalFacturado = facturas.reduce((sum, f) => sum + Number(f.total), 0);
  const totalIVA = facturas.reduce((sum, f) => sum + Number(f.iva), 0);
  const totalSinIVA = facturas.reduce((sum, f) => sum + Number(f.subtotal), 0);

  const facturasPorMes = facturas.reduce((acc, f) => {
    const mes = new Date(f.fecha || '').getMonth();
    if (!acc[mes]) {
      acc[mes] = { cantidad: 0, total: 0 };
    }
    acc[mes].cantidad++;
    acc[mes].total += Number(f.total);
    return acc;
  }, {} as Record<number, { cantidad: number; total: number }>);

  return {
    totalFacturas: facturas.length,
    totalFacturado,
    totalIVA,
    totalSinIVA,
    facturasPorMes
  };
};
