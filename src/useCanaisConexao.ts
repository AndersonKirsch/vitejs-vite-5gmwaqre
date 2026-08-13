import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabaseClient';

export interface Canal {
  id: string;
  unidadeId: string;
  plataforma: 'Airbnb' | 'Booking' | 'VRBO' | 'Expedia' | 'Site próprio';
  status: 'Conectado' | 'Desconectado' | 'Erro';
  ultimaSincronizacao: string | null;
  reservasImportadas: number;
  bloqueiosExportados: number;
  erroMensagem: string | null;
  urlExportacao: string; // cole na plataforma
  urlImportacao: string | null; // veio da plataforma, cole aqui
}

const SUPABASE_FUNCTIONS_URL = import.meta.env
  .VITE_SUPABASE_FUNCTIONS_URL as string;

export function useCanaisConexao(unidadeIds: string[]) {
  return useQuery({
    queryKey: ['canais-conexao', unidadeIds],
    enabled: unidadeIds.length > 0,
    queryFn: async (): Promise<Canal[]> => {
      const { data, error } = await supabase
        .from('canais_conexao')
        .select('*')
        .in('unidade_id', unidadeIds);
      if (error) throw error;

      return (data ?? []).map((c: any) => ({
        id: c.id,
        unidadeId: c.unidade_id,
        plataforma: c.plataforma,
        status: c.status,
        ultimaSincronizacao: c.ultima_sincronizacao,
        reservasImportadas: c.reservas_importadas,
        bloqueiosExportados: c.bloqueios_exportados,
        erroMensagem: c.erro_mensagem,
        urlExportacao: `${SUPABASE_FUNCTIONS_URL}/ical-export/${c.ical_export_token}.ics`,
        urlImportacao: c.ical_import_url,
      }));
    },
  });
}

// Grava o link que o Airbnb/Booking te deram, para o seu sistema passar a importar de lá.
export function useSalvarLinkImportacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ canalId, url }: { canalId: string; url: string }) => {
      const { error } = await supabase
        .from('canais_conexao')
        .update({ ical_import_url: url })
        .eq('id', canalId);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['canais-conexao'] }),
  });
}

// Chama a Edge Function ical-sync-canal — o botão "Sincronizar agora" da tela.
export function useSincronizarAgora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (canalId: string) => {
      const { data, error } = await supabase.functions.invoke(
        'ical-sync-canal',
        { body: { canalId } }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canais-conexao'] });
      queryClient.invalidateQueries({ queryKey: ['log-sincronizacao'] });
    },
  });
}

export function useLogSincronizacao(canalIds: string[]) {
  return useQuery({
    queryKey: ['log-sincronizacao', canalIds],
    enabled: canalIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logs_sincronizacao')
        .select('*')
        .in('canal_id', canalIds)
        .order('data_hora', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}
