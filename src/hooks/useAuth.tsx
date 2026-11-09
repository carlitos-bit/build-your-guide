import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Perfil = "aluno" | "professor";

type PerfilRow = {
  id: string;
  nome: string;
  email: string | null;
  perfil: string;
  avatar: unknown;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  perfil: PerfilRow | null;
  isProfessor: boolean;
  isAdmin: boolean;
  loading: boolean;
  sair: () => Promise<void>;
  recarregarPerfil: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  perfil: null,
  isProfessor: false,
  isAdmin: false,
  loading: true,
  sair: async () => {},
  recarregarPerfil: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [papeis, setPapeis] = useState<string[]>([]);

  async function carregarPerfil(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id, nome, email, perfil, avatar")
      .eq("id", userId)
      .maybeSingle();
    setPerfil((data as PerfilRow | null) ?? null);
    const { data: papeisData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setPapeis((papeisData ?? []).map((p) => p.role as string));
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      setSession(novaSessao);
      setUser(novaSessao?.user ?? null);
      if (novaSessao?.user) {
        void carregarPerfil(novaSessao.user.id);
      } else {
        setPerfil(null);
        setPapeis([]);
      }
      setLoading(false);
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void carregarPerfil(data.session.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    perfil,
    isProfessor: papeis.includes("professor"),
    isAdmin: papeis.includes("admin"),
    loading,
    sair: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setPerfil(null);
      setPapeis([]);
    },
    recarregarPerfil: async () => {
      if (user) await carregarPerfil(user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
