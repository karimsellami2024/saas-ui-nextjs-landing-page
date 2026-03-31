'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Spinner, Center } from '@chakra-ui/react';
import { supabase } from '../../lib/supabaseClient';

/* ── Palette ── */
const BG_PAGE   = '#2C4535';   // full-page olive-green background
const HEADER_BG = '#223328';   // darker header
const CARD_BG   = '#FFFFFF';
const SCOPE_BG  = '#243B2D';   // dark cell for scope number
const G_DARK    = '#2B4A38';
const G_MED     = '#4A7A60';
const G_LIGHT   = '#EEF4F0';
const BORDER    = '#D0DDD5';
const TXT       = '#1A2E22';
const MUTED     = '#5A7060';
const BAR_COLOR = '#5B9B7A';
const FOOT_BG   = '#2B4335';

/* ─── 23 postes ─── */
type CommentKey = 'COMPLET' | 'AMELIORATION' | 'NA' | 'NON_COMPTE';

interface PosteDef {
  num: number; scope: 1|2|3; cat: string; description: string;
  codes: string[]; fallback: CommentKey;
  nonCompteInData?: boolean; // show "(Source…)" text in data columns
}

const POSTES: PosteDef[] = [
  { num:  1, scope:1, cat:'Catégorie 1', description:"Émissions directes des sources de combustions fixes",                                                       codes:['1A1'],                               fallback:'NA' },
  { num:  2, scope:1, cat:'Catégorie 1', description:"Émissions directes des sources de combustions mobiles",                                                      codes:['2A1','2A3'],                         fallback:'NA' },
  { num:  3, scope:1, cat:'Catégorie 1', description:"Émissions directes provenant des procédés et élevages d'animaux",                                            codes:[],                                    fallback:'NA' },
  { num:  4, scope:1, cat:'Catégorie 1', description:"Émissions fugitives directes (Réfrigérants)",                                                                codes:['4A1','4B1','4B2'],                   fallback:'NA' },
  { num:  5, scope:1, cat:'Catégorie 1', description:"Émissions directes provenant de l'usage des sols (incluant agricoles) et de la foresterie",                  codes:[],                                    fallback:'NA' },
  { num:  6, scope:2, cat:'Catégorie 2', description:"Émissions indirectes provenant de la consommation d'électricité",                                            codes:['6A1','6B1'],                         fallback:'NA' },
  { num:  7, scope:2, cat:'Catégorie 2', description:"Émissions indirectes provenant de la consommation d'un réseau d'énergie (exclut l'électricité)",             codes:[],                                    fallback:'NA' },
  { num:  8, scope:3, cat:'Catégorie 4', description:"Autres émissions dues à la production et la distribution d'énergie",                                         codes:[],                                    fallback:'NA' },
  { num:  9, scope:3, cat:'Catégorie 4', description:"Achat de biens et services",                                                                                 codes:['4.1A2'],                             fallback:'AMELIORATION' },
  { num: 10, scope:3, cat:'Catégorie 4', description:"Biens immobiliers",                                                                                          codes:[],                                    fallback:'NA' },
  { num: 11, scope:3, cat:'Catégorie 4', description:"Déchets",                                                                                                    codes:['4.3A1'],                             fallback:'AMELIORATION', nonCompteInData:true },
  { num: 12, scope:3, cat:'Catégorie 3', description:"Transport et distribution en amont",                                                                         codes:[],                                    fallback:'NA' },
  { num: 13, scope:3, cat:'Catégorie 3', description:"Déplacements d'affaires",                                                                                    codes:['3.5A1'],                             fallback:'NA' },
  { num: 14, scope:3, cat:'Catégorie 4', description:"Location d'actif en amont (place d'affaires)",                                                               codes:['4.1B1','4.1C1','4.1D1','4.1E1','4.1E2'], fallback:'NA' },
  { num: 15, scope:3, cat:'Catégorie 5', description:"Investissement",                                                                                             codes:[],                                    fallback:'AMELIORATION', nonCompteInData:true },
  { num: 16, scope:3, cat:'Catégorie 3', description:"Déplacements des clients et des visiteurs (évènements)",                                                     codes:['3.4B1'],                             fallback:'NA' },
  { num: 17, scope:3, cat:'Catégorie 3', description:"Transport et distribution des produits en aval",                                                             codes:[],                                    fallback:'NA' },
  { num: 18, scope:3, cat:'Catégorie 5', description:"Utilisation des produits vendus",                                                                            codes:['5.1A1','5.1B1'],                     fallback:'NA' },
  { num: 19, scope:3, cat:'Catégorie 5', description:"Fin de vie des produits",                                                                                    codes:['5.2A1','5.2B1'],                     fallback:'NA' },
  { num: 20, scope:3, cat:'Catégorie 5', description:"Franchises en aval",                                                                                         codes:[],                                    fallback:'NA' },
  { num: 21, scope:3, cat:'Catégorie 5', description:"Location d'actif en aval",                                                                                   codes:[],                                    fallback:'NA' },
  { num: 22, scope:3, cat:'Catégorie 3', description:"Navettage des employés",                                                                                     codes:['3A1','3.3A1'],                       fallback:'NON_COMPTE', nonCompteInData:true },
  { num: 23, scope:3, cat:'Catégorie 6', description:"Autres sources d'émissions indirectes",                                                                      codes:[],                                    fallback:'NA' },
];

