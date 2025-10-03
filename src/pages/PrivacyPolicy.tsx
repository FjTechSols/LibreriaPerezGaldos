import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Database, Mail, AlertCircle } from 'lucide-react';
import '../styles/pages/PolicyPages.css';

export default function PrivacyPolicy() {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <div className="policy-header">
          <Shield size={48} className="policy-icon" />
          <h1>Política de Privacidad</h1>
          <p className="policy-date">Última actualización: 3 de octubre de 2025</p>
        </div>

        <div className="policy-content">
          <section className="policy-section">
            <div className="section-header">
              <Eye size={24} />
              <h2>Información que Recopilamos</h2>
            </div>
            <p>
              En LibrerIA-Clásicos recopilamos información necesaria para proporcionar nuestros servicios de manera efectiva:
            </p>
            <ul>
              <li><strong>Información de cuenta:</strong> nombre, correo electrónico, dirección de envío</li>
              <li><strong>Información de pedidos:</strong> historial de compras, preferencias de libros</li>
              <li><strong>Información técnica:</strong> dirección IP, tipo de navegador, datos de navegación</li>
              <li><strong>Información de pago:</strong> procesada de forma segura por proveedores externos certificados</li>
            </ul>
          </section>

          <section className="policy-section">
            <div className="section-header">
              <Database size={24} />
              <h2>Cómo Usamos tu Información</h2>
            </div>
            <p>Utilizamos la información recopilada para:</p>
            <ul>
              <li>Procesar y gestionar tus pedidos de libros</li>
              <li>Personalizar tu experiencia de compra y recomendaciones</li>
              <li>Comunicarnos contigo sobre pedidos, ofertas y novedades</li>
              <li>Mejorar nuestros servicios y catálogo de libros</li>
              <li>Prevenir fraudes y garantizar la seguridad de la plataforma</li>
              <li>Cumplir con obligaciones legales y regulatorias</li>
            </ul>
          </section>

          <section className="policy-section">
            <div className="section-header">
              <Lock size={24} />
              <h2>Protección de Datos</h2>
            </div>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para proteger tu información personal:
            </p>
            <ul>
              <li>Encriptación SSL/TLS para todas las transmisiones de datos</li>
              <li>Almacenamiento seguro en servidores con acceso restringido</li>
              <li>Auditorías de seguridad periódicas</li>
              <li>Políticas estrictas de acceso a datos por parte del personal</li>
              <li>Copias de seguridad regulares y protocolos de recuperación</li>
            </ul>
          </section>

          <section className="policy-section">
            <div className="section-header">
              <AlertCircle size={24} />
              <h2>Compartir Información</h2>
            </div>
            <p>No vendemos tu información personal. Solo la compartimos cuando es necesario:</p>
            <ul>
              <li><strong>Proveedores de servicios:</strong> empresas de envío, procesadores de pago</li>
              <li><strong>Requisitos legales:</strong> cuando la ley lo requiera o para proteger nuestros derechos</li>
              <li><strong>Transferencias empresariales:</strong> en caso de fusión, adquisición o venta de activos</li>
            </ul>
          </section>

          <section className="policy-section">
            <div className="section-header">
              <Mail size={24} />
              <h2>Tus Derechos</h2>
            </div>
            <p>Bajo el RGPD y otras leyes de protección de datos, tienes derecho a:</p>
            <ul>
              <li><strong>Acceso:</strong> solicitar una copia de tus datos personales</li>
              <li><strong>Rectificación:</strong> corregir información inexacta o incompleta</li>
              <li><strong>Eliminación:</strong> solicitar la eliminación de tus datos personales</li>
              <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado</li>
              <li><strong>Oposición:</strong> oponerte al procesamiento de tus datos</li>
              <li><strong>Limitación:</strong> restringir el procesamiento en ciertas circunstancias</li>
            </ul>
            <p className="contact-info">
              Para ejercer cualquiera de estos derechos, contáctanos en: <a href="mailto:privacidad@libreria-clasicos.com">privacidad@libreria-clasicos.com</a>
            </p>
          </section>

          <section className="policy-section">
            <h2>Cookies y Tecnologías Similares</h2>
            <p>
              Utilizamos cookies y tecnologías similares para mejorar tu experiencia.
              Para más información, consulta nuestra <Link to="/cookies">Política de Cookies</Link>.
            </p>
          </section>

          <section className="policy-section">
            <h2>Cambios en esta Política</h2>
            <p>
              Podemos actualizar esta política de privacidad periódicamente. Te notificaremos sobre cambios
              significativos por correo electrónico o mediante un aviso en nuestra web. Te recomendamos
              revisar esta página regularmente.
            </p>
          </section>

          <section className="policy-section">
            <h2>Contacto</h2>
            <p>
              Si tienes preguntas sobre esta Política de Privacidad, contáctanos:
            </p>
            <ul className="contact-list">
              <li>Email: <a href="mailto:privacidad@libreria-clasicos.com">privacidad@libreria-clasicos.com</a></li>
              <li>Teléfono: +34 912 345 678</li>
              <li>Dirección: Calle de los Libros 123, 28001 Madrid, España</li>
            </ul>
          </section>
        </div>

        <div className="policy-footer">
          <Link to="/" className="back-link">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
