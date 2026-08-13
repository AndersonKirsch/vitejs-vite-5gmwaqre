import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const FONT_DISPLAY = "'Sora', sans-serif";
const FONT_BODY = "'Inter', sans-serif";
const PRIMARY = '#24467A';
const BORDER = '#E4E7EC';
const SURFACE_ALT = '#F0F2F5';
const NEGATIVE = '#C1443C';

export function LoginScreen() {
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('cadastrar');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const inputStyle = {
    background: SURFACE_ALT,
    border: `1px solid ${BORDER}`,
    fontFamily: FONT_BODY,
  };

  const enviar = async () => {
    setErro('');
    setCarregando(true);
    try {
      if (modo === 'cadastrar') {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome_empresa: nomeEmpresa || 'Minha empresa' } },
        });
        if (error) throw error;
        // O gatilho `trg_criar_empresa_para_novo_usuario` já cria a empresa e o vínculo
        // automaticamente no banco — não precisa de nenhuma chamada extra aqui.
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
        if (error) throw error;
      }
    } catch (e: any) {
      setErro(
        e.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : e.message
      );
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: '#F6F7F9', fontFamily: FONT_BODY }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: '#fff', border: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-2 mb-6">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: PRIMARY }}
          >
            <Building2 size={16} color="#fff" />
          </div>
          <span
            className="text-base font-bold"
            style={{ fontFamily: FONT_DISPLAY, color: '#171A21' }}
          >
            Loca CustoPro
          </span>
        </div>

        <div
          className="flex gap-1 mb-5 rounded-lg p-1"
          style={{ background: SURFACE_ALT }}
        >
          {(['cadastrar', 'entrar'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className="flex-1 py-1.5 rounded-md text-[13px] font-medium"
              style={{
                background: modo === m ? '#fff' : 'transparent',
                color: modo === m ? PRIMARY : '#666D7A',
                fontFamily: FONT_BODY,
              }}
            >
              {m === 'cadastrar' ? 'Criar conta' : 'Entrar'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {modo === 'cadastrar' && (
            <input
              placeholder="Nome da sua empresa"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              className="rounded-lg px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg px-3 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Senha (mínimo 6 caracteres)"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="rounded-lg px-3 py-2.5 text-sm outline-none"
            style={inputStyle}
          />

          {erro && (
            <p className="text-[12px]" style={{ color: NEGATIVE }}>
              {erro}
            </p>
          )}

          <button
            onClick={enviar}
            disabled={carregando || !email || !senha}
            className="rounded-lg py-2.5 text-sm font-medium mt-1"
            style={{
              background: PRIMARY,
              color: '#fff',
              opacity: carregando ? 0.7 : 1,
              fontFamily: FONT_BODY,
            }}
          >
            {carregando
              ? 'Aguarde...'
              : modo === 'cadastrar'
              ? 'Criar conta e começar'
              : 'Entrar'}
          </button>
        </div>

        {modo === 'cadastrar' && (
          <p
            className="text-[11px] mt-4 text-center"
            style={{ color: '#666D7A' }}
          >
            Ao criar a conta, sua empresa já é criada automaticamente — você já
            pode cadastrar seu primeiro imóvel.
          </p>
        )}
      </div>
    </div>
  );
}
