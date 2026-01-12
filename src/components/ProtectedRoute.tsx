import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AccessDenied } from './AccessDenied';

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
    return <AccessDenied message="No tienes permisos suficientes para acceder a esta sección." />;
  }

  if (requireAdmin && !isAdmin) {
     const message = requireRole === 'usuario' 
        ? "Tu cuenta no tiene el rol necesario." // More specific but friendly for admin/user mismatch
        : "No tienes permisos de administrador.";
    return <AccessDenied message={message} />;
  }

  if (requireRole && !hasRole(requireRole)) {
    // Generic message prevents "Se requiere rol: usuario" which looks like an error
    return <AccessDenied message="No tienes los permisos necesarios para realizar esta acción." />;
  }

  if (requirePermission && !hasPermission(requirePermission)) {
    return <AccessDenied message="No tienes permiso para acceder a esta sección." />;
  }

  if (requireAnyPermission && !requireAnyPermission.some(p => hasPermission(p))) {
    return <AccessDenied message="No tienes los permisos necesarios." />;
  }

  if (requireAllPermissions && !requireAllPermissions.every(p => hasPermission(p))) {
    return <AccessDenied message="No tienes todos los permisos requeridos." />;
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
