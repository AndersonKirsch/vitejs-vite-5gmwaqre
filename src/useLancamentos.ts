import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

export interface Lancamento {
  id: string;
  data: string | null;
  mes: string;
  tipo: "receita" | "despesa";
  categoria: string;
  descricao: string | null;
  hospede: string | null;
  unidade: string | null;
  valor: number;
  status: string;
}

export function useLancamentos(imovelId: string, unidadeIds: string[], mesInicio: string, mesFim: string) {
  return useQuery({
    queryKey: ["lancamentos", imovelId, unidadeIds, mesInicio, mesFim],
    enabled: !!imovelId && unidadeIds.length > 0,
    queryFn: async (): Promise<Lancamento[]> => {
      const [reservasRes, receitasManuaisRes, despEspecificasRes, despGeraisRes, unidadesRes] = await Promise.all([
        supabase
          .from("reservas")
          .select("id, unidade_id, check_in, check_out, valor_liquido, origem, hospede_nome, status")
          .in("unidade_id", unidadeIds)
          .gte("check_in", `${mesInicio}-01`)
          .lte("check_in", `${mesFim}-31`),
        supabase
          .from("receitas_manuais")
          .select("id, unidade_id, categoria, descricao, valor_liquido, competencia, status")
          .in("unidade_id", unidadeIds)
          .gte("competencia", `${mesInicio}-01`)
          .lte("competencia", `${mesFim}-31`),
        supabase
          .from("despesas_especificas")
          .select("id, unidade_id, competencia, categoria, descricao, valor")
          .in("unidade_id", unidadeIds)
          .gte("competencia", `${mesInicio}-01`)
          .lte("competencia", `${mesFim}-31`),
        supabase
          .from("despesas_gerais")
          .select("id, imovel_id, competencia, categoria, descricao, valor")
          .eq("imovel_id", imovelId)
          .gte("competencia", `${mesInicio}-01`)
          .lte("competencia", `${mesFim}-31`),
        supabase
          .from("unidades")
          .select("id, numero")
          .in("id", unidadeIds),
      ]);

      if (reservasRes.error) throw reservasRes.error;
      if (receitasManuaisRes.error) throw receitasManuaisRes.error;
      if (despEspecificasRes.error) throw despEspecificasRes.error;
      if (despGeraisRes.error) throw despGeraisRes.error;
      if (unidadesRes.error) throw unidadesRes.error;

      const numeroPorUnidade: Record<string, string> = {};
      (unidadesRes.data ?? []).forEach((u) => { numeroPorUnidade[u.id] = u.numero; });

      const receitasReservas: Lancamento[] = (reservasRes.data ?? [])
        .filter((r) => r.status !== "Cancelado")
        .map((r) => ({
          id: `res-${r.id}`,
          data: r.check_in,
          mes: r.check_in.slice(0, 7),
          tipo: "receita" as const,
          categoria: r.origem ?? "Direta",
          descricao: null,
          hospede: r.hospede_nome,
          unidade: numeroPorUnidade[r.unidade_id] ?? null,
          valor: Number(r.valor_liquido ?? 0),
          status: r.status ?? "Confirmado",
        }));

      const receitasManuais: Lancamento[] = (receitasManuaisRes.data ?? []).map((r) => ({
        id: `rm-${r.id}`,
        data: r.competencia,
        mes: r.competencia.slice(0, 7),
        tipo: "receita" as const,
        categoria: r.categoria ?? "Airbnb",
        descricao: r.descricao,
        hospede: null,
        unidade: numeroPorUnidade[r.unidade_id] ?? null,
        valor: Number(r.valor_liquido ?? 0),
        status: r.status ?? "Confirmado",
      }));

      const despEspecificas: Lancamento[] = (despEspecificasRes.data ?? []).map((d) => ({
        id: `de-${d.id}`,
        data: d.competencia,
        mes: d.competencia.slice(0, 7),
        tipo: "despesa" as const,
        categoria: d.categoria,
        descricao: d.descricao,
        hospede: null,
        unidade: numeroPorUnidade[d.unidade_id] ?? null,
        valor: Number(d.valor),
        status: "Pago",
      }));

      const despGerais: Lancamento[] = (despGeraisRes.data ?? []).map((d) => ({
        id: `dg-${d.id}`,
        data: d.competencia,
        mes: d.competencia.slice(0, 7),
        tipo: "despesa" as const,
        categoria: d.categoria,
        descricao: d.descricao,
        hospede: null,
        unidade: null,
        valor: Number(d.valor),
        status: "Pago",
      }));

      return [...receitasReservas, ...receitasManuais, ...despEspecificas, ...despGerais].sort((a, b) =>
        (b.data ?? "").localeCompare(a.data ?? "")
      );
    },
  });
}
