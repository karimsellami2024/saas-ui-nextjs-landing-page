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
} from '@chakra-ui/react';

// Define type for B1Row
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

type SourceB1FormProps = {
  b1Rows?: B1Row[];
  setB1Rows: (rows: B1Row[]) => void;
  addB1Row: () => void;
  highlight?: string;
  tableBg?: string;
};

export function SourceB1Form({
  b1Rows = [],
  setB1Rows,
  addB1Row,
  highlight = '#245a7c',
  tableBg = '#f3f6ef'
}: SourceB1FormProps) {
  return (
    <Box bg="white" rounded="2xl" boxShadow="xl" p={6}>
      <Heading as="h3" size="md" color={highlight} pb={2} mb={4} borderBottom="1px" borderColor={`${highlight}30`}>
        Source B1 – Véhicules (Distance parcourue, Données Canadiennes)
      </Heading>
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
                <Input
                  value={row.vehicle}
                  onChange={e => {
                    const updated = [...b1Rows];
                    updated[idx].vehicle = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  value={row.year}
                  onChange={e => {
                    const updated = [...b1Rows];
                    updated[idx].year = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  value={row.make}
                  onChange={e => {
                    const updated = [...b1Rows];
                    updated[idx].make = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  value={row.model}
                  onChange={e => {
                    const updated = [...b1Rows];
                    updated[idx].model = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  value={row.trans}
                  onChange={e => {
                    const updated = [...b1Rows];
                    updated[idx].trans = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.distance}
                  onChange={e => {
                    const updated = [...b1Rows];
                    updated[idx].distance = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  value={row.type}
                  onChange={e => {
                    const updated = [...b1Rows];
                    updated[idx].type = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.cons}
                  onChange={e => {
                    const updated = [...b1Rows];
                    updated[idx].cons = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  type="number"
                  value={row.estimate}
                  onChange={e => {
                    const updated = [...b1Rows];
                    updated[idx].estimate = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  value={row.reference}
                  onChange={e => {
                    const updated = [...b1Rows];
                    updated[idx].reference = e.target.value;
                    setB1Rows(updated);
                  }}
                />
              </Td>
              <Td>
                <Input
                  value={row.ac}
                  onChange={e => {
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
      <Button mt={3} onClick={addB1Row} colorScheme="blue" rounded="xl">
        Ajouter une ligne
      </Button>
    </Box>
  );
}
