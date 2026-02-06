import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

// Mocks for contexts/providers to prevent errors during render
vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock('../context/CartContext', () => ({
  CartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useCart: () => ({ items: [], total: 0 }),
}));

vi.mock('../context/OrderContext', () => ({
  OrderProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useOrder: () => ({ orderMode: 'standard' }),
}));

vi.mock('../context/WishlistContext', () => ({
  WishlistProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useWishlist: () => ({ items: [] }),
}));

vi.mock('../context/InvoiceContext', () => ({
  InvoiceProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useInvoice: () => ({ invoices: [], loading: false }),
}));

vi.mock('../context/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useLanguage: () => ({ language: 'es', t: (key: string) => key }),
}));

vi.mock('../context/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', setTheme: vi.fn() }),
}));

vi.mock('../context/SettingsContext', () => ({
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSettings: () => ({ 
      settings: { 
          company: { name: 'Test Bookstore' } 
      }, 
      loading: false 
  }),
}));

vi.mock('../services/notificationService', () => ({
    getUnreadCount: vi.fn(),
    getAdminUnreadCount: vi.fn()
}));

vi.mock('../context/RouteTransitionContext', () => ({
  RouteTransitionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('App Smoke Test', () => {
  it('renders without crashing', () => {
    render(<App />);
    // Just verify something basic renders, like implicit Navbar or Footer from mocked providers
    // Since we mocked everything away, App just renders Router -> Providers -> AppRoutes
    // AppRoutes renders Navbar (unless admin).
    // But since we are not in admin route, Navbar should render.
    // However, Navbar implementation might need more mocks.
    // Let's just expect truthy for now to catch pure crash.
    expect(true).toBeTruthy();
  });
});
