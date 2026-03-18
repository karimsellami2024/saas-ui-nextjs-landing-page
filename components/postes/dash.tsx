'use client'
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { GesDashboard } from "../../components/postes/dashboard";

const POSTE_CATEGORY: Record<number, string> = {
  1: "Directes",
  2: "Ind. liés à l'énergie",
  3: "Ind. liés aux transports",
  4: "Ind. en amont",
  5: "Ind. en aval",
  6: "Autres indirectes",
};

const POSTE_LABEL: Record<number, string> = {
  1: "Cat. 1 — Émissions directes",
  2: "Cat. 2 — Énergie importée",
  3: "Cat. 3 — Transports indirects",
  4: "Cat. 4 — Hors énergie et transport",
  5: "Cat. 5 — Utilisation des produits",
  6: "Cat. 6 — Autres émissions indirectes",
};

export default function DashboardPage() {
  const [results,       setResults]       = useState<any[]>([]);
  const [summary,       setSummary]       = useState<any>({});
  const [energyResults, setEnergyResults] = useState<any[]>([]);
  const [energySummary, setEnergySummary] = useState<any>({});
  const [energyTrend,   setEnergyTrend]   = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const res = await fetch(`/api/dashboard?user_id=${user.id}`);
      if (!res.ok) { setLoading(false); return; }

      const data = await res.json();

      const enrich = (rows: any[]) =>
        (rows || []).map((r: any) => ({
          ...r,
          category: POSTE_CATEGORY[r.poste] || "Autres",
          label:    POSTE_LABEL[r.poste]    || r.label,
        }));

      setResults(enrich(data.poste_results));
      setSummary(data.summary || {});
      setEnergyResults(enrich(data.energy_results));
      setEnergySummary(data.energy_summary || {});
      setEnergyTrend(data.energy_trend || []);
      setLoading(false);
    })();
  }, []);

  return (
    <GesDashboard
      posteResults={results}
      summary={summary}
      energyResults={energyResults}
      energySummary={energySummary}
      energyTrend={energyTrend}
      isLoading={loading}
    />
  );
}
