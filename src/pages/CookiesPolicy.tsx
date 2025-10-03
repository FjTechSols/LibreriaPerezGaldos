import { Link } from 'react-router-dom';
import { Cookie, Settings, BarChart, Shield, CheckCircle } from 'lucide-react';
import '../styles/pages/PolicyPages.css';

export default function CookiesPolicy() {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <div className="policy-header">
          <Cookie size={48} className="policy-icon" />
          <h1>Política de Cookies</h1>
          <p className="policy-date">Última actualización: 3 de octubre de 2025</p>
        </div>

        <div className="policy-content">
          <section className="policy-section">
            <div className="section-header">
              <Cookie size={24} />
              <h2>¿Qué son las Cookies?</h2>
            </div>
            <p>
              Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo
              cuando los visitas. Se utilizan ampliamente para hacer que los sitios web funcionen de manera
              más eficiente, así como para proporcionar información a los propietarios del sitio.
            </p>
          </section>

          <section className="policy-section">
            <div className="section-header">
              <Settings size={24} />
              <h2>Tipos de Cookies que Utilizamos</h2>
            </div>

            <div className="cookie-type">
              <h3><CheckCircle size={20} /> Cookies Esenciales</h3>
              <p>
                <strong>Propósito:</strong> Necesarias para el funcionamiento básico del sitio web.
              </p>
              <p>
                <strong>Ejemplos:</strong> Autenticación de usuarios, carrito de compra, preferencias de idioma.
              </p>
              <p>
                <strong>Duración:</strong> Sesión o hasta 1 año.
              </p>
              <p className="cookie-note">
                Estas cookies no pueden desactivarse ya que son necesarias para que el sitio funcione.
              </p>
            </div>

            <div className="cookie-type">
              <h3><BarChart size={20} /> Cookies Analíticas</h3>
              <p>
                <strong>Propósito:</strong> Nos ayudan a entender cómo los visitantes interactúan con el sitio web.
              </p>
              <p>
                <strong>Ejemplos:</strong> Google Analytics, estadísticas de páginas visitadas, tiempo de permanencia.
              </p>
              <p>
                <strong>Duración:</strong> Hasta 2 años.
              </p>
              <p className="cookie-note">
                Puedes desactivar estas cookies en tu configuración de navegador sin afectar la funcionalidad del sitio.
              </p>
            </div>

            <div className="cookie-type">
              <h3><Settings size={20} /> Cookies de Funcionalidad</h3>
              <p>
                <strong>Propósito:</strong> Permiten recordar tus preferencias y personalizar tu experiencia.
              </p>
              <p>
                <strong>Ejemplos:</strong> Preferencias de visualización, libros favoritos, filtros guardados.
              </p>
              <p>
                <strong>Duración:</strong> Hasta 1 año.
              </p>
            </div>

            <div className="cookie-type">
              <h3><Shield size={20} /> Cookies de Marketing</h3>
              <p>
                <strong>Propósito:</strong> Se utilizan para mostrar anuncios relevantes y medir la efectividad de campañas.
              </p>
              <p>
                <strong>Ejemplos:</strong> Retargeting, publicidad personalizada.
              </p>
              <p>
                <strong>Duración:</strong> Hasta 90 días.
              </p>
              <p className="cookie-note">
                Requieren tu consentimiento explícito y pueden desactivarse.
              </p>
            </div>
          </section>

          <section className="policy-section">
            <h2>Cookies Específicas que Usamos</h2>
            <div className="cookie-table">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Propósito</th>
                    <th>Duración</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>sb-access-token</code></td>
                    <td>Esencial</td>
                    <td>Autenticación de usuario</td>
                    <td>1 hora</td>
                  </tr>
                  <tr>
                    <td><code>sb-refresh-token</code></td>
                    <td>Esencial</td>
                    <td>Renovación de sesión</td>
                    <td>7 días</td>
                  </tr>
                  <tr>
                    <td><code>cart_items</code></td>
                    <td>Esencial</td>
                    <td>Almacenar carrito de compras</td>
                    <td>30 días</td>
                  </tr>
                  <tr>
                    <td><code>wishlist_items</code></td>
                    <td>Funcional</td>
                    <td>Lista de deseos</td>
                    <td>90 días</td>
                  </tr>
                  <tr>
                    <td><code>_ga</code></td>
                    <td>Analítica</td>
                    <td>Google Analytics - ID único</td>
                    <td>2 años</td>
                  </tr>
                  <tr>
                    <td><code>_gid</code></td>
                    <td>Analítica</td>
                    <td>Google Analytics - ID de sesión</td>
                    <td>24 horas</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="policy-section">
            <h2>Cómo Gestionar las Cookies</h2>
            <p>
              Tienes varias opciones para gestionar las cookies:
            </p>

            <div className="management-option">
              <h3>A través de tu Navegador</h3>
              <p>La mayoría de los navegadores permiten:</p>
              <ul>
                <li>Ver qué cookies tienes y eliminarlas individualmente</li>
                <li>Bloquear cookies de terceros</li>
                <li>Bloquear cookies de sitios específicos</li>
                <li>Bloquear todas las cookies (puede afectar la funcionalidad)</li>
                <li>Eliminar todas las cookies al cerrar el navegador</li>
              </ul>
            </div>

            <div className="browser-links">
              <h4>Instrucciones por navegador:</h4>
              <ul>
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
                <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
                <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
                <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
              </ul>
            </div>

            <div className="management-option">
              <h3>Herramientas de Exclusión</h3>
              <p>Puedes optar por no recibir cookies analíticas visitando:</p>
              <ul>
                <li><a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out</a></li>
                <li><a href="http://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer">Your Online Choices</a></li>
              </ul>
            </div>
          </section>

          <section className="policy-section">
            <h2>Cookies de Terceros</h2>
            <p>
              Algunos servicios externos que utilizamos pueden establecer sus propias cookies:
            </p>
            <ul>
              <li><strong>Google Analytics:</strong> Para análisis de tráfico web</li>
              <li><strong>Procesadores de pago:</strong> Para transacciones seguras</li>
              <li><strong>Redes sociales:</strong> Si compartes contenido en redes sociales</li>
            </ul>
            <p>
              Estas cookies están sujetas a las políticas de privacidad de esos terceros.
            </p>
          </section>

          <section className="policy-section">
            <h2>Actualizaciones de esta Política</h2>
            <p>
              Podemos actualizar esta Política de Cookies ocasionalmente. Te recomendamos revisarla
              periódicamente. La fecha de última actualización se indica al principio de esta página.
            </p>
          </section>

          <section className="policy-section">
            <h2>Más Información</h2>
            <p>
              Para más detalles sobre cómo manejamos tu información personal, consulta nuestra{' '}
              <Link to="/privacy">Política de Privacidad</Link>.
            </p>
            <p>Si tienes preguntas sobre nuestra política de cookies:</p>
            <ul className="contact-list">
              <li>Email: <a href="mailto:libreria@perezgaldos.com">libreria@perezgaldos.com</a></li>
              <li>Teléfono: +34 91 531 26 40</li>
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
