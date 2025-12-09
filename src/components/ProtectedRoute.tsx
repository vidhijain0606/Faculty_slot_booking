import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth'; // ✅ Correct path (using alias)

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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!userRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading your role...</p>
      </div>
    );
  }

  // Role-based redirects
  if (userRole === 'admin' && location.pathname.startsWith('/scholar')) {
    return <Navigate to="/admin" replace />;
  }

  if (userRole === 'scholar' && location.pathname.startsWith('/admin')) {
    return <Navigate to="/scholar" replace />;
  }

  // Restrict specific roles
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
