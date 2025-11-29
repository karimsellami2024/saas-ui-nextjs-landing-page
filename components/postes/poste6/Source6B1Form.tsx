import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
  Input, Button, Spinner, Stack, useColorModeValue
} from '@chakra-ui/react';
import { supabase } from '../../../lib/supabaseClient';
import { usePrefillPosteSource } from '#components/postes/HookForGetDataSource';

// --- Types ---
type GesResults = {
  total_co2_gco2e: number | string;
  total_ges_tco2e: number | string;
  energie_equivalente_kwh: number | string;
};

type CompteurDetailRow = {
  date: string;
  site: string;
  product: string;
  consumption: string;
  carbonIntensity: string;
  reference: string;
};

type CompteurGroup = {
  number: string;
  address: string;
  province: string; // Réseaux électrique
  details: CompteurDetailRow[];
};

const resultFields = [
  { key: 'total_co2_gco2e', label: 'CO₂ [gCO2e]' },
  { key: 'total_ges_tco2e', label: 'Total GES [tCO2e]' },
  { key: 'energie_equivalente_kwh', label: 'Énergie équivalente [kWh]' },
];

export function Source6B1Form({
  posteId: initialPosteId,
  posteNum = 6,
  posteLabel = '6B1 – Électricité provenant du réseau électrique (Market based)',
  userId: propUserId,
}: {
  posteId: string | null;
  posteNum?: number;
  posteLabel?: string;
  userId?: string | null;
}) {
  const [provinceOptions, setProvinceOptions] = useState<string[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurGroup[]>([
    {
      number: '',
      address: '',
      province: '',
      details: [
        { date: '', site: '', product: '', consumption: '', carbonIntensity: '', reference: '' },
      ],
    },
  ]);
  const [gesResults, setGesResults] = useState<GesResults[]>([]);
  const [posteId, setPosteId] = useState<string | null>(initialPosteId || null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(propUserId ?? null);
  const [loading, setLoading] = useState(true);

  // Autosave UI state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJSONRef = useRef<string>('');

  const olive = '#708238';
  const oliveBg = useColorModeValue('#f6f8f3', '#202616');

  // Province (Réseaux électrique) options
  useEffect(() => {
    fetch('/api/provinces')
      .then((res) => res.json())
      .then((data) => setProvinceOptions(data.provinces || []));
  }, []);

  // --------------------------
  // Prefill via your shared hook (uses /api/GetSourceHandler)
  // --------------------------
  const {
    loading: prefillLoading,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource(
    (userId ?? propUserId ?? '') as string,
    6,
    '6B1',
    { counters: [], invoices: [] }
  );

  // Only hydrate if the form is pristine (avoid clobbering user edits)
  const isDefaultEmptyForm = (groups: CompteurGroup[]) => {
    if (groups.length !== 1) return false;
    const g = groups[0];
    if (g.number || g.address || g.province) return false;
    if (g.details.length !== 1) return false;
    const d = g.details[0];
    return (!d.date && !d.site && !d.product && !d.consumption && !d.carbonIntensity && !d.reference);
  };

  // Map {counters, invoices} → CompteurGroup[]
  const buildGroupsFromCountersInvoices = (
    counters: any[] = [],
    invoices: any[] = []
  ): CompteurGroup[] => {
    const byNumber: Record<string, CompteurGroup> = {};
    (invoices || []).forEach((inv) => {
      const num = inv.number || '';
      if (!byNumber[num]) {
        const counter = (counters || []).find((c: any) => c.number === num) || {};
        byNumber[num] = {
          number: num,
          address: counter.address || inv.address || '',
          province: counter.province || inv.province || '',
          details: [],
        };
      }
      byNumber[num].details.push({
        date: inv.date || '',
        site: inv.site || '',
        product: inv.product || '',
        consumption: inv.consumption || '',
        carbonIntensity: inv.carbonIntensity || '',
        reference: inv.reference || '',
      });
    });
    const groups = Object.values(byNumber);
    if (!groups.length && counters.length) {
      return counters.map((c: any) => ({
        number: c.number || '',
        address: c.address || '',
        province: c.province || '',
        details: [
          { date: '', site: '', product: '', consumption: '', carbonIntensity: '', reference: '' },
        ],
      }));
    }
    return groups;
  };

  // Hydrate from hook (only if pristine)
  useEffect(() => {
    if (prefillLoading) return;
    if (!prefillData) return;
    if (!isDefaultEmptyForm(compteurs)) return;

    const groups = buildGroupsFromCountersInvoices(
      (prefillData as any)?.counters || [],
      (prefillData as any)?.invoices || []
    );
    if (groups.length) setCompteurs(groups);
    if (Array.isArray(prefillResults) && prefillResults.length) {
      setGesResults(prefillResults as GesResults[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillLoading, prefillData, prefillResults]);

  // --------------------------
  // Load-from-submissions (initial)
  // --------------------------
  useEffect(() => {
    (async () => {
      setLoading(true);
      let activeUserId = propUserId;
      if (!activeUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        activeUserId = user.id;
        setUserId(user.id);
      }

      const { data } = await supabase
        .from('submissions')
        .select(`
          id,
          postes!postes_submission_id_fkey (
            id, poste_num, data, results
          )
        `)
        .eq('user_id', activeUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && data.postes) {
        const poste = posteId
          ? data.postes.find((p: any) => p.id === posteId)
          : data.postes.find((p: any) => p.poste_num === posteNum);
        if (poste) {
          setPosteId(poste.id);
          setSubmissionId(data.id);
          let parsedData = poste.data;
          if (typeof parsedData === 'string') {
            try { parsedData = JSON.parse(parsedData); } catch { parsedData = {}; }
          }
          if (parsedData.counters && parsedData.invoices) {
            const byNumber: { [num: string]: CompteurGroup } = {};
            parsedData.invoices.forEach((inv: any) => {
              if (!byNumber[inv.number]) {
                const counter = parsedData.counters.find((c: any) => c.number === inv.number) || {};
                byNumber[inv.number] = {
                  number: inv.number,
                  address: counter.address || '',
                  province: counter.province || '',
                  details: [],
                };
              }
              byNumber[inv.number].details.push({
                date: inv.date || '',
                site: inv.site || '',
                product: inv.product || '',
                consumption: inv.consumption || '',
                carbonIntensity: inv.carbonIntensity || '',
                reference: inv.reference || '',
              });
            });
            const groups = Object.values(byNumber);
            setCompteurs(groups.length ? groups : [{
              number: '', address: '', province: '',
              details: [{ date: '', site: '', product: '', consumption: '', carbonIntensity: '', reference: '' }],
            }]);
          } else {
            setCompteurs([{
              number: '', address: '', province: '',
              details: [{ date: '', site: '', product: '', consumption: '', carbonIntensity: '', reference: '' }],
            }]);
          }
          setGesResults(poste.results || []);
        }
      }
      setLoading(false);
      initializedRef.current = true;            // mark end of initial load to allow autosave
      lastSavedJSONRef.current = JSON.stringify(compteurs); // baseline to avoid an immediate save
    })();
    // eslint-disable-next-line
  }, [propUserId, initialPosteId, posteNum]);

  // --- Table logic ---
  const addCompteur = () =>
    setCompteurs((prev) => [
      ...prev,
      {
        number: '',
        address: '',
        province: '',
        details: [{ date: '', site: '', product: '', consumption: '', carbonIntensity: '', reference: '' }],
      },
    ]);

  const removeCompteur = (gIdx: number) =>
    setCompteurs((prev) => prev.filter((_, idx) => idx !== gIdx));

  type CompteurFieldKey = 'number' | 'address' | 'province';

  const updateCompteurField = (gIdx: number, key: CompteurFieldKey, value: string) => {
    const newList = [...compteurs];
    newList[gIdx][key] = value;
    setCompteurs(newList);
  };

  const addDetailRow = (gIdx: number) => {
    const newList = [...compteurs];
    newList[gIdx].details.push({ date: '', site: '', product: '', consumption: '', carbonIntensity: '', reference: '' });
    setCompteurs(newList);
  };

  const removeDetailRow = (gIdx: number, dIdx: number) => {
    const newList = [...compteurs];
    newList[gIdx].details.splice(dIdx, 1);
    if (newList[gIdx].details.length === 0) newList.splice(gIdx, 1);
    setCompteurs(newList);
  };

  const updateDetailField = (gIdx: number, dIdx: number, key: keyof CompteurDetailRow, value: string) => {
    const newList = [...compteurs];
    newList[gIdx].details[dIdx][key] = value;
    setCompteurs(newList);
  };

  // --- Helpers to build payload ---
  const buildCountersInvoices = useMemo(() => {
    return (groups: CompteurGroup[]) => {
      const counters = groups.map((group) => ({
        number: group.number,
        address: group.address,
        province: group.province,
      }));
      const invoices = groups.flatMap((group) =>
        group.details.map((detail) => ({
          number: group.number,
          address: group.address,
          province: group.province,
          date: detail.date,
          site: detail.site,
          product: detail.product,
          consumption: detail.consumption,
          carbonIntensity: detail.carbonIntensity,
          reference: detail.reference,
        }))
      );
      return { counters, invoices };
    };
  }, []);

  // --- AUTOSAVE (per-input, debounced) ---
  const saveDraft = async () => {
    if (!initializedRef.current) return;           // avoid during initial hydration
    if (!userId || !posteId) return;               // need both IDs to save

    const jsonNow = JSON.stringify(compteurs);
    if (jsonNow === lastSavedJSONRef.current) return;

    setSaving(true);
    setSaveMsg('Enregistrement…');

    const { counters, invoices } = buildCountersInvoices(compteurs);
    const payload = {
      user_id: userId,
      poste_source_id: posteId,
      source_code: '6B1',
      poste_num: 6,
      data: { counters, invoices },
      results: gesResults ?? [],
      // is_draft: true, // uncomment if your API cares
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
    if (!initializedRef.current) return;
    if (!userId || !posteId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(saveDraft, 1000); // 1s after last keystroke
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compteurs, userId, posteId]);

  // --- Submit Handler (compute + save) ---
  const validateData = (compteurs: CompteurGroup[]) =>
    compteurs.length > 0 &&
    compteurs.every(
      (group) =>
        group.number &&
        group.address &&
        group.province &&
        group.details.every(
          (detail) => detail.date && detail.consumption && detail.carbonIntensity
        )
    );

  const handleSubmit = async () => {
    if (!userId || !posteId) {
      alert('Champs obligatoires manquants (posteId ou userId)');
      return;
    }
    if (!validateData(compteurs)) {
      alert('Veuillez remplir tous les champs requis (compteurs et détails).');
      return;
    }
    setGesResults([]);
    setLoading(true);

    const { counters, invoices } = buildCountersInvoices(compteurs);
    const payload = {
      user_id: userId,
      poste_source_id: posteId,
      source_code: '6B1',
      poste_num: 6,
      data: { counters, invoices },
    };

    let results: GesResults[] = [];
    let webhookOk = false;

    // 1. Cloud Run webhook for calculation
    try {
      const response = await fetch(
        'https://allposteswebhook-129138384907.us-central1.run.app/submit/6B1',
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
        results = Array.isArray(result.results) ? result.results : [];
        webhookOk = true;
      }
    } catch (error) {
      alert('Erreur réseau lors du calcul Cloud Run.');
    }

    // 2. Save to database
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
        lastSavedJSONRef.current = JSON.stringify(compteurs);
        alert(
          webhookOk
            ? 'Données 6B1 calculées et sauvegardées avec succès!'
            : 'Données 6B1 sauvegardées sans résultat de calcul GES.'
        );
      }
    } catch (error) {
      alert('Erreur inattendue lors de la sauvegarde en base.');
    }
    setLoading(false);
  };

  // Only show result columns with at least one value
  const displayColumns = resultFields.filter((f) =>
    gesResults.some(
      (res) =>
        res && (res as any)[f.key] !== undefined && (res as any)[f.key] !== '' && (res as any)[f.key] !== '#N/A'
    )
  );

  if (loading)
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minH="300px">
        <Spinner color={olive} size="xl" />
      </Box>
    );

  // --- CONTENT BLOCK, not full page ---
  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
      <Heading as="h3" size="md" color={olive} mb={2}>
        {posteLabel}
      </Heading>

      <Stack direction="row" align="center" spacing={3} mb={4}>
        {saving && <Spinner size="sm" color={olive} />}
        <Text fontSize="sm" color="gray.600">
          {saveMsg ?? 'Saisie automatique activée'}
        </Text>
      </Stack>

      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>NUMÉRO</Th>
            <Th>ADRESSE</Th>
            <Th>RÉSEAU ÉLECTRIQUE</Th>
            <Th>DATE</Th>
            <Th>SITE</Th>
            <Th>PRODUIT</Th>
            <Th>CONSOMMATION (kWh)</Th>
            <Th>INTENSITÉ CARBONE (kgCO2e/MWh)</Th>
            <Th>RÉFÉRENCES</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {compteurs.map((group, gIdx) =>
            group.details.map((row, dIdx) => (
              <Tr key={gIdx + '-' + dIdx}>
                {dIdx === 0 && (
                  <>
                    <Td rowSpan={group.details.length}>
                      <Input value={group.number} onChange={(e) => updateCompteurField(gIdx, 'number', e.target.value)} />
                    </Td>
                    <Td rowSpan={group.details.length}>
                      <Input value={group.address} onChange={(e) => updateCompteurField(gIdx, 'address', e.target.value)} />
                    </Td>
                    <Td rowSpan={group.details.length}>
                      <select
                        value={group.province}
                        onChange={(e) => updateCompteurField(gIdx, 'province', e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px' }}
                      >
                        <option value=''>Sélectionner...</option>
                        {provinceOptions.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </Td>
                  </>
                )}
                <Td>
                  <Input type='date' value={row.date} onChange={(e) => updateDetailField(gIdx, dIdx, 'date', e.target.value)} />
                </Td>
                <Td>
                  <Input value={row.site} onChange={(e) => updateDetailField(gIdx, dIdx, 'site', e.target.value)} />
                </Td>
                <Td>
                  <Input value={row.product} onChange={(e) => updateDetailField(gIdx, dIdx, 'product', e.target.value)} />
                </Td>
                <Td>
                  <Input type='number' value={row.consumption} onChange={(e) => updateDetailField(gIdx, dIdx, 'consumption', e.target.value)} />
                </Td>
                <Td>
                  <Input type='number' value={row.carbonIntensity} onChange={(e) => updateDetailField(gIdx, dIdx, 'carbonIntensity', e.target.value)} />
                </Td>
                <Td>
                  <Input value={row.reference} onChange={(e) => updateDetailField(gIdx, dIdx, 'reference', e.target.value)} />
                </Td>
                <Td>
                  <Stack direction='row' spacing={1}>
                    <Button size='xs' onClick={() => addDetailRow(gIdx)} colorScheme='blue' title='Ajouter une ligne'>+</Button>
                    {group.details.length > 1 && (
                      <Button size='xs' onClick={() => removeDetailRow(gIdx, dIdx)} colorScheme='red' title='Supprimer la ligne'>-</Button>
                    )}
                    {dIdx === 0 && (
                      <Button size='xs' onClick={() => removeCompteur(gIdx)} colorScheme='red' title='Supprimer tout ce compteur'>
                        Suppr. compteur
                      </Button>
                    )}
                  </Stack>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>

      <Button mt={3} colorScheme='green' onClick={addCompteur}>
        Ajouter un compteur
      </Button>
      <Button mt={3} ml={4} colorScheme='blue' onClick={handleSubmit}>
        Soumettre
      </Button>

      <Box mt={6} bg='#e5f2fa' rounded='xl' boxShadow='md' p={4}>
        <Text fontWeight='bold' color={olive} mb={2}>
          Calculs et résultats
        </Text>
        {gesResults && gesResults.length > 0 && displayColumns.length > 0 ? (
          <Table size='sm' variant='simple'>
            <Thead>
              <Tr>
                {displayColumns.map((f) => (<Th key={f.key}>{f.label}</Th>))}
              </Tr>
            </Thead>
            <Tbody>
              {gesResults.map((result, idx) => (
                <Tr key={idx}>
                  {displayColumns.map((f) => (
                    <Td fontWeight='bold' key={f.key}>
                      {(result as any)[f.key] && (result as any)[f.key] !== '#N/A' ? (result as any)[f.key] : '-'}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : (
          <Text color='gray.500'>Aucun résultat à afficher.</Text>
        )}
      </Box>
    </Box>
  );
}
