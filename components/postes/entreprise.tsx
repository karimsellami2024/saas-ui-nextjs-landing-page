import { useEffect, useState } from "react";
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Text, Spinner,
} from "@chakra-ui/react";
import { supabase } from "../../lib/supabaseClient"; // Adjust if needed

const emptyLieu = { nom: "", description: "", adresse: "", ges: "" };
const emptyProduct = {
  nom: "",
  description: "",
  gesUnite: "",
  quantite: "",
  unite: "",
  gesTotal: "",
};
const emptyService = {
  nom: "",
  description: "",
  gesUnite: "",
  quantite: "",
  unite: "",
  gesTotal: "",
};
const emptyVehicle = {
  nom: "",
  type: "",
  clim: "",
};

export default function ProductionAndProductsPage() {
  const [lieux, setLieux] = useState([ { ...emptyLieu } ]);
  const [products, setProducts] = useState([ { ...emptyProduct } ]);
  const [services, setServices] = useState([ { ...emptyService } ]);
  const [vehicles, setVehicles] = useState([ { ...emptyVehicle } ]);
  const [loading, setLoading] = useState(false);

  // Company info state
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  // Load company info and existing lists from Supabase on mount
  useEffect(() => {
    (async () => {
      setCompanyLoading(true);
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id) {
        // 2. Query user_profiles for company_id
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
          // 3. Query companies for production_sites, products, services, vehicle_fleet
          const { data: companyData, error } = await supabase
            .from("companies")
            .select("production_sites, products, services, vehicle_fleet")
            .eq("id", profile.company_id)
            .single();
          if (companyData) {
            setLieux(
              Array.isArray(companyData.production_sites) && companyData.production_sites.length > 0
                ? companyData.production_sites
                : [ { ...emptyLieu } ]
            );
            setProducts(
              Array.isArray(companyData.products) && companyData.products.length > 0
                ? companyData.products
                : [ { ...emptyProduct } ]
            );
            setServices(
              Array.isArray(companyData.services) && companyData.services.length > 0
                ? companyData.services
                : [ { ...emptyService } ]
            );
            setVehicles(
              Array.isArray(companyData.vehicle_fleet) && companyData.vehicle_fleet.length > 0
                ? companyData.vehicle_fleet
                : [ { ...emptyVehicle } ]
            );
          }
        } else {
          alert("Impossible de trouver la compagnie de l'utilisateur.");
        }
      } else {
        alert("Utilisateur non connecté.");
      }
      setCompanyLoading(false);
    })();
  }, []);

  // --- Add/Remove/Update logic ---
  const addLieu = () => setLieux([...lieux, { ...emptyLieu }]);
  const addProduct = () => setProducts([...products, { ...emptyProduct }]);
  const addService = () => setServices([...services, { ...emptyService }]);
  const addVehicle = () => setVehicles([...vehicles, { ...emptyVehicle }]);

  const updateLieu = (i: number, key: string, value: string) => {
    const copy = [...lieux];
    copy[i][key] = value;
    setLieux(copy);
  };
  const updateProduct = (i: number, key: string, value: string) => {
    const updated = products.slice();
    updated[i][key] = value;
    setProducts(updated);
  };
  const updateService = (i: number, key: string, value: string) => {
    const updated = services.slice();
    updated[i][key] = value;
    setServices(updated);
  };
  const updateVehicle = (i: number, key: string, value: string) => {
    const updated = vehicles.slice();
    updated[i][key] = value;
    setVehicles(updated);
  };

  // --- Save handler ---
  const handleSave = async () => {
    if (!companyId) {
      alert("Impossible de trouver l'identifiant de la compagnie.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/company-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          production_sites: lieux,
          products,
          services,
          vehicle_fleet: vehicles,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur lors de la sauvegarde");
      alert("Données sauvegardées avec succès !");
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  };

  if (companyLoading)
    return (
      <Box p={8} minH="60vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="yellow.500" />
        <Text ml={4}>Chargement de la compagnie...</Text>
      </Box>
    );

  return (
    <Box p={8} bg="#f4f4f4" minH="100vh">

      {/* Lieux de production */}
      <Box bg="white" p={4} borderRadius="md" boxShadow="md" mb={8}>
        <Text fontWeight="bold" mb={1} fontSize="xl" color="gray.700">
          Liste des lieux de production
        </Text>
        <Table size="sm" variant="simple">
          <Thead bg="yellow.200">
            <Tr>
              <Th>Nom du lieu</Th>
              <Th>Description</Th>
              <Th>Adresse</Th>
              <Th>GES par Site [tCO2e]</Th>
            </Tr>
          </Thead>
          <Tbody>
            {lieux.map((lieu, i) => (
              <Tr key={i}>
                <Td>
                  <Input value={lieu.nom} onChange={e => updateLieu(i, "nom", e.target.value)} />
                </Td>
                <Td>
                  <Input value={lieu.description} onChange={e => updateLieu(i, "description", e.target.value)} />
                </Td>
                <Td>
                  <Input value={lieu.adresse} onChange={e => updateLieu(i, "adresse", e.target.value)} />
                </Td>
                <Td>
                  <Input value={lieu.ges} onChange={e => updateLieu(i, "ges", e.target.value)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <Button mt={2} colorScheme="yellow" onClick={addLieu}>
          Ajouter un lieu de production
        </Button>
      </Box>

      {/* Produits */}
      <Box bg="white" p={4} borderRadius="md" boxShadow="md" mb={8}>
        <Text fontWeight="bold" mb={2}>Produits</Text>
        <Table variant="simple" size="sm">
          <Thead bg="yellow.200">
            <Tr>
              <Th>Nom du produit</Th>
              <Th>Description</Th>
              <Th>GES par unité<br />[kgCO2e/unité]</Th>
              <Th>Quantité</Th>
              <Th>unité</Th>
              <Th>GES pour toute la gamme<br />[tCO2e]</Th>
            </Tr>
          </Thead>
          <Tbody>
            {products.map((prod, i) => (
              <Tr key={i}>
                <Td>
                  <Input value={prod.nom} onChange={e => updateProduct(i, "nom", e.target.value)} />
                </Td>
                <Td>
                  <Input value={prod.description} onChange={e => updateProduct(i, "description", e.target.value)} />
                </Td>
                <Td>
                  <Input value={prod.gesUnite} onChange={e => updateProduct(i, "gesUnite", e.target.value)} />
                </Td>
                <Td>
                  <Input value={prod.quantite} onChange={e => updateProduct(i, "quantite", e.target.value)} />
                </Td>
                <Td>
                  <Input value={prod.unite} onChange={e => updateProduct(i, "unite", e.target.value)} />
                </Td>
                <Td>
                  <Input value={prod.gesTotal} onChange={e => updateProduct(i, "gesTotal", e.target.value)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <Button mt={2} colorScheme="yellow" onClick={addProduct}>
          Ajouter un produit
        </Button>
      </Box>

      {/* Services */}
      <Box bg="white" p={4} borderRadius="md" boxShadow="md" mb={8}>
        <Text fontWeight="bold" mb={2}>Services</Text>
        <Table variant="simple" size="sm">
          <Thead bg="yellow.200">
            <Tr>
              <Th>Nom du service</Th>
              <Th>Description</Th>
              <Th>GES par unité<br />[kgCO2e/unité]</Th>
              <Th>Quantité</Th>
              <Th>unité</Th>
              <Th>GES pour toute la gamme<br />[tCO2e]</Th>
            </Tr>
          </Thead>
          <Tbody>
            {services.map((svc, i) => (
              <Tr key={i}>
                <Td>
                  <Input value={svc.nom} onChange={e => updateService(i, "nom", e.target.value)} />
                </Td>
                <Td>
                  <Input value={svc.description} onChange={e => updateService(i, "description", e.target.value)} />
                </Td>
                <Td>
                  <Input value={svc.gesUnite} onChange={e => updateService(i, "gesUnite", e.target.value)} />
                </Td>
                <Td>
                  <Input value={svc.quantite} onChange={e => updateService(i, "quantite", e.target.value)} />
                </Td>
                <Td>
                  <Input value={svc.unite} onChange={e => updateService(i, "unite", e.target.value)} />
                </Td>
                <Td>
                  <Input value={svc.gesTotal} onChange={e => updateService(i, "gesTotal", e.target.value)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <Button mt={2} colorScheme="yellow" onClick={addService}>
          Ajouter un service
        </Button>
      </Box>

      {/* Vehicle fleet */}
      <Box bg="white" p={4} borderRadius="md" boxShadow="md">
        <Text fontWeight="bold" mb={2}>Liste de la flotte de véhicule</Text>
        <Table variant="simple" size="sm">
          <Thead bg="yellow.200">
            <Tr>
              <Th>Nom ou numéro du véhicule</Th>
              <Th>Type de véhicule</Th>
              <Th>Climatisation</Th>
            </Tr>
          </Thead>
          <Tbody>
            {vehicles.map((veh, i) => (
              <Tr key={i}>
                <Td>
                  <Input value={veh.nom} onChange={e => updateVehicle(i, "nom", e.target.value)} />
                </Td>
                <Td>
                  <Input value={veh.type} onChange={e => updateVehicle(i, "type", e.target.value)} />
                </Td>
                <Td>
                  <Input value={veh.clim} onChange={e => updateVehicle(i, "clim", e.target.value)} placeholder="Oui/Non" />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <Button mt={2} colorScheme="yellow" onClick={addVehicle}>
          Ajouter un véhicule
        </Button>
      </Box>

      {/* Save Button */}
      <Box textAlign="center" mt={8}>
        <Button colorScheme="blue" onClick={handleSave} isLoading={loading}>
          Sauvegarder
        </Button>
      </Box>
    </Box>
  );
}
