import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useOrder } from '../../../context/OrderContext';
import { useTheme } from '../../../context/ThemeContext';
import { FlashOrderModal } from './FlashOrderModal';
import { useAuth } from '../../../context/AuthContext';

export function FlashOrderFab() {
  const { orderMode, flashItems } = useOrder();
  const { actualTheme } = useTheme();
  const { isAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Only show if Admin, in Flash Mode, and has items (or just in Flash Mode?)
  // Plan says: "Visible globally for admins when Flash Order mode is active"
  if (!isAdmin || orderMode !== 'flash') return null;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`fixed bottom-8 right-8 z-50 p-4 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center
          ${actualTheme === 'dark' 
            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50' 
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}
        `}
        title="Ver Pedido Flash"
      >
        <Zap size={28} className="fill-current" />
        {flashItems.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white dark:border-gray-900">
            {flashItems.length}
          </span>
        )}
      </button>

      <FlashOrderModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(id) => {
             // Maybe show a toast globally? 
             // Modal handles its own success message mostly, but we can rely on modal closing.
             // Usually AdminDashboard handles toasts, but here we are global.
             // For now, let the modal close.
             console.log('Order created:', id);
        }}
      />
    </>
  );
}
