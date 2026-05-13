'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Box, Button, Flex, Grid, HStack, Spinner, Text } from '@chakra-ui/react';
import { supabase } from '../../../lib/supabaseClient';
import {
  readAutomationPrefill,
  clearAutomationPrefill,
  mapNaturalGasToRows,
  mapRefrigerantToRows,
  mapFuelToCarburantGroups,
} from '../../../lib/automationPrefill';
import { AutomationImportBanner } from '../../AutomationImportBanner';

/* ===================== IMPORT SOURCE FORMS ===================== */
import { Source1AForm, Source1ARow } from './Source1A1Form';
import { SourceA1Form as Source2A1Form } from './Source2A1Form';
import { Source2A3Form } from './Source2A3Form';
import { SourceB1Form as Source2B1Form } from './Source2B1Form';
import { Source4A1Form } from './Source4A1Form';
import { Source4B1Form } from './Source4B1Form';
import { Source4B2Form } from './Source4B2Form';

/* ===================== DESIGN TOKENS ===================== */
const G700 = '#1F3D2E';
const G500 = '#4A6355';
const G300 = '#6B8F7A';
const G100 = '#C8DDD0';
const G50  = '#EAF1EC';
const SANS  = "'Manrope', sans-serif";
const SERIF = "'Source Serif 4', serif";
const BORDER = '#E4EDE7';

/* ===================== TYPES ===================== */
type CarburantRow  = { details: string; date: string; invoiceNumber: string; qty: string };
type CarburantGroup = { vehicle: string; fuelType: string; rows: CarburantRow[] };
type A3Row = { vehicle: string; type: string; date: string; cost: string; avgPrice: string; estimateQty: string; reference: string };
type B1Row = { vehicle: string; year: string; make: string; model: string; trans: string; distance: string; type: string; cons: string; estimate: string; reference: string; ac: string };
type Source4A1Row = { equipment: string; description: string; date: string; months: string; site: string; product: string; reference: string; refrigerationType: string; refrigerant: string; qtyInEquipment: string; leakObserved: string };
type Source4B1Row = { vehicle: string; description: string; date: string; months: string; site: string; product: string; reference: string; refrigerationType: string; refrigerant: string; qtyInEquipment: string; leakObserved: string; climatisation: string };
type Source4B2Row = { vehicle: string; date: string; refrigerant: string; qtyInEquipment: string; leakObserved: string };
type GesResult    = { total_ges_tco2e?: string | number; total_ges_gco2e?: string | number; total_co2_gco2e?: string | number; total_ch4_gco2e?: string | number; total_n2o_gco2e?: string | number; total_energie_kwh?: string | number; [k: string]: any };

/* ===================== TAB / SUB-CATEGORY CONFIG ===================== */
type SubKey = 'combustion_fixes' | 'combustion_mobiles' | 'refrigerants' | 'procedes' | 'sols';

const CAT1_TABS: { key: SubKey; num: string; label: string; disabled?: boolean }[] = [
  { key: 'combustion_fixes',   num: '1.1', label: 'Combustions fixes' },
  { key: 'combustion_mobiles', num: '1.2', label: 'Combustions mobiles' },
  { key: 'procedes',           num: '1.3', label: 'Procédés', disabled: true },
  { key: 'refrigerants',       num: '1.4', label: 'Émissions fugitives' },
  { key: 'sols',               num: '1.5', label: 'Usage des sols', disabled: true },
];

const CAT1_DESC: Record<SubKey, { subLabel: string; description: string }> = {
  combustion_fixes: {
    subLabel: 'Sous-catégorie 1.1 — Combustion fixe',
    description: 'Cette sous-catégorie comptabilise les émissions provenant de la combustion dans des équipements dits « fixes » comme un système de chauffage, une génératrice, une station de soudure, des fours, etc.',
  },
  combustion_mobiles: {
    subLabel: 'Sous-catégorie 1.2 — Combustion mobile',
    description: 'Émissions liées à la combustion de carburants dans les véhicules appartenant ou contrôlés par l\'organisation (flotte terrestre, engins de chantier, équipements motorisés).',
  },
  procedes: {
    subLabel: 'Sous-catégorie 1.3 — Procédés industriels',
    description: 'Émissions résultant de réactions chimiques ou physiques dans les procédés de fabrication, indépendamment de toute combustion. Module en cours de développement.',
  },
  refrigerants: {
    subLabel: 'Sous-catégorie 1.4 — Émissions fugitives',
    description: 'Émissions fugitives provenant des systèmes de réfrigération, de climatisation et de protection contre l\'incendie utilisant des HFC, PFC, SF₆ ou autres gaz fluorés.',
  },
  sols: {
    subLabel: 'Sous-catégorie 1.5 — Usage des sols',
    description: 'Émissions et absorptions liées à l\'utilisation des terres, au changement d\'affectation des terres et à la foresterie. Module en cours de développement.',
  },
};

