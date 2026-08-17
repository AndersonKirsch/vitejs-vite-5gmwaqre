import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  BarChart,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  LayoutDashboard,
  Building2,
  Wallet,
  Receipt,
  FileBarChart,
  TrendingUp,
  Sun,
  Moon,
  Plus,
  Search,
  MapPin,
  Ruler,
  X,
  CalendarDays,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CircleDollarSign,
  Percent,
  Layers,
  Trash2,
  RefreshCw,
  Link2,
  Copy,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  useImoveis,
  useAdicionarImovel, useEditarImovel, uploadFotoImovel,
  useAdicionarUnidade,
  useRemoverUnidade,
  useAdicionarDespesaGeral,
  useRemoverDespesaGeral,
} from './useImoveis';
import {
  useDashboardResumo,
  useTendenciaMensal,
  useReceitaPorOrigem,
} from './useDashboardResumo';
import { useFinanceiroMensal } from './useFinanceiroMensal';
import { useLancamentos } from "./useLancamentos";
import {
  useCanaisConexao,
  useLogSincronizacao,
  useSincronizarAgora,
  useSalvarLinkImportacao,
} from './useCanaisConexao';
import { useReservasCalendario } from './useReservasCalendario';

import { useAuth } from './AuthProvider';
import { LoginScreen } from './LoginScreen';

// Últimos `qtde` meses até hoje, no formato usado pelos seletores de período.
function gerarMeses(qtde = 12) {
  const hoje = new Date();
  const meses = [];
  for (let i = qtde - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
    const label = d
      .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      .replace('.', '');
    const dias = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    meses.push({
      key: chave,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      dias,
    });
  }
  return meses;
}
const MESES = gerarMeses(12);

/* ---------------------------------------------------------------- */
/* THEME TOKENS                                                      */
/* ---------------------------------------------------------------- */
const THEMES = {
  light: {
    bg: '#F6F7F9',
    surface: '#FFFFFF',
    surfaceAlt: '#F0F2F5',
    border: '#E4E7EC',
    text: '#171A21',
    textMuted: '#666D7A',
    primary: '#24467A',
    primarySoft: '#EAF0FA',
    gold: '#B8863B',
    goldSoft: '#FBF3E3',
    positive: '#1F8A5E',
    positiveSoft: '#E6F4ED',
    negative: '#C1443C',
    negativeSoft: '#FBEAE8',
  },
  dark: {
    bg: '#0E1116',
    surface: '#161B22',
    surfaceAlt: '#1B212A',
    border: '#262B33',
    text: '#E7E9EC',
    textMuted: '#8B93A1',
    primary: '#6E9AE0',
    primarySoft: '#1B2A42',
    gold: '#D8AE68',
    goldSoft: '#2B2416',
    positive: '#4FBE8B',
    positiveSoft: '173229',
    negative: '#E27871',
    negativeSoft: '#331A18',
  },
};

const FONT_DISPLAY = "'Sora', sans-serif";
const FONT_BODY = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

