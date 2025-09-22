import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Select, Text,
  Spinner, Stack
} from '@chakra-ui/react';
import { supabase } from '../../../lib/supabaseClient';
import { usePrefillPosteSource } from 'components/postes/HookForGetDataSource';

export type Source1ARow = {
  equipment: string;
  description: string;
  date: string;
  site: string;
  product: string;
  reference: string;
  usageAndFuel: string;
  qty: string;
  unit: string;
};

type GesResult = {
  total_co2_gco2e?: string | number;
  total_ges_ch4_gco2e?: string | number;
  total_ges_n2o_gco2e?: string | number;
  total_ges_gco2e?: string | number;
  total_ges_tco2e?: string | number;
  total_energie_kwh?: string | number;
};

export interface Source1AFormProps {
  rows: Source1ARow[];
  setRows: React.Dispatch<React.SetStateAction<Source1ARow[]>>;
  highlight?: string;
  tableBg?: string;
  posteSourceId: string | null;
  userId?: string | null;
  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
}

const FUEL_OPTIONS = [
  'Génératrice - Mazout [L]',
  'Chauffage - Bois [kg]',
  'Chauffage - Propane [L]',
];
const UNIT_OPTIONS = ['L', 'kg'];

const DEFAULT_ROWS: Source1ARow[] = [
  {
    equipment: '',
    description: '',
    date: '',
    site: '',
    product: '',
    reference: '',
    usageAndFuel: '',
    qty: '',
    unit: '',
  },
];

// helper to parse unit from a fuel option e.g. "... [L]" -> "L"
const parseUnitFromFuel = (fuelLabel: string) => {
  const m = fuelLabel.match(/\[([^\]]+)\]\s*$/);
  return m?.[1] ?? '';
};

