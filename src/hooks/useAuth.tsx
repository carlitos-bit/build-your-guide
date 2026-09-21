import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Perfil = "aluno" | "professor";

type PerfilRow = {
  id: string;
  nome: string;
  email: string | null;
  perfil: string;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  perfil: PerfilRow | null;
  isProfessor: boolean;
  loading: boolean;
  sair: () => Promise<void>;
  recarregarPerfil: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  perfil: null,
  isProfessor: false,
  loading: true,
  sair: async () => {},
  recarregarPerfil: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilRow | null>(null);
  const [loading, setLoading] = useState(true);

  async function carregarPerfil(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("id, nome, email, perfil")
      .eq("id", userId)
      .maybeSingle();
    setPerfil((data as PerfilRow | null) ?? null);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      setSession(novaSessao);
      setUser(novaSessao?.user ?? null);
      if (novaSessao?.user) {
        void carregarPerfil(novaSessao.user.id);
      } else {
        setPerfil(null);
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
    isProfessor: perfil?.perfil === "professor",
    loading,
    sair: async () => {
      await supabase.auth.signOut();
      setPerfil(null);
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
