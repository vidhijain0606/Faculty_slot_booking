import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar, Link as LinkIcon, FileText } from 'lucide-react';
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
    <header className="sticky top-0 z-50 border-b border-border/50 bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#1e3a8a] backdrop-blur-md shadow-lg">
      {/* Welcome Message for Faculty */}
      {user && userRole === 'faculty' && (
        <div className="bg-gradient-to-r from-[#1e3a8a]/30 via-[#1e40af]/20 to-[#1e3a8a]/30 border-b border-white/10 py-2.5">
          <div className="container px-4">
            <p className="text-sm text-center font-medium text-white/95">
              Welcome! You have logged in to <span className="font-bold text-white">VIT SCOPES Research Portal</span>
              {userName && <span className="font-bold text-white"> Professor {userName}</span>}
            </p>
          </div>
        </div>
      )}

      {/* Welcome Message for Admin */}
      {user && userRole === 'admin' && (
        <div className="bg-gradient-to-r from-[#1e3a8a]/30 via-[#1e40af]/20 to-[#1e3a8a]/30 border-b border-white/10 py-2.5">
          <div className="container px-4">
            <p className="text-sm text-center font-medium text-white/95">
              Welcome! You have logged in to <span className="font-bold text-white">VIT SCOPES Research Portal</span>
              {userName && <span className="font-bold text-white"> Admin {userName}</span>}
            </p>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <div className="container px-4">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <button 
            onClick={() => navigate(getDashboardPath())}
            className="flex items-center gap-3 font-bold text-xl text-white hover:opacity-90 transition-all group"
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
          
          {/* FACULTY Navigation */}
          {user && userRole === 'faculty' && (
            <nav className="flex items-center gap-2">
              <Button
                variant={isActive('/dashboard') ? 'default' : 'secondary'}
                size="sm"
                onClick={() => navigate('/dashboard')}
                className={`gap-2 font-medium transition-all ${
                  isActive('/dashboard') 
                    ? 'bg-white text-[#1e3a8a] shadow-md hover:shadow-lg hover:bg-white/90' 
                    : 'bg-white/10 text-white hover:bg-white/20 border-white/20'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Book Slot</span>
              </Button>

              <Button
                variant={isActive('/view-documents') ? 'default' : 'secondary'}
                size="sm"
                onClick={() => navigate('/view-documents')}
                className={`gap-2 font-medium transition-all ${
                  isActive('/view-documents') 
                    ? 'bg-white text-[#1e3a8a] shadow-md hover:shadow-lg hover:bg-white/90' 
                    : 'bg-white/10 text-white hover:bg-white/20 border-white/20'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documents</span>
              </Button>

              <Button
                variant={isActive('/link-document-1') ? 'default' : 'secondary'}
                size="sm"
                onClick={() => navigate('/link-document-1')}
                className={`gap-2 font-medium transition-all ${
                  isActive('/link-document-1') 
                    ? 'bg-white text-[#1e3a8a] shadow-md hover:shadow-lg hover:bg-white/90' 
                    : 'bg-white/10 text-white hover:bg-white/20 border-white/20'
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
                    ? 'bg-white text-[#1e3a8a] shadow-md hover:shadow-lg hover:bg-white/90' 
                    : 'bg-white/10 text-white hover:bg-white/20 border-white/20'
                }`}
              >
                <LinkIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Link Doc 2</span>
              </Button>
            </nav>
          )}

          {/* ADMIN Navigation */}
          {user && userRole === 'admin' && (
            <nav className="flex items-center gap-2">
              <Button
                variant={isActive('/admin') ? 'default' : 'secondary'}
                size="sm"
                onClick={() => navigate('/admin')}
                className={`gap-2 font-medium transition-all ${
                  isActive('/admin') 
                    ? 'bg-white text-[#1e3a8a] shadow-md hover:shadow-lg hover:bg-white/90' 
                    : 'bg-white/10 text-white hover:bg-white/20 border-white/20'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Admin Dashboard</span>
              </Button>

              <Button
                variant={isActive('/view-documents') ? 'default' : 'secondary'}
                size="sm"
                onClick={() => navigate('/view-documents')}
                className={`gap-2 font-medium transition-all ${
                  isActive('/view-documents') 
                    ? 'bg-white text-[#1e3a8a] shadow-md hover:shadow-lg hover:bg-white/90' 
                    : 'bg-white/10 text-white hover:bg-white/20 border-white/20'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documents</span>
              </Button>
            </nav>
          )}
          
          {/* Sign Out Button */}
          <div className="flex items-center gap-4">
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};