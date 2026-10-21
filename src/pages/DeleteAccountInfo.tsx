import { Link } from 'react-router-dom';
import { Trash2, Smartphone, Monitor, ShieldCheck, Archive } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/PolicyPages.css';

// Página pública con las instrucciones para eliminar la cuenta (exigida por Google Play para la app).
export default function DeleteAccountInfo() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="policy-page">
      <div className="policy-container">
        <div className="policy-header">
          <Trash2 size={48} className="policy-icon" />
          <h1>Eliminar tu cuenta</h1>
          <p className="policy-date">Librería Pérez Galdós · web y aplicación móvil</p>
        </div>

        <div className="policy-content">
          <section className="policy-section">
            <p>
              Puedes eliminar tu cuenta de Librería Pérez Galdós cuando quieras. El borrado es inmediato y sirve
              para la web y para la aplicación, porque es la misma cuenta.
            </p>
          </section>

          <section className="policy-section">
            <div className="section-header">
              <Monitor size={24} />
              <h2>Desde la web</h2>
            </div>
            <ol>
              <li>Inicia sesión y entra en <strong>Ajustes → Seguridad</strong>.</li>
              <li>Pulsa <strong>Eliminar cuenta</strong>.</li>
              <li>Escribe tu contraseña y la palabra <strong>ELIMINAR</strong> para confirmar.</li>
            </ol>
            <p>
              {isAuthenticated
                ? <Link to="/ajustes?tab=security">Ir a Ajustes → Seguridad</Link>
                : <Link to="/login" state={{ from: '/ajustes?tab=security' }}>Iniciar sesión para eliminar mi cuenta</Link>}
            </p>
          </section>

          <section className="policy-section">
            <div className="section-header">
              <Smartphone size={24} />
              <h2>Desde la aplicación</h2>
            </div>
            <ol>
              <li>Abre la aplicación e inicia sesión.</li>
              <li>Entra en <strong>Mi cuenta</strong> y pulsa <strong>Eliminar mi cuenta</strong>, al final de la pantalla.</li>
              <li>Escribe tu contraseña y la palabra <strong>ELIMINAR</strong> para confirmar.</li>
            </ol>
          </section>

          <section className="policy-section">
            <div className="section-header">
              <ShieldCheck size={24} />
              <h2>Qué se elimina</h2>
            </div>
            <ul>
              <li>Tu cuenta de acceso (email y contraseña).</li>
              <li>Tus datos personales: nombre, teléfono, dirección y fecha de nacimiento.</li>
              <li>Tu carrito, tus favoritos, tus avisos y tus reseñas.</li>
              <li>Tus reservas activas y los pedidos que aún no has pagado se cancelan.</li>
            </ul>
          </section>

          <section className="policy-section">
            <div className="section-header">
              <Archive size={24} />
              <h2>Qué se conserva y por qué</h2>
            </div>
            <p>
              Los pedidos realizados y sus facturas se conservan, sin tus datos de perfil, durante el plazo que exige
              la normativa mercantil y fiscal. Las facturas mantienen los datos fiscales con los que se emitieron.
              Pasado ese plazo se eliminan.
            </p>
            <p>
              Si tienes un pedido pagado que todavía no has recibido, podrás eliminar tu cuenta cuando te llegue.
            </p>
          </section>

          <section className="policy-section">
            <p>
              ¿No puedes acceder a tu cuenta? Recupera la contraseña desde <Link to="/recuperar">esta página</Link> y
              después elimínala, o escríbenos desde la página de <Link to="/contacto">contacto</Link> indicando el email de la cuenta.
              Más información en nuestra <Link to="/privacy">política de privacidad</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
