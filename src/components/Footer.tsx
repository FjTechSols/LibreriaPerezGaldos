
import { Link } from 'react-router-dom';
import { BookOpen, Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import '../styles/components/Footer.css';

export function Footer() {
  const { t } = useLanguage();
  const { settings } = useSettings();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <img src="/Logo Exlibris Perez Galdos.png" alt="Logo" className="footer-logo-img" />
              <span>{settings.company.name}</span>
            </div>
            <p className="footer-description">
              {t('footerDescription')}
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
            <h3 className="footer-title">{t('quickLinks')}</h3>
            <ul className="footer-links">
              <li><a href="/">{t('home')}</a></li>
              <li><a href="/catalogo">{t('catalog')}</a></li>
              <li><a href="/catalogo?category=Novedades">{t('latestReleases')}</a></li>
              <li><a href="/catalogo?featured=true">{t('featuredBooks')}</a></li>
              <li><a href="/catalogo?category=Ofertas">{t('specialOffers')}</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-title">{t('categories')}</h3>
            <ul className="footer-links">
              <li><a href="/catalogo?category=Clásicos">Clásicos</a></li>
              <li><a href="/catalogo?category=Fantasía">Fantasía</a></li>
              <li><a href="/catalogo?category=Romance">Romance</a></li>
              <li><a href="/catalogo?category=Misterio">Misterio</a></li>
              <li><a href="/catalogo?category=Historia">Historia</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-title">{t('contact')}</h3>
            <ul className="footer-links">
              <li>
                <MapPin size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                {settings.company.address}
              </li>
              <li>
                <Phone size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                {settings.company.phone}
              </li>
              <li>
                <Mail size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                {settings.company.email}
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {settings.company.name}. {t('allRightsReserved')}.</p>
          <div className="footer-legal">
            <Link to="/privacy">{t('privacyPolicy')}</Link>
            <Link to="/terms">{t('termsOfService')}</Link>
            <Link to="/cookies">{t('cookies')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}