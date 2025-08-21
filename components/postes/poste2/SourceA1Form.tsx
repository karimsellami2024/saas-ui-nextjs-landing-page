import React, { useState } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Stack, Text,
} from '@chakra-ui/react';
import VehicleSelect from "#components/vehicleselect/VehicleSelect"
export type CarburantRow = {
  details: string;
  date: string;
  invoiceNumber: string;
  qty: string;
};
export type CarburantGroup = {
  vehicle: string;
  fuelType: string;
  rows: CarburantRow[];
};
type GesResult = {
  total_co2_gco2e?: string | number;
  total_ges_ch4_gco2e?: string | number;
  total_ges_n2o_gco2e?: string | number;
  total_ges_gco2e?: string | number;
  total_ges_tco2e?: string | number;
  total_energie_kwh?: string | number;
};

export interface SourceA1FormProps {
  carburantGroups: CarburantGroup[];
  updateGroupField: (gIdx: number, key: keyof CarburantGroup, value: string) => void;
  updateRowField: (gIdx: number, rIdx: number, key: keyof CarburantRow, value: string) => void;
  addVehicleGroup: () => void;
  addRow: (gIdx: number) => void;
  removeRow: (gIdx: number, rIdx: number) => void;
  removeGroup: (gIdx: number) => void;
  flattenCarburantGroups: (groups: CarburantGroup[]) => any[];
  highlight?: string;
  tableBg?: string;
  posteSourceId: string;
  userId: string;
  gesResults?: GesResult[];
  setGesResults: (results: GesResult[]) => void;
}

