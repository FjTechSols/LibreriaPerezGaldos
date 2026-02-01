
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import { WishlistProvider } from './context/WishlistContext';
import { InvoiceProvider } from './context/InvoiceContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { BookDetail } from './pages/BookDetail';
import { Cart } from './pages/Cart';
import { Wishlist } from './pages/Wishlist';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserDashboard } from './pages/UserDashboard';
import { UserSettings } from './pages/UserSettings';
import { AdminSettings } from './pages/AdminSettings';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiesPolicy from './pages/CookiesPolicy';
import StripeCheckout from './pages/StripeCheckout';
import PaymentSuccess from './pages/PaymentSuccess';
import EmailVerification from './pages/EmailVerification';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteTransitionProvider } from './context/RouteTransitionContext';
import { RouteTransitionLoader } from './components/RouteTransitionLoader';
import { About } from './pages/About';
import { Location } from './pages/Location';
import { Contact } from './pages/Contact';
import OrderConfirmation from './pages/OrderConfirmation';

function AppRoutes() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <RouteTransitionLoader />
      {!isAdminRoute && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/libro/:id" element={<BookDetail />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recuperar" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/cookies" element={<CookiesPolicy />} />
          <Route path="/verificacion-email" element={<EmailVerification />} />
          <Route path="/nosotros" element={<About />} />
          <Route path="/ubicacion" element={<Location />} />
          <Route path="/contacto" element={<Contact />} />
          <Route
            path="/stripe-checkout"
            element={
              <ProtectedRoute>
                <StripeCheckout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pago-completado"
            element={
              <ProtectedRoute requireRole="usuario">
                <PaymentSuccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mi-cuenta"
            element={
              <ProtectedRoute requireRole="usuario">
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ajustes"
            element={
              <ProtectedRoute requireRole="usuario">
                <UserSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ajustes"
            element={
              <ProtectedRoute requireAdmin>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <RouteTransitionProvider>
        <ThemeProvider>
          <LanguageProvider>
            <SettingsProvider>
              <AuthProvider>
                <CartProvider>
                  <OrderProvider>
                    <WishlistProvider>
                      <InvoiceProvider>
                        <AppRoutes />
                      </InvoiceProvider>
                    </WishlistProvider>
                  </OrderProvider>
                </CartProvider>
              </AuthProvider>
            </SettingsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </RouteTransitionProvider>
    </Router>
  );
}

export default App;
