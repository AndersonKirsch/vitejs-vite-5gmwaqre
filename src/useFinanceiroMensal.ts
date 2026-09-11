import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabaseClient';

export interface MesFinanceiro {
  mes: string; // "2026-08"
  label: string; // "Ago/26"
  receita: number;
  despGerais: number;
  despEspecificas: number;
  despesasTotais: number;
  lucro: number;
  ocupacaoMedia: number;
  roiMensal: number;
}

// Substitui o computeMonthlyBuilding() mock do protótipo: busca reservas, despesas
// específicas e o rateio (view rateio_despesas_gerais) de um imóvel num intervalo
// de meses, e devolve os totais já calculados — a mesma forma que a tela espera.
export function useFinanceiroMensal(
  imovelId: string,
  unidadeIds: string[],
  mesInicio: string,
  mesFim: string
) {
  return useQuery({
    queryKey: ['financeiro-mensal', imovelId, unidadeIds, mesInicio, mesFim],
    enabled: !!imovelId && unidadeIds.length > 0,
    queryFn: async (): Promise<MesFinanceiro[]> => {
      const inicio = `${mesInicio}-01`;
      const fimExclusivo = primeiroDiaMesSeguinte(mesFim);

      const reservasRes = await supabase.from('reservas').select('unidade_id, check_in, valor_liquido').in('unidade_id', unidadeIds).neq('status', 'Cancelado').gte('check_in', inicio).lt('check_in', fimExclusivo);
      if (reservasRes.error) throw reservasRes.error;

      const receitasManuaisRes = await supabase.from('receitas_manuais').select('unidade_id, competencia, valor_liquido').in('unidade_id', unidadeIds).gte('competencia', inicio).lt('competencia', fimExclusivo);
      if (receitasManuaisRes.error) throw receitasManuaisRes.error;

      const despEspecificasRes = await supabase.from('despesas_especificas').select('unidade_id, competencia, valor').in('unidade_id', unidadeIds).gte('competencia', inicio).lt('competencia', fimExclusivo);
      if (despEspecificasRes.error) throw despEspecificasRes.error;

      const despGeraisRes = await supabase.from('despesas_gerais').select('competencia, valor').eq('imovel_id', imovelId).gte('competencia', inicio).lt('competencia', fimExclusivo);
      if (despGeraisRes.error) throw despGeraisRes.error;

      // Base do ROI: investimento das unidades (aquisicao + reforma + moveis),
      // a mesma conta usada no card do imovel. Tambem precisamos de quantas
      // unidades estao ativas para saber a capacidade de ocupacao.
      const unidadesRes = await supabase.from('unidades').select('id, situacao, valor_aquisicao, valor_reforma, valor_moveis').in('id', unidadeIds);
      if (unidadesRes.error) throw unidadesRes.error;

      const investimentoTotal = (unidadesRes.data ?? []).reduce(
        (s, u: any) => s + Number(u.valor_aquisicao ?? 0) + Number(u.valor_reforma ?? 0) + Number(u.valor_moveis ?? 0), 0);
      const unidadesAtivas = (unidadesRes.data ?? []).filter((u: any) => u.situacao === 'Ativo').length;

      // Para contar noites ocupadas precisamos das reservas que ENCOSTAM no
      // periodo, nao so das que comecam nele: uma estadia iniciada no mes
      // anterior ocupa noites deste mes. Consulta separada para nao alterar
      // a forma como a receita e atribuida (essa continua pelo check-in).
      const ocupRes = await supabase.from('reservas').select('check_in, check_out').in('unidade_id', unidadeIds).neq('status', 'Cancelado').lt('check_in', fimExclusivo).gt('check_out', inicio);
      if (ocupRes.error) throw ocupRes.error;

      const meses = listarMeses(mesInicio, mesFim);

      return meses.map(({ chave, label }) => {
        const receitaReservas = (reservasRes.data ?? []).filter((r) => r.check_in.slice(0, 7) === chave).reduce((s, r) => s + Number(r.valor_liquido ?? 0), 0);
        const receitaManual = (receitasManuaisRes.data ?? []).filter((r) => r.competencia.slice(0, 7) === chave).reduce((s, r) => s + Number(r.valor_liquido ?? 0), 0);
        const receita = receitaReservas + receitaManual;
        const despEspecificas = (despEspecificasRes.data ?? []).filter((d) => d.competencia.slice(0, 7) === chave).reduce((s, d) => s + Number(d.valor ?? 0), 0);
        const despGerais = (despGeraisRes.data ?? []).filter((d) => d.competencia.slice(0, 7) === chave).reduce((s, d) => s + Number(d.valor ?? 0), 0);
        const despesasTotais = despGerais + despEspecificas;
        const lucro = receita - despesasTotais;

        // Ocupacao = noites vendidas / (dias do mes x unidades ativas).
        // Conta so a parte da estadia que cai dentro deste mes.
        const iniMes = Date.UTC(Number(chave.slice(0, 4)), Number(chave.slice(5, 7)) - 1, 1);
        const fimMes = Date.UTC(Number(chave.slice(0, 4)), Number(chave.slice(5, 7)), 1);
        const diasNoMes = (fimMes - iniMes) / 86400000;

        let noites = 0;
        for (const r of ocupRes.data ?? []) {
          const ini = Math.max(diaUTC(r.check_in), iniMes);
          const fim = Math.min(diaUTC(r.check_out), fimMes);
          if (fim > ini) noites += (fim - ini) / 86400000;
        }
        const capacidade = diasNoMes * unidadesAtivas;

        return {
          mes: chave,
          label,
          receita,
          despGerais,
          despEspecificas,
          despesasTotais,
          lucro,
          ocupacaoMedia: capacidade > 0 ? Math.round((noites / capacidade) * 100) : 0,
          roiMensal: investimentoTotal > 0 ? (lucro / investimentoTotal) * 100 : 0,
        };
      });
    },
  });
}

// "2026-08-27" -> timestamp UTC do dia, sem o deslocamento de fuso que o
// `new Date("2026-08-27")` local causaria (viraria dia 26 no Brasil).
function diaUTC(data: string) {
  return Date.UTC(Number(data.slice(0, 4)), Number(data.slice(5, 7)) - 1, Number(data.slice(8, 10)));
}

function primeiroDiaMesSeguinte(mesChave: string) {
  const ano = Number(mesChave.slice(0, 4));
  const mes = Number(mesChave.slice(5, 7));
  const proxAno = mes === 12 ? ano + 1 : ano;
  const proxMes = mes === 12 ? 1 : mes + 1;
  return `${proxAno}-${String(proxMes).padStart(2, '0')}-01`;
}

function listarMeses(inicio: string, fim: string) {
  const [anoIni, mesIni] = inicio.split('-').map(Number);
  const [anoFim, mesFim] = fim.split('-').map(Number);
  const nomes = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];
  const meses: { chave: string; label: string }[] = [];

  let ano = anoIni;
  let mes = mesIni;
  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    meses.push({
      chave: `${ano}-${String(mes).padStart(2, '0')}`,
      label: `${nomes[mes - 1]}/${String(ano).slice(2)}`,
    });
    mes++;
    if (mes > 12) {
      mes = 1;
      ano++;
    }
  }
  return meses;
}
