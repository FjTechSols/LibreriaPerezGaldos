
import { BookOpen, Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';
import '../styles/components/Footer.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <BookOpen size={28} />
              <span>Perez Galdos</span>
            </div>
            <p className="footer-description">
              Tu librería de confianza con la mejor selección de libros en español y otros idiomas.
              Descubre nuevas historias y encuentra tus próximas lecturas favoritas.
            </p>
            <div className="social-links">
              <a href="#" className="social-link" aria-label="Facebook">
                <Facebook size={20} />
              </a>
              <a href="#" className="social-link" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className="social-link" aria-label="Instagram">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          <div className="footer-section">
            <h3 className="footer-title">Enlaces Rápidos</h3>
            <ul className="footer-links">
              <li><a href="/">Inicio</a></li>
              <li><a href="/catalogo">Catálogo</a></li>
              <li><a href="/catalogo?category=Novedades">Novedades</a></li>
              <li><a href="/catalogo?featured=true">Destacados</a></li>
              <li><a href="/catalogo?category=Ofertas">Ofertas</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-title">Categorías</h3>
            <ul className="footer-links">
              <li><a href="/catalogo?category=Clásicos">Clásicos</a></li>
              <li><a href="/catalogo?category=Fantasía">Fantasía</a></li>
              <li><a href="/catalogo?category=Romance">Romance</a></li>
              <li><a href="/catalogo?category=Misterio">Misterio</a></li>
              <li><a href="/catalogo?category=Historia">Historia</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-title">Contacto</h3>
            <div className="contact-info">
              <div className="contact-item">
                <MapPin size={16} />
                <span>Calle Principal 123, Madrid, España</span>
              </div>
              <div className="contact-item">
                <Phone size={16} />
                <span>+34 91 123 45 67</span>
              </div>
              <div className="contact-item">
                <Mail size={16} />
                <span>librería @perezgaldos.com</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2025 Perez Galdos. Todos los derechos reservados.</p>
          <div className="footer-legal">
            <a href="/privacidad">Política de Privacidad</a>
            <a href="/terminos">Términos de Servicio</a>
            <a href="/cookies">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}