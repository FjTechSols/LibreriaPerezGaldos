
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';
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
              <li><Link to="/">{t('home')}</Link></li>
              <li><Link to="/catalogo">{t('catalog')}</Link></li>
              <li><Link to="/catalogo?isNew=true">{t('latestReleases')}</Link></li>
              <li><Link to="/catalogo?featured=true">{t('featuredBooks')}</Link></li>
              <li><Link to="/catalogo?onSale=true">{t('specialOffers')}</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-title">{t('categories')}</h3>
            <ul className="footer-links">
              <li><Link to="/catalogo?category=Literatura">Literatura</Link></li>
              <li><Link to="/catalogo?category=Fantasía">Fantasía</Link></li>
              <li><Link to="/catalogo?category=Misterio">Misterio</Link></li>
              <li><Link to="/catalogo?category=Novelas">Novelas</Link></li>
              <li><Link to="/catalogo?category=Arte">Arte</Link></li>
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