const METH_LABELS: Record<string, string> = {
  '1A1': 'Facteurs d\'émission ECCC',
  '2A1': 'Méthode des factures — carburant',
  '2A3': 'Estimation par coût moyen',
  '2B1': 'Distance × consommation',
  '4A1': 'Bilan massique — équipements fixes',
  '4B1': 'Bilan massique — véhicules',
  '4B2': 'Recharge directe',
};

const SUBKEY_TO_SOURCE_CODES: Record<SubKey, string[]> = {
  combustion_fixes:   ['1A1'],
  combustion_mobiles: ['2A1', '2A3', '2B1'],
  refrigerants:       ['4A1', '4B1', '4B2'],
  procedes:           [],
  sols:               [],
};

/* ===================== PROPS ===================== */
type Props = {
  activeSubKey: SubKey | string;
  bilanId?: string;
  onNextSource?: () => void;
  onPrevSource?: () => void;
  onGesChange?: (tco2e: number) => void;
  onSubKeyChange?: (key: string) => void;
};

/* ===================== HELPERS ===================== */
const fmtGes = (v: string | number | undefined) => {
  const n = parseFloat(String(v ?? 0)) || 0;
  return n.toLocaleString('fr-CA', { maximumFractionDigits: 3 });
};
const sumField = (arr: GesResult[], key: string) =>
  arr.reduce((acc, r) => acc + (parseFloat(String(r?.[key] ?? 0)) || 0), 0);

/* ===================== STAT CARD ===================== */
function StatCard({ label, value, unit, featured }: { label: string; value: string; unit: string; featured?: boolean }) {
  return (
    <Box
      bg={featured ? G50 : 'white'}
      border="1px solid"
      borderColor={featured ? 'transparent' : BORDER}
      rounded="xl"
      p={4}
    >
      <Text fontFamily={SANS} fontSize="10.5px" fontWeight={600} textTransform="uppercase" letterSpacing="0.12em" color={G300} mb={2}>
        {label}
      </Text>
      <Text fontFamily={SERIF} fontSize={featured ? '22px' : '18px'} fontWeight={700} color={G700} lineHeight={1.1}>
        {value}
        <Text as="span" fontFamily={SANS} fontWeight={500} fontSize="11px" color={G300} ml="2px">
          {' '}{unit}
        </Text>
      </Text>
    </Box>
  );
}

/* ===================== TAB BUTTON ===================== */
function TabBtn({ num, label, active, disabled, onClick }: { num: string; label: string; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <Box
      as="button"
      onClick={onClick}
      disabled={disabled}
      px="18px"
      py="10px"
      rounded="full"
      border="1px solid"
      borderColor={active ? G700 : 'transparent'}
      bg={active ? G700 : 'white'}
      color={active ? 'white' : disabled ? '#B8C2BC' : G700}
      fontFamily={SANS}
      fontWeight={600}
      fontSize="13px"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      whiteSpace="nowrap"
      transition="all 0.15s"
      _focus={{ outline: 'none' }}
      _hover={!active && !disabled ? { borderColor: BORDER } : {}}
    >
      {num} {label}
    </Box>
  );
}

