import React, { useState } from 'react';
import { Mail, MessageSquare, Send } from 'lucide-react';
import '../styles/pages/InfoPages.css';

export const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct mailto link
    const subject = encodeURIComponent(`${formData.subject} - Contacto Web`);
    const body = encodeURIComponent(`Nombre: ${formData.name}\nEmail: ${formData.email}\n\nMensaje:\n${formData.message}`);
    
    // Open email client
    window.location.href = `mailto:info@perezgaldos.com?subject=${subject}&body=${body}`;

    // Show success state
    setTimeout(() => {
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="info-page">
      <div className="info-hero">
        <h1>Contacto</h1>
        <p>Estamos aquí para ayudarte. Escríbenos.</p>
      </div>

      <div className="info-container">
        <div className="info-card">
          <div className="contact-grid">
            <div className="info-text">
              <section className="info-section">
                <div className="section-title">
                  <MessageSquare size={32} className="section-icon" />
                  <h2>Envíanos un mensaje</h2>
                </div>
                <p>
                  Si tienes alguna duda sobre un libro, un pedido o simplemente quieres saludarnos, completa el formulario y te responderemos lo antes posible.
                </p>
                
                <div className="contact-info-group">
                   
                   {/* Email */}
                   <div className="contact-method">
                     <h3 className="contact-method-title">Correo Electrónico:</h3>
                     <a href="mailto:info@perezgaldos.com" className="contact-link email-link">
                       <Mail size={20} />
                       info@perezgaldos.com
                     </a>
                   </div>

                   {/* Phone */}
                   <div className="contact-method">
                      <h3 className="contact-method-title">Teléfonos:</h3>
                      <div className="contact-details-list">
                        <a href="tel:+34915312640" className="contact-link">
                          <span className="contact-label">Pérez Galdós:</span> +34 91 531 26 40
                        </a>
                         <a href="tel:+34911234567" className="contact-link">
                          <span className="contact-label">El Galeón:</span> +34 91 123 45 67
                        </a>
                      </div>
                   </div>

                   {/* Addresses */}
                   <div className="contact-method">
                      <h3 className="contact-method-title">Direcciones:</h3>
                      <div className="contact-details-list">
                        <div className="contact-address-item">
                          <span className="contact-label">Librería Pérez Galdós</span>
                          <p className="contact-address">Calle Hortaleza 5, 28004 Madrid</p>
                        </div>
                        <div className="contact-address-item">
                          <span className="contact-label">Librería El Galeón</span>
                          <p className="contact-address">Calle Sagasta 7, 28004 Madrid</p>
                        </div>
                      </div>
                   </div>

                </div>
              </section>
            </div>

            <div className="form-section">
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-tertiary)', borderRadius: '1rem' }}>
                  <Send size={48} color="var(--success-color)" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ marginBottom: '0.5rem' }}>¡Mensaje Enviado!</h3>
                  <p>Gracias por contactarnos. Te responderemos en breve.</p>
                  <button 
                    onClick={() => setSubmitted(false)}
                    className="action-btn primary"
                    style={{ marginTop: '1.5rem', background: 'var(--primary-600)', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="info-form">
                  <div className="form-group">
                    <label htmlFor="name">Nombre Completo</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="subject">Asunto</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      placeholder="Motivo de la consulta"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">Mensaje</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      placeholder="Escribe aquí tu mensaje..."
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="action-btn primary"
                    style={{ 
                      width: '100%', 
                      background: 'var(--primary-600)', 
                      color: 'white', 
                      padding: '0.75rem', 
                      border: 'none', 
                      borderRadius: '0.5rem', 
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Send size={18} />
                    Enviar Mensaje
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
