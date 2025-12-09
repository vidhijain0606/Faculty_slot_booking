import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Clock, ArrowRight } from 'lucide-react';
//  manually adding a line to commit 

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect only after role is fully loaded
    if (!loading && user && userRole) {
      if (userRole === 'scholar') {
        navigate('/scholar', { replace: true });
      } else if (userRole === 'faculty') {
        navigate('/faculty', { replace: true });
      } else if (userRole === 'admin') {
        navigate('/admin', { replace: true });
      }
    }
  }, [user, userRole, loading, navigate]);

  // Show loading spinner while waiting for role
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Show landing page for unauthenticated visitors only
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-primary rounded-2xl shadow-medium">
                <Calendar className="h-16 w-16 text-primary-foreground" />
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6">
              Faculty-Scholar Booking System
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Streamline academic appointments with an intuitive scheduling platform designed for educational institutions
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/auth')}
                className="text-lg gap-2 shadow-soft hover:shadow-medium transition-shadow"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/auth')}
                className="text-lg"
              >
                Sign In
              </Button>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
            <div className="bg-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-shadow">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Scheduling</h3>
              <p className="text-muted-foreground">
                Faculty members set their availability by date, and scholars can book appointments with just a few clicks
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-shadow">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
              <p className="text-muted-foreground">
                Separate dashboards for scholars, faculty, and administrators with tailored functionality for each role
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-shadow">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Availability</h3>
              <p className="text-muted-foreground">
                Automatic slot generation with conflict prevention and time-off management for faculty members
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null; // prevent flicker
};

export default Index;
