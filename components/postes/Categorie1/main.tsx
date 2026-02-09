'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Heading, Spinner, Text, Stack, useColorModeValue } from '@chakra-ui/react';
import { supabase } from '../../../lib/supabaseClient';

/* ===================== IMPORT YOUR EXISTING SOURCE FORMS ===================== */
// Poste 1
import { Source1AForm, Source1ARow } from './Source1A1Form';

// Poste 2 (inside Catégorie 1)
import { SourceA1Form as Source2A1Form } from './Source2A1Form'; // 2A1
import { Source2A3Form } from './Source2A3Form';                 // 2A3
import { SourceB1Form as Source2B1Form } from './Source2B1Form'; // 2B1

// Poste 4 (inside Catégorie 1)
import { Source4A1Form } from './Source4A1Form';
import { Source4B1Form } from './Source4B1Form';
import { Source4B2Form } from './Source4B2Form';

/* ===================== UI TOKENS ===================== */
const COL = {
  bg: '#f3f5f2',
  section: '#f7f9f6',
  greenBar: '#1f3f33',
  border: 'rgba(0,0,0,0.08)',
};

const POSTE_LABEL_FALLBACK = 'Catégorie 1 - Émissions directs';

/* ===================== TYPES ===================== */
// Poste 2 types
type CarburantRow = { details: string; date: string; invoiceNumber: string; qty: string };
type CarburantGroup = { vehicle: string; fuelType: string; rows: CarburantRow[] };
type A3Row = { vehicle: string; type: string; date: string; cost: string; avgPrice: string; estimateQty: string; reference: string };
type B1Row = { vehicle: string; year: string; make: string; model: string; trans: string; distance: string; type: string; cons: string; estimate: string; reference: string; ac: string };

// Poste 4 types
type Source4A1Row = {
  equipment: string; description: string; date: string; months: string; site: string; product: string; reference: string;
  refrigerationType: string; refrigerant: string; qtyInEquipment: string; leakObserved: string;
};
type Source4B1Row = {
  vehicle: string; description: string; date: string; months: string; site: string; product: string; reference: string;
  refrigerationType: string; refrigerant: string; qtyInEquipment: string; leakObserved: string; climatisation: string;
};
type Source4B2Row = { vehicle: string; date: string; refrigerant: string; qtyInEquipment: string; leakObserved: string };

type GesResult = {
  total_ges_tco2e?: string | number;
  total_ges_gco2e?: string | number;
  total_co2_gco2e?: string | number;
  total_energie_kwh?: string | number;
  [k: string]: any;
};

/* ===================== SUB-CATEGORY FILTERING ===================== */
type SubKey = 'combustion_fixes' | 'combustion_mobiles' | 'refrigerants' | 'procedes' | 'sols';

const SUBKEY_TO_SOURCE_CODES: Record<SubKey, string[]> = {
  combustion_fixes: ['1A1'],
  combustion_mobiles: ['2A1', '2A3', '2B1'],
  refrigerants: ['4A1', '4B1', '4B2'],
  procedes: [],
  sols: [],
};

type Props = {
  /** comes from Section.tsx (selected pill key) */
  activeSubKey: SubKey | string;
};