const money = (v) =>
  (v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

/* ---------------------------------------------------------------- */
/* Paleta fixa por origem de reserva — usada no Calendário e no gráfico de pizza */
/* ---------------------------------------------------------------- */
const CORES_ORIGEM = {
  Airbnb: '#FF5A5F',
  Booking: '#003580',
  Direta: '#B8863B',
  Outros: '#8B93A1',
};

/* ---------------------------------------------------------------- */
/* CÁLCULO — regra central: despesas gerais são rateadas entre as    */
/* unidades ATIVAS do imóvel; despesas específicas ficam só na       */
/* unidade que as gerou.                                             */
/* ---------------------------------------------------------------- */
function computeBuilding(b) {
    const ativas = b.unidades.filter((u) => u.situacao === 'Ativo');
      const despesasGeraisTotal = b.despesasGerais.reduce((s, d) => s + Number(d.valor ?? 0), 0);
        const rateio = ativas.length ? despesasGeraisTotal / ativas.length : 0;
          const receitaBruta = ativas.reduce((s, u) => s + Number(u.receitaMes ?? 0), 0);
            const receitaLiquida = receitaBruta * 0.91;
              const despesasEspecificasTotal = b.unidades.reduce((s, u) => s + Number(u.despesasEspecificas ?? 0), 0);
                const despesasTotais = despesasGeraisTotal + despesasEspecificasTotal;
                  const lucro = receitaLiquida - despesasTotais;
                    const investimentoTotal = b.unidades.reduce((s, u) => s + Number(u.valorAquisicao ?? 0) + Number(u.valorReforma ?? 0) + Number(u.valorMoveis ?? 0), 0);
                      const roiMensal = investimentoTotal > 0 ? (lucro / investimentoTotal) * 100 : 0;
                        const ocupacaoMedia = ativas.length ? Math.round(ativas.reduce((s, u) => s + Number(u.ocupacao ?? 0), 0) / ativas.length) : 0;
                          return { ativas, rateio, despesasGeraisTotal, receitaBruta, receitaLiquida, despesasEspecificasTotal, despesasTotais, lucro, investimentoTotal, roiMensal, ocupacaoMedia };
                          }
                          
                          function computeUnidade(u, rateio) {
                            const investimento = Number(u.valorAquisicao ?? 0) + Number(u.valorReforma ?? 0) + Number(u.valorMoveis ?? 0);
                            const rateioAplicado = u.situacao === 'Ativo' ? Number(rateio ?? 0) : 0;
                            const despesaTotal = Number(u.despesasEspecificas ?? 0) + rateioAplicado;
                            const lucro = Number(u.receitaMes ?? 0) * 0.91 - despesaTotal;
                            const roiMensal = investimento > 0 ? (lucro / investimento) * 100 : 0;
                            return { investimento, rateioAplicado, despesaTotal, lucro, roiMensal };
                          }
                          
/* ---------------------------------------------------------------- */
/* SMALL UI PRIMITIVES                                               */
/* ---------------------------------------------------------------- */
function KpiCard({
  t,
  icon: Icon,
  label,
  value,
  delta,
  deltaGood,
  hero,
  mono = true,
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2 min-w-0"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderLeft: hero ? `3px solid ${t.gold}` : `1px solid ${t.border}`,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] uppercase tracking-wide"
          style={{
            color: t.textMuted,
            fontFamily: FONT_BODY,
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </span>
        <Icon size={15} style={{ color: hero ? t.gold : t.textMuted }} />
      </div>
      <div
        className="text-xl font-semibold truncate"
        style={{ color: t.text, fontFamily: mono ? FONT_MONO : FONT_DISPLAY }}
      >
        {value}
      </div>
      {delta !== undefined && (
        <div
          className="flex items-center gap-1 text-[12px]"
          style={{
            color: deltaGood ? t.positive : t.negative,
            fontFamily: FONT_MONO,
          }}
        >
          {deltaGood ? (
            <ArrowUpRight size={13} />
          ) : (
            <ArrowDownRight size={13} />
          )}
          {delta}
        </div>
      )}
    </div>
  );
}

function PaybackRing({ t, percent, size = 52 }) {
  const p = Math.max(0, Math.min(100, percent));
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={t.border}
          strokeWidth={5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={t.gold}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span
        className="absolute text-[10px] font-semibold"
        style={{ color: t.text, fontFamily: FONT_MONO }}
      >
        {Math.round(p)}%
      </span>
    </div>
  );
}

function Badge({ t, tone = 'muted', children }) {
  const map = {
    positive: { bg: t.positiveSoft, fg: t.positive },
    negative: { bg: t.negativeSoft, fg: t.negative },
    gold: { bg: t.goldSoft, fg: t.gold },
    muted: { bg: t.surfaceAlt, fg: t.textMuted },
  };
  const s = map[tone];
  return (
    <span
      className="text-[11px] px-2 py-0.5 rounded-full font-medium"
      style={{ background: s.bg, color: s.fg, fontFamily: FONT_BODY }}
    >
      {children}
    </span>
  );
}

function Field({ t, label, children }) {
  return (
    <label
      className="flex flex-col gap-1 text-[12px]"
      style={{ color: t.textMuted, fontFamily: FONT_BODY }}
    >
      {label}
      {children}
    </label>
  );
}

/* ---------------------------------------------------------------- */
/* DASHBOARD VIEW (agregado de todos os imóveis e suas unidades)     */
/* ---------------------------------------------------------------- */
function Dashboard({ t, imoveis }) {
  const unidadesPorImovel = useMemo(() => {
    const mapa = {};
    imoveis.forEach((b) => {
      mapa[b.id] = b.unidades.map((u) => u.id);
    });
    return mapa;
  }, [imoveis]);
  const todasUnidadeIds = useMemo(
    () => Object.values(unidadesPorImovel).flat(),
    [unidadesPorImovel]
  );
      const periodoInicio = `${MESES[0].key}-01`;
        const ultimoMesKey = MESES[MESES.length - 1].key;
          const ultAno = Number(ultimoMesKey.slice(0, 4));
            const ultMes = Number(ultimoMesKey.slice(5, 7));
              const proxAno = ultMes === 12 ? ultAno + 1 : ultAno;
                const proxMes = ultMes === 12 ? 1 : ultMes + 1;
                  const periodoFimExcl = `${proxAno}-${String(proxMes).padStart(2, '0')}-01`;
  const ultimosSeisMeses = MESES.slice(-6); const [mesSel, setMesSel] = useState(''); const mSelFim = mesSel ? (Number(mesSel.slice(5,7)) === 12 ? (Number(mesSel.slice(0,4))+1) + '-01-01' : mesSel.slice(0,4) + '-' + String(Number(mesSel.slice(5,7))+1).padStart(2, '0') + '-01') : ''; const pIni = mesSel ? mesSel + '-01' : periodoInicio; const pFim = mesSel ? mSelFim : periodoFimExcl;

    const { data: resumo } = useDashboardResumo(unidadesPorImovel, pIni, pFim);
  const { data: tendencia = [] } = useTendenciaMensal(
    todasUnidadeIds,
    ultimosSeisMeses
  );
  const { data: origemReservas = [] } = useReceitaPorOrigem(todasUnidadeIds, pIni, pFim);

  const totais = resumo?.totais ?? { receita: 0, despesasTotais: 0, lucro: 0 };
  const receitaBruta = totais.receita;
  const receitaLiquida = receitaBruta * 0.91;
  const despesas = totais.despesasTotais;
  const lucro = totais.lucro;
  const investimentoTotal = imoveis.reduce(
    (s, b) =>
      s +
      b.unidades.reduce(
        (s2, u) => s2 + u.valorAquisicao + u.valorReforma + u.valorMoveis,
        0
      ),
    0
  );
  const roiMensal = investimentoTotal
    ? ((lucro / investimentoTotal) * 100).toFixed(2)
    : '0.00';
  const roiAnual = (roiMensal * 12).toFixed(1);
  const totalUnidadesAtivas = imoveis.reduce(
    (s, b) => s + b.unidades.filter((u) => u.situacao === 'Ativo').length,
    0
  );
  const totalNoites = imoveis.reduce((acc: any, b: any) => acc + Number(b.noites ?? 0), 0); const ticketMedio = totalNoites > 0 ? Math.round(receitaBruta / totalNoites) : 0;
  // TODO: calcular a partir de reservas (noites ocupadas / dias do mês / unidades ativas).
  const ocupacaoMedia = imoveis.length ? Math.round(imoveis.reduce((acc: any, b: any) => acc + Number(b.unidades?.[0]?.ocupacao ?? 0), 0) / imoveis.length) : 0;

  const porImovel = imoveis.map((b) => ({
    nome: b.nome.split(' ').slice(-1)[0],
    receita: Math.round(resumo?.porImovel?.[b.id]?.receita ?? 0),
    lucro: Math.round(resumo?.porImovel?.[b.id]?.lucro ?? 0),
  }));
  // Ocupação por imóvel ainda depende de "diárias ocupadas / dias do mês" — calcule a
  // partir de `reservas` (check_in/check_out) quando for construir a tela de indicadores.
  const ocupacaoPorImovel = imoveis.map((b) => ({
    nome: b.nome.split(' ').slice(-1)[0],
    ocupacao: 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="text-[12px]" style={{ fontFamily: FONT_BODY, color: t.textMuted }}><span>{mesSel ? 'Mês selecionado: ' : 'Período completo: '}</span>{resumo?.periodo?.inicio ? new Date(resumo.periodo.inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} até {resumo?.periodo?.fim ? new Date(resumo.periodo.fim + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</div><select value={mesSel} onChange={(e) => setMesSel(e.target.value)} className={'rounded-lg px-2 py-1 text-[12px] outline-none ml-3'} style={{ background: t.surface, border: 1 + 'px solid ' + t.border, color: t.text, fontFamily: FONT_BODY }}><option value={''}>Período completo</option>{MESES.map((m) => (<option key={m.key} value={m.key}>{m.label}</option>))}</select>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          t={t}
          icon={CircleDollarSign}
          label="Receita Bruta (mês)"
          value={money(receitaBruta)}
          delta="+8,2% vs mês anterior"
          deltaGood
        />
        <KpiCard
          t={t}
          icon={Wallet}
          label="Receita Líquida"
          value={money(receitaLiquida)}
          delta="+6,9% vs mês anterior"
          deltaGood
        />
        <KpiCard
          t={t}
          icon={Receipt}
          label="Despesas (gerais + específicas)"
          value={money(despesas)}
          delta="+2,1% vs mês anterior"
          deltaGood={false}
        />
        <KpiCard
          t={t}
          icon={TrendingUp}
          label="Lucro Líquido"
          value={money(lucro)}
          delta="+9,4% vs mês anterior"
          deltaGood
          hero
        />
        <KpiCard
          t={t}
          icon={Percent}
          label="Ocupação Média"
          value={`${ocupacaoMedia}%`}
        />
        <KpiCard
          t={t}
          icon={TrendingUp}
          label="ROI do período"
          value={`${roiMensal}%`}
        />
        <KpiCard
          t={t}
          icon={TrendingUp}
          label="ROI Anual (proj.)"
          value={`${roiAnual}%`}
        />
        <KpiCard
          t={t}
          icon={CalendarDays}
          label="Ticket Médio / Diária"
          value={money(ticketMedio)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: t.text, fontFamily: FONT_DISPLAY }}
          >
            Receita x Despesas por mês
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={tendencia}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.border}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke={t.textMuted}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={t.textMuted}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(v) => money(v)}
              />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: FONT_BODY }} />
              <Bar
                dataKey="receita"
                name="Receita"
                fill={t.primary}
                radius={[6, 6, 0, 0]}
                barSize={20}
              />
              <Bar
                dataKey="despesa"
                name="Despesa"
                fill={t.negative}
                radius={[6, 6, 0, 0]}
                barSize={20}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: t.text, fontFamily: FONT_DISPLAY }}
          >
            Origem das reservas
          </h3>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie
                data={origemReservas}
                dataKey="valor"
                nameKey="nome"
                innerRadius={42}
                outerRadius={70}
                paddingAngle={3}
              >
                {origemReservas.map((o) => (
                  <Cell key={o.nome} fill={o.cor} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(v) => money(v)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-2">
            {origemReservas.map((o) => (
              <div
                key={o.nome}
                className="flex items-center justify-between text-[12px]"
                style={{ color: t.textMuted, fontFamily: FONT_BODY }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: o.cor }}
                  />
                  {o.nome}
                </span>
                <span style={{ fontFamily: FONT_MONO, color: t.text }}>
                  {money(o.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="rounded-2xl p-5"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: t.text, fontFamily: FONT_DISPLAY }}
          >
            Lucro (últimos 7 meses)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={tendencia}>
              <defs>
                <linearGradient id="lucroFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.gold} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={t.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.border}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke={t.textMuted}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(v) => money(v)}
              />
              <Area
                type="monotone"
                dataKey="lucro"
                stroke={t.gold}
                fill="url(#lucroFill)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: t.text, fontFamily: FONT_DISPLAY }}
          >
            Receita e lucro por imóvel
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={porImovel}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.border}
                vertical={false}
              />
              <XAxis
                dataKey="nome"
                stroke={t.textMuted}
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(v) => money(v)}
              />
              <Bar
                dataKey="receita"
                name="Receita"
                fill={t.primary}
                radius={[6, 6, 0, 0]}
                barSize={16}
              />
              <Bar
                dataKey="lucro"
                name="Lucro"
                fill={t.positive}
                radius={[6, 6, 0, 0]}
                barSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: t.text, fontFamily: FONT_DISPLAY }}
          >
            Ocupação média por imóvel
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={ocupacaoPorImovel}
              layout="vertical"
              margin={{ left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={t.border}
                horizontal={false}
              />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="nome"
                stroke={t.textMuted}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(v) => `${v}%`}
              />
              <Bar
                dataKey="ocupacao"
                fill={t.gold}
                radius={[0, 6, 6, 0]}
                barSize={12}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* FORMULÁRIOS                                                       */
/* ---------------------------------------------------------------- */
function ModalShell({ t, title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div
        className={`w-full ${
          wide ? 'max-w-2xl' : 'max-w-md'
        } rounded-2xl p-6 max-h-[90vh] overflow-y-auto`}
        style={{ background: t.surface, border: `1px solid ${t.border}` }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-lg font-semibold"
            style={{ color: t.text, fontFamily: FONT_DISPLAY }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ color: t.textMuted }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyleFn = (t) => ({
  background: t.surfaceAlt,
  border: `1px solid ${t.border}`,
  color: t.text,
  fontFamily: FONT_BODY,
});

function NovoImovelForm({ t, onClose, onSave }) {
  const [f, setF] = useState({
    nome: '',
    codigo: '',
    endereco: '',
    cidade: '',
    situacao: 'Ativo',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const inputStyle = inputStyleFn(t);
  return (
    <ModalShell
      t={t}
      title="Cadastrar imóvel (prédio / condomínio)"
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field t={t} label="Nome do imóvel">
          <input
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.nome}
            onChange={set('nome')}
            placeholder="Flats Lumiéri"
          />
        </Field>
        <Field t={t} label="Código">
          <input
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.codigo}
            onChange={set('codigo')}
            placeholder="LUM"
          />
        </Field>
        <Field t={t} label="Endereço">
          <input
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.endereco}
            onChange={set('endereco')}
          />
        </Field>
        <Field t={t} label="Cidade">
          <input
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.cidade}
            onChange={set('cidade')}
          />
        </Field>
        <Field t={t} label="Situação">
          <select
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.situacao}
            onChange={set('situacao')}
          >
            <option>Ativo</option>
            <option>Inativo</option>
          </select>
        </Field>
      </div>
      <p
        className="text-[12px] mt-3"
        style={{ color: t.textMuted, fontFamily: FONT_BODY }}
      >
        Depois de criar o imóvel, você adiciona as unidades (flats) e as
        despesas gerais dentro dele.
      </p>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm"
          style={{ color: t.textMuted, fontFamily: FONT_BODY }}
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            if (f.nome) {
              onSave({
                ...f,
                id: Date.now(),
                foto: `https://picsum.photos/seed/${encodeURIComponent(
                  f.nome
                )}/480/320`,
                despesasGerais: [],
                unidades: [],
              });
              onClose();
            }
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            background: t.primary,
            color: '#fff',
            fontFamily: FONT_BODY,
          }}
        >
          Salvar imóvel
        </button>
      </div>
    </ModalShell>
  );
}

const UNIDADE_VAZIA = {
  numero: '',
  situacao: 'Ativo',
  valorAquisicao: '',
  valorReforma: '',
  valorMoveis: '',
  metragem: '',
  quartos: '',
  camas: '',
  receitaMes: '',
  despesasEspecificas: '',
  ocupacao: '',
};

function NovaUnidadeForm({ t, onClose, onSave }) {
  const [f, setF] = useState(UNIDADE_VAZIA);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const inputStyle = inputStyleFn(t);
  const total =
    (Number(f.valorAquisicao) || 0) +
    (Number(f.valorReforma) || 0) +
    (Number(f.valorMoveis) || 0);
  return (
    <ModalShell t={t} title="Adicionar flat / unidade" onClose={onClose} wide>
      <div className="grid grid-cols-3 gap-3">
        <Field t={t} label="Número / nome">
          <input
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.numero}
            onChange={set('numero')}
            placeholder="Flat 08"
          />
        </Field>
        <Field t={t} label="Situação">
          <select
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.situacao}
            onChange={set('situacao')}
          >
            <option>Ativo</option>
            <option>Inativo</option>
          </select>
        </Field>
        <Field t={t} label="Ocupação atual (%)">
          <input
            type="number"
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.ocupacao}
            onChange={set('ocupacao')}
          />
        </Field>
        <Field t={t} label="Valor de aquisição (R$)">
          <input
            type="number"
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.valorAquisicao}
            onChange={set('valorAquisicao')}
          />
        </Field>
        <Field t={t} label="Reforma (R$)">
          <input
            type="number"
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.valorReforma}
            onChange={set('valorReforma')}
          />
        </Field>
        <Field t={t} label="Móveis (R$)">
          <input
            type="number"
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.valorMoveis}
            onChange={set('valorMoveis')}
          />
        </Field>
        <Field t={t} label="Investimento total">
          <div
            className="rounded-lg px-3 py-2 text-sm font-semibold"
            style={{ ...inputStyle, fontFamily: FONT_MONO, color: t.gold }}
          >
            {money(total)}
          </div>
        </Field>
        <Field t={t} label="Metragem (m²)">
          <input
            type="number"
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.metragem}
            onChange={set('metragem')}
          />
        </Field>
        <Field t={t} label="Quartos">
          <input
            type="number"
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.quartos}
            onChange={set('quartos')}
          />
        </Field>
        <Field t={t} label="Receita do mês (R$)">
          <input
            type="number"
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.receitaMes}
            onChange={set('receitaMes')}
          />
        </Field>
        <Field t={t} label="Despesa específica do mês (R$)">
          <input
            type="number"
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.despesasEspecificas}
            onChange={set('despesasEspecificas')}
          />
        </Field>
      </div>
      <p
        className="text-[12px] mt-3"
        style={{ color: t.textMuted, fontFamily: FONT_BODY }}
      >
        As despesas gerais do imóvel serão rateadas automaticamente entre esta e
        as demais unidades ativas — não precisa lançar aqui.
      </p>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm"
          style={{ color: t.textMuted, fontFamily: FONT_BODY }}
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            if (f.numero) {
              const receitaMes = Number(f.receitaMes) || 0;
              const despesasEspecificas = Number(f.despesasEspecificas) || 0;
              const ocupacao = Number(f.ocupacao) || 0;
              const id = Date.now();
              onSave({
                id,
                numero: f.numero,
                situacao: f.situacao,
                valorAquisicao: Number(f.valorAquisicao) || 0,
                valorReforma: Number(f.valorReforma) || 0,
                valorMoveis: Number(f.valorMoveis) || 0,
                metragem: Number(f.metragem) || 0,
                quartos: Number(f.quartos) || 0,
                camas: Number(f.quartos) || 0,
                receitaMes,
                despesasEspecificas,
                ocupacao,
                historico: gerarHistoricoUnidade(
                  receitaMes,
                  despesasEspecificas,
                  ocupacao,
                  id
                ),
              });
              onClose();
            }
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            background: t.primary,
            color: '#fff',
            fontFamily: FONT_BODY,
          }}
        >
          Salvar unidade
        </button>
      </div>
    </ModalShell>
  );
}

