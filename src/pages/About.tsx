import React from 'react';
import { BookOpen, Award, Users, Heart } from 'lucide-react';
import '../styles/pages/InfoPages.css';

export const About = () => {
  return (
    <div className="info-page">
      <div className="info-hero">
        <h1>Sobre Nosotros</h1>
        <p>Más de 100 años difundiendo cultura y pasión por la lectura</p>
      </div>

      <div className="info-container">
        <div className="info-card">
          <section className="info-section">
            <div className="section-title">
              <BookOpen size={32} className="section-icon" />
              <h2>Nuestra Historia</h2>
            </div>
            <div className="info-text">
              <p>
                Fundada en 1920 en el corazón de Madrid, la Librería Pérez Galdós comenzó como un pequeño rincón para los amantes de la literatura clásica. Nombrada en honor al ilustre escritor canario que tan bien retrató nuestra ciudad, nos hemos mantenido fieles a su espíritu de observación y amor por las letras.
              </p>
              <p>
                A lo largo de las décadas, hemos sido testigos de la historia de nuestra ciudad, sirviendo de refugio para escritores, estudiantes y lectores curiosos. Lo que empezó con unas pocas estanterías es hoy un referente cultural que combina la tradición del librero de oficio con las nuevas tecnologías.
              </p>
            </div>
          </section>

          <section className="info-section">
            <div className="section-title">
              <Award size={32} className="section-icon" />
              <h2>Nuestra Misión</h2>
            </div>
            <div className="info-text">
              <p>
                Creemos que un libro no es solo papel y tinta, sino una puerta a otros mundos. Nuestra misión es conectar a cada lector con su próxima gran historia, ofreciendo un catálogo curado con mimo que abarca desde las últimas novedades hasta joyas descatalogadas.
              </p>
            </div>
          </section>

          <section className="info-section">
            <div className="section-title">
              <Heart size={32} className="section-icon" />
              <h2>Nuestros Valores</h2>
            </div>
            
            <div className="values-grid">
              <div className="value-item">
                <Users size={32} className="value-icon" />
                <h3>Cercanía</h3>
                <p>Trato personalizado y asesoramiento experto para cada lector.</p>
              </div>
              <div className="value-item">
                <BookOpen size={32} className="value-icon" />
                <h3>Calidad</h3>
                <p>Selección rigurosa de títulos y ediciones cuidadas.</p>
              </div>
              <div className="value-item">
                <Award size={32} className="value-icon" />
                <h3>Compromiso</h3>
                <p>Fomento de la lectura y apoyo a autores locales.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
