import { useEffect, useState } from "react";
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Text, Spinner,
  IconButton, HStack, useToast,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { supabase } from "../../lib/supabaseClient";

// ---- Types ----
type Lieu = { nom: string; description: string; adresse: string; ges: string };
type ProductItem = { nom: string; description: string; gesUnite: string; quantite: string; unite: string; gesTotal: string };
type ServiceItem = { nom: string; description: string; gesUnite: string; quantite: string; unite: string; gesTotal: string };

// New vehicle shape (matches your screenshot)
type VehicleItem = {
  details: string;          // DÉTAILS SUR LES VÉHICULES
  annee: string;            // ANNÉE
  marque: string;           // MARQUE
  modele: string;           // MODÈLE
  transmission: string;     // TRANSMISSION
  distance_km: string;      // DISTANCE PARCOURUE [KM]
  type_carburant: string;   // TYPE ET CARBURANT
  conso_l_100km: string;    // CONSO. [L/100KM]
};

const emptyLieu: Lieu = { nom: "", description: "", adresse: "", ges: "" };
const emptyProduct: ProductItem = { nom: "", description: "", gesUnite: "", quantite: "", unite: "", gesTotal: "" };
const emptyService: ServiceItem = { nom: "", description: "", gesUnite: "", quantite: "", unite: "", gesTotal: "" };
const emptyVehicle: VehicleItem = {
  details: "",
  annee: "",
  marque: "",
  modele: "",
  transmission: "",
  distance_km: "",
  type_carburant: "",
  conso_l_100km: "",
};

