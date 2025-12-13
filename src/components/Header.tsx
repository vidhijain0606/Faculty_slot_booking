import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar, Upload, Link as LinkIcon, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const Header = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (user?.id) {
      fetchUserName();
    }
  }, [user]);

  const fetchUserName = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.name) {
        setUserName(data.name);
      } else if (user.email) {
        setUserName(user.email.split('@')[0]);
      }
    } catch (err) {
      console.error('Error fetching user name:', err);
      if (user.email) {
        setUserName(user.email.split('@')[0]);
      }
    }
  };

  const getDashboardPath = () => {
    switch (userRole) {
      case 'admin':
        return '/admin';
      case 'faculty':
        return '/dashboard';
      default:
        return '/';
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const VIT_LOGO = '/vit_logo.png';

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-gradient-to-r from-primary/95 via-primary/90 to-primary/95 backdrop-blur-md shadow-lg">
      {/* Welcome Message */}
      {user && userRole === 'faculty' && (
        <div className="bg-gradient-to-r from-primary/20 via-primary/15 to-primary/20 border-b border-primary/20 py-2.5">
          <div className="container px-4">
            <p className="text-sm text-center font-medium text-primary-foreground/90">
              Welcome! You have logged in to <span className="font-bold text-primary-foreground">VIT SCOPES Research Portal</span>
              {userName && <span className="font-bold text-primary-foreground"> Professor {userName}</span>}
            </p>
          </div>
        </div>
      )}

      {/* Four Column Navbar */}
      <div className="container px-4">
        <div className="flex h-20 items-center justify-between">
          <button 
            onClick={() => navigate(getDashboardPath())}
            className="flex items-center gap-3 font-bold text-xl text-primary-foreground hover:opacity-90 transition-all group"
          >
            <div className="relative">
              <img 
                src={VIT_LOGO} 
                alt="VIT Logo" 
                className="h-12 w-12 object-contain drop-shadow-lg group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="flex flex-col items-start">
              <span className="leading-tight">VIT Scope</span>
              <span className="text-sm font-semibold opacity-90">Research Portal</span>
            </div>
          </button>
          
          {user && userRole === 'faculty' && (
            <nav className="flex items-center gap-2">
              <Button
                variant={isActive('/dashboard') ? 'default' : 'secondary'}
                size="sm"
                onClick={() => navigate('/dashboard')}
                className={`gap-2 font-medium transition-all ${
                  isActive('/dashboard') 
                    ? 'bg-primary-foreground text-primary shadow-md hover:shadow-lg' 
                    : 'bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Book Slot</span>
              </Button>
              <Button
                variant={isActive('/upload-document') ? 'default' : 'secondary'}
                size="sm"
                onClick={() => navigate('/upload-document')}
                className={`gap-2 font-medium transition-all ${
                  isActive('/upload-document') 
                    ? 'bg-primary-foreground text-primary shadow-md hover:shadow-lg' 
                    : 'bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20'
                }`}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload Document</span>
              </Button>
              <Button
                variant={isActive('/link-document-1') ? 'default' : 'secondary'}
                size="sm"
                onClick={() => navigate('/link-document-1')}
                className={`gap-2 font-medium transition-all ${
                  isActive('/link-document-1') 
                    ? 'bg-primary-foreground text-primary shadow-md hover:shadow-lg' 
                    : 'bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20'
                }`}
              >
                <LinkIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Link Doc 1</span>
              </Button>
              <Button
                variant={isActive('/link-document-2') ? 'default' : 'secondary'}
                size="sm"
                onClick={() => navigate('/link-document-2')}
                className={`gap-2 font-medium transition-all ${
                  isActive('/link-document-2') 
                    ? 'bg-primary-foreground text-primary shadow-md hover:shadow-lg' 
                    : 'bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20'
                }`}
              >
                <LinkIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Link Doc 2</span>
              </Button>
            </nav>
          )}
          
          <div className="flex items-center gap-4">
            {user && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="gap-2 border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/10 font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
