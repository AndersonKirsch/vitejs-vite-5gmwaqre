import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabaseClient';

// Formato que a tela (dashboard-imoveis-prototype.jsx) já espera — a mesma forma
// que os dados mock tinham, só que agora vindos do banco.
export interface Unidade {
  id: string;
  numero: string;
  situacao: 'Ativo' | 'Inativo';
  valorAquisicao: number;
  valorReforma: number;
  valorMoveis: number;
  metragem: number | null;
  quartos: number | null;
  camas: number | null; receitaMes: number; despesasEspecificas: number; ocupacao: number;
}

export interface DespesaGeral {
  id: string;
  categoria: string;
  descricao: string | null;
  valor: number;
  competencia: string;
}

export interface Imovel {
  id: string;
  nome: string;
  codigo: string;
  cidade: string | null;
  endereco: string | null;
  situacao: 'Ativo' | 'Inativo';
  foto: string | null;
  unidades: Unidade[];
  despesasGerais: DespesaGeral[];
}

const QUERY_KEY = ['imoveis'] as const;

function mapImovel(row: any, rec: any = {}, ocupMed: any = {}): Imovel {
  return {
    id: row.id,
    nome: row.nome,
    codigo: row.codigo,
    cidade: row.cidade,
    endereco: row.endereco,
    situacao: row.situacao,
    foto: row.foto_url,
    unidades: (row.unidades ?? []).map((u: any) => ({
      id: u.id,
      numero: u.numero,
      situacao: u.situacao,
      valorAquisicao: Number(u.valor_aquisicao),
      valorReforma: Number(u.valor_reforma),
      valorMoveis: Number(u.valor_moveis),
      metragem: u.metragem,
      quartos: u.quartos,
      camas: u.camas, receitaMes: Number(rec[u.id] ?? 0), despesasEspecificas: 0, ocupacao: Number(ocupMed[row.id] ?? 0),
    })),
    despesasGerais: (row.despesas_gerais ?? []).map((d: any) => ({
      id: d.id,
      categoria: d.categoria,
      descricao: d.descricao,
      valor: Number(d.valor),
      competencia: d.competencia,
    })),
  };
}

export function useImoveis() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<Imovel[]> => {
      const { data, error } = await supabase
        .from('imoveis')
        .select('*, unidades(*), despesas_gerais(*)')
        .order('nome');
      if (error) throw error;
      const oc = await supabase.from('ocupacao_mensal').select('imovel_id, ocupacao_pct'); const ocm: any = {}; const occ: any = {}; for (const o of oc.data ?? []) { ocm[o.imovel_id] = (ocm[o.imovel_id] ?? 0) + Number(o.ocupacao_pct ?? 0); occ[o.imovel_id] = (occ[o.imovel_id] ?? 0) + 1; } const ocupMed: any = {}; for (const k in ocm) ocupMed[k] = Math.round(ocm[k] / occ[k]); const rv = await supabase.from('reservas').select('unidade_id, valor_liquido').neq('status', 'Cancelado'); const rm = await supabase.from('receitas_manuais').select('unidade_id, valor_liquido'); const rec: any = {}; for (const r of rv.data ?? []) rec[r.unidade_id] = (rec[r.unidade_id] ?? 0) + Number(r.valor_liquido ?? 0); for (const r of rm.data ?? []) rec[r.unidade_id] = (rec[r.unidade_id] ?? 0) + Number(r.valor_liquido ?? 0); return (data ?? []).map((row: any) => mapImovel(row, rec, ocupMed));
    },
  });
}

export function useAdicionarImovel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (novo: {
      nome: string;
      codigo: string;
      endereco: string;
      cidade: string;
      situacao: string;
      empresaId: string;
    }) => {
      const { error } = await supabase.from('imoveis').insert({
        empresa_id: novo.empresaId,
        nome: novo.nome,
        codigo: novo.codigo,
        endereco: novo.endereco,
        cidade: novo.cidade,
        situacao: novo.situacao,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useAdicionarUnidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nova: {
      imovelId: string;
      numero: string;
      situacao: string;
      valorAquisicao: number;
      valorReforma: number;
      valorMoveis: number;
      metragem: number;
      quartos: number;
      camas: number;
    }) => {
      const { error } = await supabase.from('unidades').insert({
        imovel_id: nova.imovelId,
        numero: nova.numero,
        situacao: nova.situacao,
        valor_aquisicao: nova.valorAquisicao,
        valor_reforma: nova.valorReforma,
        valor_moveis: nova.valorMoveis,
        metragem: nova.metragem,
        quartos: nova.quartos,
        camas: nova.camas,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useRemoverUnidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (unidadeId: string) => {
      const { error } = await supabase
        .from('unidades')
        .delete()
        .eq('id', unidadeId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useAdicionarDespesaGeral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nova: {
      imovelId: string;
      categoria: string;
      descricao: string;
      valor: number;
      competencia: string;
    }) => {
      const { error } = await supabase.from('despesas_gerais').insert({
        imovel_id: nova.imovelId,
        categoria: nova.categoria,
        descricao: nova.descricao,
        valor: nova.valor,
        competencia: nova.competencia, // formato "YYYY-MM-01"
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useRemoverDespesaGeral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (despesaId: string) => {
      const { error } = await supabase
        .from('despesas_gerais')
        .delete()
        .eq('id', despesaId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useEditarImovel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (d: { id: string; nome: string; codigo: string; endereco: string; cidade: string; situacao: string }) => {
      const { error } = await supabase.from('imoveis').update({ nome: d.nome, codigo: d.codigo, endereco: d.endereco, cidade: d.cidade, situacao: d.situacao }).eq('id', d.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
