// relatorioDados.js
// Formato de dados esperado pelo componente <RelatorioDesempenho />.
// No sistema os valores vem do Dashboard (hooks reais); este objeto e apenas referencia.

export const relatorioExemplo = {
  imovel: 'LocaCustoPro',
  titulo: 'Relatorio de Desempenho',
  subtitulo: 'Visao geral',
  periodoLabel: '01/11/2025 a 29/07/2026',
  imoveis: 1,
  unidades: 7,
  emitidoEm: '18 de agosto de 2026',
  kpis: {
    receitaBruta: 0, lucroLiquido: 0, roiAnual: 0, roiPeriodo: 0,
    taxasPlataforma: 0, despesas: 0, despesasFixas: 0, investimentos: 0,
    ocupacaoMedia: 0, ticketMedio: 0, mediaBrutaMes: 0, mediaLiquidaMes: 0,
  },
  meses: [],
  totais: { receita: 0, despesa: 0 },
  flats: [],
  origens: [],
};

export default relatorioExemplo;
