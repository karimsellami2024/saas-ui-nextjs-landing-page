// components/postes/entreprise.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Text, Spinner,
  IconButton, HStack, useToast, Select, Tag, TagLabel, TagCloseButton, Wrap, WrapItem,
  useColorModeValue, Switch, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { supabase } from "../../lib/supabaseClient";
import VehicleSelect from "#components/vehicleselect/VehicleSelect";

/** JSON row type coming from /public/vehicles_year_marque_modele.json */
type VehicleRow = { year: number; marque: string; modele: string };

function normalize(s: string) {
  return (s ?? "").trim();
}
function unique<T>(arr: T[]) { return Array.from(new Set(arr)); }
function clampInt(n: number, min = 1, max = 9999) { return Math.max(min, Math.min(max, Math.floor(n || 0))); }

type Lieu = { nom: string; description: string; adresse: string };
type ProductItem = { nom: string; description: string; quantite: string; unite: string };
type ServiceItem = { nom: string; description: string; quantite: string; unite: string };

type VehicleItem = {
  // NEW: quantity support
  qty: number;

  details: string; annee: string; marque: string; modele: string;
  transmission: string; distance_km: string; type_carburant: string; conso_l_100km: string;
  type_equipement_refrigeration: string; type_refrigerant: string; charge_lbs: string;
  fuites_lbs?: string; climatisation: boolean;
};

// ---- Defaults you asked for ----
const DEFAULT_EQUIP = "Climatisation - Automobile";
const DEFAULT_REFRIG = "R134a";
const DEFAULT_CHARGE = "1000";

const emptyLieu: Lieu = { nom: "", description: "", adresse: "" };
const emptyProduct: ProductItem = { nom: "", description: "", quantite: "", unite: "" };
const emptyService: ServiceItem = { nom: "", description: "", quantite: "", unite: "" };
const emptyVehicle: VehicleItem = {
  qty: 1, // NEW default quantity
  details: "", annee: "", marque: "", modele: "", transmission: "", distance_km: "",
  type_carburant: "", conso_l_100km: "",
  type_equipement_refrigeration: DEFAULT_EQUIP, // defaulted
  type_refrigerant: DEFAULT_REFRIG,             // defaulted
  charge_lbs: DEFAULT_CHARGE,                   // defaulted
  fuites_lbs: "", climatisation: false,
};

// Options pour les champs réfrigération
const REFRIG_EQUIP_OPTIONS = [
  DEFAULT_EQUIP, // include default in options
  "Aucun","Unité mobile (camion)","Vitrine/armoire réfrigérée","Chambre froide",
  "Congélateur","Pompe à chaleur","Autre",
];
const REFRIGERANT_OPTIONS = [
  DEFAULT_REFRIG, // include default without the dash
  "R-134a","R-410A","R-404A","R-407C","R-22 (legacy)","CO₂ (R-744)","NH₃ (R-717)","Propane (R-290)","Autre",
];

