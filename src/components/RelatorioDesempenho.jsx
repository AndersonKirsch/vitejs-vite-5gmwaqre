import React, { useMemo, useRef, useState } from 'react';

const PAGE_W = 794;
const PAGE_H = 1120;

const COR = {
  dark: '#15130f', gold: '#c8981f',
  receita: '#2a78d6', despesa: '#e34948', lucro: '#b8860b',
  origem: { Direta: '#2a78d6', Airbnb: '#eb6834', Booking: '#1baf7a', Outros: '#9a968c' },
  origemFallback: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'],
};

const brl = (v) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const pct = (v, casas = 1) => (Number(v) || 0).toFixed(casas).replace('.', ',') + '%';

const kfmt = (v) => (v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + 'k' : String(Math.round(v)));

function escala(max, nTicks = 4) {
  if (max <= 0) return { topo: 1, ticks: [0, 1] };
  const bruto = max / nTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
  const passo = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * mag).find((p) => p >= bruto) || 10 * mag;
  const topo = passo * nTicks;
  return { topo, ticks: Array.from({ length: nTicks + 1 }, (_, i) => i * passo) };
}
function GraficoBarras({ meses }) {
  const W = 900, H = 258, ml = 58, mr = 8, mt = 18, mb = 38;
  const pw = W - ml - mr, ph = H - mt - mb;
  const max = Math.max(...meses.map((m) => Math.max(m.receita, m.despesa)), 1);
  const { topo, ticks } = escala(max);
  const slot = pw / meses.length;
  const bw = Math.min(20, slot / 2.6), gap = 4;
  return (
    <svg viewBox={[0, 0, W, H].join(' ')} width='100%'>
      {ticks.map((t) => {
        const y = mt + ph - (t / topo) * ph;
        return (
          <g key={t}>
            <line x1={ml} y1={y} x2={W - mr} y2={y} stroke='#e6e3dc' strokeWidth='1' />
            <text x={ml - 10} y={y + 3.5} textAnchor='end' fontSize='11' fill='#8a867c'>{t === 0 ? '0' : kfmt(t)}</text>
          </g>
        );
      })}
      {meses.map((m, i) => {
        const cx = ml + slot * i + slot / 2;
        const x1 = cx - bw - gap / 2, x2 = cx + gap / 2;
        const h1 = (m.receita / topo) * ph, h2 = (m.despesa / topo) * ph;
        const y1 = mt + ph - h1, y2 = mt + ph - h2;
        return (
          <g key={m.label}>
            <rect x={x1} y={y1} width={bw} height={h1} rx='4' fill={COR.receita} />
            {m.despesa > 0 && <rect x={x2} y={y2} width={bw} height={h2} rx='4' fill={COR.despesa} />}
            <text x={x1 + bw / 2} y={y1 - 6} textAnchor='middle' fontSize='10.5' fontWeight='700' fill='#3a3730'>{kfmt(m.receita)}</text>
            {m.despesa > 0 && (<text x={x2 + bw / 2} y={y2 - 6} textAnchor='middle' fontSize='10.5' fill='#6b6760'>{kfmt(m.despesa)}</text>)}
            <text x={cx} y={mt + ph + 18} textAnchor='middle' fontSize='11' fill='#6b6760'>{m.label}</text>
          </g>
        );
      })}
      <line x1={ml} y1={mt + ph} x2={W - mr} y2={mt + ph} stroke='#cfcabf' strokeWidth='1.2' />
    </svg>
  );
}
function GraficoLinha({ meses }) {
  const W = 900, H = 250, ml = 58, mr = 30, mt = 26, mb = 40;
  const pw = W - ml - mr, ph = H - mt - mb;
  const vals = meses.map((m) => ({ label: m.label, v: m.receita - m.despesa }));
  const { topo, ticks } = escala(Math.max(...vals.map((d) => d.v), 1), 3);
  const step = pw / Math.max(vals.length - 1, 1);
  const pts = vals.map((d, i) => [ml + step * i, mt + ph - (d.v / topo) * ph]);
  if (!pts.length) return null;
  const linha = 'M ' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L ');
  const area = linha + ' L ' + pts[pts.length - 1][0].toFixed(1) + ',' + (mt + ph) + ' L ' + pts[0][0].toFixed(1) + ',' + (mt + ph) + ' Z';
  return (
    <svg viewBox={[0, 0, W, H].join(' ')} width='100%'>
      <defs>
        <linearGradient id='gradLucro' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor={COR.lucro} stopOpacity='0.34' />
          <stop offset='100%' stopColor={COR.lucro} stopOpacity='0.03' />
        </linearGradient>
      </defs>
      {ticks.map((t) => {
        const y = mt + ph - (t / topo) * ph;
        return (
          <g key={t}>
            <line x1={ml} y1={y} x2={W - mr} y2={y} stroke='#e6e3dc' strokeWidth='1' />
            <text x={ml - 10} y={y + 3.5} textAnchor='end' fontSize='11' fill='#8a867c'>{t === 0 ? '0' : kfmt(t)}</text>
          </g>
        );
      })}
      <path d={area} fill='url(#gradLucro)' />
      <path d={linha} fill='none' stroke={COR.lucro} strokeWidth='2.4' strokeLinejoin='round' strokeLinecap='round' />
      {pts.map((p, i) => (
        <g key={vals[i].label}>
          <circle cx={p[0]} cy={p[1]} r='4.4' fill={COR.lucro} stroke='#ffffff' strokeWidth='2' />
          <text x={p[0]} y={p[1] - 11} textAnchor='middle' fontSize='10.5' fontWeight='700' fill='#6b5010'>{kfmt(vals[i].v)}</text>
          <text x={p[0]} y={mt + ph + 18} textAnchor='middle' fontSize='11' fill='#6b6760'>{vals[i].label}</text>
        </g>
      ))}
      <line x1={ml} y1={mt + ph} x2={W - mr} y2={mt + ph} stroke='#cfcabf' strokeWidth='1.2' />
    </svg>
  );
}
const corOrigem = (nome, i) => COR.origem[nome] || COR.origemFallback[i % COR.origemFallback.length];

