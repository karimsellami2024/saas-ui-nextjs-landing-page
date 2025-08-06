import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  Box, Stack, Heading, Text, Table, Thead, Tbody, Tr, Th, Td,
  Input, Button, useColorModeValue, Spinner
} from '@chakra-ui/react';

type GesResults = {
  total_co2_gco2e: number | string;
  total_ges_tco2e: number | string;
  total_energie_kwh: number | string;
};

type CompteurDetailRow = {
  date: string;
  consumption: string;
  reference: string;
};

type CompteurGroup = {
  number: string;
  address: string;
  province: string;
  details: CompteurDetailRow[];
};

export function ElectricityForm() {
  const [provinceOptions, setProvinceOptions] = useState<string[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurGroup[]>([
    {
      number: '',
      address: '',
      province: '',
      details: [{ date: '', consumption: '', reference: '' }],
    },
  ]);
  const [gesResults, setGesResults] = useState<GesResults[]>([]);
  const [posteId, setPosteId] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const olive = '#708238';
  const oliveBg = useColorModeValue('#f6f8f3', '#202616');

  useEffect(() => {
    fetch("/api/provinces")
      .then((res) => res.json())
      .then((data) => setProvinceOptions(data.provinces || []));
  }, []);

  // Load previous Poste 6 data if user is logged in (optional)
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      // Get latest submission with poste 6
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          postes!postes_submission_id_fkey (
            id, poste_num, data, results
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && data.postes) {
        // Look for poste_num === 6
        const poste6 = data.postes.find((p: any) => p.poste_num === 6);
        if (poste6) {
          setPosteId(poste6.id);
          setSubmissionId(data.id);
          let parsedData = poste6.data;
          if (typeof parsedData === 'string') {
            try {
              parsedData = JSON.parse(parsedData);
            } catch {
              parsedData = {};
            }
          }
          // Parse and "group by" logic for compatibility
          if (parsedData.counters && parsedData.invoices) {
            // Rebuild "grouped" format from flat arrays if needed
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
          setGesResults(poste6.results || []);
        }
      }
      setLoading(false);
    })();
  }, []);

  // --- Group logic ---
  const addCompteur = () =>
    setCompteurs(prev => [
      ...prev,
      {
        number: '',
        address: '',
        province: '',
        details: [{ date: '', consumption: '', reference: '' }],
      },
    ]);

  const removeCompteur = (gIdx: number) =>
    setCompteurs(prev => prev.filter((_, idx) => idx !== gIdx));

  type CompteurFieldKey = 'number' | 'address' | 'province';
  const updateCompteurField = (gIdx: number, key: CompteurFieldKey, value: string) => {
    const newList = [...compteurs];
    newList[gIdx][key] = value;
    setCompteurs(newList);
  };

  const addDetailRow = (gIdx: number) => {
    const newList = [...compteurs];
    newList[gIdx].details.push({ date: '', consumption: '', reference: '' });
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

  // --- Submit handler ---
  const handleSubmit = async () => {
    setGesResults([]);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Vous devez être connecté pour soumettre.');
      return;
    }
    // Flatten for backend
    const counters = compteurs.map(group => ({
      number: group.number,
      address: group.address,
      province: group.province,
    }));
    const invoices = compteurs.flatMap(group =>
      group.details.map(detail => ({
        number: group.number,
        address: group.address,
        province: group.province,
        date: detail.date,
        consumption: detail.consumption,
        reference: detail.reference,
      }))
    );
    const payload: any = {
      user_id: user.id,
      data: { counters, invoices },
      poste_num: 6,
    };
    if (submissionId) payload.submission_id = submissionId;
    if (posteId) payload.poste_id = posteId;

    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) {
      alert(result.error || "Erreur lors de la soumission.");
    } else {
      setGesResults(Array.isArray(result) ? result : []);
      alert("Soumission réussie !");
    }
  };

  if (loading)
    return (
      <Box minH="100vh" bg={oliveBg} display="flex" alignItems="center" justifyContent="center">
        <Spinner color={olive} size="xl" />
      </Box>
    );

  return (
    <Box minH="100vh" bg={oliveBg} py={10} px={{ base: 2, md: 10 }}>
      <Box maxW="7xl" mx="auto">
        <Heading as="h1" size="xl" color={olive} textAlign="center" mb={2} fontWeight="bold">
          POSTE 6 – ÉLECTRICITÉ
        </Heading>
        <Stack spacing={12}>
          {/* Compteurs Grouped Table */}
          <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
            <Heading as="h3" size="md" color={olive} mb={4}>
              Saisie des compteurs d'électricité
            </Heading>
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
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>CO₂ [gCO2e]</Th>
                    <Th>Total GES [tCO2e]</Th>
                    <Th>Énergie équivalente [kWh]</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {gesResults.length === 0 ? (
                    <Tr>
                      <Td colSpan={3} style={{ textAlign: "center" }}>
                        Les résultats seront affichés ici après soumission.
                      </Td>
                    </Tr>
                  ) : (
                    gesResults.map((row, idx) => (
                      <Tr key={idx}>
                        <Td fontWeight="bold">{row.total_co2_gco2e ?? '-'}</Td>
                        <Td fontWeight="bold">{row.total_ges_tco2e ?? '-'}</Td>
                        <Td fontWeight="bold">{row.total_energie_kwh ?? '-'}</Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Box>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
