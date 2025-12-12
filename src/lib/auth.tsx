import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userRole: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔹 Fetch user role from Supabase
  const fetchUserRole = async (userId: string, shouldRedirect = false) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data?.role) {
        const role = data.role;
        setUserRole(role);

        // ✅ Redirect after login if necessary (but not on initial page load)
        if (shouldRedirect) {
          // Only redirect if we're not already on the correct page
          const currentPath = window.location.pathname;
          if (role === 'admin' && !currentPath.startsWith('/admin')) {
            navigate('/admin', { replace: true });
          } else if (role === 'faculty' && !currentPath.startsWith('/') && !currentPath.startsWith('/link-document')) {
            navigate('/', { replace: true });
          } else if (role === 'scholar' && !currentPath.startsWith('/scholar') && !currentPath.startsWith('/book')) {
            navigate('/scholar', { replace: true });
          }
        }
      } else {
        console.warn('⚠️ No role found for user:', userId);
        setUserRole('scholar'); // Default to scholar if no role found
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      setUserRole('scholar'); // Default to scholar on error
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Handle auth state changes
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserRole(session.user.id, true);
        } else {
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    // 🔹 Check for existing session on initial load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserRole(session.user.id, false);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // 🔹 Sign Out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();

      // Clear state
      setUser(null);
      setSession(null);
      setUserRole(null);

      // Extra: clear local Supabase token if cached
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-tjbxbqcbanldldazcnul-auth-token');

      // Redirect to login
      navigate('/auth', { replace: true });
    } catch (err) {
      console.error('Error during sign-out:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, userRole, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};
