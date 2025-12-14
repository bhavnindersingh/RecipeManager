import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

/**
 * Route wrapper that checks user role before allowing access
 * @param {string|string[]} allowedRoles - Role or array of roles allowed to access
 * @param {ReactNode} children - Component to render if authorized
 * @param {string} redirectTo - Optional redirect path for unauthorized users
 */
const RoleBasedRoute = ({ allowedRoles, children, redirectTo }) => {
  const user = authService.getCurrentUser();

  // Not authenticated - redirect to PIN login
  if (!user) {
    return <Navigate to="/pin-login" replace />;
  }

  // Convert to array if single role
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  // Check if user has one of the allowed roles
  if (!rolesArray.includes(user.role)) {
    // Unauthorized - redirect based on user's role
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    // Default redirects based on role
    switch (user.role) {
      case 'admin':
        return <Navigate to="/manager" replace />;
      case 'server':
        return <Navigate to="/pos" replace />;
      case 'kitchen':
        return <Navigate to="/kds" replace />;
      default:
        return <Navigate to="/pin-login" replace />;
    }
  }

  // Authorized - render children
  return children;
};

export default RoleBasedRoute;