/* ===================== MAIN PAGE ===================== */
export default function Categorie1Page({ activeSubKey, bilanId, onNextSource, onPrevSource, onGesChange, onSubKeyChange }: Props) {
  const [loading, setLoading]       = useState(true);
  const [userId, setUserId]         = useState<string | null>(null);
  const [enabledSources, setEnabledSources] = useState<any[]>([]);
  const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab]   = useState<SubKey>((activeSubKey as SubKey) || 'combustion_fixes');

  /* --- Poste 1 state --- */
  const [rows1A1, setRows1A1]   = useState<Source1ARow[]>([]);
  const [ges1A1, setGes1A1]     = useState<any[]>([]);

  /* --- Poste 2 state --- */
  const [carburantGroups, setCarburantGroups] = useState<CarburantGroup[]>([]);
  const [a3Rows, setA3Rows]     = useState<A3Row[]>([]);
  const [b1Rows, setB1Rows]     = useState<B1Row[]>([]);
  const [ges2, setGes2]         = useState<any[]>([]);

  /* --- Poste 4 state --- */
  const [a1Rows4, setA1Rows4]   = useState<Source4A1Row[]>([]);
  const [b1Rows4, setB1Rows4]   = useState<Source4B1Row[]>([]);
  const [b2Rows4, setB2Rows4]   = useState<Source4B2Row[]>([]);
  const [ges4A1, setGes4A1]     = useState<GesResult[]>([]);
  const [ges4B1, setGes4B1]     = useState<GesResult[]>([]);
  const [ges4B2, setGes4B2]     = useState<GesResult[]>([]);

  /* --- Automation prefill banners --- */
  const [prefillBanner1A1, setPrefillBanner1A1] = useState(false);
  const [prefillCount1A1,  setPrefillCount1A1]  = useState(0);
  const [prefillBanner2A1, setPrefillBanner2A1] = useState(false);
  const [prefillCount2A1,  setPrefillCount2A1]  = useState(0);
  const [prefillBanner4A1, setPrefillBanner4A1] = useState(false);
  const [prefillCount4A1,  setPrefillCount4A1]  = useState(0);

  /* --- Sticky tabs sentinel --- */
  const [isStuck, setIsStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setIsStuck(!e.isIntersecting), { threshold: [1] });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* --- Sync activeTab from parent prop --- */
  useEffect(() => {
    if (activeSubKey && CAT1_TABS.some(t => t.key === activeSubKey)) {
      setActiveTab(activeSubKey as SubKey);
    }
  }, [activeSubKey]);

  /* --- Tab click --- */
  const handleTabClick = (key: SubKey) => {
    setActiveTab(key);
    onSubKeyChange?.(key);
  };

  /* --- Automation prefill callbacks for 1A1 --- */
  const onMounted1A1Empty = useCallback(() => {
    const store = readAutomationPrefill();
    if (!store?.natural_gas?.length) return;
    const mapped = mapNaturalGasToRows(store.natural_gas);
    if (!mapped.length) return;
    setRows1A1(mapped as any);
    setPrefillCount1A1(mapped.length);
  }, []);

  const onMounted1A1NotEmpty = useCallback(() => {
    const store = readAutomationPrefill();
    if (store?.natural_gas?.length) {
      setPrefillBanner1A1(true);
      setPrefillCount1A1(store.natural_gas.length);
    }
  }, []);

  /* --- Automation prefill callbacks for 2A1 --- */
  const onMounted2A1Empty = useCallback(() => {
    const store = readAutomationPrefill();
    if (!store?.fuel?.length) return;
    const mapped = mapFuelToCarburantGroups(store.fuel);
    if (!mapped.length) return;
    setCarburantGroups(mapped as any);
    setPrefillCount2A1(mapped.length);
  }, []);

  const onMounted2A1NotEmpty = useCallback(() => {
    const store = readAutomationPrefill();
    if (store?.fuel?.length) {
      setPrefillBanner2A1(true);
      setPrefillCount2A1(store.fuel.length);
    }
  }, []);

  /* --- Automation prefill callbacks for 4A1 --- */
  const onMounted4A1Empty = useCallback(() => {
    const store = readAutomationPrefill();
    if (!store?.refrigerant?.length) return;
    const mapped = mapRefrigerantToRows(store.refrigerant);
    if (!mapped.length) return;
    setA1Rows4(mapped as any);
    setPrefillCount4A1(mapped.length);
  }, []);

  const onMounted4A1NotEmpty = useCallback(() => {
    const store = readAutomationPrefill();
    if (store?.refrigerant?.length) {
      setPrefillBanner4A1(true);
      setPrefillCount4A1(store.refrigerant.length);
    }
  }, []);

  /* --- Totals --- */
  const totalTco2e = useMemo(() => {
    const all = [...ges1A1, ...ges2, ...ges4A1, ...ges4B1, ...ges4B2];
    return sumField(all, 'total_ges_tco2e');
  }, [ges1A1, ges2, ges4A1, ges4B1, ges4B2]);

  useEffect(() => { onGesChange?.(totalTco2e); }, [totalTco2e, onGesChange]);

  const stats = useMemo(() => {
    const all = [...ges1A1, ...ges2, ...ges4A1, ...ges4B1, ...ges4B2];
    return {
      co2:      sumField(all, 'total_co2_gco2e'),
      ch4:      sumField(all, 'total_ch4_gco2e'),
      n2o:      sumField(all, 'total_n2o_gco2e'),
      gesGco2e: sumField(all, 'total_ges_gco2e'),
      gesTco2e: sumField(all, 'total_ges_tco2e'),
      energyKwh:sumField(all, 'total_energie_kwh'),
    };
  }, [ges1A1, ges2, ges4A1, ges4B1, ges4B2]);

  /* --- Poste 2 helpers --- */
  const updateGroupField = (gIdx: number, key: keyof CarburantGroup, value: string) =>
    setCarburantGroups(prev => { const c = [...prev]; (c[gIdx] as any)[key] = value; return c; });
  const updateRowField = (gIdx: number, rIdx: number, key: keyof CarburantRow, value: string) =>
    setCarburantGroups(prev => { const c = [...prev]; (c[gIdx].rows[rIdx] as any)[key] = value; return c; });
  const addVehicleGroup = () =>
    setCarburantGroups(prev => [...prev, { vehicle: '', fuelType: '', rows: [{ details: '', date: '', invoiceNumber: '', qty: '' }] }]);
  const addRow2A1 = (gIdx: number) =>
    setCarburantGroups(prev => { const c = [...prev]; c[gIdx].rows.push({ details: '', date: '', invoiceNumber: '', qty: '' }); return c; });
  const removeRow2A1 = (gIdx: number, rIdx: number) =>
    setCarburantGroups(prev => { const c = [...prev]; c[gIdx].rows.splice(rIdx, 1); if (c[gIdx].rows.length === 0) c.splice(gIdx, 1); return c; });
  const removeGroup2A1 = (gIdx: number) =>
    setCarburantGroups(prev => prev.filter((_, i) => i !== gIdx));
  const flattenCarburantGroups = (groups: CarburantGroup[]) =>
    groups.flatMap(g => g.rows.map(r => ({
      'Liste des véhicules': g.vehicle,
      'Type de véhicule et type de carburant': g.fuelType,
      'Autres détails': r.details,
      Date: r.date,
      '# facture': r.invoiceNumber,
      'Quantité Totale': r.qty,
    })));

  const addA3Row    = () => setA3Rows(prev => [...prev, { vehicle: '', type: '', date: '', cost: '', avgPrice: '', estimateQty: '', reference: '' }]);
  const removeA3Row = (idx: number) => setA3Rows(prev => prev.filter((_, i) => i !== idx));
  const updateA3Row = (idx: number, key: keyof A3Row, value: string) =>
    setA3Rows(prev => { const c = [...prev]; c[idx][key] = value; return c; });

  const addB1Row = () => setB1Rows(prev => [...prev, { vehicle: '', year: '', make: '', model: '', trans: '', distance: '', type: '', cons: '', estimate: '', reference: '', ac: '' }]);

  /* --- Poste 4 helpers --- */
  const add4A1Row    = () => setA1Rows4(prev => [...prev, { equipment: '', description: '', date: '', months: '', site: '', product: '', reference: '', refrigerationType: '', refrigerant: '', qtyInEquipment: '', leakObserved: '' }]);
  const update4A1Row = (idx: number, key: keyof Source4A1Row, value: string) =>
    setA1Rows4(prev => { const c = [...prev]; c[idx][key] = value; return c; });
  const remove4A1Row = (idx: number) => setA1Rows4(prev => prev.filter((_, i) => i !== idx));

  const add4B1Row    = () => setB1Rows4(prev => [...prev, { vehicle: '', description: '', date: '', months: '', site: '', product: '', reference: '', refrigerationType: '', refrigerant: '', qtyInEquipment: '', leakObserved: '', climatisation: '' }]);
  const update4B1Row = (idx: number, key: keyof Source4B1Row, value: string) =>
    setB1Rows4(prev => { const c = [...prev]; c[idx][key] = value; return c; });
  const remove4B1Row = (idx: number) => setB1Rows4(prev => prev.filter((_, i) => i !== idx));

  const add4B2Row    = () => setB2Rows4(prev => [...prev, { vehicle: '', date: '', refrigerant: 'R-134a', qtyInEquipment: '', leakObserved: '' }]);
  const update4B2Row = (idx: number, key: keyof Source4B2Row, value: string) =>
    setB2Rows4(prev => { const c = [...prev]; c[idx][key] = value; return c; });
  const remove4B2Row = (idx: number) => setB2Rows4(prev => prev.filter((_, i) => i !== idx));

  /* --- Load user + source config --- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const res  = await fetch(`/api/source-visibility?user_id=${user.id}`);
      const data = await res.json();

      let p1Id: string | null = null;
      if (data?.postes && Array.isArray(data.postes)) {
        const p1 = data.postes.find((p: any) => Number(p?.num) === 1);
        p1Id = p1?.id ?? null;
      }
      if (!p1Id && data.posteLabels) {
        for (const [id, label] of Object.entries(data.posteLabels)) {
          const s = typeof label === 'string' ? label.toLowerCase() : '';
          if (s.includes('poste 1') || s.includes('catégorie 1') || s.includes('categorie 1')) { p1Id = id; break; }
        }
      }

      if (p1Id) {
        setEnabledSources(data.sources?.[p1Id] || []);
        setSourceVisibility(data.sourceVisibility?.[p1Id] || {});
      }
      setLoading(false);
    })();
  }, []);

  /* --- Filter sources for active tab --- */
  const filteredSources = useMemo(() => {
    const allowed = SUBKEY_TO_SOURCE_CODES[activeTab] ?? [];
    if (allowed.length === 0) return [];
    return (enabledSources || []).filter((s: any) => allowed.includes(String(s?.source_code)));
  }, [enabledSources, activeTab]);

  /* --- Render a form wrapped in a methodology card --- */
  const renderSource = (source: any) => {
    const code: string = source?.source_code;
    const psId: string | undefined = source?.id;
    if (!code || !userId || !psId) return null;

    if (sourceVisibility?.[code]) {
      return (
        <Box key={code} bg="white" border="1px solid" borderColor={BORDER} rounded="xl" p={5}>
          <Text color="red.600" fontWeight={700} fontFamily={SANS} fontSize="sm">
            La source <b>{source.label}</b> est masquée pour votre compte.
          </Text>
        </Box>
      );
    }

    const methLabel = METH_LABELS[code];

    const formNode = (() => {
      const HL  = '#1f3f33';
      const TBG = '#f7f9f6';
      if (code === '1A1') return <Source1AForm rows={rows1A1} setRows={setRows1A1} highlight={HL} tableBg={TBG} posteSourceId={psId} userId={userId} gesResults={ges1A1} setGesResults={setGes1A1} bilanId={bilanId} onMountedEmpty={onMounted1A1Empty} onMountedNotEmpty={onMounted1A1NotEmpty} />;
      if (code === '2A1') return <Source2A1Form posteSourceId={psId} carburantGroups={carburantGroups} setCarburantGroups={setCarburantGroups} updateGroupField={updateGroupField} updateRowField={updateRowField} addVehicleGroup={addVehicleGroup} addRow={addRow2A1} removeRow={removeRow2A1} removeGroup={removeGroup2A1} flattenCarburantGroups={flattenCarburantGroups} highlight={HL} tableBg={TBG} userId={userId} gesResults={ges2} setGesResults={setGes2} bilanId={bilanId} onMountedEmpty={onMounted2A1Empty} onMountedNotEmpty={onMounted2A1NotEmpty} />;
      if (code === '2A3') return <Source2A3Form posteSourceId={String(psId)} a3Rows={a3Rows} setA3Rows={setA3Rows} addA3Row={addA3Row} removeA3Row={removeA3Row} updateA3Row={updateA3Row} userId={userId} gesResults={ges2} setGesResults={setGes2} highlight={HL} tableBg={TBG} bilanId={bilanId} />;
      if (code === '2B1') return <Source2B1Form posteSourceId={String(psId)} b1Rows={b1Rows} setB1Rows={setB1Rows} addB1Row={addB1Row} userId={userId} gesResults={ges2} setGesResults={setGes2} bilanId={bilanId} />;
      if (code === '4A1') return <Source4A1Form rows={a1Rows4} setRows={setA1Rows4} addRow={add4A1Row} removeRow={remove4A1Row} updateRow={update4A1Row} posteSourceId={psId} userId={userId} gesResults={ges4A1} setGesResults={setGes4A1} highlight={HL} tableBg={TBG} bilanId={bilanId} onMountedEmpty={onMounted4A1Empty} onMountedNotEmpty={onMounted4A1NotEmpty} />;
      if (code === '4B1') return <Source4B1Form rows={b1Rows4} setRows={setB1Rows4} addRow={add4B1Row} removeRow={remove4B1Row} updateRow={update4B1Row} posteSourceId={psId} userId={userId} gesResults={ges4B1} setGesResults={setGes4B1} bilanId={bilanId} />;
      if (code === '4B2') return <Source4B2Form rows={b2Rows4} setRows={setB2Rows4} addRow={add4B2Row} removeRow={remove4B2Row} updateRow={update4B2Row} posteSourceId={psId} userId={userId} gesResults={ges4B2} setGesResults={setGes4B2} highlight={HL} tableBg={TBG} bilanId={bilanId} />;
      return null;
    })();

    if (!formNode) return null;

    const is1A1 = code === '1A1';
    const is2A1 = code === '2A1';
    const is4A1 = code === '4A1';

    return (
      <Box key={code} position="relative" mt={8}>
        {/* Automation import banner (form has existing data) */}
        {is1A1 && prefillBanner1A1 && (
          <AutomationImportBanner
            count={prefillCount1A1}
            onImport={() => {
              const store = readAutomationPrefill();
              if (store) setRows1A1(mapNaturalGasToRows(store.natural_gas) as any);
              clearAutomationPrefill();
              setPrefillBanner1A1(false);
            }}
            onDismiss={() => { clearAutomationPrefill(); setPrefillBanner1A1(false); }}
          />
        )}
        {is2A1 && prefillBanner2A1 && (
          <AutomationImportBanner
            count={prefillCount2A1}
            onImport={() => {
              const store = readAutomationPrefill();
              if (store) setCarburantGroups(mapFuelToCarburantGroups(store.fuel ?? []) as any);
              clearAutomationPrefill();
              setPrefillBanner2A1(false);
            }}
            onDismiss={() => { clearAutomationPrefill(); setPrefillBanner2A1(false); }}
          />
        )}
        {is4A1 && prefillBanner4A1 && (
          <AutomationImportBanner
            count={prefillCount4A1}
            onImport={() => {
              const store = readAutomationPrefill();
              if (store) setA1Rows4(mapRefrigerantToRows(store.refrigerant) as any);
              clearAutomationPrefill();
              setPrefillBanner4A1(false);
            }}
            onDismiss={() => { clearAutomationPrefill(); setPrefillBanner4A1(false); }}
          />
        )}
        {methLabel && (
          <Box
            position="absolute" top="-18px" left="24px" zIndex={1}
            bg={G100} color={G700}
            px="18px" py="9px" rounded="full"
            fontFamily={SANS} fontSize="13px" fontWeight={600}
            whiteSpace="nowrap" display="inline-flex" alignItems="center"
          >
            {methLabel}
          </Box>
        )}
        <Box bg="white" border="1px solid" borderColor={BORDER} rounded="2xl" pt={8} pb={6} px={6} overflow="visible">
          {/* Auto-fill badge — inside card to avoid overlapping the absolute methodology pill */}
          {is1A1 && prefillCount1A1 > 0 && !prefillBanner1A1 && (
            <Badge colorScheme="green" fontSize="11px" mb={3} px={3} py={1} rounded="full" display="block" w="fit-content">
              {prefillCount1A1} facture{prefillCount1A1 > 1 ? 's' : ''} importée{prefillCount1A1 > 1 ? 's' : ''} depuis l'automatisation
            </Badge>
          )}
          {is2A1 && prefillCount2A1 > 0 && !prefillBanner2A1 && (
            <Badge colorScheme="green" fontSize="11px" mb={3} px={3} py={1} rounded="full" display="block" w="fit-content">
              {prefillCount2A1} facture{prefillCount2A1 > 1 ? 's' : ''} importée{prefillCount2A1 > 1 ? 's' : ''} depuis l'automatisation
            </Badge>
          )}
          {is4A1 && prefillCount4A1 > 0 && !prefillBanner4A1 && (
            <Badge colorScheme="green" fontSize="11px" mb={3} px={3} py={1} rounded="full" display="block" w="fit-content">
              {prefillCount4A1} facture{prefillCount4A1 > 1 ? 's' : ''} importée{prefillCount4A1 > 1 ? 's' : ''} depuis l'automatisation
            </Badge>
          )}
          {formNode}
        </Box>
      </Box>
    );
  };

  /* ===================== RENDER ===================== */
  return (
    <Box minH="100vh" bg="#F4F6F4">

      {/* ── Hero Band ── */}
      <Box
        bg={G50}
        px={{ base: 6, md: 10, lg: 16 }}
        pt={{ base: 8, md: 10 }}
        pb={{ base: 12, md: 14 }}
        borderBottomLeftRadius="22px"
        borderBottomRightRadius="22px"
      >
        <Flex align={{ base: 'flex-start', md: 'center' }} justify="space-between" gap={8} flexDirection={{ base: 'column', md: 'row' }} maxW="1400px" mx="auto">
          <Text
            fontFamily={SERIF}
            fontSize={{ base: '28px', md: '38px', lg: '44px' }}
            fontWeight={700}
            color={G700}
            lineHeight={1.05}
            letterSpacing="-0.015em"
            m={0}
          >
            Catégorie 1 — Émissions directes
          </Text>

          {/* Total card */}
          <Box
            bg="rgba(255,255,255,0.66)"
            rounded="2xl"
            px={7}
            py="22px"
            textAlign="left"
            flexShrink={0}
            minW={{ base: 'auto', md: '320px' }}
            boxShadow="0 1px 0 rgba(31,61,46,.04)"
          >
            <Text fontFamily={SANS} fontSize="14px" fontWeight={500} color={G700} mb="6px">
              Total de la Catégorie :
            </Text>
            <Text fontFamily={SERIF} fontSize={{ base: '28px', md: '36px' }} fontWeight={700} color={G700} lineHeight={1} letterSpacing="-0.01em">
              {stats.gesTco2e.toLocaleString('fr-CA', { maximumFractionDigits: 3 })}
              {' '}
              <Text as="span" fontSize="0.55em" fontWeight={600}>
                t&nbsp;de&nbsp;CO<Text as="sup" fontSize="0.7em">2</Text>e
              </Text>
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* ── Sticky Tabs sentinel ── */}
      <Box ref={sentinelRef} h="1px" />

      {/* ── Sticky Tabs Bar ── */}
      <Box
        position="sticky"
        top={0}
        zIndex={20}
        bg={isStuck ? 'rgba(241,244,236,0.92)' : '#F4F6F4'}
        backdropFilter={isStuck ? 'saturate(140%) blur(8px)' : 'none'}
        borderBottom="1px solid"
        borderColor={isStuck ? BORDER : 'transparent'}
        boxShadow={isStuck ? '0 8px 18px -16px rgba(31,61,46,.18)' : 'none'}
        transition="background 0.2s, border-color 0.2s, box-shadow 0.2s"
        px={{ base: 4, md: 8, lg: 16 }}
        py={{ base: '14px', md: '18px' }}
        pb="14px"
      >
        <Flex maxW="1400px" mx="auto" gap={2} flexWrap="wrap">
          {CAT1_TABS.map(tab => (
            <TabBtn
              key={tab.key}
              num={tab.num}
              label={tab.label}
              active={activeTab === tab.key}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && handleTabClick(tab.key)}
            />
          ))}
        </Flex>
      </Box>

      {/* ── Content ── */}
      <Box maxW="1400px" mx="auto" px={{ base: 4, md: 8, lg: 16 }} py={{ base: 6, md: 10 }}>

        {/* Description block */}
        <Box position="relative" mt={4}>
          <Box
            position="absolute" top="-18px" left="24px" zIndex={1}
            bg={G700} color="white"
            px="18px" py="9px" rounded="full"
            fontFamily={SANS} fontSize="13px" fontWeight={600}
            whiteSpace="nowrap" display="inline-flex" alignItems="center"
          >
            {CAT1_DESC[activeTab]?.subLabel}
          </Box>
          <Box bg="white" border="1px solid" borderColor={BORDER} rounded="2xl" pt="34px" pb={5} px={6}>
            <Flex justify="space-between" align="flex-start" gap={6}>
              <Text fontFamily={SANS} fontSize="13.5px" color={G500} lineHeight={1.7} maxW="70ch">
                {CAT1_DESC[activeTab]?.description}
              </Text>
              <HStack spacing={1.5} flexShrink={0} align="center" pt={1}>
                <Box w="8px" h="8px" rounded="full" bg="#4FA77A" flexShrink={0} />
                <Text fontFamily={SANS} fontSize="12px" color={G300} whiteSpace="nowrap">
                  Saisie automatique activée
                </Text>
              </HStack>
            </Flex>
          </Box>
        </Box>

        {/* Results section */}
        <Box mt={10} mb={2}>
          <Text fontFamily={SERIF} fontSize="22px" fontWeight={600} color={G700}>
            Résultats {CAT1_DESC[activeTab]?.subLabel?.split(' — ')[0]}
          </Text>
        </Box>

        {/* Stat grid */}
        <Grid
          templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }}
          gap={3}
          mb={10}
        >
          <StatCard label="CO₂"            value={fmtGes(stats.co2)}       unit="gCO₂e" />
          <StatCard label="CH₄"            value={fmtGes(stats.ch4)}       unit="gCO₂e" />
          <StatCard label="N₂O"            value={fmtGes(stats.n2o)}       unit="gCO₂e" />
          <StatCard label="Total GES"      value={fmtGes(stats.gesGco2e)}  unit="gCO₂e" />
          <StatCard label="Total GES"      value={fmtGes(stats.gesTco2e)}  unit="tCO₂e" featured />
          <StatCard label="Énergie"        value={fmtGes(stats.energyKwh)} unit="kWh" />
        </Grid>

        {/* Form blocks */}
        {loading ? (
          <Flex justify="center" align="center" minH="200px">
            <Spinner color={G700} size="xl" thickness="3px" />
          </Flex>
        ) : filteredSources.length === 0 ? (
          <Box bg="white" border="1px solid" borderColor={BORDER} rounded="2xl" p={8} textAlign="center">
            <Text fontFamily={SANS} color={G300} fontSize="14px">
              {SUBKEY_TO_SOURCE_CODES[activeTab]?.length === 0
                ? 'Ce module est en cours de développement.'
                : 'Aucune source n\'est activée pour cette sous-catégorie.'}
            </Text>
          </Box>
        ) : (
          filteredSources.map(renderSource)
        )}

        {/* Navigation buttons */}
        {!loading && userId && (
          <HStack justify="space-between" mt={10} spacing={4}>
            <Button
              variant="outline"
              borderColor={G700}
              color={G700}
              rounded="xl"
              _hover={{ bg: G50 }}
              size="md"
              px={6}
              fontFamily={SANS}
              fontWeight={600}
              isDisabled={!onPrevSource}
              onClick={onPrevSource}
            >
              ← Source précédente
            </Button>
            <HStack spacing={4}>
              <Button
                variant="outline"
                borderColor={G700}
                color={G700}
                rounded="xl"
                _hover={{ bg: G50 }}
                size="md"
                px={6}
                fontFamily={SANS}
                fontWeight={600}
                isDisabled
              >
                Valider la source
              </Button>
              <Button
                bg={G700}
                color="white"
                rounded="xl"
                _hover={{ bg: '#2d5c4a' }}
                size="md"
                px={6}
                fontFamily={SANS}
                fontWeight={700}
                isDisabled={!onNextSource}
                onClick={onNextSource}
              >
                Prochaine Source →
              </Button>
            </HStack>
          </HStack>
        )}
      </Box>
    </Box>
  );
}
