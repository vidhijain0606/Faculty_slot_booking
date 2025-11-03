import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // 🚫 Not logged in → go to /auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 🎯 Role mismatch → redirect to correct dashboard
  if (userRole === 'faculty' && location.pathname.startsWith('/scholar')) {
    return <Navigate to="/faculty" replace />;
  }

  if (userRole === 'scholar' && location.pathname.startsWith('/faculty')) {
    return <Navigate to="/scholar" replace />;
  }

  // 🚷 If allowedRoles is defined, enforce it strictly
  if (allowedRoles && !allowedRoles.includes(userRole || '')) {
    return <Navigate to="/" replace />;
  }

  // ✅ Access granted
  return <>{children}</>;
};
