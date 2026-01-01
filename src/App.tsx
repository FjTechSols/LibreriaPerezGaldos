import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { NewYearFireworks } from './components/NewYearFireworks';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
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
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mi-cuenta"
            element={
              <ProtectedRoute>
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
              <ProtectedRoute>
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
  const [showFireworks, setShowFireworks] = useState(true); // Show by default
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Check if fireworks have been shown in this session
    const hasSeenFireworks = sessionStorage.getItem('hasSeenNewYearFireworks');
    
    if (hasSeenFireworks) {
      // If already seen, don't show fireworks
      setShowFireworks(false);
      setHasLoaded(true);
    } else {
      // Show fireworks as initial loader
      setShowFireworks(true);
      
      // IMPORTANT: Prevent AuthContext from showing its own splash screen
      // by setting this flag immediately
      sessionStorage.setItem('hasLoadedBefore', 'true');
      
      // Prevent scrolling while fireworks are shown
      document.body.style.overflow = 'hidden';
      
      // Mark as loaded after a short delay to ensure smooth transition
      setTimeout(() => setHasLoaded(true), 500);
    }
  }, []);

  const handleCloseFireworks = () => {
    setShowFireworks(false);
    // Restore scrolling
    document.body.style.overflow = '';
    // Mark as seen for this session
    sessionStorage.setItem('hasSeenNewYearFireworks', 'true');
  };

  return (
    <>
      {showFireworks && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2147483647 }}>
          <NewYearFireworks onClose={handleCloseFireworks} />
        </div>
      )}
      {hasLoaded && (
        <Router>
          <RouteTransitionProvider>
            <ThemeProvider>
              <LanguageProvider>
                <SettingsProvider>
                  <AuthProvider>
                    <CartProvider>
                      <WishlistProvider>
                        <InvoiceProvider>
                          <AppRoutes />
                        </InvoiceProvider>
                      </WishlistProvider>
                    </CartProvider>
                  </AuthProvider>
                </SettingsProvider>
              </LanguageProvider>
            </ThemeProvider>
          </RouteTransitionProvider>
        </Router>
      )}
    </>
  );
}

export default App;