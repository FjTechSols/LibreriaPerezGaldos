import { BookOpen, Award, Users, Heart } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/pages/InfoPages.css';

export const About = () => {
  const { t } = useLanguage();
  
  return (
    <div className="info-page">
      <div className="info-hero">
        <h1>{t('aboutUsTitle')}</h1>
        <p>{t('aboutUsSubtitle')}</p>
      </div>

      <div className="info-container">
        <div className="info-card">
          <section className="info-section">
            <div className="section-title">
              <BookOpen size={32} className="section-icon" />
              <h2>{t('ourHistory')}</h2>
            </div>
            <div className="info-text">
              <p>{t('ourHistoryP1')}</p>
              <p>{t('ourHistoryP2')}</p>
            </div>
          </section>

          <section className="info-section">
            <div className="section-title">
              <Award size={32} className="section-icon" />
              <h2>{t('ourMission')}</h2>
            </div>
            <div className="info-text">
              <p>{t('ourMissionText')}</p>
            </div>
          </section>

          <section className="info-section">
            <div className="section-title">
              <Heart size={32} className="section-icon" />
              <h2>{t('ourValues')}</h2>
            </div>
            
            <div className="values-grid">
              <div className="value-item">
                <Users size={32} className="value-icon" />
                <h3>{t('valueProximity')}</h3>
                <p>{t('valueProximityText')}</p>
              </div>
              <div className="value-item">
                <BookOpen size={32} className="value-icon" />
                <h3>{t('valueQuality')}</h3>
                <p>{t('valueQualityText')}</p>
              </div>
              <div className="value-item">
                <Award size={32} className="value-icon" />
                <h3>{t('valueCommitment')}</h3>
                <p>{t('valueCommitmentText')}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
