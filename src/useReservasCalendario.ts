import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabaseClient';

export interface ReservaCalendario {
  id: string;
  unidadeId: string;
  origem: 'Airbnb' | 'Booking' | 'Direta' | 'Outros';
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  hospedeNome: string | null;
  origemSincronizacao: 'manual' | 'ical' | 'api';
}

// Substitui gerarReservasCanal() mock: busca as reservas reais que se sobrepõem
// ao mês selecionado, para todas as unidades informadas, numa única chamada.
export function useReservasCalendario(
  unidadeIds: string[],
  inicioMes: string,
  fimMes: string
) {
  return useQuery({
    queryKey: ['reservas-calendario', unidadeIds, inicioMes, fimMes],
    enabled: unidadeIds.length > 0,
    queryFn: async (): Promise<ReservaCalendario[]> => {
      const { data, error } = await supabase
        .from('reservas')
        .select(
          'id, unidade_id, origem, check_in, check_out, hospede_nome, origem_sincronizacao'
        )
        .in('unidade_id', unidadeIds)
        .neq('status', 'Cancelado')
        .lte('check_in', fimMes)
        .gte('check_out', inicioMes);
      if (error) throw error;

      return (data ?? []).map((r: any) => ({
        id: r.id,
        unidadeId: r.unidade_id,
        origem: r.origem,
        checkIn: r.check_in,
        checkOut: r.check_out,
        hospedeNome: r.hospede_nome,
        origemSincronizacao: r.origem_sincronizacao,
      }));
    },
  });
}
