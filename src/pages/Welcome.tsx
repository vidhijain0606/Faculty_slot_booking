import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight } from 'lucide-react';

const VIT_LOGO = '/vit_logo.png';

export default function Welcome() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => {
    // Auto-redirect to dashboard after 5 seconds
    if (user && !loading && userRole) {
      const timer = setTimeout(() => {
        if (userRole === 'admin') {
          navigate('/admin', { replace: true });
        } else if (userRole === 'faculty') {
          navigate('/dashboard', { replace: true });
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user, userRole, loading, navigate]);

  const handleGetStarted = () => {
    if (user && userRole === 'admin') {
      navigate('/admin', { replace: true });
    } else if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/auth', { replace: true });
    }
  };

  useEffect(() => {
    // Redirect to auth if not logged in
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/5 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/5 flex items-center justify-center p-4 relative overflow-hidden">
      {/* VIT-themed background with logo-friendly design */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Blue gradient circles */}
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        {/* Gold accent circles */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/8 rounded-full blur-3xl"></div>
      </div>
      
      <Card className="w-full max-w-3xl shadow-2xl border-2 border-primary/30 bg-white/95 backdrop-blur-md relative z-10">
        <CardHeader className="text-center space-y-6 pb-8 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* Logo background circle with VIT colors */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 rounded-full blur-2xl scale-150"></div>
              <div className="relative bg-white rounded-full p-4 shadow-lg border-4 border-primary/20">
                <img 
                  src={VIT_LOGO} 
                  alt="VIT Logo" 
                  className="h-32 w-32 object-contain"
                />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <CardTitle className="text-5xl font-extrabold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              Welcome{userName ? `, Professor ${userName}` : ''}!
            </CardTitle>
            <CardDescription className="text-xl text-muted-foreground font-medium">
              Welcome to VIT Scope Research Portal
            </CardDescription>
            <p className="text-base text-muted-foreground">
              Manage your research activities, book slots, and link documents
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 pb-8">
          <p className="text-muted-foreground text-center text-lg max-w-xl">
            Access your faculty dashboard to manage scholars, book appointment slots, and organize your research documents with ease.
          </p>
          <Button 
            size="lg" 
            onClick={handleGetStarted} 
            className="mt-2 px-8 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            Continue to Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-muted-foreground">Redirecting automatically in 5 seconds...</p>
        </CardContent>
      </Card>
    </div>
  );
}

