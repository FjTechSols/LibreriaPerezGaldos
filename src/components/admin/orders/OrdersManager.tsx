import { useState, useEffect } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { Plus } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Pedido } from '../../../types';
import PedidosList from './PedidosList';
import PedidoDetalle from './PedidoDetalle';
import CrearPedido from './CrearPedido';
import { IberLibroPedidosList } from './IberLibroPedidosList';
import '../../../styles/components/OrdersManager.css';

interface OrdersManagerProps {
  onOrdersChange?: () => void;
}

type OrderTab = 'perez_galdos' | 'iberlibro';

export function OrdersManager({ onOrdersChange }: OrdersManagerProps) {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<OrderTab>('perez_galdos');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [isPedidoDetalleOpen, setIsPedidoDetalleOpen] = useState(false);
  const [isCrearPedidoOpen, setIsCrearPedidoOpen] = useState(false);

  // Feature Toggle: Check if AbeBooks Order Sync is enabled
  const showIberLibro = settings?.integrations?.abeBooks?.enabled && settings?.integrations?.abeBooks?.api?.orders?.showTab;

  // Effect: Use Effect to redirect if active tab becomes disabled
  useEffect(() => {
     if (activeTab === 'iberlibro' && !showIberLibro) {
         setActiveTab('perez_galdos');
     }
  }, [showIberLibro, activeTab]);

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
          {activeTab === 'perez_galdos' && (
            <button
              onClick={() => setIsCrearPedidoOpen(true)}
              className="action-btn primary"
            >
              <Plus size={20} />
              Nuevo Pedido
            </button>
          )}
      </div>

      {/* Tabs */}
      <div className="orders-tabs">
        <button 
          className={`tab-btn ${activeTab === 'perez_galdos' ? 'active' : ''}`}
          onClick={() => setActiveTab('perez_galdos')}
        >
          Pérez Galdós
        </button>
        
        {showIberLibro && (
            <button 
              className={`tab-btn ${activeTab === 'iberlibro' ? 'active' : ''}`}
              onClick={() => setActiveTab('iberlibro')}
            >
              IberLibro
            </button>
        )}
      </div>

      {/* Conditional Content */}
      {activeTab === 'perez_galdos' ? (
        <PedidosList
          key={refreshTrigger}
          onVerDetalle={(pedido) => {
            setSelectedPedido(pedido);
            setIsPedidoDetalleOpen(true);
          }}
          refreshTrigger={refreshTrigger}
        />
      ) : (
        <IberLibroPedidosList />
      )}

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
