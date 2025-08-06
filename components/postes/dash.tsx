// /pages/dashboard.js
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { GesDashboard } from "../../components/postes/dashboard";

export default function DashboardPage() {
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);

      const res = await fetch(`/api/dashboard?user_id=${user.id}`);
      if (!res.ok) return setLoading(false);

      const data = await res.json();
      setResults(data.poste_results || []);
      setSummary({ total_tCO2eq: data.total_tCO2eq });
      setLoading(false);
    };

    fetchDashboard();
  }, []);

  if (loading) return <div>Chargement…</div>;
  return <GesDashboard posteResults={results} summary={summary} />;
}
