import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/react-app/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { EnhancedUser } from "@/shared/types";

interface AuthContextValue {
  user: EnhancedUser | null;
  session: Session | null;
  isPending: boolean;
  redirectToLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [enhancedUser, setEnhancedUser] = useState<EnhancedUser | null>(null);
  const [isPending, setIsPending] = useState(true);

  // Intercept all /api/ fetches to add Authorization header
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.startsWith('/api/')) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.access_token) {
          init = {
            ...init,
            headers: {
              'Authorization': `Bearer ${currentSession.access_token}`,
              ...(init as RequestInit).headers,
            }
          };
        }
      }
      return originalFetch(input as RequestInfo, init as RequestInit);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const fetchEnhancedUser = useCallback(async (supaUser: User) => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${currentSession?.access_token}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEnhancedUser(data);
      } else {
        // No profile yet — return minimal user so ProfileSetup can be shown
        const googleData = supaUser.user_metadata;
        setEnhancedUser({
          id: supaUser.id,
          email: supaUser.email ?? '',
          google_user_data: {
            picture: googleData?.avatar_url || googleData?.picture,
            name: googleData?.full_name || googleData?.name,
            given_name: googleData?.given_name,
            family_name: googleData?.family_name,
          },
        });
      }
    } catch {
      const googleData = supaUser.user_metadata;
      setEnhancedUser({
        id: supaUser.id,
        email: supaUser.email ?? '',
        google_user_data: {
          picture: googleData?.avatar_url || googleData?.picture,
          name: googleData?.full_name || googleData?.name,
          given_name: googleData?.given_name,
          family_name: googleData?.family_name,
        },
      });
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setSupabaseUser(s?.user ?? null);
      if (s?.user) {
        fetchEnhancedUser(s.user).finally(() => setIsPending(false));
      } else {
        setIsPending(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setSupabaseUser(s?.user ?? null);
      if (s?.user) {
        fetchEnhancedUser(s.user);
      } else {
        setEnhancedUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchEnhancedUser]);

  const redirectToLogin = useCallback(async () => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setEnhancedUser(null);
    setSession(null);
    setSupabaseUser(null);
  }, []);

  // Keep user reference updated with supabaseUser as fallback
  const user = enhancedUser ?? (supabaseUser ? {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    google_user_data: {
      picture: supabaseUser.user_metadata?.avatar_url,
      name: supabaseUser.user_metadata?.full_name,
      given_name: supabaseUser.user_metadata?.given_name,
      family_name: supabaseUser.user_metadata?.family_name,
    },
  } : null);

  return (
    <AuthContext.Provider value={{ user, session, isPending, redirectToLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthProvider;