export default function Categorie1Page({ activeSubKey }: Props) {
  /* ===================== GLOBAL CONFIG ===================== */
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [posteId, setPosteId] = useState<string | null>(null);
  const [posteLabel, setPosteLabel] = useState<string>(POSTE_LABEL_FALLBACK);
  const [enabledSources, setEnabledSources] = useState<any[]>([]);
  const [sourceVisibility, setSourceVisibility] = useState<Record<string, boolean>>({});

  const pageBg = useColorModeValue(COL.bg, '#222e32');

  /* ===================== POSTE 1 STATE ===================== */
  const [rows1A1, setRows1A1] = useState<Source1ARow[]>([
    { equipment: '', description: '', date: '', site: '', product: '', reference: '', usageAndFuel: '', qty: '', unit: '' },
  ]);
  const [ges1A1, setGes1A1] = useState<any[]>([]);

  /* ===================== POSTE 2 STATE ===================== */
  const [carburantGroups, setCarburantGroups] = useState<CarburantGroup[]>([]);
  const [a3Rows, setA3Rows] = useState<A3Row[]>([]);
  const [b1Rows, setB1Rows] = useState<B1Row[]>([]);
  const [ges2, setGes2] = useState<any[]>([]);

  /* ===================== POSTE 4 STATE ===================== */
  const [a1Rows4, setA1Rows4] = useState<Source4A1Row[]>([]);
  const [b1Rows4, setB1Rows4] = useState<Source4B1Row[]>([]);
  const [b2Rows4, setB2Rows4] = useState<Source4B2Row[]>([]);
  const [ges4A1, setGes4A1] = useState<GesResult[]>([]);
  const [ges4B1, setGes4B1] = useState<GesResult[]>([]);
  const [ges4B2, setGes4B2] = useState<GesResult[]>([]);

  /* ===================== POSTE 2 HELPERS ===================== */
  const updateGroupField = (gIdx: number, key: keyof CarburantGroup, value: string) => {
    setCarburantGroups(prev => {
      const copy = [...prev];
      (copy[gIdx] as any)[key] = value;
      return copy;
    });
  };
  const updateRowField = (gIdx: number, rIdx: number, key: keyof CarburantRow, value: string) => {
    setCarburantGroups(prev => {
      const copy = [...prev];
      (copy[gIdx].rows[rIdx] as any)[key] = value;
      return copy;
    });
  };
  const addVehicleGroup = () => {
    setCarburantGroups(prev => [
      ...prev,
      { vehicle: '', fuelType: '', rows: [{ details: '', date: '', invoiceNumber: '', qty: '' }] },
    ]);
  };
  const addRow2A1 = (gIdx: number) => {
    setCarburantGroups(prev => {
      const copy = [...prev];
      copy[gIdx].rows.push({ details: '', date: '', invoiceNumber: '', qty: '' });
      return copy;
    });
  };
  const removeRow2A1 = (gIdx: number, rIdx: number) => {
    setCarburantGroups(prev => {
      const copy = [...prev];
      copy[gIdx].rows.splice(rIdx, 1);
      if (copy[gIdx].rows.length === 0) copy.splice(gIdx, 1);
      return copy;
    });
  };
  const removeGroup2A1 = (gIdx: number) => {
    setCarburantGroups(prev => prev.filter((_, i) => i !== gIdx));
  };
  const flattenCarburantGroups = (groups: CarburantGroup[]) => {
    return groups.flatMap(group =>
      group.rows.map(row => ({
        'Liste des véhicules': group.vehicle,
        'Type de véhicule et type de carburant': group.fuelType,
        'Autres détails': row.details,
        Date: row.date,
        '# facture': row.invoiceNumber,
        'Quantité Totale': row.qty,
      })),
    );
  };

  const addA3Row = () =>
    setA3Rows(prev => [
      ...prev,
      { vehicle: '', type: '', date: '', cost: '', avgPrice: '', estimateQty: '', reference: '' },
    ]);
  const removeA3Row = (idx: number) => setA3Rows(prev => prev.filter((_, i) => i !== idx));
  const updateA3Row = (idx: number, key: keyof A3Row, value: string) => {
    setA3Rows(prev => {
      const copy = [...prev];
      copy[idx][key] = value;
      return copy;
    });
  };

  const addB1Row = () =>
    setB1Rows(prev => [
      ...prev,
      { vehicle: '', year: '', make: '', model: '', trans: '', distance: '', type: '', cons: '', estimate: '', reference: '', ac: '' },
    ]);

  /* ===================== POSTE 4 HELPERS ===================== */
  const add4A1Row = () =>
    setA1Rows4(prev => [
      ...prev,
      { equipment: '', description: '', date: '', months: '', site: '', product: '', reference: '', refrigerationType: '', refrigerant: '', qtyInEquipment: '', leakObserved: '' },
    ]);
  const update4A1Row = (idx: number, key: keyof Source4A1Row, value: string) => {
    setA1Rows4(prev => {
      const copy = [...prev];
      copy[idx][key] = value;
      return copy;
    });
  };
  const remove4A1Row = (idx: number) => setA1Rows4(prev => prev.filter((_, i) => i !== idx));

  const add4B1Row = () =>
    setB1Rows4(prev => [
      ...prev,
      { vehicle: '', description: '', date: '', months: '', site: '', product: '', reference: '', refrigerationType: '', refrigerant: '', qtyInEquipment: '', leakObserved: '', climatisation: '' },
    ]);
  const update4B1Row = (idx: number, key: keyof Source4B1Row, value: string) => {
    setB1Rows4(prev => {
      const copy = [...prev];
      copy[idx][key] = value;
      return copy;
    });
  };
  const remove4B1Row = (idx: number) => setB1Rows4(prev => prev.filter((_, i) => i !== idx));

  const add4B2Row = () =>
    setB2Rows4(prev => [
      ...prev,
      { vehicle: '', date: '', refrigerant: 'R-134a', qtyInEquipment: '', leakObserved: '' },
    ]);
  const update4B2Row = (idx: number, key: keyof Source4B2Row, value: string) => {
    setB2Rows4(prev => {
      const copy = [...prev];
      copy[idx][key] = value;
      return copy;
    });
  };
  const remove4B2Row = (idx: number) => setB2Rows4(prev => prev.filter((_, i) => i !== idx));

  /* ===================== LOAD USER + POSTE CONFIG ===================== */
  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const res = await fetch(`/api/source-visibility?user_id=${user.id}`);
      const data = await res.json();

      // ✅ categorie 1 = poste.num === 1 (robust)
      let p1Id: string | null = null;
      if (data?.postes && Array.isArray(data.postes)) {
        const p1 = data.postes.find((p: any) => Number(p?.num) === 1);
        p1Id = p1?.id ?? null;
      }

      // fallback (if your api doesn't return data.postes)
      if (!p1Id && data.posteLabels) {
        for (const [id, label] of Object.entries(data.posteLabels)) {
          const s = typeof label === 'string' ? label.toLowerCase() : '';
          if (s.includes('poste 1') || s.includes('catégorie 1') || s.includes('categorie 1')) {
            p1Id = id;
            break;
          }
        }
      }

      setPosteId(p1Id);

      if (p1Id) {
        setPosteLabel(data.posteLabels?.[p1Id] || POSTE_LABEL_FALLBACK);
        setEnabledSources(data.sources?.[p1Id] || []);
        setSourceVisibility(data.sourceVisibility?.[p1Id] || {});
      } else {
        setPosteLabel(POSTE_LABEL_FALLBACK);
        setEnabledSources([]);
        setSourceVisibility({});
      }

      setLoading(false);
    })();
  }, []);

  /* ===================== FILTER SOURCES BY SUB-CATEGORY PILL ===================== */
  const filteredSources = useMemo(() => {
    const key = activeSubKey as SubKey;
    const allowed = SUBKEY_TO_SOURCE_CODES[key] ?? [];
    if (allowed.length === 0) return [];
    return (enabledSources || []).filter((s: any) => allowed.includes(String(s?.source_code)));
  }, [enabledSources, activeSubKey]);

  /* ===================== RENDER FORM PER SOURCE ===================== */
  const renderSource = (source: any) => {
    const code: string = source?.source_code;
    const posteSourceId: string | undefined = source?.id;
    if (!code || !userId || !posteSourceId) return null;

    if (sourceVisibility?.[code]) {
      return (
        <Text key={code} color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
          La source <b>{source.label}</b> est masquée pour votre compte.
        </Text>
      );
    }

    /* ---------- Poste 1 ---------- */
    if (code === '1A1') {
      return (
        <Box key={code} mt={6}>
          <Source1AForm
            rows={rows1A1}
            setRows={setRows1A1}
            highlight={COL.greenBar}
            tableBg={COL.section}
            posteSourceId={posteSourceId}
            userId={userId}
            gesResults={ges1A1}
            setGesResults={setGes1A1}
          />
        </Box>
      );
    }

    /* ---------- Poste 2 ---------- */
    if (code === '2A1') {
      return (
        <Box key={code} mt={6}>
          <Source2A1Form
            posteSourceId={posteSourceId}
            carburantGroups={carburantGroups}
            updateGroupField={updateGroupField}
            updateRowField={updateRowField}
            addVehicleGroup={addVehicleGroup}
            addRow={addRow2A1}
            removeRow={removeRow2A1}
            removeGroup={removeGroup2A1}
            flattenCarburantGroups={flattenCarburantGroups}
            highlight={COL.greenBar}
            tableBg={COL.section}
            userId={userId}
            gesResults={ges2}
            setGesResults={setGes2}
          />
        </Box>
      );
    }

    if (code === '2A3') {
      return (
        <Box key={code} mt={6}>
          <Source2A3Form
            posteSourceId={String(posteSourceId)}
            a3Rows={a3Rows}
            setA3Rows={setA3Rows}
            addA3Row={addA3Row}
            removeA3Row={removeA3Row}
            updateA3Row={updateA3Row}
            userId={userId}
            gesResults={ges2}
            setGesResults={setGes2}
            highlight={COL.greenBar}
            tableBg={COL.section}
          />
        </Box>
      );
    }

    if (code === '2B1') {
      return (
        <Box key={code} mt={6}>
          <Source2B1Form
            posteSourceId={String(posteSourceId)}
            b1Rows={b1Rows}
            setB1Rows={setB1Rows}
            addB1Row={addB1Row}
            userId={userId}
            gesResults={ges2}
            setGesResults={setGes2}
            highlight={COL.greenBar}
            tableBg={COL.section}
          />
        </Box>
      );
    }

    /* ---------- Poste 4 ---------- */
    if (code === '4A1') {
      return (
        <Box key={code} mt={6}>
          <Source4A1Form
            rows={a1Rows4}
            setRows={setA1Rows4}
            addRow={add4A1Row}
            removeRow={remove4A1Row}
            updateRow={update4A1Row}
            posteSourceId={posteSourceId}
            userId={userId}
            gesResults={ges4A1}
            setGesResults={setGes4A1}
            highlight={COL.greenBar}
            tableBg={COL.section}
          />
        </Box>
      );
    }

    if (code === '4B1') {
      return (
        <Box key={code} mt={6}>
          <Source4B1Form
            rows={b1Rows4}
            setRows={setB1Rows4}
            addRow={add4B1Row}
            removeRow={remove4B1Row}
            updateRow={update4B1Row}
            posteSourceId={posteSourceId}
            userId={userId}
            gesResults={ges4B1}
            setGesResults={setGes4B1}
            
            
          />
        </Box>
      );
    }

    if (code === '4B2') {
      return (
        <Box key={code} mt={6}>
          <Source4B2Form
            rows={b2Rows4}
            setRows={setB2Rows4}
            addRow={add4B2Row}
            removeRow={remove4B2Row}
            updateRow={update4B2Row}
            posteSourceId={posteSourceId}
            userId={userId}
            gesResults={ges4B2}
            setGesResults={setGes4B2}
            highlight={COL.greenBar}
            tableBg={COL.section}
          />
        </Box>
      );
    }

    return null;
  };

  /* ===================== PAGE RENDER ===================== */
  return (
    <Box bg={pageBg} minH="100vh" px={{ base: 4, md: 8 }} py={{ base: 6, md: 10 }}>
      <Stack maxW="1200px" mx="auto" spacing={6}>
        <Heading as="h1" size="lg" textAlign="center" color={COL.greenBar}>
          {posteLabel}
        </Heading>

        {loading || !userId ? (
          <Box display="flex" alignItems="center" justifyContent="center" minH="40vh">
            <Spinner color={COL.greenBar} size="xl" />
          </Box>
        ) : filteredSources.length === 0 ? (
          <Text color="red.600" textAlign="center" fontWeight="bold" fontSize="lg" mt={6}>
            Aucun mode de saisie n&apos;est activé pour cette sous-catégorie.
          </Text>
        ) : (
          filteredSources.map(renderSource)
        )}
      </Stack>
    </Box>
  );
}