function NovaDespesaGeralForm({ t, onClose, onSave, numUnidadesAtivas }) {
  const [f, setF] = useState({
    categoria: 'Condomínio',
    descricao: '',
    valor: '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const inputStyle = inputStyleFn(t);
  const rateio = numUnidadesAtivas
    ? (Number(f.valor) || 0) / numUnidadesAtivas
    : 0;
  return (
    <ModalShell
      t={t}
      title="Adicionar despesa geral do imóvel"
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-3">
        <Field t={t} label="Categoria">
          <select
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.categoria}
            onChange={set('categoria')}
          >
            {[
              'Condomínio',
              'Energia',
              'Água',
              'Internet',
              'Limpeza',
              'Segurança',
              'Manutenção',
              'IPTU',
              'Seguro',
              'Outros',
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field t={t} label="Descrição">
          <input
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.descricao}
            onChange={set('descricao')}
          />
        </Field>
        <Field t={t} label="Valor total (R$)">
          <input
            type="number"
            style={inputStyle}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            value={f.valor}
            onChange={set('valor')}
          />
        </Field>
      </div>
      <div
        className="mt-3 rounded-lg px-3 py-2 text-[12px]"
        style={{ background: t.goldSoft, color: t.gold, fontFamily: FONT_BODY }}
      >
        Será dividido entre {numUnidadesAtivas} unidade(s) ativa(s) →{' '}
        <b style={{ fontFamily: FONT_MONO }}>{money(rateio)}</b> por unidade.
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm"
          style={{ color: t.textMuted, fontFamily: FONT_BODY }}
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            if (f.valor) {
              onSave({
                id: Date.now(),
                categoria: f.categoria,
                descricao: f.descricao,
                valor: Number(f.valor) || 0,
              });
              onClose();
            }
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            background: t.primary,
            color: '#fff',
            fontFamily: FONT_BODY,
          }}
        >
          Salvar despesa
        </button>
      </div>
    </ModalShell>
  );
}

