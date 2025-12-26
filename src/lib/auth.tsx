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
  const navigate = useNavigate(); // Keep navigate for sign-out

  // 🔹 Fetch user role from Supabase
  const fetchUserRole = async (userId: string) => { // Removed shouldRedirect flag
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data?.role) {
        setUserRole(data.role);
      } else {
        console.warn('⚠️ No role found for user:', userId);
        setUserRole('faculty'); // Default to faculty if no role found
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      setUserRole('faculty'); // Default to faculty on error
    } 
    // IMPORTANT: DO NOT call setLoading(false) here, it's called at the end of the main useEffect
  };

  // 🔹 Handle auth state changes
  useEffect(() => {
    let initialLoadFinished = false; // Flag for initial load

    const handleSession = async (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      setUserRole(null); // Reset role while fetching/loading

      if (session?.user) {
        console.log('User ID:', session.user.id); // Log user ID for debugging
        await fetchUserRole(session.user.id); // Fetch role without redirecting here
      } else {
        setUserRole(null);
      }

      // Only set loading to false once all checks are done
      setLoading(false);
    };

    // 🔹 Set up the real-time subscription
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (initialLoadFinished) {
           handleSession(session);
        }
      }
    );

    // 🔹 Check for existing session on initial load (runs once)
    supabase.auth.getSession().then(({ data: { session } }) => {
        handleSession(session);
        initialLoadFinished = true;
    });


    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  // 🔹 Sign Out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();

      // Clear state
      setUser(null);
      setSession(null);
      setUserRole(null);
      
      // Navigate should only run AFTER state is cleared
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