function BarraOrigem({ origens, total }) {
  const W = 900, H = 74, barH = 44, y = 6, gap = 3;
  const vis = origens.filter((o) => o.valor > 0);
  let x = 0;
  return (
    <svg viewBox={[0, 0, W, H].join(' ')} width='100%'>
      {vis.map((o, i) => {
        const full = (o.valor / total) * W;
        const w = full - (i < vis.length - 1 ? gap : 0);
        const el = (
          <g key={o.nome}>
            <rect x={x} y={y} width={Math.max(w, 0)} height={barH} rx='6' fill={corOrigem(o.nome, i)} />
            {w > 70 && (
              <>
                <text x={x + w / 2} y={y + 19} textAnchor='middle' fontSize='15' fontWeight='700' fill='#ffffff'>{o.nome}</text>
                <text x={x + w / 2} y={y + 36} textAnchor='middle' fontSize='14' fill='#ffffff' opacity='0.92'>{pct((o.valor / total) * 100)}</text>
              </>
            )}
          </g>
        );
        x += full;
        return el;
      })}
    </svg>
  );
}
const Titulo = ({ children, sub, className }) => (
  <div className={'relative pl-[11px] mt-[6mm] mb-[3mm] ' + (className || '')}>
    <span className={'absolute left-0 top-[2px] bottom-[2px] w-[4px] rounded-[2px] bg-[#c8981f]'} />
    <h2 className={'text-[15.5px] font-bold tracking-[-0.2px] text-[#2b2820] leading-tight'}>{children}</h2>
    {sub && <p className={'text-[11.5px] text-[#84806f] mt-[2px]'}>{sub}</p>}
  </div>
);

