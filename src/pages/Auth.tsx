import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Loader2 } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  // All signups are faculty - admin is created separately
  const role: 'faculty' = 'faculty';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/welcome', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // ✅ Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const userId = data?.user?.id;
      if (!userId) throw new Error('User ID not found after sign in.');

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      const userRole = roleData?.role ?? 'faculty';

      toast({
        title: 'Welcome back!',
        description: 'Successfully signed in.',
      });

      // Redirect to welcome page - wait for auth state to update
      setTimeout(() => {
        navigate('/welcome', { replace: true });
      }, 500);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };
// ✅ SIGN UP 
const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { name },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('User signup failed.');

    const userId = data.user.id;

    // 🔹 Ensure no duplicate role record
    await supabase.from('user_roles').delete().eq('user_id', userId);

    // 🔹 Insert the selected role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role }]);

    if (roleError) throw roleError;

    toast({
      title: 'Account created!',
      description: 'Please sign in to continue.',
    });

    // Clear form and switch to sign in tab
    setEmail('');
    setPassword('');
    setName('');
    
    // Don't auto-redirect - let user sign in manually
    // The auth state change will handle redirect after sign in
  } catch (err: any) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: err.message,
    });
  } finally {
    setLoading(false);
  }
};


  const VIT_LOGO = '/vit_logo.png';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/5 p-4 relative overflow-hidden">
      {/* VIT-themed background with logo-friendly design */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Blue gradient circles */}
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        {/* Gold accent circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/8 rounded-full blur-3xl"></div>
      </div>
      
      <Card className="w-full max-w-md shadow-2xl border-2 border-primary/30 bg-white/95 backdrop-blur-md relative z-10">
        <CardHeader className="text-center space-y-4 pb-6 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex justify-center mb-4">
            <div className="relative">
              {/* Logo background circle with VIT colors */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 rounded-full blur-2xl scale-150"></div>
              <div className="relative bg-white rounded-full p-3 shadow-lg border-4 border-primary/20">
                <img 
                  src={VIT_LOGO} 
                  alt="VIT Logo" 
                  className="h-24 w-24 object-contain"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Faculty Research Portal
            </CardTitle>
            <CardDescription className="text-base font-medium">Login to manage research activities</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Sign In */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="user@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-md hover:shadow-lg transition-all font-semibold" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="faculty@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-md hover:shadow-lg transition-all font-semibold" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
