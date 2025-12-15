import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requirePermission?: string;
  requireRole?: string;
  requireAnyPermission?: string[];
  requireAllPermissions?: string[];
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requirePermission,
  requireRole,
  requireAnyPermission,
  requireAllPermissions,
  requireAdmin,
  requireSuperAdmin
}: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission, hasRole, isAdmin, isSuperAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <AccessDenied message="Se requieren permisos de Super Administrador" />;
  }

  if (requireAdmin && !isAdmin) {
    return <AccessDenied message="Se requieren permisos de Administrador" />;
  }

  if (requireRole && !hasRole(requireRole)) {
    return <AccessDenied message={`Se requiere el rol: ${requireRole}`} />;
  }

  if (requirePermission && !hasPermission(requirePermission)) {
    return <AccessDenied message="No tienes permiso para acceder a esta sección" />;
  }

  if (requireAnyPermission && !requireAnyPermission.some(p => hasPermission(p))) {
    return <AccessDenied message="No tienes los permisos necesarios" />;
  }

  if (requireAllPermissions && !requireAllPermissions.every(p => hasPermission(p))) {
    return <AccessDenied message="No tienes todos los permisos requeridos" />;
  }

  return <>{children}</>;
}

interface PermissionGateProps {
  children: ReactNode;
  requirePermission?: string;
  requireRole?: string;
  requireAdmin?: boolean;
  fallback?: ReactNode;
}

export function PermissionGate({
  children,
  requirePermission,
  requireRole,
  requireAdmin,
  fallback
}: PermissionGateProps) {
  const { hasPermission, hasRole, isAdmin } = useAuth();

  if (requireAdmin && !isAdmin) {
    return <>{fallback || null}</>;
  }

  if (requireRole && !hasRole(requireRole)) {
    return <>{fallback || null}</>;
  }

  if (requirePermission && !hasPermission(requirePermission)) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}

function AccessDenied({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        background: '#fef2f2',
        border: '2px solid #fecaca',
        borderRadius: '12px',
        padding: '3rem',
        maxWidth: '500px'
      }}>
        <Lock size={64} color="#dc2626" style={{ marginBottom: '1.5rem' }} />
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#991b1b',
          marginBottom: '1rem'
        }}>
          Acceso Denegado
        </h2>
        <p style={{
          fontSize: '1rem',
          color: '#7f1d1d',
          marginBottom: '2rem'
        }}>
          {message}
        </p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '1rem'
            }}
          >
            Volver Atrás
          </button>
          <a
            href="/"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'white',
              color: '#dc2626',
              border: '1px solid #dc2626',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '1rem',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            Ir al Inicio
          </a>
        </div>
      </div>
    </div>
  );
}
