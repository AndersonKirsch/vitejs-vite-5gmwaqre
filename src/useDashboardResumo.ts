import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabaseClient';

export interface ResumoImovel {
  imovelId: string;
  receita: number;
  despesasGerais: number;
  despesasEspecificas: number;
  despesasTotais: number;
  lucro: number;
}

export interface ResumoDashboard {
  porImovel: Record<string, ResumoImovel>;
  totais: {
    receita: number;
    despesasGerais: number;
    despesasEspecificas: number;
    despesasTotais: number;
    lucro: number;
  };
  periodo: { inicio: string | null; fim: string | null };
}

// Agrega receita/despesa/lucro de TODO o periodo informado, para todos os imoveis.
// `inicio` e inclusivo e `fimExclusivo` e exclusivo (primeiro dia do mes seguinte),
// para evitar datas invalidas como "2026-06-31" em meses de 30 dias.
export function useDashboardResumo(
  unidadesPorImovel: Record<string, string[]>,
  inicio: string,
  fimExclusivo: string
) {
  const todosImovelIds = Object.keys(unidadesPorImovel);
  const todasUnidadeIds = Object.values(unidadesPorImovel).flat();
  const unidadeParaImovel: Record<string, string> = {};
  for (const [imovelId, unidadeIds] of Object.entries(unidadesPorImovel)) {
    for (const uid of unidadeIds) unidadeParaImovel[uid] = imovelId;
  }

  return useQuery({
    queryKey: ['dashboard-resumo', todasUnidadeIds, inicio, fimExclusivo],
    enabled: todasUnidadeIds.length > 0,
    queryFn: async (): Promise<ResumoDashboard> => {
      const reservasRes = await supabase.from('reservas').select('unidade_id, check_in, valor_liquido').in('unidade_id', todasUnidadeIds).neq('status', 'Cancelado').gte('check_in', inicio).lt('check_in', fimExclusivo);
      if (reservasRes.error) throw reservasRes.error;

      const receitasManuaisRes = await supabase.from('receitas_manuais').select('unidade_id, competencia, valor_liquido').in('unidade_id', todasUnidadeIds).gte('competencia', inicio).lt('competencia', fimExclusivo);
      if (receitasManuaisRes.error) throw receitasManuaisRes.error;

      const despEspecificasRes = await supabase.from('despesas_especificas').select('unidade_id, competencia, valor').in('unidade_id', todasUnidadeIds).gte('competencia', inicio).lt('competencia', fimExclusivo);
      if (despEspecificasRes.error) throw despEspecificasRes.error;

      const despGeraisRes = await supabase.from('despesas_gerais').select('imovel_id, competencia, valor').in('imovel_id', todosImovelIds).gte('competencia', inicio).lt('competencia', fimExclusivo);
      if (despGeraisRes.error) throw despGeraisRes.error;

      const porImovel: Record<string, ResumoImovel> = {};
      for (const imovelId of todosImovelIds) {
        porImovel[imovelId] = { imovelId, receita: 0, despesasGerais: 0, despesasEspecificas: 0, despesasTotais: 0, lucro: 0 };
      }

      const datas: string[] = [];

      for (const r of reservasRes.data ?? []) {
        const imovelId = unidadeParaImovel[r.unidade_id];
        if (imovelId) porImovel[imovelId].receita += Number(r.valor_liquido ?? 0);
        if (r.check_in) datas.push(r.check_in);
      }
      for (const r of receitasManuaisRes.data ?? []) {
        const imovelId = unidadeParaImovel[r.unidade_id];
        if (imovelId) porImovel[imovelId].receita += Number(r.valor_liquido ?? 0);
        if (r.competencia) datas.push(r.competencia);
      }
      for (const d of despEspecificasRes.data ?? []) {
        const imovelId = unidadeParaImovel[d.unidade_id];
        if (imovelId) porImovel[imovelId].despesasEspecificas += Number(d.valor ?? 0);
        if (d.competencia) datas.push(d.competencia);
      }
      for (const d of despGeraisRes.data ?? []) {
        if (porImovel[d.imovel_id]) porImovel[d.imovel_id].despesasGerais += Number(d.valor ?? 0);
        if (d.competencia) datas.push(d.competencia);
      }

      datas.sort();
      const periodo = { inicio: datas[0] ?? null, fim: datas[datas.length - 1] ?? null };

      const totais = { receita: 0, despesasGerais: 0, despesasEspecificas: 0, despesasTotais: 0, lucro: 0 };
      for (const imovelId of todosImovelIds) {
        const p = porImovel[imovelId];
        p.despesasTotais = p.despesasGerais + p.despesasEspecificas;
        p.lucro = p.receita * 0.91 - p.despesasTotais;
        totais.receita += p.receita;
        totais.despesasGerais += p.despesasGerais;
        totais.despesasEspecificas += p.despesasEspecificas;
        totais.despesasTotais += p.despesasTotais;
        totais.lucro += p.lucro;
      }

      return { porImovel, totais, periodo };
    },
  });
}

