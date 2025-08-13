import { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Button,
  Select,
  HStack,
  IconButton,
  Spinner,
  Text,
  useToast,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { supabase } from '../../../lib/supabaseClient';

type B1Row = {
  vehicle: string;   // label/details
  year: string;
  make: string;
  model: string;
  trans: string;
  distance: string;
  type: string;
  cons: string;
  estimate: string;
  reference: string;
  ac: string;
};

type GesResult = {
  total_co2_gco2e?: string | number;
  total_ges_ch4_gco2e?: string | number;
  total_ges_n2o_gco2e?: string | number;
  total_ges_gco2e?: string | number;
  total_ges_tco2e?: string | number;
  total_energie_kwh?: string | number;
};

type SourceB1FormProps = {
  b1Rows?: B1Row[];
  setB1Rows: (rows: B1Row[]) => void;
  addB1Row: () => void;
  // NEW (match 2A3 template)
  posteSourceId: string;
  userId: string;
  gesResults?: GesResult[];
  setGesResults?: (results: GesResult[]) => void;

  highlight?: string;
  tableBg?: string;
};

// Vehicle shape stored in companies.vehicle_fleet (new shape, with legacy fallback)
type FleetVehicle = {
  details?: string;
  annee?: string;
  marque?: string;
  modele?: string;
  transmission?: string;
  distance_km?: string;
  type_carburant?: string;
  conso_l_100km?: string;
  // legacy fields that may exist
  nom?: string;
  type?: string;
  clim?: string;
};

export function SourceB1Form({
  b1Rows = [],
  setB1Rows,
  addB1Row,
  posteSourceId,
  userId,
  gesResults = [],
  setGesResults,
  highlight = '#245a7c',
  tableBg = '#f3f6ef',
}: SourceB1FormProps) {
  const toast = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [loadingFleet, setLoadingFleet] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Normalize vehicles from DB (accepts new + legacy shapes)
  const normalizeFleet = (arr: any[]): FleetVehicle[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((v: any) => ({
      details: v.details ?? v.nom ?? '',
      annee: v.annee ?? '',
      marque: v.marque ?? '',
      modele: v.modele ?? '',
      transmission: v.transmission ?? '',
      distance_km: v.distance_km ?? '',
      type_carburant: v.type_carburant ?? v.type ?? '',
      conso_l_100km: v.conso_l_100km ?? '',
      clim: v.clim ?? '',
    }));
  };

  const loadFleet = async () => {
    try {
      setLoadingFleet(true);
      // 1) current user
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userRes?.user;
      if (!user?.id) {
        toast({ status: 'warning', title: 'Utilisateur non connecté.' });
        return;
      }
      // 2) user_profiles -> company_id
      const { data: profile, error: profErr } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      if (profErr) throw profErr;
      if (!profile?.company_id) {
        toast({ status: 'error', title: "Impossible de trouver la compagnie de l'utilisateur." });
        return;
      }
      setCompanyId(profile.company_id);
      // 3) companies.vehicle_fleet
      const { data: company, error: compErr } = await supabase
        .from('companies')
        .select('vehicle_fleet')
        .eq('id', profile.company_id)
        .single();
      if (compErr) throw compErr;

      const normalized = normalizeFleet(company?.vehicle_fleet ?? []);
      setFleet(normalized);
    } catch (err: any) {
      console.error(err);
      toast({ status: 'error', title: 'Erreur de chargement des véhicules', description: err.message ?? String(err) });
      setFleet([]);
    } finally {
      setLoadingFleet(false);
    }
  };

  useEffect(() => {
    loadFleet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a vehicle is selected from dropdown, fill other fields
  const onSelectVehicle = (rowIdx: number, detailsValue: string) => {
    const v = fleet.find((fv) => (fv.details ?? '') === detailsValue);
    const updated = [...b1Rows];
    updated[rowIdx] = {
      ...updated[rowIdx],
      vehicle: detailsValue,
      year: v?.annee ?? updated[rowIdx].year ?? '',
      make: v?.marque ?? updated[rowIdx].make ?? '',
      model: v?.modele ?? updated[rowIdx].model ?? '',
      trans: v?.transmission ?? updated[rowIdx].trans ?? '',
      type: v?.type_carburant ?? updated[rowIdx].type ?? '',
      cons: v?.conso_l_100km ?? updated[rowIdx].cons ?? '',
      // keep existing values for user-entered fields:
      distance: updated[rowIdx].distance ?? '',
      estimate: updated[rowIdx].estimate ?? '',
      reference: updated[rowIdx].reference ?? '',
      ac: (v?.clim as string) ?? updated[rowIdx].ac ?? '', // legacy support if present
    };
    setB1Rows(updated);
  };

  // --- Validation (light): each row needs either estimate OR (distance & cons) ---
  const validateRows = (rows: B1Row[]) => {
    if (!rows.length) return false;
    return rows.every(r => {
      const hasEstimate = String(r.estimate ?? '').trim() !== '';
      const hasDistCons = String(r.distance ?? '').trim() !== '' && String(r.cons ?? '').trim() !== '';
      return hasEstimate || hasDistCons;
    });
  };

  // --- Submit to Cloud Run and save to DB (like 2A3) ---
  const handle2B1Submit = async () => {
    if (!posteSourceId || !userId) {
      toast({ status: 'error', title: 'Champs requis manquants', description: 'posteSourceId ou userId' });
      return;
    }
    if (!validateRows(b1Rows)) {
      toast({ status: 'warning', title: 'Validation', description: 'Chaque ligne doit avoir une estimation OU (distance et conso).' });
      return;
    }

    setSubmitting(true);
    const payload = {
      user_id: userId,
      poste_source_id: posteSourceId,
      poste_num: 2,
      source_code: '2B1',
      data: { rows: b1Rows },
    };

    let results: GesResult[] = [];
    let webhookOk = false;

    // 1) Call Cloud Run
    try {
      const r = await fetch('https://allposteswebhook-592102073404.us-central1.run.app/submit/2B1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        toast({ status: 'error', title: 'Erreur Cloud Run', description: j.error || 'Calcul GES échoué.' });
      } else {
        results = Array.isArray(j.results) ? j.results : [];
        webhookOk = true;
      }
    } catch (e: any) {
      toast({ status: 'error', title: 'Erreur réseau', description: 'Impossible de joindre le service Cloud Run.' });
    }

    // 2) Save to DB
    try {
      const dbPayload = { ...payload, results };
      const dbResponse = await fetch('/api/2submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        toast({ status: 'error', title: 'Erreur base de données', description: dbResult.error || 'Sauvegarde échouée.' });
      } else {
        setGesResults?.(results);
        toast({
          status: 'success',
          title: webhookOk ? '2B1 calculé et sauvegardé' : '2B1 sauvegardé (sans calcul Cloud Run)',
        });
      }
    } catch (e: any) {
      toast({ status: 'error', title: 'Erreur inattendue', description: 'Échec lors de la sauvegarde.' });
    }

    setSubmitting(false);
  };

  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6}>
      <HStack justify="space-between" mb={4}>
        <Heading
          as="h3"
          size="md"
          color={highlight}
          pb={2}
          borderBottom="1px"
          borderColor={`${highlight}30`}
        >
          Source B1 – Véhicules (Distance parcourue, Données Canadiennes)
        </Heading>
        <HStack>
          {loadingFleet && (
            <HStack>
              <Spinner size="sm" />
              <Text fontSize="sm">Chargement des véhicules…</Text>
            </HStack>
          )}
          <IconButton
            aria-label="Rafraîchir la flotte"
            icon={<RepeatIcon />}
            onClick={loadFleet}
            size="sm"
            variant="outline"
          />
        </HStack>
      </HStack>

      <Table size="sm" variant="simple" bg={tableBg}>
        <Thead>
          <Tr>
            <Th>Détails sur les véhicules</Th>
            <Th>Année</Th>
            <Th>Marque</Th>
            <Th>Modèle</Th>
            <Th>Transmission</Th>
            <Th>Distance parcourue [km]</Th>
            <Th>Type et carburant</Th>
            <Th>Conso. [L/100km]</Th>
            <Th>Estimation [L]</Th>
            <Th>Références</Th>
            <Th>Climatisation?</Th>
          </Tr>
        </Thead>
        <Tbody>
          {(b1Rows || []).map((row, idx) => (
            <Tr key={idx}>
              <Td>
                <Select
                  placeholder={loadingFleet ? 'Chargement…' : 'Choisir un véhicule'}
                  value={row.vehicle || ''}
                  onChange={(e) => onSelectVehicle(idx, e.target.value)}
                  isDisabled={loadingFleet || fleet.length === 0}
                >
                  {fleet.map((v, i) => (
                    <option key={`${v.details}-${i}`} value={v.details ?? ''}>
                      {v.details ?? '(Sans nom)'}
                    </option>
                  ))}
                </Select>
              </Td>

              <Td>
                <Input
                  value={row.year || ''}
                  onChange={(e) => {
                    const updated = [...b1Rows];
                    updated[idx].year = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  value={row.make || ''}
                  onChange={(e) => {
                    const updated = [...b1Rows];
                    updated[idx].make = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  value={row.model || ''}
                  onChange={(e) => {
                    const updated = [...b1Rows];
                    updated[idx].model = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  value={row.trans || ''}
                  onChange={(e) => {
                    const updated = [...b1Rows];
                    updated[idx].trans = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.distance || ''}
                  onChange={(e) => {
                    const updated = [...b1Rows];
                    updated[idx].distance = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  value={row.type || ''}
                  onChange={(e) => {
                    const updated = [...b1Rows];
                    updated[idx].type = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.cons || ''}
                  onChange={(e) => {
                    const updated = [...b1Rows];
                    updated[idx].cons = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.estimate || ''}
                  onChange={(e) => {
                    const updated = [...b1Rows];
                    updated[idx].estimate = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  value={row.reference || ''}
                  onChange={(e) => {
                    const updated = [...b1Rows];
                    updated[idx].reference = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  value={row.ac || ''}
                  onChange={(e) => {
                    const updated = [...b1Rows];
                    updated[idx].ac = e.target.value;
                    setB1Rows(updated);
                  }}
                  placeholder="Oui/Non"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <HStack mt={3} spacing={3}>
        <Button onClick={addB1Row} colorScheme="gray" rounded="xl">
          Ajouter une ligne
        </Button>
        <Button onClick={handle2B1Submit} colorScheme="blue" rounded="xl" isLoading={submitting}>
          Soumettre
        </Button>
      </HStack>

      {/* Optional: show results if provided */}
      {gesResults?.length ? (
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
              {gesResults.map((row, i) => (
                <Tr key={`res-${i}`}>
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
      ) : null}
    </Box>
  );
}


// import { useEffect, useState } from 'react';
// import {
//   Box,
//   Heading,
//   Table,
//   Thead,
//   Tbody,
//   Tr,
//   Th,
//   Td,
//   Input,
//   Button,
//   Select,
//   HStack,
//   IconButton,
//   Spinner,
//   Text,
//   useToast,
// } from '@chakra-ui/react';
// import { RepeatIcon } from '@chakra-ui/icons';
// import { supabase } from '../../../lib/supabaseClient';

// type B1Row = {
//   vehicle: string;   // label/details
//   year: string;
//   make: string;
//   model: string;
//   trans: string;
//   distance: string;
//   type: string;
//   cons: string;
//   estimate: string;
//   reference: string;
//   ac: string;
// };

// type SourceB1FormProps = {
//   b1Rows?: B1Row[];
//   setB1Rows: (rows: B1Row[]) => void;
//   addB1Row: () => void;
//   highlight?: string;
//   tableBg?: string;
// };

// // Vehicle shape stored in companies.vehicle_fleet (new shape, with legacy fallback)
// type FleetVehicle = {
//   details?: string;
//   annee?: string;
//   marque?: string;
//   modele?: string;
//   transmission?: string;
//   distance_km?: string;
//   type_carburant?: string;
//   conso_l_100km?: string;
//   // legacy fields that may exist
//   nom?: string;
//   type?: string;
//   clim?: string;
// };

// export function SourceB1Form({
//   b1Rows = [],
//   setB1Rows,
//   addB1Row,
//   highlight = '#245a7c',
//   tableBg = '#f3f6ef',
// }: SourceB1FormProps) {
//   const toast = useToast();
//   const [companyId, setCompanyId] = useState<string | null>(null);
//   const [fleet, setFleet] = useState<FleetVehicle[]>([]);
//   const [loadingFleet, setLoadingFleet] = useState<boolean>(true);

//   // Normalize vehicles from DB (accepts new + legacy shapes)
//   const normalizeFleet = (arr: any[]): FleetVehicle[] => {
//     if (!Array.isArray(arr)) return [];
//     return arr.map((v: any) => ({
//       details: v.details ?? v.nom ?? '',
//       annee: v.annee ?? '',
//       marque: v.marque ?? '',
//       modele: v.modele ?? '',
//       transmission: v.transmission ?? '',
//       distance_km: v.distance_km ?? '',
//       type_carburant: v.type_carburant ?? v.type ?? '',
//       conso_l_100km: v.conso_l_100km ?? '',
//       clim: v.clim ?? '',
//     }));
//   };

//   const loadFleet = async () => {
//     try {
//       setLoadingFleet(true);
//       // 1) current user
//       const { data: userRes, error: userErr } = await supabase.auth.getUser();
//       if (userErr) throw userErr;
//       const user = userRes?.user;
//       if (!user?.id) {
//         toast({ status: 'warning', title: 'Utilisateur non connecté.' });
//         return;
//       }
//       // 2) user_profiles -> company_id
//       const { data: profile, error: profErr } = await supabase
//         .from('user_profiles')
//         .select('company_id')
//         .eq('id', user.id)
//         .single();
//       if (profErr) throw profErr;
//       if (!profile?.company_id) {
//         toast({ status: 'error', title: "Impossible de trouver la compagnie de l'utilisateur." });
//         return;
//       }
//       setCompanyId(profile.company_id);
//       // 3) companies.vehicle_fleet
//       const { data: company, error: compErr } = await supabase
//         .from('companies')
//         .select('vehicle_fleet')
//         .eq('id', profile.company_id)
//         .single();
//       if (compErr) throw compErr;

//       const normalized = normalizeFleet(company?.vehicle_fleet ?? []);
//       setFleet(normalized);
//     } catch (err: any) {
//       console.error(err);
//       toast({ status: 'error', title: 'Erreur de chargement des véhicules', description: err.message ?? String(err) });
//       setFleet([]);
//     } finally {
//       setLoadingFleet(false);
//     }
//   };

//   useEffect(() => {
//     loadFleet();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // When a vehicle is selected from dropdown, fill other fields
//   const onSelectVehicle = (rowIdx: number, detailsValue: string) => {
//     const v = fleet.find((fv) => (fv.details ?? '') === detailsValue);
//     const updated = [...b1Rows];
//     updated[rowIdx] = {
//       ...updated[rowIdx],
//       vehicle: detailsValue,
//       year: v?.annee ?? updated[rowIdx].year ?? '',
//       make: v?.marque ?? updated[rowIdx].make ?? '',
//       model: v?.modele ?? updated[rowIdx].model ?? '',
//       trans: v?.transmission ?? updated[rowIdx].trans ?? '',
//       type: v?.type_carburant ?? updated[rowIdx].type ?? '',
//       cons: v?.conso_l_100km ?? updated[rowIdx].cons ?? '',
//       // keep existing values for user-entered fields:
//       distance: updated[rowIdx].distance ?? '',
//       estimate: updated[rowIdx].estimate ?? '',
//       reference: updated[rowIdx].reference ?? '',
//       ac: (v?.clim as string) ?? updated[rowIdx].ac ?? '', // legacy support if present
//     };
//     setB1Rows(updated);
//   };

//   return (
//     <Box bg="white" rounded="2xl" boxShadow="xl" p={6}>
//       <HStack justify="space-between" mb={4}>
//         <Heading
//           as="h3"
//           size="md"
//           color={highlight}
//           pb={2}
//           borderBottom="1px"
//           borderColor={`${highlight}30`}
//         >
//           Source B1 – Véhicules (Distance parcourue, Données Canadiennes)
//         </Heading>
//         <HStack>
//           {loadingFleet && (
//             <HStack>
//               <Spinner size="sm" />
//               <Text fontSize="sm">Chargement des véhicules…</Text>
//             </HStack>
//           )}
//           <IconButton
//             aria-label="Rafraîchir la flotte"
//             icon={<RepeatIcon />}
//             onClick={loadFleet}
//             size="sm"
//             variant="outline"
//           />
//         </HStack>
//       </HStack>

//       <Table size="sm" variant="simple" bg={tableBg}>
//         <Thead>
//           <Tr>
//             <Th>Détails sur les véhicules</Th>
//             <Th>Année</Th>
//             <Th>Marque</Th>
//             <Th>Modèle</Th>
//             <Th>Transmission</Th>
//             <Th>Distance parcourue [km]</Th>
//             <Th>Type et carburant</Th>
//             <Th>Conso. [L/100km]</Th>
//             <Th>Estimation [L]</Th>
//             <Th>Références</Th>
//             <Th>Climatisation?</Th>
//           </Tr>
//         </Thead>
//         <Tbody>
//           {(b1Rows || []).map((row, idx) => (
//             <Tr key={idx}>
//               <Td>
//                 <Select
//                   placeholder={loadingFleet ? 'Chargement…' : 'Choisir un véhicule'}
//                   value={row.vehicle || ''}
//                   onChange={(e) => onSelectVehicle(idx, e.target.value)}
//                   isDisabled={loadingFleet || fleet.length === 0}
//                 >
//                   {fleet.map((v, i) => (
//                     <option key={`${v.details}-${i}`} value={v.details ?? ''}>
//                       {v.details ?? '(Sans nom)'}
//                     </option>
//                   ))}
//                 </Select>
//               </Td>

//               <Td>
//                 <Input
//                   value={row.year || ''}
//                   onChange={(e) => {
//                     const updated = [...b1Rows];
//                     updated[idx].year = e.target.value;
//                     setB1Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.make || ''}
//                   onChange={(e) => {
//                     const updated = [...b1Rows];
//                     updated[idx].make = e.target.value;
//                     setB1Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.model || ''}
//                   onChange={(e) => {
//                     const updated = [...b1Rows];
//                     updated[idx].model = e.target.value;
//                     setB1Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.trans || ''}
//                   onChange={(e) => {
//                     const updated = [...b1Rows];
//                     updated[idx].trans = e.target.value;
//                     setB1Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.distance || ''}
//                   onChange={(e) => {
//                     const updated = [...b1Rows];
//                     updated[idx].distance = e.target.value;
//                     setB1Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.type || ''}
//                   onChange={(e) => {
//                     const updated = [...b1Rows];
//                     updated[idx].type = e.target.value;
//                     setB1Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.cons || ''}
//                   onChange={(e) => {
//                     const updated = [...b1Rows];
//                     updated[idx].cons = e.target.value;
//                     setB1Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   type="number"
//                   value={row.estimate || ''}
//                   onChange={(e) => {
//                     const updated = [...b1Rows];
//                     updated[idx].estimate = e.target.value;
//                     setB1Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.reference || ''}
//                   onChange={(e) => {
//                     const updated = [...b1Rows];
//                     updated[idx].reference = e.target.value;
//                     setB1Rows(updated);
//                   }}
//                 />
//               </Td>
//               <Td>
//                 <Input
//                   value={row.ac || ''}
//                   onChange={(e) => {
//                     const updated = [...b1Rows];
//                     updated[idx].ac = e.target.value;
//                     setB1Rows(updated);
//                   }}
//                   placeholder="Oui/Non"
//                 />
//               </Td>
//             </Tr>
//           ))}
//         </Tbody>
//       </Table>

//       <Button mt={3} onClick={addB1Row} colorScheme="blue" rounded="xl">
//         Ajouter une ligne
//       </Button>
//     </Box>
//   );
// }
