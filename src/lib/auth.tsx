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

  useEffect(() => {
    // 🔹 Listen for login/logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserRole(session.user.id, true);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    // 🔹 On refresh, check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserRole(session.user.id, false);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 🔹 Fetch role and redirect appropriately
  const fetchUserRole = async (userId: string, shouldRedirect = false) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      // If no entry, insert default
      let role = data?.role ?? null;
      if (error && error.code !== 'PGRST116') throw error;

      if (!role) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .upsert(
            { user_id: userId, role: 'scholar' },
            { onConflict: 'user_id' }
          );
        if (insertError) throw insertError;
        role = 'scholar';
      }

      setUserRole(role);

      if (shouldRedirect) {
        if (role === 'faculty') navigate('/faculty', { replace: true });
        else if (role === 'scholar') navigate('/scholar', { replace: true });
        else navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setUser(null);
      setSession(null);
      setUserRole(null);
      navigate('/auth');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
