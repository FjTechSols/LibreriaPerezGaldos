import { Link } from 'react-router-dom';
import { FileText, ShoppingCart, CreditCard, Package, AlertTriangle, Scale } from 'lucide-react';
import '../styles/pages/PolicyPages.css';

export default function TermsOfService() {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <div className="policy-header">
          <FileText size={48} className="policy-icon" />
          <h1>Términos de Servicio</h1>
          <p className="policy-date">Última actualización: 3 de octubre de 2025</p>
        </div>

        <div className="policy-content">
          <section className="policy-section">
            <div className="section-header">
              <Scale size={24} />
              <h2>Aceptación de los Términos</h2>
            </div>
            <p>
              Al acceder y utilizar LibrerIA-Clásicos, aceptas estar sujeto a estos Términos de Servicio
              y todas las leyes y regulaciones aplicables. Si no estás de acuerdo con alguno de estos
              términos, no debes usar nuestro servicio.
            </p>
          </section>

          <section className="policy-section">
            <div className="section-header">
              <ShoppingCart size={24} />
              <h2>Uso del Servicio</h2>
            </div>
            <p>LibrerIA-Clásicos es una plataforma de comercio electrónico para la venta de libros. Al utilizar nuestros servicios:</p>
            <ul>
              <li>Debes tener al menos 18 años o contar con el consentimiento de un tutor legal</li>
              <li>Debes proporcionar información precisa y actualizada en tu registro</li>
              <li>Eres responsable de mantener la confidencialidad de tu cuenta</li>
              <li>No debes usar el servicio para actividades ilegales o no autorizadas</li>
              <li>No debes intentar acceder sin autorización a sistemas o datos</li>
            </ul>
          </section>

          <section className="policy-section">
            <div className="section-header">
              <CreditCard size={24} />
              <h2>Precios y Pagos</h2>
            </div>
            <ul>
              <li>Todos los precios están expresados en euros (€) e incluyen IVA cuando corresponda</li>
              <li>Los precios pueden cambiar sin previo aviso, pero respetamos el precio al momento de tu pedido</li>
              <li>Aceptamos tarjetas de crédito/débito y otros métodos de pago especificados en la web</li>
              <li>El pago se procesa en el momento de realizar el pedido</li>
              <li>Nos reservamos el derecho de rechazar o cancelar pedidos en casos de fraude sospechoso</li>
            </ul>
          </section>

          <section className="policy-section">
            <div className="section-header">
              <Package size={24} />
              <h2>Envíos y Entregas</h2>
            </div>
            <ul>
              <li>Los plazos de entrega son estimados y pueden variar según la ubicación</li>
              <li>Los gastos de envío se calculan según el destino y peso del pedido</li>
              <li>No somos responsables de retrasos causados por empresas de transporte</li>
              <li>Debes inspeccionar el paquete al recibirlo y reportar daños inmediatamente</li>
              <li>Envíos gratuitos en pedidos superiores a 50€ dentro de España peninsular</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>Devoluciones y Reembolsos</h2>
            <p>Conforme a la legislación europea de protección al consumidor:</p>
            <ul>
              <li>Tienes 14 días desde la recepción para devolver un producto sin justificación</li>
              <li>Los libros deben estar en su estado original, sin daños ni marcas</li>
              <li>Los gastos de devolución corren por cuenta del cliente, salvo error nuestro</li>
              <li>El reembolso se procesa dentro de 14 días tras recibir la devolución</li>
              <li>Libros digitales o personalizados no son reembolsables una vez descargados</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>Propiedad Intelectual</h2>
            <p>
              Todo el contenido de LibrerIA-Clásicos, incluyendo textos, gráficos, logos, imágenes y software,
              es propiedad de LibrerIA-Clásicos o sus proveedores de contenido y está protegido por leyes
              de propiedad intelectual.
            </p>
            <ul>
              <li>No puedes reproducir, distribuir o modificar contenido sin autorización</li>
              <li>Las descripciones de productos son solo para uso informativo</li>
              <li>Los nombres de productos y marcas pertenecen a sus respectivos propietarios</li>
            </ul>
          </section>

          <section className="policy-section">
            <div className="section-header">
              <AlertTriangle size={24} />
              <h2>Limitación de Responsabilidad</h2>
            </div>
            <p>
              LibrerIA-Clásicos no será responsable de:
            </p>
            <ul>
              <li>Daños indirectos, incidentales o consecuentes derivados del uso del servicio</li>
              <li>Interrupciones o errores en el servicio</li>
              <li>Pérdida de datos o información</li>
              <li>Contenido de terceros enlazado desde nuestro sitio</li>
            </ul>
            <p>
              Nuestra responsabilidad máxima se limita al importe pagado por el producto en cuestión.
            </p>
          </section>

          <section className="policy-section">
            <h2>Disponibilidad de Stock</h2>
            <p>
              Hacemos nuestro mejor esfuerzo para mantener actualizado el inventario, pero no garantizamos
              la disponibilidad de productos. Si un libro no está disponible después de realizar tu pedido,
              te contactaremos para ofrecerte alternativas o un reembolso completo.
            </p>
          </section>

          <section className="policy-section">
            <h2>Modificaciones del Servicio</h2>
            <p>
              Nos reservamos el derecho de:
            </p>
            <ul>
              <li>Modificar o descontinuar el servicio sin previo aviso</li>
              <li>Actualizar estos términos periódicamente</li>
              <li>Suspender o terminar cuentas que violen estos términos</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>Ley Aplicable y Jurisdicción</h2>
            <p>
              Estos términos se rigen por las leyes españolas y de la Unión Europea. Cualquier disputa
              se resolverá en los tribunales de Madrid, España, sin perjuicio de tus derechos como
              consumidor según la legislación aplicable.
            </p>
          </section>

          <section className="policy-section">
            <h2>Contacto</h2>
            <p>
              Para preguntas sobre estos Términos de Servicio:
            </p>
            <ul className="contact-list">
              <li>Email: <a href="mailto:legal@libreria-clasicos.com">legal@libreria-clasicos.com</a></li>
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
