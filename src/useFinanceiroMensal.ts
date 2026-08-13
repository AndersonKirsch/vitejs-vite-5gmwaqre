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
    queryKey: ['financeiro-mensal', imovelId, mesInicio, mesFim],
    enabled: !!imovelId && unidadeIds.length > 0,
    queryFn: async (): Promise<MesFinanceiro[]> => {
      const [reservasRes, despEspecificasRes, rateioRes] = await Promise.all([
        supabase
          .from('reservas')
          .select('unidade_id, check_in, check_out, valor_liquido, status')
          .in('unidade_id', unidadeIds)
          .neq('status', 'Cancelado')
          .gte('check_out', `${mesInicio}-01`)
          .lte('check_in', `${mesFim}-28`),
        supabase
          .from('despesas_especificas')
          .select('unidade_id, competencia, valor')
          .in('unidade_id', unidadeIds)
          .gte('competencia', `${mesInicio}-01`)
          .lte('competencia', `${mesFim}-28`),
        supabase
          .from('rateio_despesas_gerais')
          .select(
            'competencia, total_despesas_gerais, unidades_ativas, rateio_por_unidade'
          )
          .eq('imovel_id', imovelId)
          .gte('competencia', `${mesInicio}-01`)
          .lte('competencia', `${mesFim}-28`),
      ]);

      if (reservasRes.error) throw reservasRes.error;
      if (despEspecificasRes.error) throw despEspecificasRes.error;
      if (rateioRes.error) throw rateioRes.error;

      const meses = listarMeses(mesInicio, mesFim);

      return meses.map(({ chave, label }) => {
        const receita = (reservasRes.data ?? [])
          .filter((r) => r.check_in.slice(0, 7) === chave)
          .reduce((s, r) => s + Number(r.valor_liquido ?? 0), 0);

        const despEspecificas = (despEspecificasRes.data ?? [])
          .filter((d) => d.competencia.slice(0, 7) === chave)
          .reduce((s, d) => s + Number(d.valor), 0);

        const rateio = (rateioRes.data ?? []).find(
          (r) => r.competencia.slice(0, 7) === chave
        );
        const despGerais = Number(rateio?.total_despesas_gerais ?? 0);
        const despesasTotais = despGerais + despEspecificas;
        const lucro = receita - despesasTotais;

        return {
          mes: chave,
          label,
          receita,
          despGerais,
          despEspecificas,
          despesasTotais,
          lucro,
          ocupacaoMedia: 0, // calcule a partir das diárias ocupadas / dias do mês, se precisar no relatório
          roiMensal: 0, // divida `lucro` pelo investimento total do imóvel, disponível em unidades_investimento
        };
      });
    },
  });
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
