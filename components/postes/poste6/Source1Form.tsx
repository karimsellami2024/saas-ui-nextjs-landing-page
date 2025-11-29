
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
  Input, Button, Spinner, Stack, useToast, HStack, Icon
} from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../../../lib/supabaseClient';
import { CheckCircleIcon } from '@chakra-ui/icons';

type GesResults = {
  total_co2_gco2e: number | string;
  total_ges_tco2e: number | string;
  energie_equivalente_kwh: number | string;
};

type CompteurDetailRow = { date: string; consumption: string; reference: string; };
type CompteurGroup = { number: string; address: string; province: string; details: CompteurDetailRow[]; };

const resultFields = [
  { key: "total_co2_gco2e", label: "CO₂ [gCO2e]" },
  { key: "total_ges_tco2e", label: "Total GES [tCO2e]" },
  { key: "energie_equivalente_kwh", label: "Énergie équivalente [kWh]" }
];

export function SourceAForm({
  posteId: initialPosteId,
  posteNum = 6,
  posteLabel = "6A1 - Électricité provenant du réseau électrique (Location based)",
  userId: propUserId
}: {
  posteId: string | null,
  posteNum?: number,
  posteLabel?: string,
  userId?: string | null
}) {
  const [provinceOptions, setProvinceOptions] = useState<string[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurGroup[]>([
    { number: '', address: '', province: '', details: [{ date: '', consumption: '', reference: '' }] }
  ]);
  const [gesResults, setGesResults] = useState<GesResults[]>([]);
  const [posteId, setPosteId] = useState<string | null>(initialPosteId || null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(propUserId ?? null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // === AUTOSAVE additions ===
  const [autoSaving, setAutoSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const lastSavedHashRef = useRef<string>("");      // prevent duplicate saves
  const debounceTimerRef = useRef<any>(null);
  const toast = useToast();
  const olive = '#708238';

  // Drag & drop file upload logic
  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    const formData = new FormData();
    acceptedFiles.forEach(file => formData.append('file', file));
    try {
      const res = await fetch('/api/upload-bill', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'extraction');
      if (Array.isArray(data) && data.length > 0) {
        // Map backend response to form structure
        const extracted = data.map(item => {
          const r = (item as any).result || {};
          // French date → yyyy-mm-dd
          let dateVal = r.date || '';
          const months: Record<string, string> = {
            janvier: '01', février: '02', mars: '03', avril: '04', mai: '05',
            juin: '06', juillet: '07', août: '08', septembre: '09',
            octobre: '10', novembre: '11', décembre: '12'
          };
          const frDateMatch = dateVal.match(/^(\d{1,2}) (\w+) (\d{4})$/i);
          if (frDateMatch) {
            const [, day, month, year] = frDateMatch;
            const mm = months[month.toLowerCase()] || '01';
            dateVal = `${year}-${mm}-${day.padStart(2, '0')}`;
          }
          // Combine secondary info into references
          const references = [
            (item as any).filename,
            r.period ? `Période: ${r.period}` : '',
            r.amount ? `Montant: ${r.amount}` : '',
            r.client_name ? `Client: ${r.client_name}` : ''
          ].filter(Boolean).join(' | ');
          return {
            number: '',
            address: r.address || '',
            province: '',
            details: [{
              date: dateVal,
              consumption: r.kwh ? String(r.kwh).replace(/\s/g, '') : '',
              reference: references
            }]
          };
        });
        setCompteurs(extracted);
        // Trigger autosave after drop
        scheduleAutosave();
        toast({
          title: 'Factures importées!',
          description: 'Champs auto-remplis à partir des fichiers.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Aucune donnée détectée.',
          description: 'Impossible de lire les fichiers.',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erreur à l\'import.',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    multiple: true,
    disabled: uploading,
  });

  useEffect(() => {
    fetch("/api/provinces")
      .then((res) => res.json())
      .then((data) => setProvinceOptions(data.provinces || []));
  }, []);

  // =======================
  // Prefill (unchanged)
  // =======================
  const isDefaultEmptyForm = (groups: CompteurGroup[]) => {
    if (groups.length !== 1) return false;
    const g = groups[0];
    if (g.number || g.address || g.province) return false;
    if (g.details.length !== 1) return false;
    const d = g.details[0];
    return !d.date && !d.consumption && !d.reference;
  };

  const buildGroupsFromCountersInvoices = (counters: any[] = [], invoices: any[] = []): CompteurGroup[] => {
    const byNumber: Record<string, CompteurGroup> = {};
    (invoices || []).forEach(inv => {
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
        consumption: inv.consumption || '',
        reference: inv.reference || '',
      });
    });
    const groups = Object.values(byNumber);
    if (!groups.length && counters.length) {
      return counters.map((c: any) => ({
        number: c.number || '',
        address: c.address || '',
        province: c.province || '',
        details: [{ date: '', consumption: '', reference: '' }],
      }));
    }
    return groups;
  };

  useEffect(() => {
    (async () => {
      try {
        // get a user id
        let activeUserId = propUserId ?? userId;
        if (!activeUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user?.id) return;
          activeUserId = user.id;
          setUserId(user.id);
        }
        // hydrate only if untouched
        if (!isDefaultEmptyForm(compteurs)) return;

        const qs = new URLSearchParams({
          user_id: String(activeUserId),
          poste_num: String(posteNum),
          source_code: '6A1',
        });
        const res = await fetch(`/api/GetSourceHandler?${qs.toString()}`, { method: 'GET' });
        if (!res.ok) return;
        const json = await res.json();

        const savedData = json?.data;
        const savedResults = json?.results;

        if (savedData && (Array.isArray(savedData.counters) || Array.isArray(savedData.invoices))) {
          const groups = buildGroupsFromCountersInvoices(savedData.counters || [], savedData.invoices || []);
          if (groups.length) {
            setCompteurs(groups);
          }
        }
        if (Array.isArray(savedResults) && savedResults.length) {
          setGesResults(savedResults);
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propUserId, userId, posteNum]);

  // ORIGINAL submissions/postes load (unchanged)
  useEffect(() => {
    (async () => {
      setLoading(true);
      let activeUserId = propUserId;
      if (!activeUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        activeUserId = user.id;
        setUserId(user.id);
      }
      let filter = { user_id: activeUserId } as any;
      if (posteId) filter = { ...filter, "postes.id": posteId };
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
                consumption: inv.consumption || '',
                reference: inv.reference || '',
              });
            });
            setCompteurs(Object.values(byNumber).length > 0 ? Object.values(byNumber) : [
              { number: '', address: '', province: '', details: [{ date: '', consumption: '', reference: '' }] }
            ]);
          } else {
            setCompteurs([
              { number: '', address: '', province: '', details: [{ date: '', consumption: '', reference: '' }] }
            ]);
          }
          setGesResults(poste.results || []);
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, [propUserId, initialPosteId, posteNum]);

  // --- Group logic ---
  const addCompteur = () => { setCompteurs(prev => [...prev, { number: '', address: '', province: '', details: [{ date: '', consumption: '', reference: '' }] }]); scheduleAutosave(); };
  const removeCompteur = (gIdx: number) => { setCompteurs(prev => prev.filter((_, idx) => idx !== gIdx)); scheduleAutosave(); };
  type CompteurFieldKey = 'number' | 'address' | 'province';
  const updateCompteurField = (gIdx: number, key: CompteurFieldKey, value: string) => {
    const newList = [...compteurs];
    newList[gIdx][key] = value;
    setCompteurs(newList);
    scheduleAutosave(); // === AUTOSAVE
  };
  const addDetailRow = (gIdx: number) => {
    const newList = [...compteurs];
    newList[gIdx].details.push({ date: '', consumption: '', reference: '' });
    setCompteurs(newList);
    scheduleAutosave(); // === AUTOSAVE
  };
  const removeDetailRow = (gIdx: number, dIdx: number) => {
    const newList = [...compteurs];
    newList[gIdx].details.splice(dIdx, 1);
    if (newList[gIdx].details.length === 0) newList.splice(gIdx, 1);
    setCompteurs(newList);
    scheduleAutosave(); // === AUTOSAVE
  };
  const updateDetailField = (gIdx: number, dIdx: number, key: keyof CompteurDetailRow, value: string) => {
    const newList = [...compteurs];
    newList[gIdx].details[dIdx][key] = value;
    setCompteurs(newList);
    scheduleAutosave(); // === AUTOSAVE
  };

  const validateData = (groups: CompteurGroup[]) =>
    groups.length > 0 && groups.every(group =>
      group.number && group.address && group.province &&
      group.details.every(detail => detail.date && detail.consumption)
    );

  // === AUTOSAVE: build payload + hash ===
  const buildPayload = (groups: CompteurGroup[]) => {
    const counters = groups.map(group => ({
      number: group.number,
      address: group.address,
      province: group.province,
    }));
    const invoices = groups.flatMap(group =>
      group.details.map(detail => ({
        number: group.number,
        address: group.address,
        province: group.province,
        date: detail.date,
        consumption: detail.consumption,
        reference: detail.reference,
      }))
    );
    return { counters, invoices };
  };

  const payloadHash = useMemo(() => {
    try {
      const base = buildPayload(compteurs);
      return JSON.stringify(base);
    } catch {
      return "";
    }
  }, [compteurs]);

  // === AUTOSAVE: debounced scheduler ===
  function scheduleAutosave() {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void autosave(); // fire-and-forget
    }, 800); // user "finishes inputting"
  }

  // === AUTOSAVE: main function ===
  const autosave = async () => {
    if (!userId || !posteId) return;                    // need IDs to save
    const base = buildPayload(compteurs);
    const baseHash = JSON.stringify(base);
    if (baseHash === lastSavedHashRef.current) return;  // skip identical state

    setAutoSaving(true);
    setJustSaved(false);

    let results: GesResults[] = [];

    try {
      // If valid → compute results first
      if (validateData(compteurs)) {
        try {
          const resp = await fetch('https://allposteswebhook-129138384907.us-central1.run.app/submit/6A1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              poste_source_id: posteId,
              source_code: '6A1',
              poste_num: 6,
              data: base,
            }),
          });
          const json = await resp.json();
          if (resp.ok && Array.isArray(json.results)) {
            results = json.results as GesResults[];
            setGesResults(results);
          }
        } catch {
          // Silent: if webhook fails, we still save the draft without results
        }
      }

      // Save to DB (draft or full)
      const dbPayload = {
        user_id: userId,
        poste_source_id: posteId,
        source_code: '6A1',
        poste_num: 6,
        data: base,
        results,
      };

      const dbResp = await fetch('/api/4submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload),
      });

      if (dbResp.ok) {
        lastSavedHashRef.current = baseHash;
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
      }
    } finally {
      setAutoSaving(false);
    }
  };

  // Manual submit (kept)
  const handleSubmit = async () => {
    if (!userId || !posteId) {
      alert("Champs obligatoires manquants (posteId ou userId)");
      return;
    }
    if (!validateData(compteurs)) {
      alert("Veuillez remplir tous les champs requis (compteurs et détails).");
      return;
    }
    setGesResults([]);
    setLoading(true);

    const data = buildPayload(compteurs);
    const payload = {
      user_id: userId,
      poste_source_id: posteId,
      source_code: '6A1',
      poste_num: 6,
      data,
    };

    let results: GesResults[] = [];
    let webhookOk = false;

    // 2. Call webhook first for calculation
    try {
      const response = await fetch('https://allposteswebhook-129138384907.us-central1.run.app/submit/6A1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
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

    // 3. Save to database
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
        alert(webhookOk
          ? 'Données 6A1 calculées et sauvegardées avec succès!'
          : 'Données 6A1 sauvegardées sans résultat de calcul GES.');
      }
    } catch (error) {
      alert('Erreur inattendue lors de la sauvegarde en base.');
    }
    setLoading(false);
  };

  const displayColumns = resultFields.filter(f =>
    gesResults.some(res => res && (res as any)[f.key] !== undefined && (res as any)[f.key] !== "" && (res as any)[f.key] !== "#N/A")
  );

  if (loading)
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minH="300px">
        <Spinner color={olive} size="xl" />
      </Box>
    );

  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
      <HStack justify="space-between" align="center" mb={4}>
        <Heading as="h3" size="md" color={olive}>
          {posteLabel}
        </Heading>
        {/* === AUTOSAVE status === */}
        <HStack spacing={3} minW="160px" justify="flex-end">
          {autoSaving && (
            <HStack color="gray.600">
              <Spinner size="sm" /> <Text fontSize="sm">Enregistrement…</Text>
            </HStack>
          )}
          {!autoSaving && justSaved && (
            <HStack color="green.600">
              <Icon as={CheckCircleIcon} /> <Text fontSize="sm">Enregistré</Text>
            </HStack>
          )}
        </HStack>
      </HStack>

      {/* Drag & Drop Bill Upload */}
      <Box
        mt={2}
        mb={2}
        p={4}
        borderWidth={2}
        borderStyle="dashed"
        borderRadius="md"
        bg="#f9fafb"
        textAlign="center"
        style={{ cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <Text>
          {uploading
            ? 'Extraction en cours...'
            : isDragActive
              ? "Déposez les fichiers ici..."
              : 'Glissez-déposez une ou plusieurs factures PDF ou images ici, ou cliquez pour sélectionner'}
        </Text>
      </Box>

      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>NUMÉRO</Th>
            <Th>ADRESSE</Th>
            <Th>PROVINCE/PAYS</Th>
            <Th>DATE</Th>
            <Th>CONSOMMATION (kWh)</Th>
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
                      <Input value={group.number}
                        onChange={e => updateCompteurField(gIdx, "number", e.target.value)} />
                    </Td>
                    <Td rowSpan={group.details.length}>
                      <Input value={group.address}
                        onChange={e => updateCompteurField(gIdx, "address", e.target.value)} />
                    </Td>
                    <Td rowSpan={group.details.length}>
                      <select
                        value={group.province}
                        onChange={e => updateCompteurField(gIdx, "province", e.target.value)}
                        style={{ width: "100%", padding: "8px", borderRadius: "8px" }}
                      >
                        <option value="">Sélectionner...</option>
                        {provinceOptions.map((p) =>
                          <option key={p} value={p}>{p}</option>
                        )}
                      </select>
                    </Td>
                  </>
                )}
                <Td>
                  <Input
                    type="date"
                    value={row.date}
                    onChange={e => updateDetailField(gIdx, dIdx, "date", e.target.value)}
                  />
                </Td>
                <Td>
                  <Input
                    type="number"
                    value={row.consumption}
                    onChange={e => updateDetailField(gIdx, dIdx, "consumption", e.target.value)}
                  />
                </Td>
                <Td>
                  <Input
                    value={row.reference}
                    onChange={e => updateDetailField(gIdx, dIdx, "reference", e.target.value)}
                  />
                </Td>
                <Td>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="xs"
                      onClick={() => addDetailRow(gIdx)}
                      colorScheme="blue"
                      title="Ajouter une ligne">
                      +
                    </Button>
                    {group.details.length > 1 && (
                      <Button
                        size="xs"
                        onClick={() => removeDetailRow(gIdx, dIdx)}
                        colorScheme="red"
                        title="Supprimer la ligne">
                        -
                      </Button>
                    )}
                    {dIdx === 0 && (
                      <Button
                        size="xs"
                        onClick={() => removeCompteur(gIdx)}
                        colorScheme="red"
                        title="Supprimer tout ce compteur">
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

      <Button mt={3} colorScheme="green" onClick={addCompteur}>
        Ajouter un compteur
      </Button>
      <Button mt={3} ml={4} colorScheme="blue" onClick={handleSubmit}>
        Soumettre
      </Button>

      <Box mt={6} bg="#e5f2fa" rounded="xl" boxShadow="md" p={4}>
        <Text fontWeight="bold" color={olive} mb={2}>Calculs et résultats</Text>
        {(gesResults && gesResults.length > 0) ? (
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                {resultFields.filter(f =>
                  gesResults.some(res => res && (res as any)[f.key] !== undefined && (res as any)[f.key] !== "" && (res as any)[f.key] !== "#N/A")
                ).map(f => (
                  <Th key={f.key}>{f.label}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {gesResults.map((result, idx) => (
                <Tr key={idx}>
                  {resultFields.filter(f =>
                    gesResults.some(res => res && (res as any)[f.key] !== undefined && (res as any)[f.key] !== "" && (res as any)[f.key] !== "#N/A")
                  ).map(f => (
                    <Td fontWeight="bold" key={f.key}>
                      {((result as any)[f.key] && (result as any)[f.key] !== "#N/A") ? (result as any)[f.key] : "-"}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : (
          <Text color="gray.500">Aucun résultat à afficher.</Text>
        )}
      </Box>
    </Box>
  );
}

