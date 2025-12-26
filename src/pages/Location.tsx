import { Clock, Phone, Navigation, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/pages/InfoPages.css';

export const Location = () => {
  const { t } = useLanguage();
  
  return (
    <div className="info-page">
      <div className="info-hero">
        <h1>{t('ourStores')}</h1>
        <p>{t('twoUniqueSpaces')}</p>
      </div>

      <div className="info-container">
        
        {/* LIBRERÍA PÉREZ GALDÓS */}
        <div className="info-card location-card">
          <div className="location-header">
            <div>
              <h2>Librería Pérez Galdós</h2>
              <p className="location-subtitle">{t('heartOfOurHistory')}</p>
            </div>
            <a 
              href="https://maps.app.goo.gl/UqFMLQg8N7uqxz33A" 
              target="_blank" 
              rel="noopener noreferrer"
              className="maps-profile-btn"
            >
              <ExternalLink size={18} />
              {t('viewOnGoogleMaps')}
            </a>
          </div>

          <div className="contact-grid">
            <div className="info-text">
              <div className="contact-info-list">
                <div className="contact-item">
                  <Navigation className="contact-icon-small" size={24} color="var(--primary-600)" />
                  <div className="contact-item-content">
                    <h3>{t('addressLabel')}</h3>
                    <p>Calle Hortaleza 5</p>
                    <p>28004, Madrid</p>
                    <p>(Barrio de Chueca - Justicia)</p>
                  </div>
                </div>

                <div className="contact-item">
                  <Clock className="contact-icon-small" size={24} color="var(--primary-600)" />
                  <div className="contact-item-content">
                    <h3>{t('scheduleLabel')}</h3>
                    <p>{t('mondayToFriday')}: 10:30 - 20:30</p>
                    <p>{t('saturdays')}: 10:30 - 14:30</p>
                    <p>{t('sundays')}: {t('checkOpening')}</p>
                  </div>
                </div>

                <div className="contact-item">
                  <Phone className="contact-icon-small" size={24} color="var(--primary-600)" />
                  <div className="contact-item-content">
                    <h3>{t('contactLabel')}</h3>
                    <p>Tel: +34 91 531 26 40</p>
                    <p>WhatsApp: +34 91 531 26 40</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="map-section">
              <div className="map-container">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3037.135767222378!2d-3.702558684605996!3d40.42146997936453!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd422880e6c5a3b7%3A0x12b5f60877840130!2sC.%20de%20Hortaleza%2C%205%2C%2028004%20Madrid!5e0!3m2!1ses!2ses!4v1620000000000!5m2!1ses!2ses"
                  className="map-frame"
                  title="Ubicación Librería Pérez Galdós"
                  allowFullScreen={true} 
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>
        </div>

        {/* LIBRERÍA EL GALEÓN */}
        <div className="info-card location-card">
          <div className="location-header">
            <div>
              <h2>Librería El Galeón</h2>
              <p className="location-subtitle">{t('ourNewAdventure')}</p>
            </div>
            <a 
              href="https://maps.app.goo.gl/Z3W3J9Hg6LSgyQ6v9" 
              target="_blank" 
              rel="noopener noreferrer"
              className="maps-profile-btn"
            >
              <ExternalLink size={18} />
              {t('viewOnGoogleMaps')}
            </a>
          </div>

          <div className="contact-grid">
            <div className="info-text">
              <div className="contact-info-list">
                <div className="contact-item">
                  <Navigation className="contact-icon-small" size={24} color="var(--primary-600)" />
                  <div className="contact-item-content">
                    <h3>{t('addressLabel')}</h3>
                    <p>Calle Sagasta 7</p>
                    <p>28004, Madrid</p>
                    <p>(Zona Bilbao - Alonso Martínez)</p>
                  </div>
                </div>

                <div className="contact-item">
                  <Clock className="contact-icon-small" size={24} color="var(--primary-600)" />
                  <div className="contact-item-content">
                    <h3>{t('scheduleLabel')}</h3>
                    <p>{t('mondayToFriday')}: 11:00 - 14:30 y 17:00 - 20:30</p>
                    <p>{t('saturdays')}: 11:00 - 14:30</p>
                    <p>{t('sundays')}: {t('closed')}</p>
                  </div>
                </div>

                <div className="contact-item">
                  <Phone className="contact-icon-small" size={24} color="var(--primary-600)" />
                  <div className="contact-item-content">
                    <h3>{t('contactLabel')}</h3>
                    <p>Tel: +34 91 123 45 67</p>
                    <p>WhatsApp: +34 91 123 45 67</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="map-section">
              <div className="map-container">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3036.887654321!2d-3.700123!3d40.428765!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd422890abcdef12%3A0x987654321fedcba!2sC.%20de%20Sagasta%2C%207%2C%2028004%20Madrid!5e0!3m2!1ses!2ses!4v1620000000001!5m2!1ses!2ses"
                  className="map-frame"
                  title="Ubicación Librería El Galeón"
                  allowFullScreen={true} 
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
