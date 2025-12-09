import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    switch (userRole) {
      case 'scholar':
        return '/scholar';
      case 'admin':
        return '/admin';
      default:
        return '/';
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <button 
          onClick={() => navigate(getDashboardPath())}
          className="flex items-center gap-2 font-semibold text-xl text-foreground hover:text-primary transition-colors"
        >
          <Calendar className="h-6 w-6" />
          <span>Scholar Booking System</span>
        </button>
        
        <div className="flex items-center gap-4">
          {user && (
            <>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium">{user.email}</span>
                <span className="text-xs text-muted-foreground capitalize">{userRole}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
