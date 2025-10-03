
import { Link } from 'react-router-dom';
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
            <ul className="footer-links">
              <li>
                <MapPin size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Calle Hortaleza 5, 28004 Madrid
              </li>
              <li>
                <Phone size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                +34 91 531 26 40
              </li>
              <li>
                <Mail size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                libreria@perezgaldos.com
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2025 Perez Galdos. Todos los derechos reservados.</p>
          <div className="footer-legal">
            <Link to="/privacy">Política de Privacidad</Link>
            <Link to="/terms">Términos de Servicio</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}