/* ---------------------------------------------------------------- */
/* DETALHE DO IMÓVEL (prédio) — unidades + despesas gerais           */
/* ---------------------------------------------------------------- */
function BuildingDetail({ t, building, onBack }) { const [editando, setEditando] = useState(false); const [ed, setEd] = useState({ nome: 0, codigo: 0, endereco: 0, cidade: 0, situacao: 0 } as any); const editarImovel = useEditarImovel();
  const [showUnidade, setShowUnidade] = useState(false);
  const [showDespesa, setShowDespesa] = useState(false);
    const [deIdx, setDeIdx] = useState(0);
  const [ateIdx, setAteIdx] = useState(MESES.length - 1);
  const c = computeBuilding(building);

  const unidadeIds = useMemo(
    () => building.unidades.map((u) => u.id),
    [building]
  );
  const { data: periodo = [] } = useFinanceiroMensal(
    building.id,
    unidadeIds,
    MESES[deIdx].key,
    MESES[ateIdx].key
  );

  const periodoTotais = periodo.reduce(
    (acc, m) => ({
      receita: acc.receita + m.receita,
      despGerais: acc.despGerais + m.despGerais,
      despEspecificas: acc.despEspecificas + m.despEspecificas,
      despesasTotais: acc.despesasTotais + m.despesasTotais,
      lucro: acc.lucro + m.lucro,
      ocupacaoSoma: acc.ocupacaoSoma + m.ocupacaoMedia,
    }),
    {
      receita: 0,
      despGerais: 0,
      despEspecificas: 0,
      despesasTotais: 0,
      lucro: 0,
      ocupacaoSoma: 0,
    }
  );
  const ocupacaoMediaPeriodo = periodo.length
    ? Math.round(periodoTotais.ocupacaoSoma / periodo.length)
    : 0;
  const investimentoTotal = building.unidades.reduce(
    (s, u) => s + u.valorAquisicao + u.valorReforma + u.valorMoveis,
    0
  );
  const n = periodo.length || 1;
  const media = {
    receita: periodoTotais.receita / n,
    despGerais: periodoTotais.despGerais / n,
    despEspecificas: periodoTotais.despEspecificas / n,
    despesasTotais: periodoTotais.despesasTotais / n,
    lucro: periodoTotais.lucro / n,
    ocupacao: ocupacaoMediaPeriodo,
    roiMensal: periodo.length
      ? periodo.reduce((s, m) => s + m.roiMensal, 0) / n
      : 0,
  };

  const adicionarUnidade = useAdicionarUnidade();
  const removerUnidade = useRemoverUnidade();
  const adicionarDespesaGeral = useAdicionarDespesaGeral();
  const removerDespesaGeral = useRemoverDespesaGeral();

  const addUnidade = (u) =>
    adicionarUnidade.mutate({
      imovelId: building.id,
      numero: u.numero,
      situacao: u.situacao,
      valorAquisicao: u.valorAquisicao,
      valorReforma: u.valorReforma,
      valorMoveis: u.valorMoveis,
      metragem: u.metragem,
      quartos: u.quartos,
      camas: u.camas,
    });
  const addDespesa = (d) =>
    adicionarDespesaGeral.mutate({
      imovelId: building.id,
      categoria: d.categoria,
      descricao: d.descricao,
      valor: d.valor,
      competencia: `${MESES[MESES.length - 1].key}-01`, // lançada no mês atual por padrão
    });
  const removeDespesa = (id) => removerDespesaGeral.mutate(id);
  const removeUnidade = (id) => removerUnidade.mutate(id);

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] font-medium w-fit"
        style={{ color: t.textMuted, fontFamily: FONT_BODY }}
      >
        <ArrowLeft size={15} /> Voltar para imóveis
      </button> <button onClick={() => { setEd({ nome: building.nome, codigo: building.codigo, endereco: building.endereco || String(), cidade: building.cidade || String(), situacao: building.situacao, foto: building.foto || String(), valorAquisicao: building.valorAquisicao || 0, valorReforma: building.valorReforma || 0, valorMoveis: building.valorMoveis || 0 }); setEditando(true); }} className={'text-[12px] rounded-lg px-3 py-2 ml-3'} style={{ background: t.primarySoft, color: t.primary, fontFamily: FONT_BODY, alignSelf: 'flex-start', width: 'fit-content' }}>Editar imóvel</button> {editando && (<div className={'rounded-2xl p-5 mt-3'} style={{ background: t.surface, border: 1 + 'px solid ' + t.border }}><div className={'text-[15px] font-semibold'} style={{ color: t.text, fontFamily: FONT_DISPLAY }}>Editar imóvel</div><div className={'text-[12px]'} style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Dados cadastrais e investimento total do prédio</div><div className={'text-[11px] uppercase mb-2 mt-5'} style={{ color: t.textMuted, letterSpacing: 1, fontFamily: FONT_BODY }}>Identificação</div><div className={'grid grid-cols-1 sm:grid-cols-2 gap-4'}><div><label className={'block text-[11px] mb-1.5'} style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Nome do imóvel</label><input type={'text'} value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} className={'w-full rounded-lg px-3 py-2 text-sm outline-none'} style={{ background: t.bg, border: 1 + 'px solid ' + t.border, color: t.text }} /></div><div><label className={'block text-[11px] mb-1.5'} style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Código</label><input type={'text'} value={ed.codigo} onChange={(e) => setEd({ ...ed, codigo: e.target.value })} className={'w-full rounded-lg px-3 py-2 text-sm outline-none'} style={{ background: t.bg, border: 1 + 'px solid ' + t.border, color: t.text }} /></div></div><div className={'text-[11px] uppercase mb-2 mt-5'} style={{ color: t.textMuted, letterSpacing: 1, fontFamily: FONT_BODY }}>Localização</div><div className={'grid grid-cols-1 sm:grid-cols-2 gap-4'}><div><label className={'block text-[11px] mb-1.5'} style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Endereço</label><input type={'text'} value={ed.endereco} onChange={(e) => setEd({ ...ed, endereco: e.target.value })} className={'w-full rounded-lg px-3 py-2 text-sm outline-none'} style={{ background: t.bg, border: 1 + 'px solid ' + t.border, color: t.text }} /></div><div><label className={'block text-[11px] mb-1.5'} style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Cidade</label><input type={'text'} value={ed.cidade} onChange={(e) => setEd({ ...ed, cidade: e.target.value })} className={'w-full rounded-lg px-3 py-2 text-sm outline-none'} style={{ background: t.bg, border: 1 + 'px solid ' + t.border, color: t.text }} /></div></div><div className={'text-[11px] uppercase mb-2 mt-5'} style={{ color: t.textMuted, letterSpacing: 1, fontFamily: FONT_BODY }}>Situação e foto</div><div className={'grid grid-cols-1 sm:grid-cols-2 gap-4'}><div><label className={'block text-[11px] mb-1.5'} style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Situação</label><select value={ed.situacao} onChange={(e) => setEd({ ...ed, situacao: e.target.value })} className={'w-full rounded-lg px-3 py-2 text-sm outline-none'} style={{ background: t.bg, border: 1 + 'px solid ' + t.border, color: t.text }}><option value={'Ativo'}>Ativo</option><option value={'Inativo'}>Inativo</option></select></div><div><label className={'block text-[11px] mb-1.5'} style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Foto do imóvel</label><input type={'file'} accept={'image/*'} onChange={async (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; try { const url = await uploadFotoImovel(building.id, f); setEd({ ...ed, foto: url }); } catch (err) { alert('Falha ao enviar a foto'); } }} className={'w-full rounded-lg px-3 py-2 text-sm outline-none'} style={{ background: t.bg, border: 1 + 'px solid ' + t.border, color: t.text }} /></div></div><div className={'text-[11px] uppercase mb-2 mt-5'} style={{ color: t.textMuted, letterSpacing: 1, fontFamily: FONT_BODY }}>Investimento total do prédio</div><div className={'grid grid-cols-1 sm:grid-cols-3 gap-4'}><div><label className={'block text-[11px] mb-1.5'} style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Aquisição (R$)</label><input type={'number'} value={ed.valorAquisicao} onChange={(e) => setEd({ ...ed, valorAquisicao: e.target.value })} className={'w-full rounded-lg px-3 py-2 text-sm outline-none'} style={{ background: t.bg, border: 1 + 'px solid ' + t.border, color: t.text }} /></div><div><label className={'block text-[11px] mb-1.5'} style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Reforma (R$)</label><input type={'number'} value={ed.valorReforma} onChange={(e) => setEd({ ...ed, valorReforma: e.target.value })} className={'w-full rounded-lg px-3 py-2 text-sm outline-none'} style={{ background: t.bg, border: 1 + 'px solid ' + t.border, color: t.text }} /></div><div><label className={'block text-[11px] mb-1.5'} style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Móveis (R$)</label><input type={'number'} value={ed.valorMoveis} onChange={(e) => setEd({ ...ed, valorMoveis: e.target.value })} className={'w-full rounded-lg px-3 py-2 text-sm outline-none'} style={{ background: t.bg, border: 1 + 'px solid ' + t.border, color: t.text }} /></div></div><div className={'text-[11px] mt-2'} style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Rateado igualmente entre as unidades ativas para o cálculo de ROI.</div><div className={'flex gap-2 mt-5 pt-4'} style={{ borderTop: 1 + 'px solid ' + t.border }}><button onClick={() => { editarImovel.mutate({ id: building.id, ...ed }); setEditando(false); }} className={'text-[13px] rounded-lg px-4 py-2'} style={{ background: t.primary, color: t.surface, fontFamily: FONT_BODY }}>Salvar alterações</button><button onClick={() => setEditando(false)} className={'text-[13px] rounded-lg px-4 py-2'} style={{ background: t.bg, color: t.textMuted, border: 1 + 'px solid ' + t.border, fontFamily: FONT_BODY }}>Cancelar</button></div></div>)}

      <div
        className="rounded-2xl overflow-hidden flex flex-col sm:flex-row"
        style={{ background: t.surface, border: `1px solid ${t.border}` }}
      >
        <img
          src={building.foto}
          alt={building.nome}
          className="w-full sm:w-56 h-40 object-cover"
        />
        <div className="p-5 flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2
              className="text-lg font-bold"
              style={{ color: t.text, fontFamily: FONT_DISPLAY }}
            >
              {building.nome}
            </h2>
            <Badge t={t} tone="gold">
              {building.codigo}
            </Badge>
            <Badge
              t={t}
              tone={building.situacao === 'Ativo' ? 'positive' : 'muted'}
            >
              {building.situacao}
            </Badge>
          </div>
          <div
            className="flex items-center gap-1.5 text-[12px]"
            style={{ color: t.textMuted, fontFamily: FONT_BODY }}
          >
            <MapPin size={12} /> {building.endereco}, {building.cidade}
          </div>
          <div
            className="flex items-center gap-1.5 text-[12px]"
            style={{ color: t.textMuted, fontFamily: FONT_BODY }}
          >
            <Layers size={12} /> {c.ativas.length} de {building.unidades.length}{' '}
            unidades ativas
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          t={t}
          icon={CircleDollarSign}
          label="Receita bruta"
                    value={money(periodoTotais.receita)}
        />
        <KpiCard
          t={t}
          icon={Receipt}
          label="Despesas totais"
                    value={money(periodoTotais.despesasTotais)}
        />
        <KpiCard
          t={t}
          icon={TrendingUp}
          label="Lucro"
                    value={money(periodoTotais.lucro)}
          hero
        />
        <KpiCard
          t={t}
          icon={Percent}
          label="ROI mensal"
                    value={c.investimentoTotal > 0 ? `${((periodoTotais.lucro / c.investimentoTotal) * 100).toFixed(2)}%` : '0.00%'}
        />
      </div>

      {/* Filtro de período + detalhamento mês a mês */}
      <div
        className="rounded-2xl p-5"
        style={{ background: t.surface, border: `1px solid ${t.border}` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3
            className="text-sm font-semibold"
            style={{ color: t.text, fontFamily: FONT_DISPLAY }}
          >
            Receita e despesas mês a mês
          </h3>
          <div
            className="flex items-center gap-2 text-[12px]"
            style={{ fontFamily: FONT_BODY, color: t.textMuted }}
          >
            <span>De</span>
            <select
              value={deIdx}
              onChange={(e) => {
                const v = Number(e.target.value);
                setDeIdx(v);
                if (v > ateIdx) setAteIdx(v);
              }}
              className="rounded-lg px-2 py-1.5 text-[12px] outline-none"
              style={inputStyleFn(t)}
            >
              {MESES.map((m, i) => (
                <option key={m.key} value={i}>
                  {m.label}
                </option>
              ))}
            </select>
            <span>até</span>
            <select
              value={ateIdx}
              onChange={(e) => {
                const v = Number(e.target.value);
                setAteIdx(v);
                if (v < deIdx) setDeIdx(v);
              }}
              className="rounded-lg px-2 py-1.5 text-[12px] outline-none"
              style={inputStyleFn(t)}
            >
              {MESES.map((m, i) => (
                <option key={m.key} value={i}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <KpiCard
            t={t}
            icon={CircleDollarSign}
            label="Receita no período"
            value={money(periodoTotais.receita)}
          />
          <KpiCard
            t={t}
            icon={Receipt}
            label="Despesas gerais"
            value={money(periodoTotais.despGerais)}
          />
          <KpiCard
            t={t}
            icon={Receipt}
            label="Despesas específicas"
            value={money(periodoTotais.despEspecificas)}
          />
          <KpiCard
            t={t}
            icon={TrendingUp}
            label="Lucro no período"
            value={money(periodoTotais.lucro)}
            hero
          />
          <KpiCard
            t={t}
            icon={Percent}
            label="Ocup. média / ROI médio mensal"
            value={`${ocupacaoMediaPeriodo}% · ${media.roiMensal.toFixed(2)}%`}
            mono={false}
          />
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={periodo}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={t.border}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke={t.textMuted}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={t.textMuted}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              contentStyle={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                fontSize: 12,
              }}
              formatter={(v) => money(v)}
            />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: FONT_BODY }} />
            <Bar
              dataKey="receita"
              name="Receita"
              fill={t.primary}
              radius={[6, 6, 0, 0]}
              barSize={20}
            />
            <Bar
              dataKey="despesasTotais"
              name="Despesas"
              fill={t.negative}
              radius={[6, 6, 0, 0]}
              barSize={20}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="overflow-x-auto mt-4">
          <table
            className="w-full text-[12px] min-w-[680px]"
            style={{ fontFamily: FONT_BODY, color: t.text }}
          >
            <thead>
              <tr className="text-left" style={{ color: t.textMuted }}>
                <th className="py-2 pr-3">Mês</th>
                <th className="py-2 pr-3">Receita</th>
                <th className="py-2 pr-3">Desp. gerais</th>
                <th className="py-2 pr-3">Desp. específicas</th>
                <th className="py-2 pr-3">Desp. totais</th>
                <th className="py-2 pr-3">Lucro</th>
                <th className="py-2 pr-3">Ocupação</th>
                <th className="py-2 pr-3">ROI mensal</th>
              </tr>
            </thead>
            <tbody>
              {periodo.filter((m: any) => Number(m.receita ?? 0) !== 0 || Number(m.despesaTotal ?? m.despesa ?? 0) !== 0).map((m) => (
                <tr
                  key={m.mes}
                  className="border-t"
                  style={{ borderColor: t.border }}
                >
                  <td className="py-2 pr-3 font-medium">{m.label}</td>
                  <td className="py-2 pr-3" style={{ fontFamily: FONT_MONO }}>
                    {money(m.receita)}
                  </td>
                  <td className="py-2 pr-3" style={{ fontFamily: FONT_MONO }}>
                    {money(m.despGerais)}
                  </td>
                  <td className="py-2 pr-3" style={{ fontFamily: FONT_MONO }}>
                    {money(m.despEspecificas)}
                  </td>
                  <td className="py-2 pr-3" style={{ fontFamily: FONT_MONO }}>
                    {money(m.despesasTotais)}
                  </td>
                  <td
                    className="py-2 pr-3 font-semibold"
                    style={{
                      fontFamily: FONT_MONO,
                      color: m.lucro >= 0 ? t.positive : t.negative,
                    }}
                  >
                    {money(m.lucro)}
                  </td>
                  <td className="py-2 pr-3" style={{ fontFamily: FONT_MONO }}>
                    {m.ocupacaoMedia}%
                  </td>
                  <td className="py-2 pr-3" style={{ fontFamily: FONT_MONO }}>
                    {m.roiMensal.toFixed(2)}%
                  </td>
                </tr>
              ))}
              <tr
                className="border-t-2"
                style={{ borderColor: t.gold, background: t.goldSoft }}
              >
                <td
                  className="py-2 pr-3 font-semibold"
                  style={{ color: t.gold }}
                >
                  Média do período
                </td>
                <td
                  className="py-2 pr-3 font-semibold"
                  style={{ fontFamily: FONT_MONO, color: t.gold }}
                >
                  {money(media.receita)}
                </td>
                <td
                  className="py-2 pr-3 font-semibold"
                  style={{ fontFamily: FONT_MONO, color: t.gold }}
                >
                  {money(media.despGerais)}
                </td>
                <td
                  className="py-2 pr-3 font-semibold"
                  style={{ fontFamily: FONT_MONO, color: t.gold }}
                >
                  {money(media.despEspecificas)}
                </td>
                <td
                  className="py-2 pr-3 font-semibold"
                  style={{ fontFamily: FONT_MONO, color: t.gold }}
                >
                  {money(media.despesasTotais)}
                </td>
                <td
                  className="py-2 pr-3 font-semibold"
                  style={{ fontFamily: FONT_MONO, color: t.gold }}
                >
                  {money(media.lucro)}
                </td>
                <td
                  className="py-2 pr-3 font-semibold"
                  style={{ fontFamily: FONT_MONO, color: t.gold }}
                >
                  {media.ocupacao}%
                </td>
                <td
                  className="py-2 pr-3 font-semibold"
                  style={{ fontFamily: FONT_MONO, color: t.gold }}
                >
                  {media.roiMensal.toFixed(2)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Despesas gerais rateadas */}
      <div
        className="rounded-2xl p-5"
        style={{ background: t.surface, border: `1px solid ${t.border}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: t.text, fontFamily: FONT_DISPLAY }}
            >
              Despesas gerais do imóvel
            </h3>
            <p
              className="text-[12px]"
              style={{ color: t.textMuted, fontFamily: FONT_BODY }}
            >
              Rateadas automaticamente entre as {c.ativas.length} unidades
              ativas — {money(c.rateio)} cada.
            </p>
          </div>
          <button
            onClick={() => setShowDespesa(true)}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg"
            style={{
              background: t.primarySoft,
              color: t.primary,
              fontFamily: FONT_BODY,
            }}
          >
            <Plus size={14} /> Nova despesa geral
          </button>
        </div>
        <div
          className="flex flex-col divide-y"
          style={{ borderColor: t.border }}
        >
          {building.despesasGerais.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between py-2 text-[13px]"
              style={{ color: t.text, fontFamily: FONT_BODY }}
            >
              <div>
            <span style={{ fontFamily: FONT_MONO, color: t.textMuted, marginRight: 8 }}>
                          {d.competencia ? new Date(d.competencia + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                                      </span>
                                                      <span className="font-medium">{d.categoria}</span>
                {d.descricao && (
                  <span style={{ color: t.textMuted }}> · {d.descricao}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: FONT_MONO }}>{money(d.valor)}</span>
                <button
                  onClick={() => removeDespesa(d.id)}
                  style={{ color: t.textMuted }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {building.despesasGerais.length === 0 && (
            <p
              className="text-[12px] py-2"
              style={{ color: t.textMuted, fontFamily: FONT_BODY }}
            >
              Nenhuma despesa geral lançada.
            </p>
          )}
        </div>
      </div>

      {/* Unidades */}
      <div
        className="rounded-2xl p-5 overflow-x-auto"
        style={{ background: t.surface, border: `1px solid ${t.border}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-sm font-semibold"
            style={{ color: t.text, fontFamily: FONT_DISPLAY }}
          >
            Unidades (flats)
          </h3>
          <button
            onClick={() => setShowUnidade(true)}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg"
            style={{
              background: t.primary,
              color: '#fff',
              fontFamily: FONT_BODY,
            }}
          >
            <Plus size={14} /> Adicionar flat
          </button>
        </div>
        <table
          className="w-full text-[12px] min-w-[720px]"
          style={{ fontFamily: FONT_BODY, color: t.text }}
        >
          <thead>
            <tr className="text-left" style={{ color: t.textMuted }}>
              <th className="py-2 pr-3">Unidade</th>
              <th className="py-2 pr-3">Situação</th>
              <th className="py-2 pr-3">Ocupação</th>
              <th className="py-2 pr-3">Receita</th>
              <th className="py-2 pr-3">Desp. específica</th>
              <th className="py-2 pr-3">Rateio recebido</th>
              <th className="py-2 pr-3">Lucro</th>
              <th className="py-2 pr-3">ROI mensal</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {building.unidades.map((u) => {
              const cu = computeUnidade(u, c.rateio);
              return (
                <tr
                  key={u.id}
                  className="border-t"
                  style={{ borderColor: t.border }}
                >
                  <td className="py-2 pr-3 font-medium">{u.numero}</td>
                  <td className="py-2 pr-3">
                    <Badge
                      t={t}
                      tone={u.situacao === 'Ativo' ? 'positive' : 'muted'}
                    >
                      {u.situacao}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3" style={{ fontFamily: FONT_MONO }}>
                    {u.ocupacao}%
                  </td>
                  <td className="py-2 pr-3" style={{ fontFamily: FONT_MONO }}>
                    {money(u.receitaMes)}
                  </td>
                  <td className="py-2 pr-3" style={{ fontFamily: FONT_MONO }}>
                    {money(u.despesasEspecificas)}
                  </td>
                  <td
                    className="py-2 pr-3"
                    style={{ fontFamily: FONT_MONO, color: t.gold }}
                  >
                    {money(cu.rateioAplicado)}
                  </td>
                  <td
                    className="py-2 pr-3 font-semibold"
                    style={{
                      fontFamily: FONT_MONO,
                      color: cu.lucro >= 0 ? t.positive : t.negative,
                    }}
                  >
                    {money(cu.lucro)}
                  </td>
                  <td className="py-2 pr-3" style={{ fontFamily: FONT_MONO }}>
                    {cu.roiMensal.toFixed(2)}%
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      onClick={() => removeUnidade(u.id)}
                      style={{ color: t.textMuted }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showUnidade && (
        <NovaUnidadeForm
          t={t}
          onClose={() => setShowUnidade(false)}
          onSave={addUnidade}
        />
      )}
      {showDespesa && (
        <NovaDespesaGeralForm
          t={t}
          onClose={() => setShowDespesa(false)}
          onSave={addDespesa}
          numUnidadesAtivas={c.ativas.length}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* LISTA DE IMÓVEIS                                                   */
/* ---------------------------------------------------------------- */
function ImovelCard({ t, building, onOpen }) {
  const c = computeBuilding(building);
  return (
    <button
      onClick={onOpen}
      className="rounded-2xl overflow-hidden flex flex-col text-left"
      style={{ background: t.surface, border: `1px solid ${t.border}` }}
    >
      <div className="relative h-32">
        <img
          src={building.foto}
          alt={building.nome}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <Badge
            t={t}
            tone={building.situacao === 'Ativo' ? 'positive' : 'muted'}
          >
            {building.situacao}
          </Badge>
        </div>
        <div className="absolute bottom-2 left-2">
          <Badge t={t}>
            <Layers size={11} className="inline mr-1 -mt-0.5" />
            {c.ativas.length}/{building.unidades.length} unidades
          </Badge>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: t.text, fontFamily: FONT_DISPLAY }}
            >
              {building.nome}
            </h3>
            <span
              className="text-[11px]"
              style={{ color: t.textMuted, fontFamily: FONT_MONO }}
            >
              {building.codigo}
            </span>
          </div>
          <PaybackRing
            t={t}
            percent={
              c.investimentoTotal
                ? c.lucro > 0
                  ? Math.min(100, ((c.lucro * 12) / c.investimentoTotal) * 100)
                  : 0
                : 0
            }
          />
        </div>
        <div
          className="flex items-center gap-1.5 text-[12px]"
          style={{ color: t.textMuted, fontFamily: FONT_BODY }}
        >
          <MapPin size={12} /> {building.cidade}
        </div>
        <div
          className="grid grid-cols-2 gap-2 pt-2 border-t"
          style={{ borderColor: t.border }}
        >
          <div>
            <div
              className="text-[10px] uppercase"
              style={{ color: t.textMuted, fontFamily: FONT_BODY }}
            >
              Receita / mês
            </div>
            <div
              className="text-[13px] font-semibold"
              style={{ color: t.text, fontFamily: FONT_MONO }}
            >
              {money(c.receitaBruta)}
            </div>
          </div>
          <div>
            <div
              className="text-[10px] uppercase"
              style={{ color: t.textMuted, fontFamily: FONT_BODY }}
            >
              Lucro / mês
            </div>
            <div
              className="text-[13px] font-semibold"
              style={{
                color: c.lucro >= 0 ? t.positive : t.negative,
                fontFamily: FONT_MONO,
              }}
            >
              {money(c.lucro)}
            </div>
          </div>
          <div>
            <div
              className="text-[10px] uppercase"
              style={{ color: t.textMuted, fontFamily: FONT_BODY }}
            >
              Ocupação média
            </div>
            <div
              className="text-[13px] font-semibold"
              style={{ color: t.text, fontFamily: FONT_MONO }}
            >
              {c.ocupacaoMedia}%
            </div>
          </div>
          <div>
            <div
              className="text-[10px] uppercase"
              style={{ color: t.textMuted, fontFamily: FONT_BODY }}
            >
              ROI mensal
            </div>
            <div
              className="text-[13px] font-semibold"
              style={{ color: t.gold, fontFamily: FONT_MONO }}
            >
              {c.roiMensal.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function Imoveis({ t, imoveis, empresaId }) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [showNovo, setShowNovo] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const adicionarImovel = useAdicionarImovel();

  const filtrados = useMemo(
    () =>
      imoveis.filter(
        (i) =>
          (filtro === 'Todos' || i.situacao === filtro) &&
          i.nome.toLowerCase().includes(busca.toLowerCase())
      ),
    [imoveis, busca, filtro]
  );

  const building = imoveis.find((i) => i.id === selecionado);

  if (building)
    return (
      <BuildingDetail
        t={t}
        building={building}
        onBack={() => setSelecionado(null)}
      />
    );
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}
          >
            <Search size={15} style={{ color: t.textMuted }} />
            <input
              placeholder="Buscar imóvel..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent outline-none text-sm w-40"
              style={{ color: t.text, fontFamily: FONT_BODY }}
            />
          </div>
          {['Todos', 'Ativo', 'Inativo'].map((op) => (
            <button
              key={op}
              onClick={() => setFiltro(op)}
              className="text-[12px] px-3 py-1.5 rounded-lg font-medium"
              style={{
                fontFamily: FONT_BODY,
                background: filtro === op ? t.primarySoft : 'transparent',
                color: filtro === op ? t.primary : t.textMuted,
                border: `1px solid ${filtro === op ? t.primary : t.border}`,
              }}
            >
              {op}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNovo(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg"
          style={{
            background: t.primary,
            color: '#fff',
            fontFamily: FONT_BODY,
          }}
        >
          <Plus size={15} /> Cadastrar imóvel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map((im) => (
          <ImovelCard
            key={im.id}
            t={t}
            building={im}
            onOpen={() => setSelecionado(im.id)}
          />
        ))}
      </div>

      {showNovo && (
        <NovoImovelForm
          t={t}
          onClose={() => setShowNovo(false)}
          onSave={(novo) => adicionarImovel.mutate({ ...novo, empresaId })}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* CHANNEL MANAGER                                                    */
/* ---------------------------------------------------------------- */
function IcalModal({
  t,
  unidadeNumero,
  buildingNome,
  canaisDaUnidade,
  onClose,
}) {
  const [copiado, setCopiado] = useState('');
  const [edicao, setEdicao] = useState({}); // { [canalId]: valorDigitado }
  const salvarLink = useSalvarLinkImportacao();

  const copiar = (label, valor) => {
    navigator.clipboard?.writeText(valor);
    setCopiado(label);
    setTimeout(() => setCopiado(''), 1500);
  };

  return (
    <ModalShell
      t={t}
      title={`Configurar iCal — ${unidadeNumero}`}
      onClose={onClose}
      wide
    >
      <p
        className="text-[12px] mb-4"
        style={{ color: t.textMuted, fontFamily: FONT_BODY }}
      >
        {buildingNome} · cole o link de exportação na plataforma, e cole o link
        que a plataforma te der no campo de importação abaixo.
      </p>
      <div className="flex flex-col gap-5">
        {canaisDaUnidade.map((canal) => (
          <div
            key={canal.id}
            className="flex flex-col gap-2 pb-4"
            style={{ borderBottom: `1px solid ${t.border}` }}
          >
            <span
              className="text-[13px] font-semibold"
              style={{ color: t.text, fontFamily: FONT_DISPLAY }}
            >
              {canal.plataforma}
            </span>

            <div className="flex flex-col gap-1">
              <span
                className="text-[12px]"
                style={{ color: t.textMuted, fontFamily: FONT_BODY }}
              >
                Link para colar no {canal.plataforma} (exporta seus bloqueios)
              </span>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={canal.urlExportacao}
                  className="flex-1 rounded-lg px-3 py-2 text-[11px] outline-none"
                  style={{ ...inputStyleFn(t), fontFamily: FONT_MONO }}
                />
                <button
                  onClick={() =>
                    copiar(`export-${canal.id}`, canal.urlExportacao)
                  }
                  className="p-2 rounded-lg"
                  style={{ background: t.primarySoft, color: t.primary }}
                >
                  <Copy size={14} />
                </button>
              </div>
              {copiado === `export-${canal.id}` && (
                <span
                  className="text-[11px]"
                  style={{ color: t.positive, fontFamily: FONT_BODY }}
                >
                  Copiado!
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span
                className="text-[12px]"
                style={{ color: t.textMuted, fontFamily: FONT_BODY }}
              >
                Link que o {canal.plataforma} te deu, para importar aqui
              </span>
              <div className="flex items-center gap-2">
                <input
                  value={edicao[canal.id] ?? canal.urlImportacao ?? ''}
                  onChange={(e) =>
                    setEdicao({ ...edicao, [canal.id]: e.target.value })
                  }
                  placeholder={`Cole aqui o link .ics do ${canal.plataforma}`}
                  className="flex-1 rounded-lg px-3 py-2 text-[11px] outline-none"
                  style={{ ...inputStyleFn(t), fontFamily: FONT_MONO }}
                />
                <button
                  onClick={() =>
                    salvarLink.mutate({
                      canalId: canal.id,
                      url: edicao[canal.id] ?? canal.urlImportacao ?? '',
                    })
                  }
                  className="px-3 py-2 rounded-lg text-[11px] font-medium"
                  style={{
                    background: t.primary,
                    color: '#fff',
                    fontFamily: FONT_BODY,
                  }}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-5">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            background: t.primary,
            color: '#fff',
            fontFamily: FONT_BODY,
          }}
        >
          Concluído
        </button>
      </div>
    </ModalShell>
  );
}

function ChannelManager({ t, imoveis }) {
  const [modalUnidade, setModalUnidade] = useState(null);
  const sincronizarAgora = useSincronizarAgora();

  const unidadeInfo = useMemo(() => {
    const mapa = {};
    imoveis.forEach((b) =>
      b.unidades.forEach((u) => {
        mapa[u.id] = { numero: u.numero, buildingNome: b.nome };
      })
    );
    return mapa;
  }, [imoveis]);
  const unidadeIds = useMemo(() => Object.keys(unidadeInfo), [unidadeInfo]);

  const { data: canais = [] } = useCanaisConexao(unidadeIds);
  const canalIds = useMemo(() => canais.map((c) => c.id), [canais]);
  const { data: log = [] } = useLogSincronizacao(canalIds);

  const totalConexoes = canais.length;
  const conectadas = canais.filter((c) => c.status === 'Conectado').length;
  const erros = canais.filter((c) => c.status === 'Erro').length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          t={t}
          icon={Link2}
          label="Conexões ativas"
          value={`${conectadas}/${totalConexoes}`}
        />
        <KpiCard
          t={t}
          icon={AlertTriangle}
          label="Erros pendentes"
          value={`${erros}`}
          deltaGood={erros === 0}
          delta={erros === 0 ? 'tudo certo' : 'verificar log'}
        />
        <KpiCard
          t={t}
          icon={RefreshCw}
          label="Método de sincronização"
          value="iCal automático"
          mono={false}
        />
      </div>

      <div
        className="rounded-2xl p-5 overflow-x-auto"
        style={{ background: t.surface, border: `1px solid ${t.border}` }}
      >
        <div className="mb-3">
          <h3
            className="text-sm font-semibold"
            style={{ color: t.text, fontFamily: FONT_DISPLAY }}
          >
            Conexões por unidade
          </h3>
          <p
            className="text-[12px]"
            style={{ color: t.textMuted, fontFamily: FONT_BODY }}
          >
            Sincronização via iCal — bloqueia datas automaticamente em todos os
            canais. Não traz nome do hóspede nem valor da reserva; isso só
            existe quando a reserva é lançada direto no seu sistema.
          </p>
        </div>
        <table
          className="w-full text-[12px] min-w-[760px]"
          style={{ fontFamily: FONT_BODY, color: t.text }}
        >
          <thead>
            <tr className="text-left" style={{ color: t.textMuted }}>
              <th className="py-2 pr-3">Unidade</th>
              <th className="py-2 pr-3">Plataforma</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Última sinc.</th>
              <th className="py-2 pr-3">Importadas</th>
              <th className="py-2 pr-3">Bloqueios exportados</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {canais.map((c) => {
              const info = unidadeInfo[c.unidadeId] ?? {};
              return (
                <tr
                  key={c.id}
                  className="border-t"
                  style={{ borderColor: t.border }}
                >
                  <td className="py-2 pr-3 font-medium">
                    {info.numero}{' '}
                    <span style={{ color: t.textMuted, fontFamily: FONT_BODY }}>
                      · {info.buildingNome}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{c.plataforma}</td>
                  <td className="py-2 pr-3">
                    <Badge
                      t={t}
                      tone={c.status === 'Conectado' ? 'positive' : 'negative'}
                    >
                      {c.status}
                    </Badge>
                    {c.erroMensagem && (
                      <div
                        className="text-[11px] mt-1"
                        style={{ color: t.negative, fontFamily: FONT_BODY }}
                      >
                        {c.erroMensagem}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-3" style={{ fontFamily: FONT_MONO }}>
                    {sincronizarAgora.isPending &&
                    sincronizarAgora.variables === c.id
                      ? 'sincronizando…'
                      : c.ultimaSincronizacao
                      ? new Date(c.ultimaSincronizacao).toLocaleString('pt-BR')
                      : 'nunca'}
                  </td>
                  <td className="py-2 pr-3" style={{ fontFamily: FONT_MONO }}>
                    {c.reservasImportadas}
                  </td>
                  <td className="py-2 pr-3" style={{ fontFamily: FONT_MONO }}>
                    {c.bloqueiosExportados}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => sincronizarAgora.mutate(c.id)}
                        className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg"
                        style={{
                          background: t.primarySoft,
                          color: t.primary,
                          fontFamily: FONT_BODY,
                        }}
                      >
                        <RefreshCw
                          size={12}
                          className={
                            sincronizarAgora.isPending &&
                            sincronizarAgora.variables === c.id
                              ? 'animate-spin'
                              : ''
                          }
                        />{' '}
                        Sincronizar
                      </button>
                      <button
                        onClick={() => setModalUnidade(c.unidadeId)}
                        className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg"
                        style={{
                          background: t.surfaceAlt,
                          color: t.textMuted,
                          fontFamily: FONT_BODY,
                        }}
                      >
                        <Link2 size={12} /> iCal
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className="rounded-2xl p-5"
        style={{ background: t.surface, border: `1px solid ${t.border}` }}
      >
        <h3
          className="text-sm font-semibold mb-3"
          style={{ color: t.text, fontFamily: FONT_DISPLAY }}
        >
          Log de sincronização
        </h3>
        <div
          className="flex flex-col divide-y"
          style={{ borderColor: t.border }}
        >
          {log.map((l) => {
            const canal = canais.find((c) => c.id === l.canal_id);
            const info = canal ? unidadeInfo[canal.unidadeId] : null;
            return (
              <div
                key={l.id}
                className="flex items-center gap-3 py-2 text-[12px]"
                style={{ fontFamily: FONT_BODY, color: t.text }}
              >
                {l.status === 'ok' ? (
                  <CheckCircle2 size={14} style={{ color: t.positive }} />
                ) : (
                  <AlertTriangle size={14} style={{ color: t.negative }} />
                )}
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    color: t.textMuted,
                    minWidth: 130,
                  }}
                >
                  {new Date(l.data_hora).toLocaleString('pt-BR')}
                </span>
                <span className="font-medium" style={{ minWidth: 150 }}>
                  {info ? `${info.numero} · ${info.buildingNome}` : '—'}
                </span>
                <Badge t={t} tone="muted">
                  {canal?.plataforma}
                </Badge>
                <span
                  style={{
                    color: l.status === 'erro' ? t.negative : t.textMuted,
                  }}
                >
                  {l.acao}
                </span>
              </div>
            );
          })}
          {log.length === 0 && (
            <p
              className="text-[12px] py-2"
              style={{ color: t.textMuted, fontFamily: FONT_BODY }}
            >
              Nenhuma sincronização registrada ainda.
            </p>
          )}
        </div>
      </div>

      {modalUnidade && (
        <IcalModal
          t={t}
          unidadeNumero={unidadeInfo[modalUnidade]?.numero}
          buildingNome={unidadeInfo[modalUnidade]?.buildingNome}
          canaisDaUnidade={canais.filter((c) => c.unidadeId === modalUnidade)}
          onClose={() => setModalUnidade(null)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* CALENDÁRIO                                                         */
/* ---------------------------------------------------------------- */
function Calendar({ t, imoveis }) {
  const [mesIdx, setMesIdx] = useState(MESES.length - 1);
  const allUnits = useMemo(
    () =>
      imoveis.flatMap((b) =>
        b.unidades.map((u) => ({ ...u, buildingNome: b.nome }))
      ),
    [imoveis]
  );
  const unidadeIds = useMemo(() => allUnits.map((u) => u.id), [allUnits]);
  const diasNoMes = MESES[mesIdx].dias;
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);
  const mesChave = MESES[mesIdx].key;
  const inicioMes = `${mesChave}-01`;
  const fimMes = `${mesChave}-${String(diasNoMes).padStart(2, '0')}`;

  const { data: reservas = [] } = useReservasCalendario(
    unidadeIds,
    inicioMes,
    fimMes
  );

  const reservasPorUnidade = useMemo(() => {
    const map = {};
    for (const r of reservas) {
      if (!map[r.unidadeId]) map[r.unidadeId] = [];
      map[r.unidadeId].push(r);
    }
    return map;
  }, [reservas]);

  const dataDoDia = (d) => `${mesChave}-${String(d).padStart(2, '0')}`;

  const corCelula = (reserva) => {
    if (!reserva) return { background: t.surfaceAlt };
    // Veio de sincronização iCal e sem nome de hóspede = é só um bloqueio, não uma reserva completa.
    if (reserva.origemSincronizacao === 'ical' && !reserva.hospedeNome) {
      return {
        background: `repeating-linear-gradient(45deg, ${t.border} 0 4px, ${t.surfaceAlt} 4px 8px)`,
      };
    }
    const cor =
      reserva.origem === 'Airbnb'
        ? '#FF5A5F'
        : reserva.origem === 'Booking'
        ? '#003580'
        : t.gold;
    return { background: cor };
  };

  const Legenda = ({ cor, label, hatch }) => (
    <div
      className="flex items-center gap-1.5 text-[11px]"
      style={{ color: t.textMuted, fontFamily: FONT_BODY }}
    >
      <span
        className="w-3 h-3 rounded"
        style={
          hatch
            ? {
                background: `repeating-linear-gradient(45deg, ${t.border} 0 3px, ${t.surfaceAlt} 3px 6px)`,
              }
            : { background: cor }
        }
      />
      {label}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMesIdx((m) => Math.max(0, m - 1))}
            className="p-1.5 rounded-lg"
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.text,
            }}
          >
            <ChevronLeft size={15} />
          </button>
          <span
            className="text-sm font-semibold w-16 text-center"
            style={{ color: t.text, fontFamily: FONT_DISPLAY }}
          >
            {MESES[mesIdx].label}
          </span>
          <button
            onClick={() => setMesIdx((m) => Math.min(MESES.length - 1, m + 1))}
            className="p-1.5 rounded-lg"
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.text,
            }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <Legenda cor="#FF5A5F" label="Airbnb" />
          <Legenda cor="#003580" label="Booking" />
          <Legenda cor={t.gold} label="Direta" />
          <Legenda hatch label="Bloqueio (iCal)" />
          <Legenda cor={t.surfaceAlt} label="Livre" />
        </div>
      </div>

      <div
        className="rounded-2xl p-4 overflow-x-auto"
        style={{ background: t.surface, border: `1px solid ${t.border}` }}
      >
        <div style={{ minWidth: 170 + diasNoMes * 24 }}>
          <div className="flex">
            <div style={{ width: 170 }} />
            {dias.map((d) => (
              <div
                key={d}
                className="text-center text-[10px]"
                style={{ width: 24, color: t.textMuted, fontFamily: FONT_MONO }}
              >
                {d}
              </div>
            ))}
          </div>
          {allUnits.map((u) => (
            <div
              key={u.id}
              className="flex items-center"
              style={{ borderTop: `1px solid ${t.border}` }}
            >
              <div
                className="text-[12px] py-1.5 pr-2 truncate"
                style={{ width: 170, color: t.text, fontFamily: FONT_BODY }}
              >
                <span className="font-medium">{u.numero}</span>
                <span style={{ color: t.textMuted }}> · {u.buildingNome}</span>
              </div>
              {dias.map((d) => {
                const dataAtual = dataDoDia(d);
                const reserva = (reservasPorUnidade[u.id] || []).find(
                  (r) => dataAtual >= r.checkIn && dataAtual < r.checkOut
                );
                return (
                  <div
                    key={d}
                    title={
                      reserva
                        ? `${reserva.origem}${
                            reserva.hospedeNome
                              ? ' · ' + reserva.hospedeNome
                              : ''
                          }`
                        : 'Livre'
                    }
                    style={{
                      width: 24,
                      height: 22,
                      ...corCelula(reserva),
                      borderLeft: `1px solid ${t.bg}`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SeletorImovel({ t, imoveis, imovelId, setImovelId }) {
  if (imoveis.length <= 1) return null;
  return (
    <select
      value={imovelId}
      onChange={(e) => setImovelId(e.target.value)}
      className="rounded-lg px-2 py-1.5 text-[12px] outline-none"
      style={inputStyleFn(t)}
    >
      {imoveis.map((im) => <option key={im.id} value={im.id}>{im.nome}</option>)}
    </select>
  );
}

function PeriodoSeletorReal({ t, deIdx, ateIdx, setDeIdx, setAteIdx }) {
  return (
    <div className="flex items-center gap-2 text-[12px]" style={{ fontFamily: FONT_BODY, color: t.textMuted }}>
      <span>De</span>
      <select value={deIdx} onChange={(e) => { const v = Number(e.target.value); setDeIdx(v); if (v > ateIdx) setAteIdx(v); }} className="rounded-lg px-2 py-1.5 text-[12px] outline-none" style={inputStyleFn(t)}>
        {MESES.map((m, i) => <option key={m.key} value={i}>{m.label}</option>)}
      </select>
      <span>até</span>
      <select value={ateIdx} onChange={(e) => { const v = Number(e.target.value); setAteIdx(v); if (v < deIdx) setDeIdx(v); }} className="rounded-lg px-2 py-1.5 text-[12px] outline-none" style={inputStyleFn(t)}>
        {MESES.map((m, i) => <option key={m.key} value={i}>{m.label}</option>)}
      </select>
    </div>
  );
}

function Financeiro({ t, imoveis }) {
  const [imovelId, setImovelId] = useState(imoveis[0]?.id ?? "");
  const imovel = imoveis.find((im) => im.id === imovelId) ?? imoveis[0];
  const unidadeIds = useMemo(() => (imovel?.unidades ?? []).map((u) => u.id), [imovel]);

  const [deIdx, setDeIdx] = useState(MESES.length - 6);
  const [ateIdx, setAteIdx] = useState(MESES.length - 1);
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  const { data: lancamentos = [], isLoading } = useLancamentos(imovel?.id, unidadeIds, MESES[deIdx].key, MESES[ateIdx].key);

  const entradas = lancamentos.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
  const saidas = lancamentos.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
  const saldoPeriodo = entradas - saidas;

  const serieFluxo = MESES.slice(deIdx, ateIdx + 1).map((m) => {
    const doMes = lancamentos.filter((l) => l.mes === m.key);
    const ent = doMes.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
    const sai = doMes.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
    return { label: m.label, entradas: ent, saidas: sai, saldo: ent - sai };
  });

  const filtrados = lancamentos.filter((l) => filtroTipo === "Todos" || l.tipo === filtroTipo);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SeletorImovel t={t} imoveis={imoveis} imovelId={imovelId} setImovelId={setImovelId} />
          <PeriodoSeletorReal t={t} deIdx={deIdx} ateIdx={ateIdx} setDeIdx={setDeIdx} setAteIdx={setAteIdx} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard t={t} icon={ArrowUpRight} label="Entradas no período" value={money(entradas)} />
        <KpiCard t={t} icon={ArrowDownRight} label="Saídas no período" value={money(saidas)} />
        <KpiCard t={t} icon={TrendingUp} label="Saldo do período" value={money(saldoPeriodo)} hero />
        <KpiCard t={t} icon={Wallet} label="Lançamentos" value={String(lancamentos.length)} mono={false} />
      </div>

      <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: t.text, fontFamily: FONT_DISPLAY }}>Fluxo de caixa</h3>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={serieFluxo}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
            <XAxis dataKey="label" stroke={t.textMuted} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke={t.textMuted} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 12 }} formatter={(v) => money(v)} />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: FONT_BODY }} />
            <Bar dataKey="entradas" name="Entradas" fill={t.positive} radius={[6, 6, 0, 0]} barSize={16} />
            <Bar dataKey="saidas" name="Saídas" fill={t.negative} radius={[6, 6, 0, 0]} barSize={16} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl p-5 overflow-x-auto" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: t.text, fontFamily: FONT_DISPLAY }}>Lançamentos do período</h3>
          <div className="flex gap-1">
            {["Todos", "receita", "despesa"].map((op) => (
              <button key={op} onClick={() => setFiltroTipo(op)} className="text-[11px] px-2.5 py-1 rounded-lg font-medium" style={{ fontFamily: FONT_BODY, background: filtroTipo === op ? t.primarySoft : "transparent", color: filtroTipo === op ? t.primary : t.textMuted, border: `1px solid ${filtroTipo === op ? t.primary : t.border}` }}>
                {op === "Todos" ? "Todos" : op === "receita" ? "Receitas" : "Despesas"}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <p className="text-[12px]" style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Carregando...</p>
        ) : (
          <table className="w-full text-[12px] min-w-[760px]" style={{ fontFamily: FONT_BODY, color: t.text }}>
            <thead>
              <tr className="text-left" style={{ color: t.textMuted }}>
                <th className="py-2 pr-3">Data</th><th className="py-2 pr-3">Unidade</th>
                <th className="py-2 pr-3">Categoria</th><th className="py-2 pr-3">Hóspede / Descrição</th>
                <th className="py-2 pr-3">Tipo</th><th className="py-2 pr-3">Valor</th><th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.slice(0, 100).map((l) => (
                <tr key={l.id} className="border-t" style={{ borderColor: t.border }}>
                  <td className="py-1.5 pr-3" style={{ fontFamily: FONT_MONO }}>{l.data ? new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="py-1.5 pr-3">{l.unidade ?? "Geral"}</td>
                  <td className="py-1.5 pr-3">{l.categoria}</td>
                  <td className="py-1.5 pr-3">{l.hospede ?? l.descricao ?? "—"}</td>
                  <td className="py-1.5 pr-3"><Badge t={t} tone={l.tipo === "receita" ? "positive" : "negative"}>{l.tipo === "receita" ? "Receita" : "Despesa"}</Badge></td>
                  <td className="py-1.5 pr-3" style={{ fontFamily: FONT_MONO, color: l.tipo === "receita" ? t.positive : t.negative }}>{l.tipo === "receita" ? "+" : "−"}{money(l.valor)}</td>
                  <td className="py-1.5 pr-3"><Badge t={t}>{l.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtrados.length === 0 && !isLoading && <p className="text-[12px] py-3" style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Nenhum lançamento no período selecionado.</p>}
        {filtrados.length > 100 && <p className="text-[11px] mt-2" style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Mostrando 100 de {filtrados.length} lançamentos — refine o período para ver todos.</p>}
      </div>
    </div>
  );
}
function Despesas({ t, imoveis }) {
  const [imovelId, setImovelId] = useState(imoveis[0]?.id ?? "");
  const imovel = imoveis.find((im) => im.id === imovelId) ?? imoveis[0];
  const unidadeIds = useMemo(() => (imovel?.unidades ?? []).map((u) => u.id), [imovel]);

  const [deIdx, setDeIdx] = useState(MESES.length - 6);
  const [ateIdx, setAteIdx] = useState(MESES.length - 1);
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");

  const { data: lancamentos = [], isLoading } = useLancamentos(imovel?.id, unidadeIds, MESES[deIdx].key, MESES[ateIdx].key);
  const despesas = lancamentos.filter((l) => l.tipo === "despesa");

  const categorias = useMemo(() => ["Todas", ...Array.from(new Set(despesas.map((d) => d.categoria)))], [despesas]);
  const filtradas = despesas.filter((d) => filtroCategoria === "Todas" || d.categoria === filtroCategoria);

  const totalGerais = despesas.filter((d) => !d.unidade).reduce((s, d) => s + d.valor, 0);
  const totalEspecificas = despesas.filter((d) => d.unidade).reduce((s, d) => s + d.valor, 0);
  const total = totalGerais + totalEspecificas;

  const porCategoria = useMemo(() => {
    const map = {};
    despesas.forEach((d) => { map[d.categoria] = (map[d.categoria] ?? 0) + d.valor; });
    return Object.entries(map).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);
  }, [despesas]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <SeletorImovel t={t} imoveis={imoveis} imovelId={imovelId} setImovelId={setImovelId} />
        <PeriodoSeletorReal t={t} deIdx={deIdx} ateIdx={ateIdx} setDeIdx={setDeIdx} setAteIdx={setAteIdx} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard t={t} icon={Receipt} label="Despesas gerais (rateadas)" value={money(totalGerais)} />
        <KpiCard t={t} icon={Receipt} label="Despesas específicas" value={money(totalEspecificas)} />
        <KpiCard t={t} icon={Receipt} label="Total no período" value={money(total)} hero />
      </div>

      <div className="rounded-2xl p-5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: t.text, fontFamily: FONT_DISPLAY }}>Despesas por categoria</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={porCategoria} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} horizontal={false} />
            <XAxis type="number" stroke={t.textMuted} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <YAxis type="category" dataKey="categoria" stroke={t.textMuted} fontSize={11} tickLine={false} axisLine={false} width={110} />
            <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 12 }} formatter={(v) => money(v)} />
            <Bar dataKey="valor" fill={t.negative} radius={[0, 6, 6, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl p-5 overflow-x-auto" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold" style={{ color: t.text, fontFamily: FONT_DISPLAY }}>Lançamentos de despesa</h3>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="rounded-lg px-2 py-1.5 text-[12px] outline-none" style={inputStyleFn(t)}>
            {categorias.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {isLoading ? (
          <p className="text-[12px]" style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Carregando...</p>
        ) : (
          <table className="w-full text-[12px] min-w-[680px]" style={{ fontFamily: FONT_BODY, color: t.text }}>
            <thead>
              <tr className="text-left" style={{ color: t.textMuted }}>
                <th className="py-2 pr-3">Competência</th><th className="py-2 pr-3">Unidade</th>
                <th className="py-2 pr-3">Categoria</th><th className="py-2 pr-3">Descrição</th><th className="py-2 pr-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.slice(0, 100).map((d) => (
                <tr key={d.id} className="border-t" style={{ borderColor: t.border }}>
                  <td className="py-1.5 pr-3" style={{ fontFamily: FONT_MONO }}>{d.data ? new Date(d.data + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="py-1.5 pr-3">{d.unidade ?? <Badge t={t} tone="gold">Geral</Badge>}</td>
                  <td className="py-1.5 pr-3">{d.categoria}</td>
                  <td className="py-1.5 pr-3">{d.descricao ?? "—"}</td>
                  <td className="py-1.5 pr-3" style={{ fontFamily: FONT_MONO, color: t.negative }}>{money(d.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtradas.length === 0 && !isLoading && <p className="text-[12px] py-3" style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Nenhuma despesa no período selecionado.</p>}
      </div>
    </div>
  );
}

function Relatorios({ t, imoveis }) {
  const [imovelId, setImovelId] = useState(imoveis[0]?.id ?? "");
  const imovel = imoveis.find((im) => im.id === imovelId) ?? imoveis[0];
  const unidadeIds = useMemo(() => (imovel?.unidades ?? []).map((u) => u.id), [imovel]);

  const [deIdx, setDeIdx] = useState(0);
  const [ateIdx, setAteIdx] = useState(MESES.length - 1);

  const { data: lancamentos = [], isLoading } = useLancamentos(imovel?.id, unidadeIds, MESES[deIdx].key, MESES[ateIdx].key);
  const receitas = lancamentos.filter((l) => l.tipo === "receita");
  const despesas = lancamentos.filter((l) => l.tipo === "despesa");

  const baixarCsv = (linhas, cabecalho, nomeArquivo) => {
    const csv = [cabecalho.join(";"), ...linhas.map((l) => l.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarReceitas = () => baixarCsv(
    receitas.map((r) => [r.data ?? "", r.unidade ?? "", r.categoria, (r.hospede ?? "").replace(/;/g, ","), r.valor.toFixed(2), r.status]),
    ["Data", "Unidade", "Origem", "Hóspede", "Valor", "Status"],
    `receitas_${MESES[deIdx].key}_a_${MESES[ateIdx].key}.csv`
  );

  const exportarDespesas = () => baixarCsv(
    despesas.map((d) => [d.data ?? "", d.unidade ?? "Geral", d.categoria, (d.descricao ?? "").replace(/;/g, ","), d.valor.toFixed(2)]),
    ["Competência", "Unidade", "Categoria", "Descrição", "Valor"],
    `despesas_${MESES[deIdx].key}_a_${MESES[ateIdx].key}.csv`
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <SeletorImovel t={t} imoveis={imoveis} imovelId={imovelId} setImovelId={setImovelId} />
        <PeriodoSeletorReal t={t} deIdx={deIdx} ateIdx={ateIdx} setDeIdx={setDeIdx} setAteIdx={setAteIdx} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <h3 className="text-sm font-semibold" style={{ color: t.text, fontFamily: FONT_DISPLAY }}>Relatório de receitas</h3>
          <p className="text-[12px]" style={{ color: t.textMuted, fontFamily: FONT_BODY }}>{receitas.length} lançamentos · Total {money(receitas.reduce((s, r) => s + r.valor, 0))}</p>
          <button onClick={exportarReceitas} disabled={isLoading || receitas.length === 0} className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg w-fit" style={{ background: t.primary, color: "#fff", fontFamily: FONT_BODY, opacity: receitas.length === 0 ? 0.5 : 1 }}>
            Baixar CSV
          </button>
        </div>
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <h3 className="text-sm font-semibold" style={{ color: t.text, fontFamily: FONT_DISPLAY }}>Relatório de despesas</h3>
          <p className="text-[12px]" style={{ color: t.textMuted, fontFamily: FONT_BODY }}>{despesas.length} lançamentos · Total {money(despesas.reduce((s, d) => s + d.valor, 0))}</p>
          <button onClick={exportarDespesas} disabled={isLoading || despesas.length === 0} className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg w-fit" style={{ background: t.primary, color: "#fff", fontFamily: FONT_BODY, opacity: despesas.length === 0 ? 0.5 : 1 }}>
            Baixar CSV
          </button>
        </div>
      </div>
      <p className="text-[11px]" style={{ color: t.textMuted, fontFamily: FONT_BODY }}>Os arquivos são gerados com os dados reais do período e imóvel selecionados acima, prontos para abrir no Excel.</p>
    </div>
  );
}

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, ativo: true },
  { id: 'imoveis', label: 'Imóveis', icon: Building2, ativo: true },
    { id: 'calendario', label: 'Calendário', icon: CalendarDays, ativo: true },
      { id: 'channel', label: 'Channel Manager', icon: Link2, ativo: true },
        { id: 'financeiro', label: 'Financeiro', icon: Wallet, ativo: true },
          { id: 'despesas', label: 'Despesas', icon: Receipt, ativo: true },
            { id: 'relatorios', label: 'Relatórios', icon: FileBarChart, ativo: true },];

export default function App() {
  const [dark, setDark] = useState(false);
  const [view, setView] = useState('dashboard');
  const { carregando: carregandoAuth, usuario, empresaId, sair } = useAuth();
  const { data: imoveis = [], isLoading, error } = useImoveis();
  const t = dark ? THEMES.dark : THEMES.light;

  if (carregandoAuth) return null;
  if (!usuario) return <LoginScreen />;

  if (error) {
    return (
      <div
        style={{
          padding: 24,
          color: THEMES.light.negative,
          fontFamily: FONT_BODY,
        }}
      >
        Erro ao carregar dados: {String(error)}
      </div>
    );
  }

  return (
    <div
      style={{ background: t.bg, minHeight: '100%', fontFamily: FONT_BODY }}
      className="flex w-full"
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');`}</style>

      <aside
        className="hidden md:flex flex-col w-56 shrink-0 p-4 gap-1"
        style={{ borderRight: `1px solid ${t.border}` }}
      >
        <div className="flex items-center gap-2 px-2 pb-5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: t.primary }}
          >
            <Building2 size={15} color="#fff" />
          </div>
          <span
            className="text-[15px] font-bold"
            style={{ color: t.text, fontFamily: FONT_DISPLAY }}
          >
            Loca CustoPro
          </span>
        </div>
        {NAV.map((n) => (
          <button
            key={n.id}
            disabled={!n.ativo}
            onClick={() => {
              n.ativo && setView(n.id);
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-left"
            style={{
              fontFamily: FONT_BODY,
              color: view === n.id ? t.primary : n.ativo ? t.text : t.textMuted,
              background: view === n.id ? t.primarySoft : 'transparent',
              opacity: n.ativo ? 1 : 0.55,
              cursor: n.ativo ? 'pointer' : 'default',
            }}
          >
            <n.icon size={16} />
            {n.label}
            {!n.ativo && (
              <span
                className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: t.surfaceAlt, color: t.textMuted }}
              >
                em breve
              </span>
            )}
          </button>
        ))}
        <button
          onClick={sair}
          className="mt-auto text-[12px] px-3 py-2 text-left"
          style={{ color: t.textMuted, fontFamily: FONT_BODY }}
        >
          Sair ({usuario.email})
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${t.border}` }}
        >
          <div>
            <h1
              className="text-lg font-bold"
              style={{ color: t.text, fontFamily: FONT_DISPLAY }}
            >
              {
                {
                  dashboard: 'Visão geral',
                  imoveis: 'Imóveis',
                  calendario: 'Calendário',
                  channel: 'Channel Manager',
                }[view]
              }
            </h1>
            <p
              className="text-[12px]"
              style={{ color: t.textMuted, fontFamily: FONT_BODY }}
            >
              {isLoading && 'Carregando...'}
              {!isLoading &&
                view === 'dashboard' &&
                `${MESES[MESES.length - 1].label} · ${
                  imoveis.length
                } imóveis · ${imoveis.reduce(
                  (s, b) => s + b.unidades.length,
                  0
                )} unidades`}
              {!isLoading &&
                view === 'imoveis' &&
                `${imoveis.length} imóveis cadastrados`}
              {!isLoading &&
                view === 'calendario' &&
                'Disponibilidade e reservas de todas as unidades'}
              {!isLoading &&
                view === 'channel' &&
                'Conexões, links iCal e log de sincronização'}
            </p>
          </div>
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-lg"
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.text,
            }}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <main className="p-6 overflow-y-auto">
          {view === 'dashboard' && <Dashboard t={t} imoveis={imoveis} />}
          {view === 'imoveis' && (
            <Imoveis t={t} imoveis={imoveis} empresaId={empresaId} />
          )}
          {view === 'calendario' && <Calendar t={t} imoveis={imoveis} />}
          {view === 'channel' && <ChannelManager t={t} imoveis={imoveis} />}
          {view === 'financeiro' && <Financeiro t={t} imoveis={imoveis} />}
          {view === 'despesas' && <Despesas t={t} imoveis={imoveis} />}
          {view === 'relatorios' && <Relatorios t={t} imoveis={imoveis} />}
        </main>
      </div>
    </div>
  );
}
