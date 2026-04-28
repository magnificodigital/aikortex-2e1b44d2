import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  tenant_type: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isPlatformOwner: boolean;
  isPlatformAdmin: boolean;
  isPlatform: boolean;
  isAgencyOwner: boolean;
  isClient: boolean;
  getRedirectPath: () => string;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, avatar_url, role, tenant_type, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (data && !error) {
      setProfile(data as UserProfile);
    } else {
      // Default profile for new users before trigger fires
      setProfile({
        id: "",
        user_id: userId,
        full_name: null,
        avatar_url: null,
        role: "agency_owner",
        tenant_type: "agency",
        is_active: true,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isPlatformOwner = profile?.role === "platform_owner";
  const isPlatformAdmin = profile?.role === "platform_admin";
  const isPlatform = profile?.tenant_type === "platform";
  const isAgencyOwner = profile?.role === "agency_owner";
  const isClient = profile?.tenant_type === "client";

  const getRedirectPath = () => {
    if (isPlatformOwner || isPlatformAdmin) return "/admin";
    if (isClient) return "/workspace";
    return "/home";
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      isPlatformOwner, isPlatformAdmin, isPlatform, isAgencyOwner, isClient,
      getRedirectPath, signUp, signIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