export function Source1AForm({
  rows = [],
  setRows,
  highlight = '#245a7c',
  tableBg = '#f3f6ef',
  posteSourceId,
  userId: propUserId,
  gesResults = [],
  setGesResults,
}: Source1AFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(propUserId ?? null);

  // === Prefill (poste 1, source 1A1) ===
  const {
    loading: prefillLoading,
    error: prefillError,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource((userId ?? '') as string, 1, '1A1', { rows: DEFAULT_ROWS });

  // Is the form pristine (untouched)?
  const isPristine = useMemo(() => {
    if (!rows || rows.length === 0) return true;
    if (rows.length !== 1) return false;
    const r = rows[0];
    return (
      !r.equipment &&
      !r.description &&
      !r.date &&
      !r.site &&
      !r.product &&
      !r.reference &&
      !r.usageAndFuel &&
      !r.qty &&
      !r.unit
    );
  }, [rows]);

  // NEW: dropdown options from Supabase
  const [siteOptions, setSiteOptions] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [referenceOptions, setReferenceOptions] = useState<string[]>([]);

  // Load user & saved draft/results from DB (latest submission/poste)
  useEffect(() => {
    (async () => {
      setLoading(true);

      let activeUserId = propUserId ?? null;
      if (!activeUserId) {
        const { data: auth } = await supabase.auth.getUser();
        if (auth?.user) activeUserId = auth.user.id;
      }
      if (!activeUserId) {
        // still allow prefill hook to show something if it can
        setLoading(false);
        return;
      }
      setUserId(activeUserId);

      // Load saved data/results
      const { data, error } = await supabase
        .from('submissions')
        .select(
          `
          id,
          postes!postes_submission_id_fkey (
            id, poste_num, data, results
          )
        `
        )
        .eq('user_id', activeUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data?.postes) {
        const poste = posteSourceId
          ? data.postes.find((p: any) => p.id === posteSourceId)
          : data.postes.find((p: any) => p.poste_num === 1);

        if (poste) {
          let parsed = poste.data;
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
          }
          if (parsed?.rows && Array.isArray(parsed.rows)) {
            setRows(parsed.rows.map((r: any) => ({
              equipment: r.equipment ?? '',
              description: r.description ?? '',
              date: r.date ?? '',
              site: r.site ?? '',
              product: r.product ?? '',
              reference: r.reference ?? '',
              usageAndFuel: r.usageAndFuel ?? r.fuel ?? '',
              qty: String(r.qty ?? ''),
              unit: r.unit ?? '',
            })));
          } else if (!rows?.length) {
            setRows(DEFAULT_ROWS);
          }

          if (Array.isArray(poste.results)) {
            setGesResults(poste.results as GesResult[]);
          }
        } else if (!rows?.length) {
          setRows(DEFAULT_ROWS);
        }
      } else if (!rows?.length) {
        setRows(DEFAULT_ROWS);
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posteSourceId, propUserId]);

  // Hydrate from prefill only if pristine and not loading DB
  useEffect(() => {
    if (loading || prefillLoading) return;
    if (!isPristine) return;

    if (prefillData?.rows) {
      const dataRows = Array.isArray(prefillData.rows) ? prefillData.rows : DEFAULT_ROWS;
      setRows(dataRows.length ? dataRows : DEFAULT_ROWS);
    } else if (!rows?.length) {
      setRows(DEFAULT_ROWS);
    }

    if (prefillResults) {
      const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
      setGesResults(normalized as GesResult[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData, prefillResults, prefillLoading, loading, isPristine]);

  // Load company dropdown data (sites, products, references)
  useEffect(() => {
    (async () => {
      try {
        if (!userId) return;

        // 1) user_profiles -> company_id
        const { data: profile, error: profErr } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', userId)
          .single();
        if (profErr || !profile?.company_id) return;

        // 2) companies -> production_sites, products, company_references
        const { data: company, error: compErr } = await supabase
          .from('companies')
          .select('production_sites, products, company_references')
          .eq('id', profile.company_id)
          .single();
        if (compErr) return;

        const sites = Array.isArray(company?.production_sites)
          ? (company.production_sites as any[]).map(s => String(s?.nom ?? '')).filter(Boolean)
          : [];
        const prods = Array.isArray(company?.products)
          ? (company.products as any[]).map(p => String(p?.nom ?? '')).filter(Boolean)
          : [];
        const refs = Array.isArray(company?.company_references)
          ? (company.company_references as any[]).map(r => String(r)).filter(Boolean)
          : [];

        const uniq = (arr: string[]) => Array.from(new Set(arr));
        setSiteOptions(uniq(sites));
        setProductOptions(uniq(prods));
        setReferenceOptions(uniq(refs));
      } catch {
        // silent fail; dropdowns remain empty
      }
    })();
  }, [userId]);

  // Validation (for manual submit)
  const validateData = (rws: Source1ARow[]) =>
    rws.length > 0 &&
    rws.every(row =>
      row.equipment &&
      row.site &&
      row.product &&
      row.usageAndFuel &&
      row.qty &&
      row.unit
    );

  // ---------- Debounced autosave (draft) ----------
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJSONRef = useRef<string>('');

  const makeSanitizedRows = (rws: Source1ARow[]) =>
    rws.map(row => ({
      equipment: row.equipment,
      description: row.description,
      date: row.date,
      site: row.site,
      product: row.product,
      reference: row.reference,
      usageAndFuel: row.usageAndFuel,
      qty: parseFloat(String(row.qty)) || 0,
      unit: row.unit,
    }));

  const saveDraft = async () => {
    if (!userId || !posteSourceId) return;

    // avoid redundant saves
    const jsonNow = JSON.stringify(rows);
    if (jsonNow === lastSavedJSONRef.current) return;

    setSaving(true);
    setSaveMsg('Enregistrement…');

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 1,
      source_code: '1A1',
      data: { rows: makeSanitizedRows(rows) },
      results: gesResults ?? [],
    };

    try {
      const dbResponse = await fetch('/api/4submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        setSaveMsg('Erreur d’enregistrement');
        console.error('Autosave DB error:', dbResult?.error || dbResult);
      } else {
        lastSavedJSONRef.current = jsonNow;
        setSaveMsg('Enregistré');
      }
    } catch (e) {
      console.error('Autosave network error:', e);
      setSaveMsg('Erreur réseau');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 1500);
    }
  };

  useEffect(() => {
    if (!userId || !posteSourceId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(saveDraft, 1000); // 1s after last keystroke
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, userId, posteSourceId]);

  // ---------- Manual submit (compute + save) ----------
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!posteSourceId || !userId) {
      alert('Champs obligatoires manquants (posteSourceId ou userId)');
      return;
    }
    if (!validateData(rows)) {
      alert('Veuillez remplir tous les champs requis.');
      return;
    }
    setSubmitting(true);
    setGesResults([]);

    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 1, // 1A1
      source_code: '1A1',
      data: { rows: makeSanitizedRows(rows) },
    };

    let results: GesResult[] = [];
    let webhookOk = false;

    // Cloud Run webhook call
    try {
      const response = await fetch(
        'https://allposteswebhook-129138384907.us-central1.run.app/submit/1A1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        alert('Erreur calcul GES (Cloud Run): ' + (result.error || ''));
      } else {
        results = Array.isArray(result.results) ? result.results : (result.results || []);
        webhookOk = true;
      }
    } catch {
      alert('Erreur réseau lors du calcul Cloud Run.');
    }

    // Save to DB with results
    try {
      const dbPayload = { ...payload, results };
      const dbResponse = await fetch('/api/4submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        alert('Erreur lors de la sauvegarde en base : ' + (dbResult.error || ''));
      } else {
        setGesResults(results);
        lastSavedJSONRef.current = JSON.stringify(rows);
        alert(
          webhookOk
            ? 'Données 1A1 calculées et sauvegardées avec succès!'
            : 'Données 1A1 sauvegardées sans résultat de calcul GES.'
        );
      }
    } catch {
      alert('Erreur inattendue lors de la sauvegarde en base.');
    }

    setSubmitting(false);
  };

  // row helpers
  const addRow = () =>
    setRows(prev => [
      ...prev,
      {
        equipment: '',
        description: '',
        date: '',
        site: '',
        product: '',
        reference: '',
        usageAndFuel: '',
        qty: '',
        unit: '',
      },
    ]);

  const updateRowField = (idx: number, key: keyof Source1ARow, value: string) => {
    setRows(prev => {
      const copy = [...prev];
      copy[idx][key] = value;
      return copy;
    });
  };

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  // auto set unit when fuel chosen (only if unit blank)
  const onFuelChange = (idx: number, value: string) => {
    setRows(prev => {
      const copy = [...prev];
      copy[idx].usageAndFuel = value;
      const unit = parseUnitFromFuel(value);
      if (unit && !copy[idx].unit) {
        copy[idx].unit = unit;
      }
      return copy;
    });
  };

  if (loading || prefillLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minH="300px">
        <Spinner color={highlight} size="xl" />
      </Box>
    );
  }

  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
      <Heading as="h3" size="md" color={highlight} mb={2}>
        Chauffage des bâtiments et équipements fixes – Source 1A1
      </Heading>

      <Stack direction="row" align="center" spacing={3} mb={4}>
        {saving && <Spinner size="sm" color={highlight} />}
        <Text fontSize="sm" color="gray.600">
          {saveMsg ?? 'Saisie automatique activée'}
        </Text>
        {prefillError && (
          <Text fontSize="sm" color="red.500">Erreur de préchargement : {String(prefillError)}</Text>
        )}
      </Stack>

      <Table size="sm" variant="simple" bg={tableBg}>
        <Thead>
          <Tr>
            <Th>Source de combustion</Th>
            <Th>Description</Th>
            <Th>Date</Th>
            <Th>Site</Th>
            <Th>Produit</Th>
            <Th>Références</Th>
            <Th>Utilisation et Combustible</Th>
            <Th>Quantité</Th>
            <Th>Unité</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, idx) => (
            <Tr key={idx}>
              <Td>
                <Input
                  value={row.equipment}
                  onChange={e => updateRowField(idx, 'equipment', e.target.value)}
                />
              </Td>
              <Td>
                <Input
                  value={row.description}
                  onChange={e => updateRowField(idx, 'description', e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>
              <Td>
                <Input
                  type="date"
                  value={row.date}
                  onChange={e => updateRowField(idx, 'date', e.target.value)}
                  placeholder="Facultatif"
                />
              </Td>

              {/* Site dropdown */}
              <Td>
                <Select
                  value={row.site}
                  onChange={e => updateRowField(idx, 'site', e.target.value)}
                  placeholder={siteOptions.length ? 'Sélectionner le site' : 'Aucun site'}
                >
                  {siteOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Td>

              {/* Product dropdown */}
              <Td>
                <Select
                  value={row.product}
                  onChange={e => updateRowField(idx, 'product', e.target.value)}
                  placeholder={productOptions.length ? 'Sélectionner le produit' : 'Aucun produit'}
                >
                  {productOptions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Td>

              {/* Reference dropdown */}
              <Td>
                <Select
                  value={row.reference}
                  onChange={e => updateRowField(idx, 'reference', e.target.value)}
                  placeholder={referenceOptions.length ? 'Sélectionner une référence' : 'Aucune référence'}
                >
                  {referenceOptions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
              </Td>

              <Td>
                <Select
                  value={row.usageAndFuel}
                  onChange={e => onFuelChange(idx, e.target.value)}
                  placeholder="(Sélectionner)"
                >
                  {FUEL_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Select>
              </Td>

              <Td>
                <Input
                  type="number"
                  value={row.qty}
                  onChange={e => updateRowField(idx, 'qty', e.target.value)}
                />
              </Td>

              <Td>
                <Select
                  value={row.unit}
                  onChange={e => updateRowField(idx, 'unit', e.target.value)}
                  placeholder="Unité"
                >
                  {UNIT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Select>
              </Td>

              <Td>
                <Button
                  size="xs"
                  colorScheme="red"
                  onClick={() => removeRow(idx)}
                  title="Supprimer la ligne"
                >
                  -
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Button mt={3} colorScheme="blue" onClick={addRow}>
        Ajouter une ligne
      </Button>
      <Button mt={3} ml={4} colorScheme="green" onClick={handleSubmit} isLoading={submitting}>
        Soumettre
      </Button>

      {/* Results */}
      <Box mt={6} bg="#e5f2fa" rounded="xl" boxShadow="md" p={4}>
        <Text fontWeight="bold" color={highlight} mb={2}>Calculs et résultats</Text>
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>CO₂ [gCO2e]</Th>
              <Th>CH₄ [gCO2e]</Th>
              <Th>N₂O [gCO2e]</Th>
              <Th>Total GES [gCO2e]</Th>
              <Th>Total GES [tCO2e]</Th>
              <Th>Énergie équivalente [kWh]</Th>
            </Tr>
          </Thead>
          <Tbody>
            {gesResults.map((row, idx) => (
              <Tr key={idx}>
                <Td fontWeight="bold">{row.total_co2_gco2e ?? '-'}</Td>
                <Td fontWeight="bold">{row.total_ges_ch4_gco2e ?? '-'}</Td>
                <Td fontWeight="bold">{row.total_ges_n2o_gco2e ?? '-'}</Td>
                <Td fontWeight="bold">{row.total_ges_gco2e ?? '-'}</Td>
                <Td fontWeight="bold">{row.total_ges_tco2e ?? '-'}</Td>
                <Td fontWeight="bold">{row.total_energie_kwh ?? '-'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}



// import React, { useEffect, useState } from 'react';
// import {
//   Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Select, Text,
// } from '@chakra-ui/react';
// import { supabase } from '../../../lib/supabaseClient';
// import { usePrefillPosteSource } from 'components/postes/HookForGetDataSource';

// export type Source1ARow = {
//   equipment: string;
//   description: string;
//   date: string;
//   site: string;
//   product: string;
//   reference: string;
//   usageAndFuel: string;
//   qty: string;
//   unit: string;
// };

// type GesResult = {
//   total_co2_gco2e?: string | number;
//   total_ges_ch4_gco2e?: string | number;
//   total_ges_n2o_gco2e?: string | number;
//   total_ges_gco2e?: string | number;
//   total_ges_tco2e?: string | number;
//   total_energie_kwh?: string | number;
// };

// export interface Source1AFormProps {
//   rows: Source1ARow[];
//   setRows: React.Dispatch<React.SetStateAction<Source1ARow[]>>;
//   highlight?: string;
//   tableBg?: string;
//   posteSourceId: string;
//   userId: string;
//   gesResults?: GesResult[];
//   setGesResults: (results: GesResult[]) => void;
// }

// const FUEL_OPTIONS = [
//   'Génératrice - Mazout [L]',
//   'Chauffage - Bois [kg]',
//   'Chauffage - Propane [L]',
// ];
// const UNIT_OPTIONS = ['L', 'kg'];

// const DEFAULT_ROWS: Source1ARow[] = [
//   {
//     equipment: '',
//     description: '',
//     date: '',
//     site: '',
//     product: '',
//     reference: '',
//     usageAndFuel: '',
//     qty: '',
//     unit: '',
//   },
// ];

// // helper to parse unit from a fuel option e.g. "... [L]" -> "L"
// const parseUnitFromFuel = (fuelLabel: string) => {
//   const m = fuelLabel.match(/\[([^\]]+)\]\s*$/);
//   return m?.[1] ?? '';
// };

// export function Source1AForm({
//   rows = [],
//   setRows,
//   highlight = '#245a7c',
//   tableBg = '#f3f6ef',
//   posteSourceId,
//   userId,
//   gesResults = [],
//   setGesResults,
// }: Source1AFormProps) {
//   const [loading, setLoading] = useState(false);

//   // === NEW: Prefill from /api/get-source (poste 1, source 1A1) ===
//   const {
//     loading: prefillLoading,
//     error: prefillError,
//     data: prefillData,
//     results: prefillResults,
//   } = usePrefillPosteSource(userId, 1, '1A1', { rows: DEFAULT_ROWS });

//   // When prefill returns, update parent-managed rows + results once
//   useEffect(() => {
//     if (prefillData?.rows) {
//       const dataRows = Array.isArray(prefillData.rows) ? prefillData.rows : DEFAULT_ROWS;
//       // ensure each row matches Source1ARow shape
//       setRows(
//         dataRows.length ? dataRows : DEFAULT_ROWS
//       );
//     } else if (!rows?.length) {
//       setRows(DEFAULT_ROWS);
//     }
//     if (prefillResults) {
//       // expecting an array of result rows; if single object, wrap it
//       const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
//       setGesResults(normalized as GesResult[]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [prefillData, prefillResults]);

//   // NEW: dropdown options from Supabase
//   const [siteOptions, setSiteOptions] = useState<string[]>([]);
//   const [productOptions, setProductOptions] = useState<string[]>([]);
//   const [referenceOptions, setReferenceOptions] = useState<string[]>([]);

//   // Load company dropdown data (sites, products, references)
//   useEffect(() => {
//     (async () => {
//       try {
//         if (!userId) return;

//         // 1) user_profiles -> company_id
//         const { data: profile, error: profErr } = await supabase
//           .from('user_profiles')
//           .select('company_id')
//           .eq('id', userId)
//           .single();
//         if (profErr || !profile?.company_id) return;

//         // 2) companies -> production_sites, products, company_references
//         const { data: company, error: compErr } = await supabase
//           .from('companies')
//           .select('production_sites, products, company_references')
//           .eq('id', profile.company_id)
//           .single();
//         if (compErr) return;

//         const sites = Array.isArray(company?.production_sites)
//           ? (company.production_sites as any[]).map(s => String(s?.nom ?? '')).filter(Boolean)
//           : [];
//         const prods = Array.isArray(company?.products)
//           ? (company.products as any[]).map(p => String(p?.nom ?? '')).filter(Boolean)
//           : [];
//         const refs = Array.isArray(company?.company_references)
//           ? (company.company_references as any[]).map(r => String(r)).filter(Boolean)
//           : [];

//         const uniq = (arr: string[]) => Array.from(new Set(arr));
//         setSiteOptions(uniq(sites));
//         setProductOptions(uniq(prods));
//         setReferenceOptions(uniq(refs));
//       } catch {
//         // silent fail; dropdowns will just be empty
//       }
//     })();
//   }, [userId]);

//   // Validate required fields
//   const validateData = (rws: Source1ARow[]) =>
//     rws.length > 0 &&
//     rws.every(row =>
//       row.equipment &&
//       row.site &&
//       row.product &&
//       row.usageAndFuel &&
//       row.qty &&
//       row.unit
//     );

//   // --- SUBMIT ---
//   const handleSubmit = async () => {
//     if (!posteSourceId || !userId) {
//       alert('Champs obligatoires manquants (posteSourceId ou userId)');
//       return;
//     }
//     if (!validateData(rows)) {
//       alert('Veuillez remplir tous les champs requis.');
//       return;
//     }
//     setLoading(true);

//     // 1. Sanitize rows
//     const sanitizedRows = rows.map(row => ({
//       ...row,
//       qty: parseFloat(String(row.qty)) || 0,
//     }));
//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       poste_num: 1, // 1A1
//       source_code: '1A1',
//       data: { rows: sanitizedRows },
//     };

//     let results: any[] = [];
//     let webhookOk = false;

//     // 2. Cloud Run webhook call
//     try {
//       const response = await fetch(
//         'https://allposteswebhook-129138384907.us-central1.run.app/submit/1A1',
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(payload),
//         }
//       );
//       const result = await response.json();
//       if (!response.ok) {
//         alert('Erreur calcul GES (Cloud Run): ' + (result.error || ''));
//       } else {
//         results = Array.isArray(result.results) ? result.results : (result.results || []);
//         webhookOk = true;
//       }
//     } catch {
//       alert('Erreur réseau lors du calcul Cloud Run.');
//     }

//     // 3. Save to DB
//     try {
//       const dbPayload = { ...payload, results };
//       const dbResponse = await fetch('/api/4submit', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(dbPayload),
//       });
//       const dbResult = await dbResponse.json();
//       if (!dbResponse.ok) {
//         alert('Erreur lors de la sauvegarde en base : ' + (dbResult.error || ''));
//       } else {
//         setGesResults(results as GesResult[]);
//         alert(
//           webhookOk
//             ? 'Données 1A1 calculées et sauvegardées avec succès!'
//             : 'Données 1A1 sauvegardées sans résultat de calcul GES.'
//         );
//       }
//     } catch {
//       alert('Erreur inattendue lors de la sauvegarde en base.');
//     }

//     setLoading(false);
//   };

//   // row helpers
//   const addRow = () =>
//     setRows(prev => [
//       ...prev,
//       {
//         equipment: '',
//         description: '',
//         date: '',
//         site: '',
//         product: '',
//         reference: '',
//         usageAndFuel: '',
//         qty: '',
//         unit: '',
//       },
//     ]);

//   const updateRowField = (idx: number, key: keyof Source1ARow, value: string) => {
//     setRows(prev => {
//       const copy = [...prev];
//       copy[idx][key] = value;
//       return copy;
//     });
//   };

//   const removeRow = (idx: number) => {
//     setRows(prev => prev.filter((_, i) => i !== idx));
//   };

//   // auto set unit when fuel chosen (only if unit blank)
//   const onFuelChange = (idx: number, value: string) => {
//     setRows(prev => {
//       const copy = [...prev];
//       copy[idx].usageAndFuel = value;
//       const unit = parseUnitFromFuel(value);
//       if (unit && !copy[idx].unit) {
//         copy[idx].unit = unit;
//       }
//       return copy;
//     });
//   };

//   return (
//     <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
//       <Heading as="h3" size="md" color={highlight} mb={4}>
//         Chauffage des bâtiments et équipements fixes – Source 1A1
//       </Heading>

//       {prefillLoading && (
//         <Text mb={2} fontSize="sm" color="gray.500">Chargement des données enregistrées…</Text>
//       )}
//       {prefillError && (
//         <Text mb={2} fontSize="sm" color="red.500">Erreur de préchargement : {prefillError}</Text>
//       )}

//       <Table size="sm" variant="simple" bg={tableBg}>
//         <Thead>
//           <Tr>
//             <Th>Source de combustion</Th>
//             <Th>Description</Th>
//             <Th>Date</Th>
//             <Th>Site</Th>
//             <Th>Produit</Th>
//             <Th>Références</Th>
//             <Th>Utilisation et Combustible</Th>
//             <Th>Quantité</Th>
//             <Th>Unité</Th>
//             <Th></Th>
//           </Tr>
//         </Thead>
//         <Tbody>
//           {rows.map((row, idx) => (
//             <Tr key={idx}>
//               <Td>
//                 <Input
//                   value={row.equipment}
//                   onChange={e => updateRowField(idx, 'equipment', e.target.value)}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.description}
//                   onChange={e => updateRowField(idx, 'description', e.target.value)}
//                   placeholder="Facultatif"
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="date"
//                   value={row.date}
//                   onChange={e => updateRowField(idx, 'date', e.target.value)}
//                   placeholder="Facultatif"
//                 />
//               </Td>

//               {/* Site dropdown */}
//               <Td>
//                 <Select
//                   value={row.site}
//                   onChange={e => updateRowField(idx, 'site', e.target.value)}
//                   placeholder={siteOptions.length ? 'Sélectionner le site' : 'Aucun site'}
//                 >
//                   {siteOptions.map(s => (
//                     <option key={s} value={s}>{s}</option>
//                   ))}
//                 </Select>
//               </Td>

//               {/* Product dropdown */}
//               <Td>
//                 <Select
//                   value={row.product}
//                   onChange={e => updateRowField(idx, 'product', e.target.value)}
//                   placeholder={productOptions.length ? 'Sélectionner le produit' : 'Aucun produit'}
//                 >
//                   {productOptions.map(p => (
//                     <option key={p} value={p}>{p}</option>
//                   ))}
//                 </Select>
//               </Td>

//               {/* Reference dropdown */}
//               <Td>
//                 <Select
//                   value={row.reference}
//                   onChange={e => updateRowField(idx, 'reference', e.target.value)}
//                   placeholder={referenceOptions.length ? 'Sélectionner une référence' : 'Aucune référence'}
//                 >
//                   {referenceOptions.map(r => (
//                     <option key={r} value={r}>{r}</option>
//                   ))}
//                 </Select>
//               </Td>

//               <Td>
//                 <Select
//                   value={row.usageAndFuel}
//                   onChange={e => onFuelChange(idx, e.target.value)}
//                   placeholder="(Sélectionner)"
//                 >
//                   {FUEL_OPTIONS.map(opt => (
//                     <option key={opt} value={opt}>{opt}</option>
//                   ))}
//                 </Select>
//               </Td>

//               <Td>
//                 <Input
//                   type="number"
//                   value={row.qty}
//                   onChange={e => updateRowField(idx, 'qty', e.target.value)}
//                 />
//               </Td>

//               <Td>
//                 <Select
//                   value={row.unit}
//                   onChange={e => updateRowField(idx, 'unit', e.target.value)}
//                   placeholder="Unité"
//                 >
//                   {UNIT_OPTIONS.map(opt => (
//                     <option key={opt} value={opt}>{opt}</option>
//                   ))}
//                 </Select>
//               </Td>

//               <Td>
//                 <Button
//                   size="xs"
//                   colorScheme="red"
//                   onClick={() => removeRow(idx)}
//                   title="Supprimer la ligne"
//                 >
//                   -
//                 </Button>
//               </Td>
//             </Tr>
//           ))}
//         </Tbody>
//       </Table>

//       <Button mt={3} colorScheme="blue" onClick={addRow}>
//         Ajouter une ligne
//       </Button>
//       <Button mt={3} ml={4} colorScheme="green" onClick={handleSubmit} isLoading={loading}>
//         Soumettre
//       </Button>

//       {/* Results */}
//       <Box mt={6} bg="#e5f2fa" rounded="xl" boxShadow="md" p={4}>
//         <Text fontWeight="bold" color={highlight} mb={2}>Calculs et résultats</Text>
//         <Table size="sm" variant="simple">
//           <Thead>
//             <Tr>
//               <Th>CO₂ [gCO2e]</Th>
//               <Th>CH₄ [gCO2e]</Th>
//               <Th>N₂O [gCO2e]</Th>
//               <Th>Total GES [gCO2e]</Th>
//               <Th>Total GES [tCO2e]</Th>
//               <Th>Énergie équivalente [kWh]</Th>
//             </Tr>
//           </Thead>
//           <Tbody>
//             {gesResults.map((row, idx) => (
//               <Tr key={idx}>
//                 <Td fontWeight="bold">{row.total_co2_gco2e ?? '-'}</Td>
//                 <Td fontWeight="bold">{row.total_ges_ch4_gco2e ?? '-'}</Td>
//                 <Td fontWeight="bold">{row.total_ges_n2o_gco2e ?? '-'}</Td>
//                 <Td fontWeight="bold">{row.total_ges_gco2e ?? '-'}</Td>
//                 <Td fontWeight="bold">{row.total_ges_tco2e ?? '-'}</Td>
//                 <Td fontWeight="bold">{row.total_energie_kwh ?? '-'}</Td>
//               </Tr>
//             ))}
//           </Tbody>
//         </Table>
//       </Box>
//     </Box>
//   );
// }

