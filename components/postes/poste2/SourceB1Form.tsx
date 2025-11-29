import { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Grid,
  GridItem,
  Input,
  Button,
  Select,
  HStack,
  IconButton,
  Spinner,
  Text,
  useToast,
  VStack,
  useColorModeValue,
  Icon,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { Copy, Trash2, Lock } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { usePrefillPosteSource } from 'components/postes/HookForGetDataSource';

type B1Row = {
  vehicle: string;
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
  posteSourceId: string;
  userId: string;
  gesResults?: GesResult[];
  setGesResults?: (results: GesResult[]) => void;
  highlight?: string;
  tableBg?: string;
};

type FleetVehicle = {
  details?: string;
  annee?: string;
  marque?: string;
  modele?: string;
  transmission?: string;
  distance_km?: string;
  type_carburant?: string;
  conso_l_100km?: string;
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

  const inputBorder = useColorModeValue('#E8ECE7', '#2f3a36');
  const faintLine = useColorModeValue('rgba(0,0,0,0.12)', 'rgba(255,255,255,0.12)');
  const headerFg = 'white';

  // ===== Prefill from /api/get-source (poste 2, source 2B1) =====
  const {
    loading: prefillLoading,
    error: prefillError,
    data: prefillData,
    results: prefillResults,
  } = usePrefillPosteSource(userId, 2, '2B1', { rows: [] });

  useEffect(() => {
    if (Array.isArray(prefillData?.rows) && prefillData.rows.length) {
      setB1Rows(prefillData.rows as B1Row[]);
    }
    if (prefillResults && typeof setGesResults === 'function') {
      const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
      setGesResults(normalized as GesResult[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData, prefillResults]);

  // ===== Fleet loading =====
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
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userRes?.user;
      if (!user?.id) {
        toast({ status: 'warning', title: 'Utilisateur non connecté.' });
        return;
      }

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

      const { data: company, error: compErr } = await supabase
        .from('companies')
        .select('vehicle_fleet')
        .eq('id', profile.company_id)
        .single();
      if (compErr) throw compErr;

      setFleet(normalizeFleet(company?.vehicle_fleet ?? []));
    } catch (err: any) {
      console.error(err);
      toast({
        status: 'error',
        title: 'Erreur de chargement des véhicules',
        description: err.message ?? String(err),
      });
      setFleet([]);
    } finally {
      setLoadingFleet(false);
    }
  };

  useEffect(() => {
    loadFleet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Row helpers =====
  const updateRow = (idx: number, patch: Partial<B1Row>) => {
    setB1Rows(
      b1Rows.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  };

const duplicateRow = (idx: number) => {
  const row = b1Rows[idx];
  if (!row) return;

  const next = [...b1Rows];
  next.splice(idx + 1, 0, { ...row });
  setB1Rows(next);
};

const removeRow = (idx: number) => {
  const next = b1Rows.filter((_, i) => i !== idx);
  setB1Rows(next);
};


  // When a vehicle is selected from dropdown, fill other fields
  const onSelectVehicle = (rowIdx: number, detailsValue: string) => {
    const v = fleet.find((fv) => (fv.details ?? '') === detailsValue);
    const current = b1Rows[rowIdx] || ({} as B1Row);
    updateRow(rowIdx, {
      vehicle: detailsValue,
      year: v?.annee ?? current.year ?? '',
      make: v?.marque ?? current.make ?? '',
      model: v?.modele ?? current.model ?? '',
      trans: v?.transmission ?? current.trans ?? '',
      type: v?.type_carburant ?? current.type ?? '',
      cons: v?.conso_l_100km ?? current.cons ?? '',
      distance: current.distance ?? '',
      estimate: current.estimate ?? '',
      reference: current.reference ?? '',
      ac: (v?.clim as string) ?? current.ac ?? '',
    });
  };

  // Validation
  const validateRows = (rows: B1Row[]) => {
    if (!rows.length) return false;
    return rows.every(r => {
      const hasEstimate = String(r.estimate ?? '').trim() !== '';
      const hasDistCons =
        String(r.distance ?? '').trim() !== '' && String(r.cons ?? '').trim() !== '';
      return hasEstimate || hasDistCons;
    });
  };

  // Submit
  const handle2B1Submit = async () => {
    if (!posteSourceId || !userId) {
      toast({
        status: 'error',
        title: 'Champs requis manquants',
        description: 'posteSourceId ou userId',
      });
      return;
    }
    if (!validateRows(b1Rows)) {
      toast({
        status: 'warning',
        title: 'Validation',
        description: 'Chaque ligne doit avoir une estimation OU (distance et conso).',
      });
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

    try {
      const r = await fetch(
        'https://allposteswebhook-129138384907.us-central1.run.app/submit/2B1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const j = await r.json();
      if (!r.ok || !j.ok) {
        toast({
          status: 'error',
          title: 'Erreur Cloud Run',
          description: j.error || 'Calcul GES échoué.',
        });
      } else {
        results = Array.isArray(j.results) ? j.results : [];
        webhookOk = true;
      }
    } catch {
      toast({
        status: 'error',
        title: 'Erreur réseau',
        description: 'Impossible de joindre le service Cloud Run.',
      });
    }

    try {
      const dbPayload = { ...payload, results };
      const dbResponse = await fetch('/api/2submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload),
      });
      const dbResult = await dbResponse.json();
      if (!dbResponse.ok) {
        toast({
          status: 'error',
          title: 'Erreur base de données',
          description: dbResult.error || 'Sauvegarde échouée.',
        });
      } else {
        setGesResults?.(results);
        toast({
          status: 'success',
          title: webhookOk
            ? '2B1 calculé et sauvegardé'
            : '2B1 sauvegardé (sans calcul Cloud Run)',
        });
      }
    } catch {
      toast({
        status: 'error',
        title: 'Erreur inattendue',
        description: 'Échec lors de la sauvegarde.',
      });
    }

    setSubmitting(false);
  };

  return (
    <VStack align="stretch" spacing={4}>
      {/* Title + status bar */}
      <HStack justify="space-between" align="flex-start">
        <Heading
          as="h3"
          size="md"
          color={highlight}
          pb={2}
          borderBottom="1px solid"
          borderColor={`${highlight}30`}
        >
          Source B1 – Véhicules (Distance parcourue, Données Canadiennes)
        </Heading>

        <HStack spacing={3} align="center">
          {(prefillLoading || loadingFleet) && (
            <HStack spacing={2} color="gray.500">
              <Spinner size="sm" />
              <Text fontSize="sm">
                {prefillLoading
                  ? 'Chargement des données enregistrées…'
                  : 'Chargement des véhicules…'}
              </Text>
            </HStack>
          )}
          {prefillError && (
            <Text fontSize="sm" color="red.500">
              Erreur de préchargement : {prefillError}
            </Text>
          )}
          <IconButton
            aria-label="Rafraîchir la flotte"
            icon={<RepeatIcon />}
            size="sm"
            variant="ghost"
            onClick={loadFleet}
          />
        </HStack>
      </HStack>

      {/* Header row (same style as 2A3) */}
      <Grid
        templateColumns="2fr 0.8fr 1.1fr 1.1fr 1.1fr 1.1fr 1.2fr 1.1fr 1.1fr 1.2fr 0.9fr 96px"
        bg={highlight}
        color={headerFg}
        fontWeight={600}
        fontSize="sm"
        alignItems="center"
        px={4}
        py={3}
        rounded="lg"
      >
        <GridItem>Véhicule (flotte)</GridItem>
        <GridItem>Année</GridItem>
        <GridItem>Marque</GridItem>
        <GridItem>Modèle</GridItem>
        <GridItem>Transmission</GridItem>
        <GridItem>Distance [km]</GridItem>
        <GridItem>Type carburant</GridItem>
        <GridItem>Conso [L/100km]</GridItem>
        <GridItem>Estimation [L]</GridItem>
        <GridItem>Référence</GridItem>
        <GridItem>Climatisation</GridItem>
        <GridItem textAlign="right">Actions</GridItem>
      </Grid>

      {/* Rows */}
      <VStack
        spacing={0}
        bg={tableBg}
        rounded="xl"
        border="1px solid"
        borderColor={inputBorder}
        overflow="hidden"
      >
        {(b1Rows || []).map((row, idx) => (
          <Box key={idx} bg="transparent" px={{ base: 2, md: 3 }} pt={3}>
            <Grid
              templateColumns="2fr 0.8fr 1.1fr 1.1fr 1.1fr 1.1fr 1.2fr 1.1fr 1.1fr 1.2fr 0.9fr 96px"
              gap={3}
              alignItems="center"
              px={1}
            >
              {/* Vehicle from fleet */}
              <GridItem>
                <PillSelect
                  placeholder={
                    loadingFleet
                      ? 'Chargement…'
                      : fleet.length
                      ? 'Choisir un véhicule'
                      : 'Aucun véhicule'
                  }
                  value={row.vehicle || ''}
                  onChange={(v: string) => onSelectVehicle(idx, v)}
                  inputBorder={inputBorder}
                  disabled={loadingFleet || fleet.length === 0}
                >
                  {fleet.map((v, i) => (
                    <option key={`${v.details}-${i}`} value={v.details ?? ''}>
                      {v.details ?? '(Sans nom)'}
                    </option>
                  ))}
                </PillSelect>
              </GridItem>

              <GridItem>
                <PillInput
                  placeholder="Année"
                  value={row.year}
                  onChange={(v: string) => updateRow(idx, { year: v })}
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  placeholder="Marque"
                  value={row.make}
                  onChange={(v: string) => updateRow(idx, { make: v })}
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  placeholder="Modèle"
                  value={row.model}
                  onChange={(v: string) => updateRow(idx, { model: v })}
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  placeholder="Transmission"
                  value={row.trans}
                  onChange={(v: string) => updateRow(idx, { trans: v })}
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  placeholder="Distance [km]"
                  value={row.distance}
                  onChange={(v: string) => updateRow(idx, { distance: v })}
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  placeholder="Type carburant"
                  value={row.type}
                  onChange={(v: string) => updateRow(idx, { type: v })}
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  placeholder="Conso [L/100km]"
                  value={row.cons}
                  onChange={(v: string) => updateRow(idx, { cons: v })}
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  placeholder="Estimation [L]"
                  value={row.estimate}
                  onChange={(v: string) => updateRow(idx, { estimate: v })}
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  placeholder="Référence"
                  value={row.reference}
                  onChange={(v: string) => updateRow(idx, { reference: v })}
                  inputBorder={inputBorder}
                />
              </GridItem>

              <GridItem>
                <PillInput
                  placeholder="Oui / Non"
                  value={row.ac}
                  onChange={(v: string) => updateRow(idx, { ac: v })}
                  inputBorder={inputBorder}
                />
              </GridItem>

              {/* Actions */}
              <GridItem>
                <HStack spacing={2} justify="flex-end" pr={1}>
                  <MiniIconBtn icon={Lock} ariaLabel="Verrouiller" />
                  <MiniIconBtn
                    icon={Copy}
                    ariaLabel="Dupliquer"
                    onClick={() => duplicateRow(idx)}
                  />
                  <MiniIconBtn
                    icon={Trash2}
                    ariaLabel="Supprimer"
                    onClick={() => removeRow(idx)}
                  />
                </HStack>
              </GridItem>
            </Grid>

            {/* Per-row result line (like 2A3) */}
            <HStack spacing={3} align="center" px={1} py={3}>
              <Text ml="auto" fontSize="sm" color="gray.600">
                <strong>{formatResult(gesResults[idx])}</strong>
              </Text>
            </HStack>

            <Box h="2px" bg={faintLine} mx={2} rounded="full" />
          </Box>
        ))}

        {/* Placeholder row */}
        {(!b1Rows || b1Rows.length === 0) && (
          <Box p={4} textAlign="center" color="gray.500">
            Aucune ligne. Cliquez sur « Ajouter une ligne » pour commencer.
          </Box>
        )}
      </VStack>

      {/* Footer buttons */}
      <HStack pt={3} spacing={3}>
        <Button
          onClick={addB1Row}
          leftIcon={<Icon as={Copy} boxSize={4} />}
          bg={highlight}
          color="white"
          rounded="full"
          px={6}
          h="44px"
          _hover={{ opacity: 0.95 }}
        >
          Ajouter une ligne
        </Button>
        <Button
          onClick={handle2B1Submit}
          colorScheme="blue"
          rounded="full"
          px={6}
          h="44px"
          isLoading={submitting}
        >
          Soumettre
        </Button>
      </HStack>

      {/* Recap summary box (same style as 2A3) */}
      {Array.isArray(gesResults) && gesResults.length > 0 && (
        <Box mt={4} bg="#e5f2fa" rounded="xl" p={4} boxShadow="sm">
          <Text fontWeight="bold" color={highlight} mb={2}>
            Calculs et résultats (récapitulatif)
          </Text>
          <Grid templateColumns="repeat(6, 1fr)" gap={3} fontSize="sm">
            <ResultPill label="CO₂ [gCO₂e]" value={sumField(gesResults, 'total_co2_gco2e')} />
            <ResultPill label="CH₄ [gCO₂e]" value={sumField(gesResults, 'total_ges_ch4_gco2e')} />
            <ResultPill label="N₂O [gCO₂e]" value={sumField(gesResults, 'total_ges_n2o_gco2e')} />
            <ResultPill label="Total GES [gCO₂e]" value={sumField(gesResults, 'total_ges_gco2e')} />
            <ResultPill label="Total GES [tCO₂e]" value={sumField(gesResults, 'total_ges_tco2e')} />
            <ResultPill
              label="Énergie [kWh]"
              value={sumField(gesResults, 'total_energie_kwh')}
            />
          </Grid>
        </Box>
      )}
    </VStack>
  );
}

/* ===== UI helpers (same style as 2A3) ===== */
function PillInput({
  value,
  onChange,
  placeholder,
  inputBorder,
  full,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputBorder: string;
  full?: boolean;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      bg="white"
      border="1px solid"
      borderColor={inputBorder}
      rounded="xl"
      h="36px"
      boxShadow="0 2px 4px rgba(0,0,0,0.06)"
      fontSize="sm"
      flex={full ? 1 : undefined}
    />
  );
}

function PillSelect({
  value,
  onChange,
  placeholder,
  inputBorder,
  disabled,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputBorder: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      bg="white"
      border="1px solid"
      borderColor={inputBorder}
      rounded="xl"
      h="36px"
      boxShadow="0 2px 4px rgba(0,0,0,0.06)"
      fontSize="sm"
      isDisabled={disabled}
    >
      {children}
    </Select>
  );
}

function MiniIconBtn({
  icon,
  ariaLabel,
  onClick,
}: {
  icon: any;
  ariaLabel: string;
  onClick?: () => void;
}) {
  return (
    <Box
      as="button"
      aria-label={ariaLabel}
      p="6px"
      rounded="md"
      color="gray.600"
      _hover={{ bg: '#eef2ee' }}
      border="1px solid"
      borderColor="transparent"
      onClick={onClick}
    >
      <Icon as={icon} boxSize={4} />
    </Box>
  );
}

function ResultPill({ label, value }: { label: string; value: string }) {
  return (
    <VStack
      bg="white"
      border="1px solid"
      borderColor="#E8ECE7"
      rounded="xl"
      p={3}
      spacing={1}
      align="stretch"
    >
      <Text fontSize="xs" color="gray.600">
        {label}
      </Text>
      <Text fontWeight="bold">{value}</Text>
    </VStack>
  );
}

/* ===== Utils (same as 2A3) ===== */
function sumField(results: GesResult[], key: keyof GesResult): string {
  const s = results.reduce((acc, r) => acc + (toNum(r[key]) || 0), 0);
  return formatNumber(s);
}
function toNum(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return isFinite(n) ? n : 0;
}
function formatNumber(n: number): string {
  return Number(n).toLocaleString('fr-CA', { maximumFractionDigits: 3 });
}
function formatResult(r?: GesResult): string {
  if (!r) return '-';
  const t = r.total_ges_tco2e ?? r.total_ges_gco2e ?? r.total_co2_gco2e ?? '-';
  if (t === '-') return '-';
  const n = toNum(t as any);
  return n > 10_000
    ? `${formatNumber(n)} gCO₂e`
    : `${formatNumber(n)} ${String(t).includes('t') ? 'tCO₂e' : 'gCO₂e'}`;
}


// import { useEffect, useState } from 'react';
// import {
//   Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Select,
//   HStack, IconButton, Spinner, Text, useToast,
// } from '@chakra-ui/react';
// import { RepeatIcon } from '@chakra-ui/icons';
// import { supabase } from '../../../lib/supabaseClient';
// import VehicleSelect from "#components/vehicleselect/VehicleSelect";
// import { usePrefillPosteSource } from 'components/postes/HookForGetDataSource'; // ← NEW

// type B1Row = {
//   vehicle: string;
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

// type GesResult = {
//   total_co2_gco2e?: string | number;
//   total_ges_ch4_gco2e?: string | number;
//   total_ges_n2o_gco2e?: string | number;
//   total_ges_gco2e?: string | number;
//   total_ges_tco2e?: string | number;
//   total_energie_kwh?: string | number;
// };

// type SourceB1FormProps = {
//   b1Rows?: B1Row[];
//   setB1Rows: (rows: B1Row[]) => void;
//   addB1Row: () => void;
//   posteSourceId: string;
//   userId: string;
//   gesResults?: GesResult[];
//   setGesResults?: (results: GesResult[]) => void;
//   highlight?: string;
//   tableBg?: string;
// };

// type FleetVehicle = {
//   details?: string;
//   annee?: string;
//   marque?: string;
//   modele?: string;
//   transmission?: string;
//   distance_km?: string;
//   type_carburant?: string;
//   conso_l_100km?: string;
//   nom?: string;
//   type?: string;
//   clim?: string;
// };

// export function SourceB1Form({
//   b1Rows = [],
//   setB1Rows,
//   addB1Row,
//   posteSourceId,
//   userId,
//   gesResults = [],
//   setGesResults,
//   highlight = '#245a7c',
//   tableBg = '#f3f6ef',
// }: SourceB1FormProps) {
//   const toast = useToast();
//   const [companyId, setCompanyId] = useState<string | null>(null);
//   const [fleet, setFleet] = useState<FleetVehicle[]>([]);
//   const [loadingFleet, setLoadingFleet] = useState<boolean>(true);
//   const [submitting, setSubmitting] = useState<boolean>(false);

//   // ===== NEW: Prefill from /api/get-source (poste 2, source 2B1) =====
//   const {
//     loading: prefillLoading,
//     error: prefillError,
//     data: prefillData,
//     results: prefillResults,
//   } = usePrefillPosteSource(userId, 2, '2B1', { rows: [] });

//   useEffect(() => {
//     if (Array.isArray(prefillData?.rows) && prefillData.rows.length) {
//       setB1Rows(prefillData.rows as B1Row[]);
//     }
//     if (prefillResults && typeof setGesResults === 'function') {
//       const normalized = Array.isArray(prefillResults) ? prefillResults : [prefillResults];
//       setGesResults(normalized as GesResult[]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [prefillData, prefillResults]);

//   // ===== Fleet loading (unchanged) =====
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
//       const { data: userRes, error: userErr } = await supabase.auth.getUser();
//       if (userErr) throw userErr;
//       const user = userRes?.user;
//       if (!user?.id) {
//         toast({ status: 'warning', title: 'Utilisateur non connecté.' });
//         return;
//       }

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

//       const { data: company, error: compErr } = await supabase
//         .from('companies')
//         .select('vehicle_fleet')
//         .eq('id', profile.company_id)
//         .single();
//       if (compErr) throw compErr;

//       setFleet(normalizeFleet(company?.vehicle_fleet ?? []));
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
//       distance: updated[rowIdx].distance ?? '',
//       estimate: updated[rowIdx].estimate ?? '',
//       reference: updated[rowIdx].reference ?? '',
//       ac: (v?.clim as string) ?? updated[rowIdx].ac ?? '',
//     };
//     setB1Rows(updated);
//   };

//   // Validation
//   const validateRows = (rows: B1Row[]) => {
//     if (!rows.length) return false;
//     return rows.every(r => {
//       const hasEstimate = String(r.estimate ?? '').trim() !== '';
//       const hasDistCons = String(r.distance ?? '').trim() !== '' && String(r.cons ?? '').trim() !== '';
//       return hasEstimate || hasDistCons;
//     });
//   };

//   // Submit (unchanged)
//   const handle2B1Submit = async () => {
//     if (!posteSourceId || !userId) {
//       toast({ status: 'error', title: 'Champs requis manquants', description: 'posteSourceId ou userId' });
//       return;
//     }
//     if (!validateRows(b1Rows)) {
//       toast({ status: 'warning', title: 'Validation', description: 'Chaque ligne doit avoir une estimation OU (distance et conso).' });
//       return;
//     }

//     setSubmitting(true);
//     const payload = {
//       user_id: userId,
//       poste_source_id: posteSourceId,
//       poste_num: 2,
//       source_code: '2B1',
//       data: { rows: b1Rows },
//     };

//     let results: GesResult[] = [];
//     let webhookOk = false;

//     try {
//       const r = await fetch('https://allposteswebhook-129138384907.us-central1.run.app/submit/2B1', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       });
//       const j = await r.json();
//       if (!r.ok || !j.ok) {
//         toast({ status: 'error', title: 'Erreur Cloud Run', description: j.error || 'Calcul GES échoué.' });
//       } else {
//         results = Array.isArray(j.results) ? j.results : [];
//         webhookOk = true;
//       }
//     } catch {
//       toast({ status: 'error', title: 'Erreur réseau', description: 'Impossible de joindre le service Cloud Run.' });
//     }

//     try {
//       const dbPayload = { ...payload, results };
//       const dbResponse = await fetch('/api/2submit', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(dbPayload),
//       });
//       const dbResult = await dbResponse.json();
//       if (!dbResponse.ok) {
//         toast({ status: 'error', title: 'Erreur base de données', description: dbResult.error || 'Sauvegarde échouée.' });
//       } else {
//         setGesResults?.(results);
//         toast({
//           status: 'success',
//           title: webhookOk ? '2B1 calculé et sauvegardé' : '2B1 sauvegardé (sans calcul Cloud Run)',
//         });
//       }
//     } catch {
//       toast({ status: 'error', title: 'Erreur inattendue', description: 'Échec lors de la sauvegarde.' });
//     }

//     setSubmitting(false);
//   };

//   return (
//     <Box bg="white" rounded="2xl" boxShadow="xl" p={6}>
//       <HStack justify="space-between" mb={4}>
//         <Heading as="h3" size="md" color={highlight} pb={2} borderBottom="1px" borderColor={`${highlight}30`}>
//           Source B1 – Véhicules (Distance parcourue, Données Canadiennes)
//         </Heading>
//         <HStack>
//           {(prefillLoading || loadingFleet) && (
//             <HStack>
//               <Spinner size="sm" />
//               <Text fontSize="sm">
//                 {prefillLoading ? 'Chargement des données enregistrées…' : 'Chargement des véhicules…'}
//               </Text>
//             </HStack>
//           )}
//           {prefillError && <Text fontSize="sm" color="red.500">Erreur de préchargement : {prefillError}</Text>}
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

//       <HStack mt={3} spacing={3}>
//         <Button onClick={addB1Row} colorScheme="gray" rounded="xl">
//           Ajouter une ligne
//         </Button>
//         <Button onClick={handle2B1Submit} colorScheme="blue" rounded="xl" isLoading={submitting}>
//           Soumettre
//         </Button>
//       </HStack>

//       {gesResults?.length ? (
//         <Box mt={6} bg="#e5f2fa" rounded="xl" boxShadow="md" p={4}>
//           <Text fontWeight="bold" color={highlight} mb={2}>Calculs et résultats</Text>
//           <Table size="sm" variant="simple">
//             <Thead>
//               <Tr>
//                 <Th>CO₂ [gCO2e]</Th>
//                 <Th>CH₄ [gCO2e]</Th>
//                 <Th>N₂O [gCO2e]</Th>
//                 <Th>Total GES [gCO2e]</Th>
//                 <Th>Total GES [tCO2e]</Th>
//                 <Th>Énergie équivalente [kWh]</Th>
//               </Tr>
//             </Thead>
//             <Tbody>
//               {gesResults.map((row, i) => (
//                 <Tr key={`res-${i}`}>
//                   <Td fontWeight="bold">{row.total_co2_gco2e ?? '-'}</Td>
//                   <Td fontWeight="bold">{row.total_ges_ch4_gco2e ?? '-'}</Td>
//                   <Td fontWeight="bold">{row.total_ges_n2o_gco2e ?? '-'}</Td>
//                   <Td fontWeight="bold">{row.total_ges_gco2e ?? '-'}</Td>
//                   <Td fontWeight="bold">{row.total_ges_tco2e ?? '-'}</Td>
//                   <Td fontWeight="bold">{row.total_energie_kwh ?? '-'}</Td>
//                 </Tr>
//               ))}
//             </Tbody>
//           </Table>
//         </Box>
//       ) : null}
//     </Box>
//   );
// }