export function SourceA1Form({
  carburantGroups = [],
  updateGroupField,
  updateRowField,
  addVehicleGroup,
  addRow,
  removeRow,
  removeGroup,
  flattenCarburantGroups,
  highlight = '#245a7c',
  tableBg = '#f3f6ef',
  posteSourceId,
  userId,
  gesResults = [],
  setGesResults,
}: SourceA1FormProps) {
  const [loading, setLoading] = useState(false);

  // Validate data before submission
  const validateData = (groups: CarburantGroup[]) => {
    return groups.every(group =>
      group.vehicle && group.fuelType && group.rows.length > 0 && group.rows.every(row =>
        row.details && row.date && row.invoiceNumber && row.qty
      )
    );
  };

const handleA1Submit = async () => {
  if (!posteSourceId || !userId) {
    alert("Missing required fields (posteSourceId or userId)");
    return;
  }
  if (!validateData(carburantGroups)) {
    alert("Veuillez remplir tous les champs des groupes de carburant, y compris au moins une ligne par groupe.");
    return;
  }
  setLoading(true);

  // Sanitize and nest the data structure
  const sanitizedGroups = carburantGroups.map(group => ({
    ...group,
    rows: group.rows.map(row => ({
      ...row,
      qty: parseFloat(row.qty) || 0, // Convert qty to number
    })),
  }));

  const payload = {
    user_id: userId,
    poste_source_id: posteSourceId,
    source_code: '2A1',
    data: { groups: sanitizedGroups }
  };

  let results = [];
  let webhookOk = false;

  // 1. Call Cloud Run webhook
  try {
    const response = await fetch('https://allposteswebhook-592102073404.us-central1.run.app/submit/2A1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      alert('Erreur calcul GES (Cloud Run): ' + (result.error || ''));
    } else {
      // 👇 results is the array/object expected by the backend and the dashboard!
      results = Array.isArray(result.results) ? result.results : result.results || [];
      webhookOk = true;
    }
  } catch (error) {
    alert('Erreur réseau lors du calcul Cloud Run.');
  }

  // 2. Save to your database (Supabase/Postgres)
  try {
    // 🚨 INCLUDE THE 'results' key in your POST body!
    const dbPayload = { ...payload, results };
    const dbResponse = await fetch('/api/2submit', {
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
        ? 'Données A1 calculées et sauvegardées avec succès!'
        : 'Données A1 sauvegardées sans résultat de calcul GES.');
    }
  } catch (error) {
    alert('Erreur inattendue lors de la sauvegarde en base.');
  }

  setLoading(false);
};


  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6} mb={4}>
      <Heading as="h3" size="md" color={highlight} mb={4}>
        Saisie carburant – Groupé par véhicule
      </Heading>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Véhicule / Province</Th>
            <Th>Type de carburant</Th>
            <Th>Détail</Th>
            <Th>Date</Th>
            <Th># facture</Th>
            <Th>Quantité de carburant</Th>
            <Th>Unité</Th>
            <Th>Total carburant</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {(carburantGroups || []).map((group, gIdx) => {
            const total = (group.rows || []).reduce(
              (sum, r) => sum + parseFloat(r.qty || "0"),
              0
            );
            return (group.rows || []).map((row, rIdx) => (
              <Tr key={`${gIdx}-${rIdx}`}>
                {rIdx === 0 && (
  <>
    <Td rowSpan={group.rows.length}>
      <Input
        value={group.vehicle}
        onChange={e => updateGroupField(gIdx, "vehicle", e.target.value)}
      />
    </Td>
    <Td rowSpan={group.rows.length}>
      <VehicleSelect
        value={group.fuelType}
        onChange={(val: string) => updateGroupField(gIdx, "fuelType", val)}
      />
    </Td>
  </>
)}

                
                <Td>
                  <Input
                    value={row.details}
                    onChange={e => updateRowField(gIdx, rIdx, "details", e.target.value)}
                  />
                </Td>
                <Td>
                  <Input
                    type="date"
                    value={row.date}
                    onChange={e => updateRowField(gIdx, rIdx, "date", e.target.value)}
                  />
                </Td>
                <Td>
                  <Input
                    value={row.invoiceNumber}
                    onChange={e => updateRowField(gIdx, rIdx, "invoiceNumber", e.target.value)}
                  />
                </Td>
                <Td>
                  <Input
                    type="number"
                    value={row.qty}
                    onChange={e => updateRowField(gIdx, rIdx, "qty", e.target.value)}
                  />
                </Td>
                <Td>L</Td>
                {rIdx === 0 && (
                  <Td rowSpan={group.rows.length} fontWeight="bold">
                    {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                  </Td>
                )}
                <Td>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="xs"
                      onClick={() => addRow(gIdx)}
                      colorScheme="blue"
                      title="Ajouter une ligne"
                    >+</Button>
                    {group.rows.length > 1 && (
                      <Button
                        size="xs"
                        onClick={() => removeRow(gIdx, rIdx)}
                        colorScheme="red"
                        title="Supprimer la ligne"
                      >-</Button>
                    )}
                    {rIdx === 0 && (
                      <Button
                        size="xs"
                        onClick={() => removeGroup(gIdx)}
                        colorScheme="red"
                        title="Supprimer tout ce véhicule"
                      >Suppr. véhicule</Button>
                    )}
                  </Stack>
                </Td>
              </Tr>
            ));
          })}
        </Tbody>
      </Table>
      <Button mt={3} colorScheme="green" onClick={addVehicleGroup}>
        Ajouter un véhicule
      </Button>
      <Button mt={3} ml={4} colorScheme="blue" onClick={handleA1Submit} isLoading={loading}>
        Soumettre
      </Button>
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
            {(flattenCarburantGroups(carburantGroups) || []).map((_: any, idx: number) => {
              const row = gesResults[idx] || {};
              return (
                <Tr key={idx}>
                  <Td fontWeight="bold">{row.total_co2_gco2e ?? '-'}</Td>
                  <Td fontWeight="bold">{row.total_ges_ch4_gco2e ?? '-'}</Td>
                  <Td fontWeight="bold">{row.total_ges_n2o_gco2e ?? '-'}</Td>
                  <Td fontWeight="bold">{row.total_ges_gco2e ?? '-'}</Td>
                  <Td fontWeight="bold">{row.total_ges_tco2e ?? '-'}</Td>
                  <Td fontWeight="bold">{row.total_energie_kwh ?? '-'}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}
