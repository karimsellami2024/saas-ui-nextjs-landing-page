import { useEffect, useState } from "react";

type PrefillResponse = {
  success: boolean;
  posteSourceId: string | null;
  data: any | null;
  results: any | null;
  meta?: { enabled?: boolean | null; label?: string | null };
};

export function usePrefillPosteSource(
  userId: string,
  posteNum: number,
  sourceCode: string,
  defaultValue: any = {}
) {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [data, setData]       = useState<any>(defaultValue);
  const [results, setResults] = useState<any>(null);
  const [posteSourceId, setPosteSourceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const qs = new URLSearchParams({
          user_id: userId,
          poste_num: String(posteNum),
          source_code: sourceCode,
        });
        const res = await fetch(`/api/GetSourceHandler?${qs.toString()}`, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: PrefillResponse = await res.json();

        if (!cancelled && json?.success) {
          setPosteSourceId(json.posteSourceId ?? null);
          setData(json.data ?? defaultValue);
          setResults(json.results ?? null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, posteNum, sourceCode]);

  return { loading, error, data, setData, results, setResults, posteSourceId };
}