export interface MesTendencia {
  mes: string;
  label: string;
  receita: number;
  despesa: number;
  lucro: number;
}

// Série dos últimos `mesesChaves.length` meses, somando todas as unidades — para o
// gráfico "Receita x Despesas por mês" e o gráfico de lucro do Dashboard.
export function useTendenciaMensal(
  todasUnidadeIds: string[],
  mesesChaves: { key: string; label: string }[]
) {
  return useQuery({
    queryKey: [
      'tendencia-mensal',
      todasUnidadeIds,
      mesesChaves.map((m) => m.key),
    ],
    enabled: todasUnidadeIds.length > 0 && mesesChaves.length > 0,
    queryFn: async (): Promise<MesTendencia[]> => {
      const inicio = `${mesesChaves[0].key}-01`;
          const fim = `${mesesChaves[mesesChaves.length - 1].key}-31`;

          const [reservasRes, receitasManuaisRes, despesasEspRes, despesasGeraisRes] =
        await Promise.all([
          supabase
            .from('reservas')
            .select('unidade_id, check_in, valor_liquido')
            .in('unidade_id', todasUnidadeIds)
            .neq('status', 'Cancelado')
            .gte('check_in', inicio)
            .lte('check_in', fim),
                  supabase
                          .from('receitas_manuais')
                                  .select('unidade_id, competencia, valor_liquido')
                                          .in('unidade_id', todasUnidadeIds)
                                                  .gte('competencia', inicio)
                                                          .lte('competencia', fim),
          supabase
            .from('despesas_especificas')
            .select('unidade_id, competencia, valor')
            .in('unidade_id', todasUnidadeIds)
            .gte('competencia', inicio)
            .lte('competencia', fim),
          supabase
            .from('despesas_gerais')
            .select('valor, competencia, imovel_id')
            .gte('competencia', inicio)
            .lte('competencia', fim),
        ]);
      if (reservasRes.error) throw reservasRes.error;
      if (receitasManuaisRes.error) throw receitasManuaisRes.error;
      if (despesasEspRes.error) throw despesasEspRes.error;
      if (despesasGeraisRes.error) throw despesasGeraisRes.error;

      return mesesChaves.map(({ key, label }) => {
        const receita = (reservasRes.data ?? [])
          .filter((r) => r.check_in.slice(0, 7) === key)
          .reduce((s, r) => s + Number(r.valor_liquido ?? 0), 0);
              const receitaManual = (receitasManuaisRes.data ?? [])
                    .filter((r) => r.competencia.slice(0, 7) === key)
                          .reduce((s, r) => s + Number(r.valor_liquido ?? 0), 0);
                              const receitaTotal = receita + receitaManual;
        const despEsp = (despesasEspRes.data ?? [])
          .filter((d) => d.competencia.slice(0, 7) === key)
          .reduce((s, d) => s + Number(d.valor), 0);
        const despGer = (despesasGeraisRes.data ?? [])
          .filter((d) => d.competencia.slice(0, 7) === key)
          .reduce((s, d) => s + Number(d.valor), 0);
        const despesa = despEsp + despGer;
        return {
          mes: key,
          label,
                receita: receitaTotal,
          despesa,
                lucro: receitaTotal * 0.91 - despesa,
        };
      });
    },
  });
}

export interface OrigemReceita {
  nome: string;
  valor: number;
  cor: string;
}
const CORES_ORIGEM_HOOK: Record<string, string> = {
  Airbnb: '#FF5A5F',
  Booking: '#003580',
  Direta: '#B8863B',
  Outros: '#8B93A1',
};

// Receita líquida do mês agrupada por origem — alimenta o gráfico de pizza do Dashboard.
export function useReceitaPorOrigem(unidadeIds: string[], inicio: string, fimExclusivo: string) {
  return useQuery({
        queryKey: ['receita-por-origem', unidadeIds, inicio, fimExclusivo],
    enabled: unidadeIds.length > 0,
    queryFn: async (): Promise<OrigemReceita[]> => {
      const { data, error } = await supabase
        .from('reservas')
        .select('origem, valor_liquido, check_in')
        .in('unidade_id', unidadeIds)
        .neq('status', 'Cancelado')
                .gte('check_in', inicio)
                        .lt('check_in', fimExclusivo);
      if (error) throw error;

      const porOrigem: Record<string, number> = {
        Airbnb: 0,
        Booking: 0,
        Direta: 0,
        Outros: 0,
      };
      for (const r of data ?? [])
        porOrigem[r.origem] =
          (porOrigem[r.origem] ?? 0) + Number(r.valor_liquido ?? 0);

      return Object.entries(porOrigem).map(([nome, valor]) => ({
        nome,
        valor,
        cor: CORES_ORIGEM_HOOK[nome],
      }));
    },
  });
}
