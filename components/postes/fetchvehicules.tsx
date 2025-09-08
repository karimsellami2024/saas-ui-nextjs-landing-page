// components/postes/fetchvehicules.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { HStack, VStack, Select, Button, Spinner, Text, useToast, Tooltip } from "@chakra-ui/react";

type OptionsResponse = { years?: (number | string)[]; makes?: string[]; models?: string[]; };

type SearchResult = {
  year?: number; make?: string; model?: string;
  transmission?: string | null; fuel_type?: string | null;
  combined_l_100km?: number | null; co2_g_km?: number | null;
  city_l_100km?: number | null; highway_l_100km?: number | null;
};

export interface FetchVehiculesProps {
  year: string; make: string; model: string;
  onYearChange: (v: string) => void;
  onMakeChange: (v: string) => void;
  onModelChange: (v: string) => void;
  onAutofill: (patch: { transmission?: string; type_carburant?: string; conso_l_100km?: string; _raw?: SearchResult; }) => void;
  compact?: boolean; disabled?: boolean;
  apiBase?: string; // e.g. https://.../dv
}

export default function FetchVehicules({
  year, make, model, onYearChange, onMakeChange, onModelChange, onAutofill,
  compact = false, disabled = false, apiBase = "/dv",
}: FetchVehiculesProps) {
  const toast = useToast();
  const base = (apiBase || "").replace(/\/$/, "");

  const [years, setYears] = useState<string[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);

  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [searching, setSearching] = useState(false);

  const ctlYears = useRef<AbortController | null>(null);
  const ctlMakes = useRef<AbortController | null>(null);
  const ctlModels = useRef<AbortController | null>(null);
  const ctlSearch = useRef<AbortController | null>(null);

  const canSearch = useMemo(() => Boolean(year && make && model), [year, make, model]);

  const fetchJSON = async <T,>(url: string, ctl?: AbortController): Promise<T> => {
    const res = await fetch(url, {
      signal: ctl?.signal, mode: "cors", cache: "no-store",
      headers: { Accept: "application/json" }, credentials: "omit",
    });
    const ct = res.headers.get("content-type") || "";
    let data: any;
    if (ct.includes("application/json")) data = await res.json();
    else data = { error: (await res.text()).slice(0, 500) || "Non-JSON response" };
    if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${res.status}`);
    return data as T;
  };

  // Years
  useEffect(() => {
    ctlYears.current?.abort();
    const ctrl = new AbortController();
    ctlYears.current = ctrl;
    setLoadingYears(true);
    (async () => {
      try {
        const data = await fetchJSON<OptionsResponse>(`${base}/options`, ctrl);
        const ys = (data.years || []).map(String).filter(Boolean);
        setYears(ys);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          toast({ status: "error", title: "Années indisponibles", description: e?.message || String(e) });
        }
      } finally {
        setLoadingYears(false);
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  // Makes
  useEffect(() => {
    if (!year) { setMakes([]); return; }
    ctlMakes.current?.abort();
    const ctrl = new AbortController();
    ctlMakes.current = ctrl;
    setLoadingMakes(true);
    (async () => {
      try {
        const qs = new URLSearchParams({ year });
        const data = await fetchJSON<OptionsResponse>(`${base}/options?${qs}`, ctrl);
        const ms = (data.makes || []).filter(Boolean);
        setMakes(ms);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          toast({ status: "error", title: "Marques indisponibles", description: e?.message || String(e) });
        }
      } finally {
        setLoadingMakes(false);
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, base]);

  // Models
  useEffect(() => {
    if (!year || !make) { setModels([]); return; }
    ctlModels.current?.abort();
    const ctrl = new AbortController();
    ctlModels.current = ctrl;
    setLoadingModels(true);
    (async () => {
      try {
        const qs = new URLSearchParams({ year, make });
        const data = await fetchJSON<OptionsResponse>(`${base}/options?${qs}`, ctrl);
        const mods = (data.models || []).filter(Boolean);
        setModels(mods);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          toast({ status: "error", title: "Modèles indisponibles", description: e?.message || String(e) });
        }
      } finally {
        setLoadingModels(false);
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, make, base]);

  // Auto search on full trio
  useEffect(() => {
    if (!canSearch) return;
    void doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSearch, year, make, model]);

  const doSearch = async () => {
    if (!canSearch) return;
    ctlSearch.current?.abort();
    const ctrl = new AbortController();
    ctlSearch.current = ctrl;
    setSearching(true);
    try {
      const qs = new URLSearchParams({ year, make, model });
      const data = await fetchJSON<{ results: SearchResult[] }>(`${base}/search?${qs}`, ctrl);
      const best = data.results?.[0];
      if (!best) {
        toast({ status: "warning", title: "Aucune fiche trouvée pour ce véhicule." });
        return;
      }
      onAutofill({
        transmission: best.transmission || undefined,
        type_carburant: best.fuel_type || undefined,
        conso_l_100km: best.combined_l_100km != null ? String(best.combined_l_100km) : undefined,
        _raw: best,
      });
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ status: "error", title: "Recherche véhicule échouée", description: e?.message || String(e) });
      }
    } finally {
      setSearching(false);
    }
  };

  const YearSelect = (
    <Select
      value={year || ""}
      onChange={(e) => { onYearChange(e.target.value); onMakeChange(""); onModelChange(""); }}
      placeholder={loadingYears ? "Chargement…" : "Année"}
      isDisabled={disabled || loadingYears}
      size={compact ? "sm" : "md"}
    >
      {years.map((y) => (<option key={y} value={String(y)}>{y}</option>))}
    </Select>
  );

  const MakeSelect = (
    <Select
      value={make || ""}
      onChange={(e) => { onMakeChange(e.target.value); onModelChange(""); }}
      placeholder={loadingMakes ? "Chargement…" : (year ? "Marque" : "Choisir l’année")}
      isDisabled={disabled || !year || loadingMakes}
      size={compact ? "sm" : "md"}
    >
      {makes.map((m) => (<option key={m} value={m}>{m}</option>))}
    </Select>
  );

  const ModelSelect = (
    <Select
      value={model || ""}
      onChange={(e) => onModelChange(e.target.value)}
      placeholder={loadingModels ? "Chargement…" : (make ? "Modèle" : "Choisir la marque")}
      isDisabled={disabled || !year || !make || loadingModels}
      size={compact ? "sm" : "md"}
    >
      {models.map((m) => (<option key={m} value={m}>{m}</option>))}
    </Select>
  );

  const Action = (
    <Tooltip label="Relancer la recherche et auto-remplir transmission / carburant / conso" hasArrow placement="top">
      <Button onClick={doSearch} isLoading={searching} isDisabled={disabled || !canSearch} size={compact ? "sm" : "md"} colorScheme="yellow">
        {searching ? "Recherche…" : "Auto-remplir"}
      </Button>
    </Tooltip>
  );

  if (compact) {
    return (
      <HStack spacing={2} align="center">
        {YearSelect}{MakeSelect}{ModelSelect}{Action}
        {(loadingYears || loadingMakes || loadingModels) && <Spinner size="sm" />}
      </HStack>
    );
  }

  return (
    <VStack align="stretch" spacing={2}>
      <Text fontWeight="bold" color="gray.700">Référence véhicules</Text>
      <HStack spacing={3} align="center">
        {YearSelect}{MakeSelect}{ModelSelect}{Action}
        {(loadingYears || loadingMakes || loadingModels) && <Spinner size="sm" />}
      </HStack>
    </VStack>
  );
}
