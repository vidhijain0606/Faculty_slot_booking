import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();

  // 1️⃣ Still checking auth/session
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // 2️⃣ Not logged in → go to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 3️⃣ Logged in but role not yet resolved
  if (!userRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // 4️⃣ Role restriction (this is the ONLY role check)
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return (
      <Navigate
        to={userRole === 'admin' ? '/admin' : '/dashboard'}
        replace
      />
    );
  }

  // 5️⃣ All good → render page
  return <>{children}</>;
};
