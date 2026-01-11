import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Pedido } from '../../../types';
import PedidosList from './PedidosList';
import PedidoDetalle from './PedidoDetalle';
import CrearPedido from './CrearPedido';

interface OrdersManagerProps {
  onOrdersChange?: () => void;
}

export function OrdersManager({ onOrdersChange }: OrdersManagerProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [isPedidoDetalleOpen, setIsPedidoDetalleOpen] = useState(false);
  const [isCrearPedidoOpen, setIsCrearPedidoOpen] = useState(false);

  // Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('orders-manager-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        setRefreshTrigger(prev => prev + 1);
        // Optional: Trigger badge update on realtime changes too
        if (onOrdersChange) onOrdersChange();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onOrdersChange]);

  return (
    <div className="orders-manager">
       <div className="content-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h2 className="content-title">Gestión de Pedidos</h2>
            <p className="content-subtitle">Control de pedidos y envíos</p>
          </div>
          <button
              onClick={() => setIsCrearPedidoOpen(true)}
              className="action-btn primary"
            >
              <Plus size={20} />
              Nuevo Pedido
            </button>
      </div>

      <PedidosList
        key={refreshTrigger}
        onVerDetalle={(pedido) => {
          setSelectedPedido(pedido);
          setIsPedidoDetalleOpen(true);
        }}
        refreshTrigger={refreshTrigger}
      />

      {/* Modals */}
      <PedidoDetalle
          pedido={selectedPedido}
          isOpen={isPedidoDetalleOpen}
          onClose={() => {
            setIsPedidoDetalleOpen(false);
            setSelectedPedido(null);
          }}
          onRefresh={() => {
            setRefreshTrigger(prev => prev + 1);
            if (onOrdersChange) onOrdersChange();
          }}
        />

        <CrearPedido
          isOpen={isCrearPedidoOpen}
          onClose={() => setIsCrearPedidoOpen(false)}
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
            setIsCrearPedidoOpen(false);
            if (onOrdersChange) onOrdersChange();
          }}
        />
    </div>
  );
}