const Hero = ({ label, valor, sub }) => (
  <div className={'rounded-[10px] border border-[#3a3325] px-[5mm] pt-[4.2mm] pb-[4mm] text-white bg-[#211d15]'}>
    <div className={'text-[9.5px] font-bold uppercase tracking-[1.5px] text-[#c8981f]'}>{label}</div>
    <div className={'text-[24px] font-bold tracking-[-0.5px] mt-[5px] leading-none'}>{valor}</div>
    <div className={'text-[10.5px] text-[#a9a294] mt-[6px]'}>{sub}</div>
  </div>
);

const Kpi = ({ label, valor }) => (
  <div className={'rounded-[9px] border border-[#e5e1d8] bg-[#fdfcfa] px-[4mm] py-[2.9mm]'}>
    <div className={'text-[9px] font-bold uppercase tracking-[1.1px] text-[#8a8578]'}>{label}</div>
    <div className={'text-[17px] font-bold text-[#221f19] mt-[3px] leading-tight'}>{valor}</div>
  </div>
);

const Card = ({ children }) => (
  <div className={'rounded-[10px] border border-[#e5e1d8] bg-white px-[4mm] pt-[4mm] pb-[2mm]'}>{children}</div>
);

const Rodape = ({ periodo, pagina, total }) => (
  <div className={'absolute left-[14mm] right-[14mm] bottom-[6mm] flex justify-between border-t border-[#eae5db] pt-[3mm] text-[9.5px] text-[#a09b8e]'}>
    <span><b className={'text-[#c8981f]'}>LocaCustoPro</b> {String.fromCharCode(183)} Relatorio de desempenho{periodo ? ' ' + String.fromCharCode(183) + ' ' + periodo : ''}</span>
    <span>Pagina {pagina} de {total}</span>
  </div>
);
export default function RelatorioDesempenho({ dados, nomeArquivo }) {
  const areaRef = useRef(null);
  const [gerando, setGerando] = useState(false);

  const d = dados || {};
  const meses = d.meses || [];
  const flats = d.flats || [];
  const origens = (d.origens || []).filter((o) => Number(o.valor || 0) > 0);
  const k = d.kpis || {};

  const totalReceita = (d.totais && d.totais.receita != null) ? d.totais.receita : meses.reduce((a, m) => a + m.receita, 0);
  const totalDespesa = (d.totais && d.totais.despesa != null) ? d.totais.despesa : meses.reduce((a, m) => a + m.despesa, 0);
  const totalLucro = totalReceita - totalDespesa;
  const margemTotal = totalReceita ? (totalLucro / totalReceita) * 100 : 0;
  const totalOrigem = origens.reduce((a, o) => a + o.valor, 0) || 1;
  const maxFlat = Math.max(...flats.map((x) => x.receita), 1);
  const somaFlats = flats.reduce((a, x) => a + x.receita, 0) || 1;
  const margemLiquida = totalReceita ? ((k.lucroLiquido || 0) / totalReceita) * 100 : 0;

  const arquivo = useMemo(
    () => nomeArquivo || 'Relatorio_' + String(d.imovel || 'relatorio').replace(/s+/g, '-') + '.pdf',
    [nomeArquivo, d.imovel]
  );

  async function baixarPdf() {
    if (!areaRef.current) return;
    setGerando(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: 0,
          filename: arquivo,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 3, useCORS: true, backgroundColor: '#ffffff', windowWidth: PAGE_W, scrollX: 0, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
          pagebreak: { mode: ['css', 'legacy'], before: '.pdf-page-break' },
        })
        .from(areaRef.current)
        .save();
    } catch (e) {
      console.error(e);
      alert('Nao foi possivel gerar o PDF.');
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className='w-full'>
      <div className={'mb-4 flex flex-wrap items-center gap-3 print:hidden'}>
        <button type='button' onClick={baixarPdf} disabled={gerando} className={'rounded-lg bg-[#15130f] px-5 py-2.5 text-[14px] font-semibold text-white'}>
          {gerando ? 'Gerando PDF...' : 'Baixar PDF'}
        </button>
        <button type='button' onClick={() => window.print()} className={'rounded-lg border border-[#d8d3c8] bg-white px-5 py-2.5 text-[14px] font-semibold text-[#2b2820]'}>
          Imprimir / PDF nitido
        </button>
      </div>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          #relatorio-pdf, #relatorio-pdf * { visibility: visible; }
          #relatorio-pdf { position: absolute; left: 0; top: 0; }
          .pdf-page { box-shadow: none !important; margin: 0 !important; break-after: page; }
          .pdf-page:last-child { break-after: auto; }
        }
        #relatorio-pdf { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      <div className={'overflow-x-auto'}>
        <div id={'relatorio-pdf'} ref={areaRef} className={'mx-auto text-[#2b2820]'} style={{ width: PAGE_W }}>
          <section className={'pdf-page relative overflow-hidden bg-white'} style={{ width: PAGE_W, height: PAGE_H }}>
            <header className={'relative bg-[#15130f] px-[14mm] pt-[11mm] pb-[9mm] text-white'}>
              <div className={'mb-[9px] flex items-center gap-[9px]'}>
                <span className={'h-[22px] w-[22px] rounded-[6px] bg-gradient-to-br from-[#c8981f] to-[#e8c463]'} />
                <span className={'text-[12.5px] font-bold uppercase tracking-[2.4px] text-[#e3d9c2]'}>{d.imovel}</span>
              </div>
              <h1 className={'text-[29px] font-bold tracking-[-0.4px] leading-none'}>{d.titulo}</h1>
              <p className={'mt-[9px] text-[13px] text-[#c9c2b2]'}>
                Periodo: <b className={'text-[#c8981f]'}>{d.periodoLabel}</b>
                {d.unidades ? ' - ' + d.unidades + ' unidades' : ''}
              </p>
              <div className={'absolute right-[14mm] top-[11mm] text-right text-[11px] leading-[1.7] text-[#b8b1a2]'}>
                <b className={'block text-[13px] text-white'}>{d.subtitulo}</b>
                Emitido em {d.emitidoEm}
              </div>
              <span className={'absolute inset-x-0 bottom-0 h-[3.5px] bg-gradient-to-r from-[#c8981f] via-[#e8c463] to-[#c8981f]'} />
            </header>
            <div className={'px-[14mm]'}>
              <div className={'mt-[6mm] grid grid-cols-3 gap-[5mm]'}>
                <Hero label={'Receita bruta do periodo'} valor={brl(totalReceita)} sub={'Media de ' + brl(k.mediaBrutaMes) + ' por mes'} />
                <Hero label={'Lucro liquido'} valor={brl(k.lucroLiquido)} sub={'Margem de ' + pct(margemLiquida) + ' sobre a receita'} />
                <Hero label={'ROI anual (projetado)'} valor={pct(k.roiAnual)} sub={'ROI do periodo: ' + pct(k.roiPeriodo, 2)} />
              </div>

              <Titulo>Indicadores do periodo</Titulo>
              <div className={'grid grid-cols-3 gap-[3.4mm]'}>
                <Kpi label={'Taxas de plataforma'} valor={brl(k.taxasPlataforma)} />
                
                <Kpi label={'Despesas fixas'} valor={brl(k.despesasFixas)} />
                <Kpi label={'Investimentos'} valor={brl(k.investimentos)} />
                <Kpi label={'Ocupacao media'} valor={k.ocupacaoMedia + '%'} />
                <Kpi label={'Ticket medio / diaria'} valor={brl(k.ticketMedio)} />
                <Kpi label={'Media bruta / mes'} valor={brl(k.mediaBrutaMes)} />
                <Kpi label={'Media liquida / mes'} valor={brl(k.mediaLiquidaMes)} />
                <Kpi label={'Lucro antes de investimentos'} valor={brl(totalLucro)} />
              </div>

              <Titulo sub={'Barra azul = receita bruta - barra vermelha = despesas'}>Receita x Despesas por mes</Titulo>
              <Card>
                <div className={'mb-[2mm] ml-[2mm] flex items-center gap-[18px] text-[11.5px] text-[#5f5b52]'}>
                  <span className={'flex items-center gap-[6px]'}><i className={'inline-block h-[11px] w-[11px] rounded-[3px] bg-[#2a78d6]'} />Receita</span>
                  <span className={'flex items-center gap-[6px]'}><i className={'inline-block h-[11px] w-[11px] rounded-[3px] bg-[#e34948]'} />Despesas</span>
                </div>
                <GraficoBarras meses={meses} />
              </Card>

              <Titulo sub={'Distribuicao da receita bruta por canal'} className={'mt-[5mm]'}>Origem das reservas</Titulo>
              <Card>
                <BarraOrigem origens={origens} total={totalOrigem} />
                <div className={'mt-[3.5mm] grid grid-cols-4 gap-[4mm]'}>
                  {origens.map((o, i) => (
                    <div key={o.nome} className={i === 0 ? 'pl-0' : 'pl-[4mm] border-l border-[#eee9df]'}>
                      <div className={'flex items-center gap-[7px]'}>
                        <span className={'h-[11px] w-[11px] rounded-[3px]'} style={{ backgroundColor: corOrigem(o.nome, i) }} />
                        <span className={'text-[11.5px] font-bold text-[#221f19]'}>{o.nome}</span>
                      </div>
                      <div className={'mt-[2px] pl-[18px] text-[14px] font-bold text-[#221f19]'}>{brl(o.valor)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <Rodape pagina={1} total={2} />
          </section>

          <section className={'pdf-page pdf-page-break relative overflow-hidden bg-white'} style={{ width: PAGE_W, height: PAGE_H }}>
            <div className={'px-[14mm]'}>
              <Titulo className={'mt-[12mm]'} sub={'Receita bruta menos despesas do mes'}>Lucro operacional por mes</Titulo>
              <Card><GraficoLinha meses={meses} /></Card>

              <Titulo>Receita e despesas mes a mes</Titulo>
              <table className={'w-full border-collapse text-[11.8px]'}>
                <thead>
                  <tr className={'text-[9.2px] uppercase tracking-[1.1px] text-[#8a8578]'}>
                    <th className={'border-b-[1.5px] border-[#ddd8cd] px-[8px] pb-[6px] text-left font-bold'}>Mes</th>
                    <th className={'border-b-[1.5px] border-[#ddd8cd] px-[8px] pb-[6px] text-right font-bold'}>Receita</th>
                    <th className={'border-b-[1.5px] border-[#ddd8cd] px-[8px] pb-[6px] text-right font-bold'}>Despesas</th>
                    <th className={'border-b-[1.5px] border-[#ddd8cd] px-[8px] pb-[6px] text-right font-bold'}>Lucro</th>
                    <th className={'border-b-[1.5px] border-[#ddd8cd] px-[8px] pb-[6px] text-right font-bold'}>Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map((m, i) => {
                    const lucro = m.receita - m.despesa;
                    const margem = m.receita ? (lucro / m.receita) * 100 : 0;
                    return (
                      <tr key={m.label} className={i % 2 === 1 ? 'bg-[#faf8f4]' : ''}>
                        <td className={'border-b border-[#f0ece4] px-[8px] py-[6.2px] font-bold text-[#221f19]'}>{m.label}</td>
                        <td className={'border-b border-[#f0ece4] px-[8px] py-[6.2px] text-right'}>{brl(m.receita)}</td>
                        <td className={'border-b border-[#f0ece4] px-[8px] py-[6.2px] text-right text-[#e34948]'}>{brl(m.despesa)}</td>
                        <td className={'border-b border-[#f0ece4] px-[8px] py-[6.2px] text-right font-bold text-[#137a45]'}>{brl(lucro)}</td>
                        <td className={'border-b border-[#f0ece4] px-[8px] py-[6.2px] text-right text-[#6b6760]'}>{pct(margem)}</td>
                      </tr>
                    );
                  })}
                  <tr className={'bg-[#15130f] font-bold text-white'}>
                    <td className={'px-[8px] py-[9px] text-[#c8981f]'}>Total</td>
                    <td className={'px-[8px] py-[9px] text-right'}>{brl(totalReceita)}</td>
                    <td className={'px-[8px] py-[9px] text-right text-[#ff9d9d]'}>{brl(totalDespesa)}</td>
                    <td className={'px-[8px] py-[9px] text-right text-[#7ee0a8]'}>{brl(totalLucro)}</td>
                    <td className={'px-[8px] py-[9px] text-right text-[#d9d3c4]'}>{pct(margemTotal)}</td>
                  </tr>
                </tbody>
              </table>
              <p className={'mt-[3mm] text-[10.5px] leading-[1.55] text-[#8a8578]'}>
                O lucro liquido do periodo (<b>{brl(k.lucroLiquido)}</b>) corresponde ao lucro operacional menos as taxas de plataforma ({brl(k.taxasPlataforma)}).
              </p>

              <Titulo sub={'Receita acumulada e participacao no total'}>Desempenho por unidade</Titulo>
              <table className={'w-full border-collapse text-[11.8px]'}>
                <thead>
                  <tr className={'text-[9.2px] uppercase tracking-[1.1px] text-[#8a8578]'}>
                    <th className={'border-b-[1.5px] border-[#ddd8cd] px-[8px] pb-[6px] font-bold text-left'}>Flat</th>
                    <th className={'border-b-[1.5px] border-[#ddd8cd] px-[8px] pb-[6px] font-bold text-left'}>Situacao</th>
                    <th className={'border-b-[1.5px] border-[#ddd8cd] px-[8px] pb-[6px] font-bold text-left'}>Participacao</th>
                    <th className={'border-b-[1.5px] border-[#ddd8cd] px-[8px] pb-[6px] font-bold text-right'}>Receita</th>
                    <th className={'border-b-[1.5px] border-[#ddd8cd] px-[8px] pb-[6px] font-bold text-right'}>% do total</th>
                  </tr>
                </thead>
                <tbody>
                  {flats.map((fl, i) => (
                    <tr key={fl.nome} className={i % 2 === 1 ? 'bg-[#faf8f4]' : ''}>
                      <td className={'border-b border-[#f0ece4] px-[8px] py-[6.2px] font-bold text-[#221f19]'}>{fl.nome}</td>
                      <td className={'border-b border-[#f0ece4] px-[8px] py-[6.2px] '}><span className={'inline-block rounded-full border border-[#bfe5d0] bg-[#e6f5ec] px-[8px] py-[1.5px] text-[9.5px] font-bold uppercase text-[#137a45]'}>{fl.situacao || 'Ativo'}</span></td>
                      <td className={'border-b border-[#f0ece4] px-[8px] py-[6.2px] w-[38%]'}><div className={'h-[9px] overflow-hidden rounded-[4px] bg-[#f0ece4]'}><div className={'h-full rounded-[4px] bg-gradient-to-r from-[#c8981f] to-[#e0b84e]'} style={{ width: (fl.receita / maxFlat) * 100 + '%' }} /></div></td>
                      <td className={'border-b border-[#f0ece4] px-[8px] py-[6.2px] text-right font-bold'}>{brl(fl.receita)}</td>
                      <td className={'border-b border-[#f0ece4] px-[8px] py-[6.2px] text-right text-[#6b6760]'}>{pct((fl.receita / somaFlats) * 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Rodape pagina={2} total={2} periodo={d.periodoLabel} />
          </section>
        </div>
      </div>
    </div>
  );
}
