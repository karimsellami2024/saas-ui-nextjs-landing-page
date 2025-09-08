// pages/api/vehicules/search.js
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { year, make, model } = req.query || {};
  if (!year || !make || !model) {
    return res.status(400).json({ error: "Missing year, make, or model" });
  }

  const BASE = process.env.VEHICULES_BASE
    || "https://vehiculecanada-592102073404.us-central1.run.app";

  const url = new URL("/search", BASE);
  url.searchParams.set("year", Array.isArray(year) ? year[0] : String(year));
  url.searchParams.set("make", Array.isArray(make) ? make[0] : String(make));
  url.searchParams.set("model", Array.isArray(model) ? model[0] : String(model));

  try {
    const upstream = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
    });

    const ct = upstream.headers.get("content-type") || "";
    const payload = ct.includes("application/json")
      ? await upstream.json().catch(() => ({}))
      : { error: await upstream.text().catch(() => "Non-JSON response") };

    if (!upstream.ok) {
      return res.status(502).json({
        error: "Upstream /search failed",
        details: payload?.error || payload,
        status: upstream.status,
      });
    }

    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({
      error: "Error fetching /search",
      details: err?.message || String(err),
    });
  }
}