export default function ProductionAndProductsPage() {
  const toast = useToast();

  const [lieux, setLieux] = useState<Lieu[]>([{ ...emptyLieu }]);
  const [products, setProducts] = useState<ProductItem[]>([{ ...emptyProduct }]);
  const [services, setServices] = useState<ServiceItem[]>([{ ...emptyService }]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([{ ...emptyVehicle }]);
  const [lookupLoadingIndex, setLookupLoadingIndex] = useState<number | null>(null);

  // NEW: control whether to expand duplicates on save
  const [expandOnSave, setExpandOnSave] = useState<boolean>(false);

  // Company references (file names only)
  const [companyReferences, setCompanyReferences] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  // Company info state
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  // === Catalog (Année / Marque / Modèle) loaded from public JSON ===
  const [catalog, setCatalog] = useState<VehicleRow[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Load catalog JSON once
  useEffect(() => {
    (async () => {
      try {
        setLoadingCatalog(true);
        const res = await fetch("/vehicles_year_marque_modele.json", { cache: "force-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: VehicleRow[] = await res.json();
        const cleaned = data
          .filter(r => r && typeof r.year === "number" && r.marque && r.modele)
          .map(r => ({ year: r.year, marque: normalize(r.marque), modele: normalize(r.modele) }));
        setCatalog(cleaned);
        setCatalogError(null);
      } catch (e: any) {
        console.error(e);
        setCatalogError(e?.message ?? "Échec du chargement du catalogue.");
        toast({ status: "error", title: "Catalogue véhicules", description: "Impossible de charger Année/Marque/Modèle." });
      } finally {
        setLoadingCatalog(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unique sorted years in catalog
  const allYears = useMemo(
    () => unique(catalog.map(r => String(r.year))).sort((a,b)=>Number(a)-Number(b)),
    [catalog]
  );

  // Helper builders per row
  const makesFor = useCallback((year?: string) => {
    if (!year) return [];
    const y = Number(year);
    return unique(
      catalog.filter(r => r.year === y).map(r => r.marque)
    ).sort((a,b)=>a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [catalog]);

  const modelsFor = useCallback((year?: string, make?: string) => {
    if (!year || !make) return [];
    const y = Number(year);
    const m = normalize(make);
    return unique(
      catalog.filter(r => r.year === y && normalize(r.marque) === m).map(r => r.modele)
    ).sort((a,b)=>a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [catalog]);

  // Helper: migrate legacy rows -> new shape
  function normalizeVehicles(arr: any[]): VehicleItem[] {
    if (!Array.isArray(arr) || arr.length === 0) return [{ ...emptyVehicle }];
    return arr.map((v: any) => ({
      qty: clampInt(Number(v?.qty) || 1), // NEW: bring forward existing qty or default 1
      details: v?.details ?? v?.nom ?? "",
      annee: v?.annee ?? "",
      marque: v?.marque ?? "",
      modele: v?.modele ?? "",
      transmission: v?.transmission ?? "",
      distance_km: v?.distance_km ?? "",
      type_carburant: v?.type_carburant ?? v?.type ?? v?.carburant ?? "",
      conso_l_100km: v?.conso_l_100km ?? "",
      // ---- apply defaults if missing/empty ----
      type_equipement_refrigeration: v?.type_equipement_refrigeration || DEFAULT_EQUIP,
      type_refrigerant: v?.type_refrigerant || DEFAULT_REFRIG,
      charge_lbs: (v?.charge_lbs != null && String(v?.charge_lbs) !== "") ? String(v?.charge_lbs) : DEFAULT_CHARGE,
      fuites_lbs: v?.fuites_lbs != null ? String(v?.fuites_lbs) : "",
      climatisation: typeof v?.climatisation === "boolean" ? v.climatisation : Boolean(v?.clim),
    }));
  }

  // Load company info
  useEffect(() => {
    (async () => {
      try {
        setCompanyLoading(true);
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const user = userRes?.user;
        if (!user?.id) {
          toast({ status: "warning", title: "Utilisateur non connecté." });
          setCompanyLoading(false);
          return;
        }

        const { data: profile, error: profErr } = await supabase
          .from("user_profiles").select("company_id").eq("id", user.id).single();
        if (profErr) throw profErr;
        if (!profile?.company_id) {
          toast({ status: "error", title: "Impossible de trouver la compagnie de l'utilisateur." });
          setCompanyLoading(false);
          return;
        }
        setCompanyId(profile.company_id);

        const { data: companyData, error: compErr } = await supabase
          .from("companies")
          .select("production_sites, products, services, vehicle_fleet, company_references")
          .eq("id", profile.company_id)
          .single();
        if (compErr) throw compErr;

        setLieux(Array.isArray(companyData?.production_sites) && companyData.production_sites.length > 0 ? companyData.production_sites as Lieu[] : [{ ...emptyLieu }]);
        setProducts(Array.isArray(companyData?.products) && companyData.products.length > 0 ? companyData.products as ProductItem[] : [{ ...emptyProduct }]);
        setServices(Array.isArray(companyData?.services) && companyData.services.length > 0 ? companyData.services as ServiceItem[] : [{ ...emptyService }]);
        setVehicles(normalizeVehicles(companyData?.vehicle_fleet ?? []));
        setCompanyReferences(Array.isArray(companyData?.company_references) ? (companyData.company_references as string[]) : []);
      } catch (err: any) {
        console.error(err);
        toast({ status: "error", title: "Erreur de chargement", description: err?.message ?? String(err) });
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
    setLieux(prev => { const copy = [...prev]; copy[i] = { ...copy[i], [key]: value }; return copy; });
  };
  const updateProduct = <K extends keyof ProductItem>(i: number, key: K, value: ProductItem[K]) => {
    setProducts(prev => { const copy = [...prev]; copy[i] = { ...copy[i], [key]: value }; return copy; });
  };
  const updateService = <K extends keyof ServiceItem>(i: number, key: K, value: ServiceItem[K]) => {
    setServices(prev => { const copy = [...prev]; copy[i] = { ...copy[i], [key]: value }; return copy; });
  };
  const updateVehicle = <K extends keyof VehicleItem>(i: number, key: K, value: VehicleItem[K]) => {
    setVehicles(prev => { const copy = [...prev]; copy[i] = { ...copy[i], [key]: value }; return copy; });
  };

  // --- file references drag/drop handlers ---
  const addFilenames = useCallback((files: FileList | File[]) => {
    const names = Array.from(files).map(f => f.name).filter(Boolean);
    if (!names.length) return;
    setCompanyReferences(prev => { const set = new Set(prev); names.forEach(n => set.add(n)); return Array.from(set); });
    toast({ status: "success", title: `${names.length} fichier(s) ajouté(s) aux références` });
  }, [toast]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer?.files?.length) addFilenames(e.dataTransfer.files); };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

  const fileInputId = "company-refs-file-input";
  const removeReference = (name: string) => setCompanyReferences(prev => prev.filter(n => n !== name));

  const borderColor = useColorModeValue("#E2E8F0", "#2D3748");
  const hoverColor = useColorModeValue("#CBD5E0", "#4A5568");
  const activeColor = useColorModeValue("#A0AEC0", "#718096");

  // === Vehicle lookup: POST JSON directly to Cloud Run and prefill fields ===
  const fetchAndPrefillVehicle = useCallback(async (index: number) => {
    const v = vehicles[index];
    if (!v?.annee || !v?.marque || !v?.modele) return;

    setLookupLoadingIndex(index);
    try {
      const resp = await fetch("https://vehiculecanada-592102073404.us-central1.run.app/vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(v.annee),         // send as number (backend accepts str/int)
          marque: v.marque,
          modele: v.modele,
        }),
      });

      const data = await resp.json().catch(() => ({} as any));
      if (!resp.ok || !data?.ok) {
        throw new Error(data?.detail || data?.error || `Requête échouée (${resp.status})`);
      }

      const rows: Array<{ R?: string; Q?: string; U?: string }> = data.rows || [];
      if (!rows.length) {
        toast({ status: "info", title: "Aucun résultat", description: "Aucune correspondance trouvée pour ce véhicule." });
        return;
      }

      const uniq = (arr: (string | undefined)[]) =>
        Array.from(new Set(arr.filter(Boolean).map((x) => String(x))));

      const rVals = uniq(rows.map(r => r.R));
      const qVals = uniq(rows.map(r => r.Q));
      const uVals = uniq(rows.map(r => r.U));

      const q = qVals[0];
      const qNormalized = q ? q.replace(",", ".") : "";  // "9,95" -> "9.95"
      const u = uVals[0] || "";

      let r = "";
      if (rVals.length === 1) {
        r = rVals[0]!;
      } else if (rVals.length > 1) {
        toast({
          status: "info",
          title: "Plusieurs transmissions possibles",
          description: rVals.join(" / "),
          duration: 5000,
        });
      }

      setVehicles(prev => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          type_carburant: u || copy[index].type_carburant,
          conso_l_100km: qNormalized || copy[index].conso_l_100km,
          transmission: r || copy[index].transmission,
        };
        return copy;
      });

      toast({ status: "success", title: "Champs préremplis", description: "Les données ont été récupérées." });
    } catch (err: any) {
      console.error(err);
      toast({ status: "error", title: "Erreur de recherche", description: err?.message ?? String(err) });
    } finally {
      setLookupLoadingIndex(null);
    }
  }, [vehicles, toast]);

  // Helper to expand duplicates if requested
  function expandVehicles(list: VehicleItem[]): VehicleItem[] {
    const out: VehicleItem[] = [];
    for (const v of list) {
      const n = clampInt(v.qty || 1);
      for (let i = 0; i < n; i++) {
        out.push({ ...v, qty: 1 }); // each copy is qty 1
      }
    }
    return out;
  }

  // --- Save handler ---
  const handleSave = async () => {
    if (!companyId) {
      toast({ status: "error", title: "Impossible de trouver l'identifiant de la compagnie." });
      return;
    }
    setSaving(true);
    try {
      const vehiclesPayload = expandOnSave ? expandVehicles(vehicles) : vehicles;

      const res = await fetch("/api/company-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          production_sites: lieux,
          products,
          services,
          vehicle_fleet: vehiclesPayload,
          company_references: companyReferences,
        }),
      });
      const result = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(result?.error || "Erreur lors de la sauvegarde");
      toast({
        status: "success",
        title: "Données sauvegardées avec succès !",
        description: expandOnSave
          ? "Les lignes ont été dupliquées selon les quantités."
          : "Les quantités ont été enregistrées sur chaque ligne.",
      });
    } catch (err: any) {
      console.error(err);
      toast({ status: "error", title: "Échec de la sauvegarde", description: err?.message ?? String(err) });
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
      {/* Références fichiers */}
      <Box
        bg="white" p={4} borderRadius="md" boxShadow="md" mb={8}
        border="2px dashed" borderColor={isDragging ? activeColor : borderColor}
        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
      >
        <HStack justify="space-between" align="start">
          <Box>
            <Text fontWeight="bold" fontSize="xl" color="gray.700" mb={1}>
              Références de la compagnie (fichiers)
            </Text>
            <Text color="gray.600" mb={3}>
              Glissez-déposez plusieurs fichiers ici, ou{" "}
              <Button variant="link" colorScheme="yellow" onClick={() => document.getElementById(fileInputId)?.click()}>
                cliquez pour parcourir
              </Button>
              . Seuls les <strong>noms</strong> des fichiers seront enregistrés.
            </Text>

            <input
              id={fileInputId} type="file" multiple style={{ display: "none" }}
              onChange={(e) => { const files = e.target.files; if (files && files.length) addFilenames(files); (e.currentTarget as HTMLInputElement).value = ""; }}
            />

            {companyReferences.length > 0 ? (
              <>
                <Text fontSize="sm" color="gray.500" mb={2}>
                  {companyReferences.length} référence(s)
                </Text>
                <Wrap>
                  {companyReferences.map((name) => (
                    <WrapItem key={name}>
                      <Tag size="md" borderRadius="full" colorScheme="yellow" variant="subtle">
                        <TagLabel maxW="320px" isTruncated title={name}>{name}</TagLabel>
                        <TagCloseButton onClick={() => removeReference(name)} />
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              </>
            ) : (
              <Box mt={2} px={4} py={6} borderRadius="md" bg="#f9fafb" border="1px dashed" borderColor={hoverColor} textAlign="center">
                <Text color="gray.500">Aucune référence pour l’instant. Ajoutez des fichiers pour enregistrer leurs noms.</Text>
              </Box>
            )}
          </Box>

          <Button size="sm" variant="outline" onClick={() => setCompanyReferences([])} isDisabled={companyReferences.length === 0}>
            Vider la liste
          </Button>
        </HStack>
      </Box>

      {/* Lieux de production */}
      <Box bg="white" p={4} borderRadius="md" boxShadow="md" mb={8}>
        <HStack justify="space-between" mb={1}>
          <Text fontWeight="bold" fontSize="xl" color="gray.700">Liste des lieux de production</Text>
          <Button size="sm" colorScheme="yellow" onClick={addLieu}>Ajouter un lieu de production</Button>
        </HStack>
        <Table size="sm" variant="simple">
          <Thead bg="yellow.200">
            <Tr>
              <Th>Nom du lieu</Th><Th>Description</Th><Th>Adresse</Th><Th w="40px"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {lieux.map((lieu, i) => (
              <Tr key={`lieu-${i}`}>
                <Td><Input value={lieu.nom || ""} onChange={e => updateLieu(i, "nom", e.target.value)} /></Td>
                <Td><Input value={lieu.description || ""} onChange={e => updateLieu(i, "description", e.target.value)} /></Td>
                <Td><Input value={lieu.adresse || ""} onChange={e => updateLieu(i, "adresse", e.target.value)} /></Td>
                <Td><IconButton aria-label="Supprimer" icon={<CloseIcon boxSize="2" />} size="xs" onClick={() => removeRow(lieux, setLieux, i)} /></Td>
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
              <Th>Nom du produit</Th><Th>Description</Th><Th>Quantité</Th><Th>Unité</Th><Th w="40px"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {products.map((prod, i) => (
              <Tr key={`prod-${i}`}>
                <Td><Input value={prod.nom || ""} onChange={e => updateProduct(i, "nom", e.target.value)} /></Td>
                <Td><Input value={prod.description || ""} onChange={e => updateProduct(i, "description", e.target.value)} /></Td>
                <Td><Input value={prod.quantite || ""} onChange={e => updateProduct(i, "quantite", e.target.value)} /></Td>
                <Td>
                  <Select placeholder="Choisir unité" value={prod.unite || ""} onChange={e => updateProduct(i, "unite", e.target.value)}>
                    <option value="kg">kg</option><option value="lb">lb</option><option value="m">mètres</option>
                    <option value="ft">pieds</option><option value="L">litres</option><option value="kWh">kWh</option><option value="t">tonnes</option>
                  </Select>
                </Td>
                <Td><IconButton aria-label="Supprimer" icon={<CloseIcon boxSize="2" />} size="xs" onClick={() => removeRow(products, setProducts, i)} /></Td>
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
              <Th>Nom du service</Th><Th>Description</Th><Th>Quantité</Th><Th>Unité</Th><Th w="40px"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {services.map((svc, i) => (
              <Tr key={`svc-${i}`}>
                <Td><Input value={svc.nom || ""} onChange={e => updateService(i, "nom", e.target.value)} /></Td>
                <Td><Input value={svc.description || ""} onChange={e => updateService(i, "description", e.target.value)} /></Td>
                <Td><Input value={svc.quantite || ""} onChange={e => updateService(i, "quantite", e.target.value)} /></Td>
                <Td><Input value={svc.unite || ""} onChange={e => updateService(i, "unite", e.target.value)} /></Td>
                <Td><IconButton aria-label="Supprimer" icon={<CloseIcon boxSize="2" />} size="xs" onClick={() => removeRow(services, setServices, i)} /></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Flotte de véhicules */}
      {/* Flotte de véhicules */}
<Box
  bg="white"
  p={4}
  borderRadius="md"
  boxShadow="md"
  // Keep left aligned with the wrapper, but let the right side go full-bleed
  w="100%"
  maxW="unset"
  overflowX="auto"
  sx={{ mr: "calc(50% - 50vw)" }}  // <- open to the right edge
>
  <HStack justify="space-between" mb={2}>
    <Text fontWeight="bold">Liste de la flotte de véhicule</Text>
    <HStack spacing={4}>
      <HStack>
        <Switch isChecked={expandOnSave} onChange={(e) => setExpandOnSave(e.target.checked)} colorScheme="green" />
        <Text fontSize="sm" color="gray.600">Dupliquer à l'enregistrement</Text>
      </HStack>
      <Button size="sm" colorScheme="yellow" onClick={addVehicle}>Ajouter un véhicule</Button>
    </HStack>
  </HStack>

        <Table variant="simple" size="sm">
          <Thead bg="yellow.200">
            <Tr>
              <Th>QTÉ</Th>
              <Th>DÉTAILS SUR LES VÉHICULES</Th>
              <Th colSpan={3}>ANNÉE / MARQUE / MODÈLE</Th>
              <Th>TRANSMISSION</Th>
              <Th>TYPE ET CARBURANT</Th>
              <Th>CONSO. [L/100KM]</Th>
              <Th>ÉQUIPEMENT FRIGO</Th>
              <Th>RÉFRIGÉRANT</Th>
              <Th>CHARGE [lbs]</Th>
              <Th>FUITES [lbs] (opt.)</Th>
              <Th>CLIM</Th>
              <Th w="40px"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {vehicles.map((veh, i) => {
              const yearOptions = allYears;
              const makeOptions = makesFor(veh.annee);
              const modelOptions = modelsFor(veh.annee, veh.marque);
              const isThisLoading = lookupLoadingIndex === i;

              return (
                <Tr key={`veh-${i}`}>
                  {/* Quantity */}
                  <Td>
                    <NumberInput
                      size="sm"
                      min={1}
                      max={9999}
                      value={veh.qty ?? 1}
                      onChange={(_, num) => updateVehicle(i, "qty", clampInt(num))}
                      w="84px"
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </Td>

                  <Td>
                    <Input value={veh.details || ""} onChange={e => updateVehicle(i, "details", e.target.value)} placeholder="Plaque, usage, notes…" />
                  </Td>

                  {/* Cascading dropdowns */}
                  <Td colSpan={3}>
                    <HStack spacing={3} align="center" w="full">
                      {/* Année */}
                      <Select
                        placeholder={loadingCatalog ? "Chargement..." : "Année"}
                        isDisabled={loadingCatalog || !!catalogError}
                        value={veh.annee || ""}
                        onChange={(e) => {
                          updateVehicle(i, "annee", e.target.value);
                          updateVehicle(i, "marque", "");
                          updateVehicle(i, "modele", "");
                        }}
                        size="lg"
                        h="48px"
                        w={{ base: "160px", md: "220px" }}
                      >
                        {yearOptions.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </Select>

                      {/* Marque */}
                      <Select
                        placeholder={!veh.annee ? "Choisir année d'abord" : "Marque"}
                        isDisabled={!veh.annee || loadingCatalog || !!catalogError}
                        value={veh.marque || ""}
                        onChange={(e) => {
                          updateVehicle(i, "marque", e.target.value);
                          updateVehicle(i, "modele", "");
                        }}
                        size="lg"
                        h="48px"
                        w={{ base: "220px", md: "320px" }}
                      >
                        {makeOptions.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </Select>

                      {/* Modèle */}
                      <Select
                        placeholder={!veh.marque ? "Choisir marque d'abord" : "Modèle"}
                        isDisabled={!veh.annee || !veh.marque || loadingCatalog || !!catalogError}
                        value={veh.modele || ""}
                        onChange={(e) => {
                          updateVehicle(i, "modele", e.target.value);
                        }}
                        size="lg"
                        h="48px"
                        w={{ base: "260px", md: "420px" }}
                      >
                        {modelOptions.map(md => (
                          <option key={md} value={md}>{md}</option>
                        ))}
                      </Select>

                      {/* Bouton de recherche */}
                      <Button
                        colorScheme="yellow"
                        onClick={() => fetchAndPrefillVehicle(i)}
                        isDisabled={!veh.annee || !veh.marque || !veh.modele}
                        isLoading={isThisLoading}
                        h="48px"
                        px={5}
                      >
                        Rechercher
                      </Button>
                    </HStack>
                  </Td>

                  <Td>
                    <Input value={veh.transmission || ""} onChange={e => updateVehicle(i, "transmission", e.target.value)} placeholder="Manuelle/Automatique" />
                  </Td>

                  <Td>
                    <VehicleSelect value={veh.type_carburant || ""} onChange={(val: string) => updateVehicle(i, "type_carburant", val)} />
                  </Td>

                  <Td>
                    <Input value={veh.conso_l_100km || ""} onChange={e => updateVehicle(i, "conso_l_100km", e.target.value)} placeholder="ex: 7.2" />
                  </Td>

                  <Td>
                    <Select placeholder="(sélectionner)" value={veh.type_equipement_refrigeration || ""} onChange={e => updateVehicle(i, "type_equipement_refrigeration", e.target.value)}>
                      {REFRIG_EQUIP_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                    </Select>
                  </Td>
                  <Td>
                    <Select placeholder="(sélectionner)" value={veh.type_refrigerant || ""} onChange={e => updateVehicle(i, "type_refrigerant", e.target.value)}>
                      {REFRIGERANT_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                    </Select>
                  </Td>
                  <Td>
                    <Input type="number" step="any" value={veh.charge_lbs || ""} onChange={e => updateVehicle(i, "charge_lbs", e.target.value)} placeholder="ex: 12.5" />
                  </Td>
                  <Td>
                    <Input type="number" step="any" value={veh.fuites_lbs || ""} onChange={e => updateVehicle(i, "fuites_lbs", e.target.value)} placeholder="ex: 0.3" />
                  </Td>
                  <Td>
                    <Switch isChecked={!!veh.climatisation} onChange={e => updateVehicle(i, "climatisation", e.target.checked as any)} colorScheme="green" />
                  </Td>

                  <Td>
                    <IconButton aria-label="Supprimer" icon={<CloseIcon boxSize="2" />} size="xs" onClick={() => removeRow(vehicles, setVehicles, i)} />
                  </Td>
                </Tr>
              );
            })}
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


// // components/postes/entreprise.tsx
// 'use client';

// import { useEffect, useState, useCallback, useMemo } from "react";
// import {
//   Box, Table, Thead, Tbody, Tr, Th, Td, Input, Button, Text, Spinner,
//   IconButton, HStack, useToast, Select, Tag, TagLabel, TagCloseButton, Wrap, WrapItem,
//   useColorModeValue, Switch
// } from "@chakra-ui/react";
// import { CloseIcon } from "@chakra-ui/icons";
// import { supabase } from "../../lib/supabaseClient";
// import VehicleSelect from "#components/vehicleselect/VehicleSelect";

// /** JSON row type coming from /public/vehicles_year_marque_modele.json */
// type VehicleRow = { year: number; marque: string; modele: string };

// function normalize(s: string) {
//   return (s ?? "").trim();
// }
// function unique<T>(arr: T[]) { return Array.from(new Set(arr)); }

// type Lieu = { nom: string; description: string; adresse: string };
// type ProductItem = { nom: string; description: string; quantite: string; unite: string };
// type ServiceItem = { nom: string; description: string; quantite: string; unite: string };

// type VehicleItem = {
//   details: string; annee: string; marque: string; modele: string;
//   transmission: string; distance_km: string; type_carburant: string; conso_l_100km: string;
//   type_equipement_refrigeration: string; type_refrigerant: string; charge_lbs: string;
//   fuites_lbs?: string; climatisation: boolean;
// };

// // ---- Defaults you asked for ----
// const DEFAULT_EQUIP = "Climatisation - Automobile";
// const DEFAULT_REFRIG = "R134a";
// const DEFAULT_CHARGE = "1000";

// const emptyLieu: Lieu = { nom: "", description: "", adresse: "" };
// const emptyProduct: ProductItem = { nom: "", description: "", quantite: "", unite: "" };
// const emptyService: ServiceItem = { nom: "", description: "", quantite: "", unite: "" };
// const emptyVehicle: VehicleItem = {
//   details: "", annee: "", marque: "", modele: "", transmission: "", distance_km: "",
//   type_carburant: "", conso_l_100km: "",
//   type_equipement_refrigeration: DEFAULT_EQUIP, // defaulted
//   type_refrigerant: DEFAULT_REFRIG,             // defaulted
//   charge_lbs: DEFAULT_CHARGE,                   // defaulted
//   fuites_lbs: "", climatisation: false,
// };

// // Options pour les champs réfrigération
// const REFRIG_EQUIP_OPTIONS = [
//   DEFAULT_EQUIP, // include default in options
//   "Aucun","Unité mobile (camion)","Vitrine/armoire réfrigérée","Chambre froide",
//   "Congélateur","Pompe à chaleur","Autre",
// ];
// const REFRIGERANT_OPTIONS = [
//   DEFAULT_REFRIG, // include default without the dash
//   "R-134a","R-410A","R-404A","R-407C","R-22 (legacy)","CO₂ (R-744)","NH₃ (R-717)","Propane (R-290)","Autre",
// ];

// export default function ProductionAndProductsPage() {
//   const toast = useToast();

//   const [lieux, setLieux] = useState<Lieu[]>([{ ...emptyLieu }]);
//   const [products, setProducts] = useState<ProductItem[]>([{ ...emptyProduct }]);
//   const [services, setServices] = useState<ServiceItem[]>([{ ...emptyService }]);
//   const [vehicles, setVehicles] = useState<VehicleItem[]>([{ ...emptyVehicle }]);
//   const [lookupLoadingIndex, setLookupLoadingIndex] = useState<number | null>(null);

//   // Company references (file names only)
//   const [companyReferences, setCompanyReferences] = useState<string[]>([]);
//   const [isDragging, setIsDragging] = useState(false);
//   const [saving, setSaving] = useState(false);

//   // Company info state
//   const [companyId, setCompanyId] = useState<string | null>(null);
//   const [companyLoading, setCompanyLoading] = useState(true);

//   // === Catalog (Année / Marque / Modèle) loaded from public JSON ===
//   const [catalog, setCatalog] = useState<VehicleRow[]>([]);
//   const [loadingCatalog, setLoadingCatalog] = useState(true);
//   const [catalogError, setCatalogError] = useState<string | null>(null);

//   // Load catalog JSON once
//   useEffect(() => {
//     (async () => {
//       try {
//         setLoadingCatalog(true);
//         const res = await fetch("/vehicles_year_marque_modele.json", { cache: "force-cache" });
//         if (!res.ok) throw new Error(`HTTP ${res.status}`);
//         const data: VehicleRow[] = await res.json();
//         const cleaned = data
//           .filter(r => r && typeof r.year === "number" && r.marque && r.modele)
//           .map(r => ({ year: r.year, marque: normalize(r.marque), modele: normalize(r.modele) }));
//         setCatalog(cleaned);
//         setCatalogError(null);
//       } catch (e: any) {
//         console.error(e);
//         setCatalogError(e?.message ?? "Échec du chargement du catalogue.");
//         toast({ status: "error", title: "Catalogue véhicules", description: "Impossible de charger Année/Marque/Modèle." });
//       } finally {
//         setLoadingCatalog(false);
//       }
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Unique sorted years in catalog
//   const allYears = useMemo(
//     () => unique(catalog.map(r => String(r.year))).sort((a,b)=>Number(a)-Number(b)),
//     [catalog]
//   );

//   // Helper builders per row
//   const makesFor = useCallback((year?: string) => {
//     if (!year) return [];
//     const y = Number(year);
//     return unique(
//       catalog.filter(r => r.year === y).map(r => r.marque)
//     ).sort((a,b)=>a.localeCompare(b, 'fr', { sensitivity: 'base' }));
//   }, [catalog]);

//   const modelsFor = useCallback((year?: string, make?: string) => {
//     if (!year || !make) return [];
//     const y = Number(year);
//     const m = normalize(make);
//     return unique(
//       catalog.filter(r => r.year === y && normalize(r.marque) === m).map(r => r.modele)
//     ).sort((a,b)=>a.localeCompare(b, 'fr', { sensitivity: 'base' }));
//   }, [catalog]);

//   // Helper: migrate legacy rows -> new shape
//   function normalizeVehicles(arr: any[]): VehicleItem[] {
//     if (!Array.isArray(arr) || arr.length === 0) return [{ ...emptyVehicle }];
//     return arr.map((v: any) => ({
//       details: v?.details ?? v?.nom ?? "",
//       annee: v?.annee ?? "",
//       marque: v?.marque ?? "",
//       modele: v?.modele ?? "",
//       transmission: v?.transmission ?? "",
//       distance_km: v?.distance_km ?? "",
//       type_carburant: v?.type_carburant ?? v?.type ?? v?.carburant ?? "",
//       conso_l_100km: v?.conso_l_100km ?? "",
//       // ---- apply defaults if missing/empty ----
//       type_equipement_refrigeration: v?.type_equipement_refrigeration || DEFAULT_EQUIP,
//       // accept both "R134a" and "R-134a" but store default if missing
//       type_refrigerant: v?.type_refrigerant || DEFAULT_REFRIG,
//       charge_lbs: (v?.charge_lbs != null && String(v?.charge_lbs) !== "") ? String(v?.charge_lbs) : DEFAULT_CHARGE,
//       fuites_lbs: v?.fuites_lbs != null ? String(v?.fuites_lbs) : "",
//       climatisation: typeof v?.climatisation === "boolean" ? v.climatisation : Boolean(v?.clim),
//     }));
//   }

//   // Load company info
//   useEffect(() => {
//     (async () => {
//       try {
//         setCompanyLoading(true);
//         const { data: userRes, error: userErr } = await supabase.auth.getUser();
//         if (userErr) throw userErr;
//         const user = userRes?.user;
//         if (!user?.id) {
//           toast({ status: "warning", title: "Utilisateur non connecté." });
//           setCompanyLoading(false);
//           return;
//         }

//         const { data: profile, error: profErr } = await supabase
//           .from("user_profiles").select("company_id").eq("id", user.id).single();
//         if (profErr) throw profErr;
//         if (!profile?.company_id) {
//           toast({ status: "error", title: "Impossible de trouver la compagnie de l'utilisateur." });
//           setCompanyLoading(false);
//           return;
//         }
//         setCompanyId(profile.company_id);

//         const { data: companyData, error: compErr } = await supabase
//           .from("companies")
//           .select("production_sites, products, services, vehicle_fleet, company_references")
//           .eq("id", profile.company_id)
//           .single();
//         if (compErr) throw compErr;

//         setLieux(Array.isArray(companyData?.production_sites) && companyData.production_sites.length > 0 ? companyData.production_sites as Lieu[] : [{ ...emptyLieu }]);
//         setProducts(Array.isArray(companyData?.products) && companyData.products.length > 0 ? companyData.products as ProductItem[] : [{ ...emptyProduct }]);
//         setServices(Array.isArray(companyData?.services) && companyData.services.length > 0 ? companyData.services as ServiceItem[] : [{ ...emptyService }]);
//         setVehicles(normalizeVehicles(companyData?.vehicle_fleet ?? []));
//         setCompanyReferences(Array.isArray(companyData?.company_references) ? (companyData.company_references as string[]) : []);
//       } catch (err: any) {
//         console.error(err);
//         toast({ status: "error", title: "Erreur de chargement", description: err?.message ?? String(err) });
//       } finally {
//         setCompanyLoading(false);
//       }
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // --- Add/Remove/Update logic ---
//   const addLieu = () => setLieux(prev => [...prev, { ...emptyLieu }]);
//   const addProduct = () => setProducts(prev => [...prev, { ...emptyProduct }]);
//   const addService = () => setServices(prev => [...prev, { ...emptyService }]);
//   const addVehicle = () => setVehicles(prev => [...prev, { ...emptyVehicle }]);

//   const removeRow = <T,>(arr: T[], setArr: (v: T[]) => void, index: number, min = 1) => {
//     setArr(arr.length > min ? [...arr.slice(0, index), ...arr.slice(index + 1)] : arr);
//   };

//   const updateLieu = <K extends keyof Lieu>(i: number, key: K, value: Lieu[K]) => {
//     setLieux(prev => { const copy = [...prev]; copy[i] = { ...copy[i], [key]: value }; return copy; });
//   };
//   const updateProduct = <K extends keyof ProductItem>(i: number, key: K, value: ProductItem[K]) => {
//     setProducts(prev => { const copy = [...prev]; copy[i] = { ...copy[i], [key]: value }; return copy; });
//   };
//   const updateService = <K extends keyof ServiceItem>(i: number, key: K, value: ServiceItem[K]) => {
//     setServices(prev => { const copy = [...prev]; copy[i] = { ...copy[i], [key]: value }; return copy; });
//   };
//   const updateVehicle = <K extends keyof VehicleItem>(i: number, key: K, value: VehicleItem[K]) => {
//     setVehicles(prev => { const copy = [...prev]; copy[i] = { ...copy[i], [key]: value }; return copy; });
//   };

//   // --- file references drag/drop handlers ---
//   const addFilenames = useCallback((files: FileList | File[]) => {
//     const names = Array.from(files).map(f => f.name).filter(Boolean);
//     if (!names.length) return;
//     setCompanyReferences(prev => { const set = new Set(prev); names.forEach(n => set.add(n)); return Array.from(set); });
//     toast({ status: "success", title: `${names.length} fichier(s) ajouté(s) aux références` });
//   }, [toast]);

//   const onDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer?.files?.length) addFilenames(e.dataTransfer.files); };
//   const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
//   const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

//   const fileInputId = "company-refs-file-input";
//   const removeReference = (name: string) => setCompanyReferences(prev => prev.filter(n => n !== name));

//   const borderColor = useColorModeValue("#E2E8F0", "#2D3748");
//   const hoverColor = useColorModeValue("#CBD5E0", "#4A5568");
//   const activeColor = useColorModeValue("#A0AEC0", "#718096");

//   // === Vehicle lookup: POST JSON directly to Cloud Run and prefill fields ===
//   const fetchAndPrefillVehicle = useCallback(async (index: number) => {
//     const v = vehicles[index];
//     if (!v?.annee || !v?.marque || !v?.modele) return;

//     setLookupLoadingIndex(index);
//     try {
//       const resp = await fetch("https://vehiculecanada-592102073404.us-central1.run.app/vehicle", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           year: Number(v.annee),         // send as number (backend accepts str/int)
//           marque: v.marque,
//           modele: v.modele,
//         }),
//       });

//       const data = await resp.json().catch(() => ({} as any));
//       if (!resp.ok || !data?.ok) {
//         throw new Error(data?.detail || data?.error || `Requête échouée (${resp.status})`);
//       }

//       const rows: Array<{ R?: string; Q?: string; U?: string }> = data.rows || [];
//       if (!rows.length) {
//         toast({ status: "info", title: "Aucun résultat", description: "Aucune correspondance trouvée pour ce véhicule." });
//         return;
//       }

//       const uniq = (arr: (string | undefined)[]) =>
//         Array.from(new Set(arr.filter(Boolean).map((x) => String(x))));

//       const rVals = uniq(rows.map(r => r.R));
//       const qVals = uniq(rows.map(r => r.Q));
//       const uVals = uniq(rows.map(r => r.U));

//       const q = qVals[0];
//       const qNormalized = q ? q.replace(",", ".") : "";  // "9,95" -> "9.95"
//       const u = uVals[0] || "";

//       let r = "";
//       if (rVals.length === 1) {
//         r = rVals[0]!;
//       } else if (rVals.length > 1) {
//         toast({
//           status: "info",
//           title: "Plusieurs transmissions possibles",
//           description: rVals.join(" / "),
//           duration: 5000,
//         });
//       }

//       setVehicles(prev => {
//         const copy = [...prev];
//         copy[index] = {
//           ...copy[index],
//           type_carburant: u || copy[index].type_carburant,
//           conso_l_100km: qNormalized || copy[index].conso_l_100km,
//           transmission: r || copy[index].transmission,
//         };
//         return copy;
//       });

//       toast({ status: "success", title: "Champs préremplis", description: "Les données ont été récupérées." });
//     } catch (err: any) {
//       console.error(err);
//       toast({ status: "error", title: "Erreur de recherche", description: err?.message ?? String(err) });
//     } finally {
//       setLookupLoadingIndex(null);
//     }
//   }, [vehicles, toast]);

//   // --- Save handler ---
//   const handleSave = async () => {
//     if (!companyId) {
//       toast({ status: "error", title: "Impossible de trouver l'identifiant de la compagnie." });
//       return;
//     }
//     setSaving(true);
//     try {
//       const res = await fetch("/api/company-info", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           company_id: companyId,
//           production_sites: lieux,
//           products,
//           services,
//           vehicle_fleet: vehicles,
//           company_references: companyReferences,
//         }),
//       });
//       const result = await res.json().catch(() => ({} as any));
//       if (!res.ok) throw new Error(result?.error || "Erreur lors de la sauvegarde");
//       toast({ status: "success", title: "Données sauvegardées avec succès !" });
//     } catch (err: any) {
//       console.error(err);
//       toast({ status: "error", title: "Échec de la sauvegarde", description: err?.message ?? String(err) });
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (companyLoading)
//     return (
//       <Box p={8} minH="60vh" display="flex" alignItems="center" justifyContent="center">
//         <Spinner size="xl" color="yellow.500" />
//         <Text ml={4}>Chargement de la compagnie...</Text>
//       </Box>
//     );

//   return (
//     <Box p={8} bg="#f4f4f4" minH="100vh">
//       {/* Références fichiers */}
//       <Box
//         bg="white" p={4} borderRadius="md" boxShadow="md" mb={8}
//         border="2px dashed" borderColor={isDragging ? activeColor : borderColor}
//         onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
//       >
//         <HStack justify="space-between" align="start">
//           <Box>
//             <Text fontWeight="bold" fontSize="xl" color="gray.700" mb={1}>
//               Références de la compagnie (fichiers)
//             </Text>
//             <Text color="gray.600" mb={3}>
//               Glissez-déposez plusieurs fichiers ici, ou{" "}
//               <Button variant="link" colorScheme="yellow" onClick={() => document.getElementById(fileInputId)?.click()}>
//                 cliquez pour parcourir
//               </Button>
//               . Seuls les <strong>noms</strong> des fichiers seront enregistrés.
//             </Text>

//             <input
//               id={fileInputId} type="file" multiple style={{ display: "none" }}
//               onChange={(e) => { const files = e.target.files; if (files && files.length) addFilenames(files); (e.currentTarget as HTMLInputElement).value = ""; }}
//             />

//             {companyReferences.length > 0 ? (
//               <>
//                 <Text fontSize="sm" color="gray.500" mb={2}>
//                   {companyReferences.length} référence(s)
//                 </Text>
//                 <Wrap>
//                   {companyReferences.map((name) => (
//                     <WrapItem key={name}>
//                       <Tag size="md" borderRadius="full" colorScheme="yellow" variant="subtle">
//                         <TagLabel maxW="320px" isTruncated title={name}>{name}</TagLabel>
//                         <TagCloseButton onClick={() => removeReference(name)} />
//                       </Tag>
//                     </WrapItem>
//                   ))}
//                 </Wrap>
//               </>
//             ) : (
//               <Box mt={2} px={4} py={6} borderRadius="md" bg="#f9fafb" border="1px dashed" borderColor={hoverColor} textAlign="center">
//                 <Text color="gray.500">Aucune référence pour l’instant. Ajoutez des fichiers pour enregistrer leurs noms.</Text>
//               </Box>
//             )}
//           </Box>

//           <Button size="sm" variant="outline" onClick={() => setCompanyReferences([])} isDisabled={companyReferences.length === 0}>
//             Vider la liste
//           </Button>
//         </HStack>
//       </Box>

//       {/* Lieux de production */}
//       <Box bg="white" p={4} borderRadius="md" boxShadow="md" mb={8}>
//         <HStack justify="space-between" mb={1}>
//           <Text fontWeight="bold" fontSize="xl" color="gray.700">Liste des lieux de production</Text>
//           <Button size="sm" colorScheme="yellow" onClick={addLieu}>Ajouter un lieu de production</Button>
//         </HStack>
//         <Table size="sm" variant="simple">
//           <Thead bg="yellow.200">
//             <Tr>
//               <Th>Nom du lieu</Th><Th>Description</Th><Th>Adresse</Th><Th w="40px"></Th>
//             </Tr>
//           </Thead>
//           <Tbody>
//             {lieux.map((lieu, i) => (
//               <Tr key={`lieu-${i}`}>
//                 <Td><Input value={lieu.nom || ""} onChange={e => updateLieu(i, "nom", e.target.value)} /></Td>
//                 <Td><Input value={lieu.description || ""} onChange={e => updateLieu(i, "description", e.target.value)} /></Td>
//                 <Td><Input value={lieu.adresse || ""} onChange={e => updateLieu(i, "adresse", e.target.value)} /></Td>
//                 <Td><IconButton aria-label="Supprimer" icon={<CloseIcon boxSize="2" />} size="xs" onClick={() => removeRow(lieux, setLieux, i)} /></Td>
//               </Tr>
//             ))}
//           </Tbody>
//         </Table>
//       </Box>

//       {/* Produits */}
//       <Box bg="white" p={4} borderRadius="md" boxShadow="md" mb={8}>
//         <HStack justify="space-between" mb={2}>
//           <Text fontWeight="bold">Produits</Text>
//           <Button size="sm" colorScheme="yellow" onClick={addProduct}>Ajouter un produit</Button>
//         </HStack>
//         <Table variant="simple" size="sm">
//           <Thead bg="yellow.200">
//             <Tr>
//               <Th>Nom du produit</Th><Th>Description</Th><Th>Quantité</Th><Th>Unité</Th><Th w="40px"></Th>
//             </Tr>
//           </Thead>
//           <Tbody>
//             {products.map((prod, i) => (
//               <Tr key={`prod-${i}`}>
//                 <Td><Input value={prod.nom || ""} onChange={e => updateProduct(i, "nom", e.target.value)} /></Td>
//                 <Td><Input value={prod.description || ""} onChange={e => updateProduct(i, "description", e.target.value)} /></Td>
//                 <Td><Input value={prod.quantite || ""} onChange={e => updateProduct(i, "quantite", e.target.value)} /></Td>
//                 <Td>
//                   <Select placeholder="Choisir unité" value={prod.unite || ""} onChange={e => updateProduct(i, "unite", e.target.value)}>
//                     <option value="kg">kg</option><option value="lb">lb</option><option value="m">mètres</option>
//                     <option value="ft">pieds</option><option value="L">litres</option><option value="kWh">kWh</option><option value="t">tonnes</option>
//                   </Select>
//                 </Td>
//                 <Td><IconButton aria-label="Supprimer" icon={<CloseIcon boxSize="2" />} size="xs" onClick={() => removeRow(products, setProducts, i)} /></Td>
//               </Tr>
//             ))}
//           </Tbody>
//         </Table>
//       </Box>

//       {/* Services */}
//       <Box bg="white" p={4} borderRadius="md" boxShadow="md" mb={8}>
//         <HStack justify="space-between" mb={2}>
//           <Text fontWeight="bold">Services</Text>
//           <Button size="sm" colorScheme="yellow" onClick={addService}>Ajouter un service</Button>
//         </HStack>
//         <Table variant="simple" size="sm">
//           <Thead bg="yellow.200">
//             <Tr>
//               <Th>Nom du service</Th><Th>Description</Th><Th>Quantité</Th><Th>Unité</Th><Th w="40px"></Th>
//             </Tr>
//           </Thead>
//           <Tbody>
//             {services.map((svc, i) => (
//               <Tr key={`svc-${i}`}>
//                 <Td><Input value={svc.nom || ""} onChange={e => updateService(i, "nom", e.target.value)} /></Td>
//                 <Td><Input value={svc.description || ""} onChange={e => updateService(i, "description", e.target.value)} /></Td>
//                 <Td><Input value={svc.quantite || ""} onChange={e => updateService(i, "quantite", e.target.value)} /></Td>
//                 <Td><Input value={svc.unite || ""} onChange={e => updateService(i, "unite", e.target.value)} /></Td>
//                 <Td><IconButton aria-label="Supprimer" icon={<CloseIcon boxSize="2" />} size="xs" onClick={() => removeRow(services, setServices, i)} /></Td>
//               </Tr>
//             ))}
//           </Tbody>
//         </Table>
//       </Box>

//       {/* Flotte de véhicules */}
//       <Box bg="white" p={4} borderRadius="md" boxShadow="md">
//         <HStack justify="space-between" mb={2}>
//           <Text fontWeight="bold">Liste de la flotte de véhicule</Text>
//           <Button size="sm" colorScheme="yellow" onClick={addVehicle}>Ajouter un véhicule</Button>
//         </HStack>

//         <Table variant="simple" size="sm">
//           <Thead bg="yellow.200">
//             <Tr>
//               <Th>DÉTAILS SUR LES VÉHICULES</Th>
//               <Th colSpan={3}>ANNÉE / MARQUE / MODÈLE</Th>
//               <Th>TRANSMISSION</Th>
//               <Th>TYPE ET CARBURANT</Th>
//               <Th>CONSO. [L/100KM]</Th>
//               <Th>ÉQUIPEMENT FRIGO</Th>
//               <Th>RÉFRIGÉRANT</Th>
//               <Th>CHARGE [lbs]</Th>
//               <Th>FUITES [lbs] (opt.)</Th>
//               <Th>CLIM</Th>
//               <Th w="40px"></Th>
//             </Tr>
//           </Thead>
//           <Tbody>
//             {vehicles.map((veh, i) => {
//               const yearOptions = allYears;
//               const makeOptions = makesFor(veh.annee);
//               const modelOptions = modelsFor(veh.annee, veh.marque);
//               const isThisLoading = lookupLoadingIndex === i;

//               return (
//                 <Tr key={`veh-${i}`}>
//                   <Td>
//                     <Input value={veh.details || ""} onChange={e => updateVehicle(i, "details", e.target.value)} placeholder="Plaque, usage, notes…" />
//                   </Td>

//                   {/* Cascading dropdowns */}
//                   <Td colSpan={3}>
//                     <HStack spacing={3} align="center" w="full">
//                       {/* Année */}
//                       <Select
//                         placeholder={loadingCatalog ? "Chargement..." : "Année"}
//                         isDisabled={loadingCatalog || !!catalogError}
//                         value={veh.annee || ""}
//                         onChange={(e) => {
//                           updateVehicle(i, "annee", e.target.value);
//                           updateVehicle(i, "marque", "");
//                           updateVehicle(i, "modele", "");
//                         }}
//                         size="lg"
//                         h="48px"
//                         w={{ base: "160px", md: "220px" }}
//                       >
//                         {yearOptions.map(y => (
//                           <option key={y} value={y}>{y}</option>
//                         ))}
//                       </Select>

//                       {/* Marque */}
//                       <Select
//                         placeholder={!veh.annee ? "Choisir année d'abord" : "Marque"}
//                         isDisabled={!veh.annee || loadingCatalog || !!catalogError}
//                         value={veh.marque || ""}
//                         onChange={(e) => {
//                           updateVehicle(i, "marque", e.target.value);
//                           updateVehicle(i, "modele", "");
//                         }}
//                         size="lg"
//                         h="48px"
//                         w={{ base: "220px", md: "320px" }}
//                       >
//                         {makeOptions.map(m => (
//                           <option key={m} value={m}>{m}</option>
//                         ))}
//                       </Select>

//                       {/* Modèle */}
//                       <Select
//                         placeholder={!veh.marque ? "Choisir marque d'abord" : "Modèle"}
//                         isDisabled={!veh.annee || !veh.marque || loadingCatalog || !!catalogError}
//                         value={veh.modele || ""}
//                         onChange={(e) => {
//                           updateVehicle(i, "modele", e.target.value);
//                         }}
//                         size="lg"
//                         h="48px"
//                         w={{ base: "260px", md: "420px" }}
//                       >
//                         {modelOptions.map(md => (
//                           <option key={md} value={md}>{md}</option>
//                         ))}
//                       </Select>

//                       {/* Bouton de recherche */}
//                       <Button
//                         colorScheme="yellow"
//                         onClick={() => fetchAndPrefillVehicle(i)}
//                         isDisabled={!veh.annee || !veh.marque || !veh.modele}
//                         isLoading={isThisLoading}
//                         h="48px"
//                         px={5}
//                       >
//                         Rechercher
//                       </Button>
//                     </HStack>
//                   </Td>

//                   <Td>
//                     <Input value={veh.transmission || ""} onChange={e => updateVehicle(i, "transmission", e.target.value)} placeholder="Manuelle/Automatique" />
//                   </Td>

//                   <Td>
//                     <VehicleSelect value={veh.type_carburant || ""} onChange={(val: string) => updateVehicle(i, "type_carburant", val)} />
//                   </Td>

//                   <Td>
//                     <Input value={veh.conso_l_100km || ""} onChange={e => updateVehicle(i, "conso_l_100km", e.target.value)} placeholder="ex: 7.2" />
//                   </Td>

//                   <Td>
//                     <Select placeholder="(sélectionner)" value={veh.type_equipement_refrigeration || ""} onChange={e => updateVehicle(i, "type_equipement_refrigeration", e.target.value)}>
//                       {REFRIG_EQUIP_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
//                     </Select>
//                   </Td>
//                   <Td>
//                     <Select placeholder="(sélectionner)" value={veh.type_refrigerant || ""} onChange={e => updateVehicle(i, "type_refrigerant", e.target.value)}>
//                       {REFRIGERANT_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
//                     </Select>
//                   </Td>
//                   <Td>
//                     <Input type="number" step="any" value={veh.charge_lbs || ""} onChange={e => updateVehicle(i, "charge_lbs", e.target.value)} placeholder="ex: 12.5" />
//                   </Td>
//                   <Td>
//                     <Input type="number" step="any" value={veh.fuites_lbs || ""} onChange={e => updateVehicle(i, "fuites_lbs", e.target.value)} placeholder="ex: 0.3" />
//                   </Td>
//                   <Td>
//                     <Switch isChecked={!!veh.climatisation} onChange={e => updateVehicle(i, "climatisation", e.target.checked as any)} colorScheme="green" />
//                   </Td>

//                   <Td>
//                     <IconButton aria-label="Supprimer" icon={<CloseIcon boxSize="2" />} size="xs" onClick={() => removeRow(vehicles, setVehicles, i)} />
//                   </Td>
//                 </Tr>
//               );
//             })}
//           </Tbody>
//         </Table>
//       </Box>

//       {/* Save Button */}
//       <Box textAlign="center" mt={8}>
//         <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
//           Sauvegarder
//         </Button>
//       </Box>
//     </Box>
//   );
// }