export default function ProductionAndProductsPage() {
  const toast = useToast();

  const [lieux, setLieux] = useState<Lieu[]>([{ ...emptyLieu }]);
  const [products, setProducts] = useState<ProductItem[]>([{ ...emptyProduct }]);
  const [services, setServices] = useState<ServiceItem[]>([{ ...emptyService }]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([{ ...emptyVehicle }]);

  const [saving, setSaving] = useState(false);

  // Company info state
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  // Helper: migrate any legacy vehicle rows {nom,type,clim} -> new shape
  function normalizeVehicles(arr: any[]): VehicleItem[] {
    if (!Array.isArray(arr) || arr.length === 0) return [{ ...emptyVehicle }];
    return arr.map((v: any) => {
      // If already in new shape, keep fields; else map from old
      if (
        "details" in v || "annee" in v || "marque" in v || "modele" in v ||
        "transmission" in v || "distance_km" in v || "type_carburant" in v || "conso_l_100km" in v
      ) {
        return {
          details: v.details ?? "",
          annee: v.annee ?? "",
          marque: v.marque ?? "",
          modele: v.modele ?? "",
          transmission: v.transmission ?? "",
          distance_km: v.distance_km ?? "",
          type_carburant: v.type_carburant ?? "",
          conso_l_100km: v.conso_l_100km ?? "",
        };
      }
      // Legacy mapping
      return {
        details: v.nom ?? "",
        annee: "",
        marque: "",
        modele: "",
        transmission: "",
        distance_km: "",
        type_carburant: v.type ?? (v.carburant ?? ""),
        conso_l_100km: "",
      };
    });
  }

  // Load company info and existing lists from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        setCompanyLoading(true);
        // 1. Get current user
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const user = userRes?.user;
        if (!user?.id) {
          toast({ status: "warning", title: "Utilisateur non connecté." });
          setCompanyLoading(false);
          return;
        }

        // 2. Query user_profiles for company_id
        const { data: profile, error: profErr } = await supabase
          .from("user_profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();
        if (profErr) throw profErr;
        if (!profile?.company_id) {
          toast({ status: "error", title: "Impossible de trouver la compagnie de l'utilisateur." });
          setCompanyLoading(false);
          return;
        }
        setCompanyId(profile.company_id);

        // 3. Query companies for production_sites, products, services, vehicle_fleet
        const { data: companyData, error: compErr } = await supabase
          .from("companies")
          .select("production_sites, products, services, vehicle_fleet")
          .eq("id", profile.company_id)
          .single();
        if (compErr) throw compErr;

        setLieux(
          Array.isArray(companyData?.production_sites) && companyData.production_sites.length > 0
            ? (companyData.production_sites as Lieu[])
            : [{ ...emptyLieu }]
        );
        setProducts(
          Array.isArray(companyData?.products) && companyData.products.length > 0
            ? (companyData.products as ProductItem[])
            : [{ ...emptyProduct }]
        );
        setServices(
          Array.isArray(companyData?.services) && companyData.services.length > 0
            ? (companyData.services as ServiceItem[])
            : [{ ...emptyService }]
        );
        setVehicles(normalizeVehicles(companyData?.vehicle_fleet ?? []));
      } catch (err: any) {
        console.error(err);
        toast({ status: "error", title: "Erreur de chargement", description: err.message ?? String(err) });
      } finally {
        setCompanyLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Add/Remove/Update logic ---
  const addLieu = () => setLieux(prev => [...prev, { ...emptyLieu }]);
  const addProduct = () => setProducts(prev => [...prev, { ...emptyProduct }]);
  const addService = () => setServices(prev => [...prev, { ...emptyService }]);
  const addVehicle = () => setVehicles(prev => [...prev, { ...emptyVehicle }]);

  const removeRow = <T,>(arr: T[], setArr: (v: T[]) => void, index: number, min = 1) => {
    setArr(arr.length > min ? [...arr.slice(0, index), ...arr.slice(index + 1)] : arr);
  };

  const updateLieu = <K extends keyof Lieu>(i: number, key: K, value: Lieu[K]) => {
    setLieux(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [key]: value };
      return copy;
    });
  };
  const updateProduct = <K extends keyof ProductItem>(i: number, key: K, value: ProductItem[K]) => {
    setProducts(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [key]: value };
      return copy;
    });
  };
  const updateService = <K extends keyof ServiceItem>(i: number, key: K, value: ServiceItem[K]) => {
    setServices(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [key]: value };
      return copy;
    });
  };
  const updateVehicle = <K extends keyof VehicleItem>(i: number, key: K, value: VehicleItem[K]) => {
    setVehicles(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [key]: value };
      return copy;
    });
  };

  // --- Save handler ---
  const handleSave = async () => {
    if (!companyId) {
      toast({ status: "error", title: "Impossible de trouver l'identifiant de la compagnie." });
      return;
    }
    setSaving(true);
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
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.error || "Erreur lors de la sauvegarde");
      toast({ status: "success", title: "Données sauvegardées avec succès !" });
    } catch (err: any) {
      console.error(err);
      toast({ status: "error", title: "Échec de la sauvegarde", description: err.message ?? String(err) });
    } finally {
      setSaving(false);
    }
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
        <HStack justify="space-between" mb={1}>
          <Text fontWeight="bold" fontSize="xl" color="gray.700">
            Liste des lieux de production
          </Text>
          <Button size="sm" colorScheme="yellow" onClick={addLieu}>
            Ajouter un lieu de production
          </Button>
        </HStack>
        <Table size="sm" variant="simple">
          <Thead bg="yellow.200">
            <Tr>
              <Th>Nom du lieu</Th>
              <Th>Description</Th>
              <Th>Adresse</Th>
              <Th>GES par Site [tCO2e]</Th>
              <Th w="40px"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {lieux.map((lieu, i) => (
              <Tr key={`lieu-${i}`}>
                <Td><Input value={lieu.nom || ""} onChange={e => updateLieu(i, "nom", e.target.value)} /></Td>
                <Td><Input value={lieu.description || ""} onChange={e => updateLieu(i, "description", e.target.value)} /></Td>
                <Td><Input value={lieu.adresse || ""} onChange={e => updateLieu(i, "adresse", e.target.value)} /></Td>
                <Td><Input value={lieu.ges || ""} onChange={e => updateLieu(i, "ges", e.target.value)} /></Td>
                <Td>
                  <IconButton aria-label="Supprimer" icon={<CloseIcon boxSize="2" />} size="xs"
                    onClick={() => removeRow(lieux, setLieux, i)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Produits */}
      <Box bg="white" p={4} borderRadius="md" boxShadow="md" mb={8}>
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="bold">Produits</Text>
          <Button size="sm" colorScheme="yellow" onClick={addProduct}>Ajouter un produit</Button>
        </HStack>
        <Table variant="simple" size="sm">
          <Thead bg="yellow.200">
            <Tr>
              <Th>Nom du produit</Th>
              <Th>Description</Th>
              <Th>GES par unité<br />[kgCO2e/unité]</Th>
              <Th>Quantité</Th>
              <Th>Unité</Th>
              <Th>GES total<br />[tCO2e]</Th>
              <Th w="40px"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {products.map((prod, i) => (
              <Tr key={`prod-${i}`}>
                <Td><Input value={prod.nom || ""} onChange={e => updateProduct(i, "nom", e.target.value)} /></Td>
                <Td><Input value={prod.description || ""} onChange={e => updateProduct(i, "description", e.target.value)} /></Td>
                <Td><Input value={prod.gesUnite || ""} onChange={e => updateProduct(i, "gesUnite", e.target.value)} /></Td>
                <Td><Input value={prod.quantite || ""} onChange={e => updateProduct(i, "quantite", e.target.value)} /></Td>
                <Td><Input value={prod.unite || ""} onChange={e => updateProduct(i, "unite", e.target.value)} /></Td>
                <Td><Input value={prod.gesTotal || ""} onChange={e => updateProduct(i, "gesTotal", e.target.value)} /></Td>
                <Td>
                  <IconButton aria-label="Supprimer" icon={<CloseIcon boxSize="2" />} size="xs"
                    onClick={() => removeRow(products, setProducts, i)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Services */}
      <Box bg="white" p={4} borderRadius="md" boxShadow="md" mb={8}>
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="bold">Services</Text>
          <Button size="sm" colorScheme="yellow" onClick={addService}>Ajouter un service</Button>
        </HStack>
        <Table variant="simple" size="sm">
          <Thead bg="yellow.200">
            <Tr>
              <Th>Nom du service</Th>
              <Th>Description</Th>
              <Th>GES par unité<br />[kgCO2e/unité]</Th>
              <Th>Quantité</Th>
              <Th>Unité</Th>
              <Th>GES total<br />[tCO2e]</Th>
              <Th w="40px"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {services.map((svc, i) => (
              <Tr key={`svc-${i}`}>
                <Td><Input value={svc.nom || ""} onChange={e => updateService(i, "nom", e.target.value)} /></Td>
                <Td><Input value={svc.description || ""} onChange={e => updateService(i, "description", e.target.value)} /></Td>
                <Td><Input value={svc.gesUnite || ""} onChange={e => updateService(i, "gesUnite", e.target.value)} /></Td>
                <Td><Input value={svc.quantite || ""} onChange={e => updateService(i, "quantite", e.target.value)} /></Td>
                <Td><Input value={svc.unite || ""} onChange={e => updateService(i, "unite", e.target.value)} /></Td>
                <Td><Input value={svc.gesTotal || ""} onChange={e => updateService(i, "gesTotal", e.target.value)} /></Td>
                <Td>
                  <IconButton aria-label="Supprimer" icon={<CloseIcon boxSize="2" />} size="xs"
                    onClick={() => removeRow(services, setServices, i)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Flotte de véhicules (new columns) */}
      <Box bg="white" p={4} borderRadius="md" boxShadow="md">
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="bold">Liste de la flotte de véhicule</Text>
          <Button size="sm" colorScheme="yellow" onClick={addVehicle}>Ajouter un véhicule</Button>
        </HStack>
        <Table variant="simple" size="sm">
          <Thead bg="yellow.200">
            <Tr>
              <Th>DÉTAILS SUR LES VÉHICULES</Th>
              <Th>ANNÉE</Th>
              <Th>MARQUE</Th>
              <Th>MODÈLE</Th>
              <Th>TRANSMISSION</Th>
              <Th>DISTANCE PARCOURUE [KM]</Th>
              <Th>TYPE ET CARBURANT</Th>
              <Th>CONSO. [L/100KM]</Th>
              <Th w="40px"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {vehicles.map((veh, i) => (
              <Tr key={`veh-${i}`}>
                <Td><Input value={veh.details || ""} onChange={e => updateVehicle(i, "details", e.target.value)} placeholder="Plaque, usage, notes…" /></Td>
                <Td><Input value={veh.annee || ""} onChange={e => updateVehicle(i, "annee", e.target.value)} placeholder="2021" /></Td>
                <Td><Input value={veh.marque || ""} onChange={e => updateVehicle(i, "marque", e.target.value)} placeholder="Toyota" /></Td>
                <Td><Input value={veh.modele || ""} onChange={e => updateVehicle(i, "modele", e.target.value)} placeholder="Corolla" /></Td>
                <Td><Input value={veh.transmission || ""} onChange={e => updateVehicle(i, "transmission", e.target.value)} placeholder="Manuelle/Automatique" /></Td>
                <Td><Input value={veh.distance_km || ""} onChange={e => updateVehicle(i, "distance_km", e.target.value)} placeholder="ex: 12500" /></Td>
                <Td><Input value={veh.type_carburant || ""} onChange={e => updateVehicle(i, "type_carburant", e.target.value)} placeholder="Essence, Diesel, Hybride…" /></Td>
                <Td><Input value={veh.conso_l_100km || ""} onChange={e => updateVehicle(i, "conso_l_100km", e.target.value)} placeholder="ex: 7.2" /></Td>
                <Td>
                  <IconButton aria-label="Supprimer" icon={<CloseIcon boxSize="2" />} size="xs"
                    onClick={() => removeRow(vehicles, setVehicles, i)} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Save Button */}
      <Box textAlign="center" mt={8}>
        <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
          Sauvegarder
        </Button>
      </Box>
    </Box>
  );
}
