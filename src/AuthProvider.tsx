import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

interface AuthContextValue {
  carregando: boolean;
  usuario: { id: string; email: string } | null;
  empresaId: string | null;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState<{ id: string; email: string } | null>(
    null
  );
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  async function carregarEmpresa(usuarioId: string) {
    const { data, error } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('usuario_id', usuarioId)
      .limit(1)
      .single();
    if (!error && data) setEmpresaId(data.empresa_id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user;
      if (sessionUser) {
        setUsuario({ id: sessionUser.id, email: sessionUser.email ?? '' });
        await carregarEmpresa(sessionUser.id);
      }
      setCarregando(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUsuario({ id: session.user.id, email: session.user.email ?? '' });
          await carregarEmpresa(session.user.id);
        } else {
          setUsuario(null);
          setEmpresaId(null);
        }
      }
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  const sair = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ carregando, usuario, empresaId, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