/* ── Span builder ── */
function buildSpans(rows: PosteDef[]) {
  const scopeSpans: Record<number, number> = {};
  const catSpans: Record<number, { label: string; span: number }> = {};
  for (let i = 0; i < rows.length; i++) {
    if (i === 0 || rows[i].scope !== rows[i - 1].scope) {
      let s = 1; while (i + s < rows.length && rows[i + s].scope === rows[i].scope) s++;
      scopeSpans[i] = s;
    }
    if (i === 0 || rows[i].cat !== rows[i - 1].cat) {
      let s = 1; while (i + s < rows.length && rows[i + s].cat === rows[i].cat) s++;
      catSpans[i] = { label: rows[i].cat, span: s };
    }
  }
  return { scopeSpans, catSpans };
}

/* ── Bar ── */
function Bar({ pct, max }: { pct: number; max: number }) {
  const w = max > 0 ? Math.max(4, Math.round((pct / max) * 90)) : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', height:'100%' }}>
      <div style={{ height:9, borderRadius:5, backgroundColor:BAR_COLOR, width:w, opacity:0.85 }} />
    </div>
  );
}

/* ── Comment cell ── */
function Cmt({ k }: { k: CommentKey }) {
  if (k === 'NA')           return <span style={{ color:MUTED, fontSize:9 }}>N/A</span>;
  if (k === 'NON_COMPTE')   return <span style={{ color:'#9B7A0A', fontSize:8, fontStyle:'italic' }}>(Source d'émissions<br />non-comptabilisée)</span>;
  if (k === 'AMELIORATION') return <span style={{ color:'#B45309', fontSize:8, fontWeight:700, lineHeight:1.3 }}>POSSIBILITÉ<br />D'AMÉLIORATION</span>;
  return <span style={{ color:'#1A6B3C', fontSize:10, fontWeight:800 }}>COMPLET</span>;
}

const fmt = (n: number) => n > 0 ? n.toFixed(2) : '';

export default function RapportPage() {
  const [userId, setUserId]   = useState<string|null>(null);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/rapport?user_id=${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); });
  }, [userId]);

  const download = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF }       = await import('jspdf');
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: BG_PAGE, logging: false });
      const pdf    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pw     = pdf.internal.pageSize.getWidth();
      const ph     = pdf.internal.pageSize.getHeight();
      const ratio  = canvas.width / canvas.height;
      const iw     = pw, ih = pw / ratio;

      if (ih <= ph) {
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, iw, ih);
      } else {
        const pageH = Math.floor(canvas.width * (ph / pw));
        let y = 0, page = 0;
        while (y < canvas.height) {
          const tmp = document.createElement('canvas');
          tmp.width  = canvas.width;
          tmp.height = Math.min(pageH, canvas.height - y);
          tmp.getContext('2d')!.drawImage(canvas, 0, -y);
          if (page++ > 0) pdf.addPage();
          pdf.addImage(tmp.toDataURL('image/png'), 'PNG', 0, 0, pw, tmp.height * (pw / canvas.width));
          y += pageH;
        }
      }
      pdf.save(`bilan-ges-${(data?.company?.name ?? 'entreprise').replace(/\s+/g,'-').toLowerCase()}.pdf`);
    } finally { setBusy(false); }
  };

  if (loading) return <Center minH="50vh"><Spinner size="xl" color="green.700" /></Center>;

  const byCode: Record<string, { co2:number; ch4:number; n2o:number; total:number }> = data?.by_source_code ?? {};
  const totals  = data?.totals  ?? { co2:0, ch4:0, n2o:0, total:0 };
  const company = data?.company ?? {};

  const rows = POSTES.map(p => {
    let co2=0, ch4=0, n2o=0, total=0;
    p.codes.forEach(c => { const r=byCode[c]; if(r){ co2+=r.co2; ch4+=r.ch4; n2o+=r.n2o; total+=r.total; } });
    const pct  = totals.total > 0 ? +(100 * total / totals.total).toFixed(1) : 0;
    const cmtK: CommentKey = total > 0 ? 'COMPLET' : p.fallback;
    const showNonCompte = total === 0 && !!p.nonCompteInData;
    return { ...p, co2, ch4, n2o, total, pct, cmtK, showNonCompte };
  });

  const maxPct = Math.max(...rows.map(r => r.pct), 1);
  const { scopeSpans, catSpans } = buildSpans(POSTES);

  const now = new Date();
  const fy  = company.fiscal_year_start && company.fiscal_year_end
    ? `${company.fiscal_year_start} – ${company.fiscal_year_end}`
    : `${now.getFullYear()-1}-${now.getFullYear()}`;

  /* ── Cell base styles ── */
  const TH: React.CSSProperties = {
    padding: '7px 5px', fontSize: 8, fontWeight: 800, color: '#3A5445',
    backgroundColor: G_LIGHT, textAlign: 'center', textTransform: 'uppercase',
    letterSpacing: '0.05em', borderBottom: `2px solid ${BORDER}`,
    whiteSpace: 'nowrap', verticalAlign: 'bottom',
  };
  const TD: React.CSSProperties = {
    padding: '4px 5px', fontSize: 10, borderBottom: `1px dashed ${BORDER}`,
    verticalAlign: 'middle', lineHeight: 1.3,
  };

  return (
    <Box>
      <Box mb={4} display="flex" justifyContent="flex-end">
        <Button onClick={download} isLoading={busy} loadingText="Génération..."
          bg={G_DARK} color="white" size="sm" borderRadius="full" px={6}
          _hover={{ bg: G_MED }}>
          ⬇ Télécharger PDF
        </Button>
      </Box>

      {/* ── Capturable report ── */}
      <div ref={ref} style={{
        fontFamily: 'Arial,Helvetica,sans-serif',
        backgroundColor: BG_PAGE,
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,.18)',
      }}>

        {/* ── Header ── */}
        <div style={{
          backgroundColor: HEADER_BG,
          padding: '24px 32px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {/* Left: title */}
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
              BILAN DES ÉMISSIONS DE <span style={{ color: '#7DD4A0' }}>GES</span>
            </div>
            <div style={{ fontSize: 12, color: '#A8CFBA', marginTop: 6, letterSpacing: '0.05em', fontWeight: 600 }}>
              RÉALISÉ POUR LA PÉRIODE D'EXERCICE {fy.toUpperCase()}
            </div>
          </div>

          {/* Right: logos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Company name box */}
            {company.name && (
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 10,
                padding: '10px 18px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 8, color: '#A8CFBA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                  Réalisé pour
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                  {company.name}
                </div>
              </div>
            )}

            {/* Divider */}
            <div style={{ width: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.2)' }} />

            {/* Carbone Québec box */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 10,
              padding: '10px 18px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 8, color: '#A8CFBA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                Préparé par
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.08em' }}>
                CARBONE QUÉBEC<sup style={{ fontSize: 7 }}>®</sup>
              </div>
            </div>
          </div>
        </div>

        {/* ── White table card ── */}
        <div style={{ padding: '14px 18px 18px' }}>
          <div style={{
            backgroundColor: CARD_BG,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,.10)',
          }}>
            <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
              <colgroup>
                <col style={{ width:36 }} />  {/* SCOPE */}
                <col style={{ width:68 }} />  {/* CATÉG */}
                <col style={{ width:40 }} />  {/* POSTE */}
                <col />                        {/* DESCRIPTION */}
                <col style={{ width:50 }} />  {/* CO₂ */}
                <col style={{ width:42 }} />  {/* CH₄ */}
                <col style={{ width:42 }} />  {/* N₂O */}
                <col style={{ width:52 }} />  {/* Total */}
                <col style={{ width:34 }} />  {/* % */}
                <col style={{ width:96 }} />  {/* BAR */}
                <col style={{ width:118 }} /> {/* COMMENTAIRES */}
              </colgroup>
              <thead>
                <tr>
                  <th style={TH}>SCOPE</th>
                  <th style={TH}>CATÉG.</th>
                  <th style={TH}>POSTE<br />D'ÉMISSION</th>
                  <th style={{ ...TH, textAlign:'left', paddingLeft:8 }}>DESCRIPTION</th>
                  <th style={TH}>CO₂</th>
                  <th style={TH}>CH₄</th>
                  <th style={TH}>N₂O</th>
                  <th style={TH}>TOTAL<br /><span style={{ fontWeight:500, fontSize:7 }}>tCO₂eq</span></th>
                  <th style={TH}>%</th>
                  <th style={{ ...TH, textAlign:'left' }}>BAR %</th>
                  <th style={{ ...TH, textAlign:'left' }}>COMMENTAIRES</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const bg        = i % 2 === 0 ? '#FFFFFF' : '#F7FAF8';
                  const scopeSpan = scopeSpans[i];
                  const catEntry  = catSpans[i];

                  return (
                    <tr key={row.num} style={{ backgroundColor: bg }}>

                      {/* SCOPE merged */}
                      {scopeSpan !== undefined && (
                        <td rowSpan={scopeSpan} style={{
                          ...TD,
                          textAlign: 'center', fontWeight: 900, fontSize: 20, color: '#FFFFFF',
                          backgroundColor: SCOPE_BG,
                          borderRight: `2px solid ${BORDER}`,
                          verticalAlign: 'middle',
                        }}>
                          {row.scope}
                        </td>
                      )}

                      {/* CATÉG merged */}
                      {catEntry !== undefined && (
                        <td rowSpan={catEntry.span} style={{
                          ...TD,
                          textAlign: 'center', fontSize: 8, fontWeight: 700,
                          color: G_DARK, backgroundColor: G_LIGHT,
                          borderRight: `1px solid ${BORDER}`,
                          verticalAlign: 'middle', lineHeight: 1.4,
                        }}>
                          {catEntry.label}
                        </td>
                      )}

                      {/* POSTE # */}
                      <td style={{ ...TD, textAlign:'center', fontWeight:700, color:MUTED, fontSize:11 }}>
                        {row.num}
                      </td>

                      {/* DESCRIPTION */}
                      <td style={{ ...TD, color:TXT, fontSize:9.5, paddingLeft:8 }}>
                        {row.description}
                      </td>

                      {row.showNonCompte ? (
                        /* Non-comptabilisée: span the 4 value columns */
                        <td colSpan={4} style={{
                          ...TD, textAlign:'center', color:'#9B7A0A',
                          fontSize:8, fontStyle:'italic', whiteSpace:'nowrap',
                        }}>
                          (Source d'émissions non-comptabilisée)
                        </td>
                      ) : (
                        <>
                          {/* CO₂ */}
                          <td style={{ ...TD, textAlign:'center', fontWeight: row.co2>0 ? 700 : 400, color:TXT, fontSize:9.5 }}>
                            {fmt(row.co2)}
                          </td>
                          {/* CH₄ */}
                          <td style={{ ...TD, textAlign:'center', fontWeight: row.ch4>0 ? 700 : 400, color:TXT, fontSize:9.5 }}>
                            {fmt(row.ch4)}
                          </td>
                          {/* N₂O */}
                          <td style={{ ...TD, textAlign:'center', fontWeight: row.n2o>0 ? 700 : 400, color:TXT, fontSize:9.5 }}>
                            {fmt(row.n2o)}
                          </td>
                          {/* Total */}
                          <td style={{ ...TD, textAlign:'center', fontWeight: row.total>0 ? 800 : 400, color: row.total>0 ? G_DARK : MUTED, fontSize:9.5 }}>
                            {fmt(row.total)}{row.total>0 && row.total<0.005 ? '*' : ''}
                          </td>
                        </>
                      )}

                      {/* % */}
                      <td style={{ ...TD, textAlign:'center', color:MUTED, fontSize:9 }}>
                        {row.pct > 0 ? `${row.pct}%` : ''}
                      </td>

                      {/* BAR */}
                      <td style={{ ...TD, paddingLeft:6 }}>
                        {row.pct > 0 && <Bar pct={row.pct} max={maxPct} />}
                      </td>

                      {/* COMMENTAIRES */}
                      <td style={{ ...TD, paddingLeft:8 }}>
                        <Cmt k={row.cmtK} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* ── TOTAUX footer ── */}
              <tfoot>
                <tr>
                  <td colSpan={4} style={{
                    padding:'10px 16px', textAlign:'right', fontWeight:900, fontSize:11,
                    color:'#FFFFFF', backgroundColor:FOOT_BG,
                    textTransform:'uppercase', letterSpacing:'0.12em',
                  }}>
                    TOTAUX
                  </td>
                  <td style={{ padding:'10px 5px', textAlign:'center', fontWeight:700, fontSize:11, color:'#FFFFFF', backgroundColor:FOOT_BG }}>
                    {totals.co2 > 0 ? totals.co2.toFixed(2) : '—'}
                  </td>
                  <td style={{ padding:'10px 5px', textAlign:'center', fontWeight:700, fontSize:11, color:'#FFFFFF', backgroundColor:FOOT_BG }}>
                    {totals.ch4 > 0 ? totals.ch4.toFixed(2) : '—'}
                  </td>
                  <td style={{ padding:'10px 5px', textAlign:'center', fontWeight:700, fontSize:11, color:'#FFFFFF', backgroundColor:FOOT_BG }}>
                    {totals.n2o > 0 ? totals.n2o.toFixed(2) : '—'}
                  </td>
                  <td colSpan={4} style={{ padding:'10px 10px', fontWeight:900, fontSize:14, color:'#FFFFFF', backgroundColor:FOOT_BG }}>
                    {totals.total > 0 ? `${totals.total.toFixed(2)} tCO₂eq` : '— tCO₂eq'}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div style={{ padding:'6px 14px 10px', fontSize:8.5, color:MUTED, fontStyle:'italic' }}>
              * Résultat faible mais non nul
            </div>
          </div>
        </div>
      </div>
    </Box>
  );
}
