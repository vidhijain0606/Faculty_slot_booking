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

  // 1. If not logged in, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 2. If user is logged in but role is still fetching, show loading state
  if (!userRole) {
    // This state should be brief due to the fixes in AuthProvider
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  // 3. Centralized Role Redirects (Guiding users to their primary dashboard if they stray)

  // Admin trying to access Faculty/Scholar dashboard
  if (userRole === 'admin' && (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/welcome'))) {
    return <Navigate to="/admin" replace />;
  }

  // Faculty/Scholar trying to access Admin dashboard
  if (userRole !== 'admin' && location.pathname.startsWith('/admin')) {
    // Redirect faculty/scholar to their own dashboard
    return <Navigate to="/dashboard" replace />;
  }
  
  // 4. Role Restriction Check (for specific pages)
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // If the user is on a page they are not allowed to see, send them to their primary dashboard
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    // Default redirect for faculty/scholar
    return <Navigate to="/dashboard" replace />;
  }

  // If all checks pass, render the protected content
  return <>{children}</>;
};