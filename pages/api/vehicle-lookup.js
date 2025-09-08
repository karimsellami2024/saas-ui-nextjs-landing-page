const UPSTREAM =
  process.env.VEHICLE_API_URL ||
  "https://vehiculecanada-592102073404.us-central1.run.app/vehicle";

// Simple normalization to match backend
function normalize(s) {
  if (!s) return "";
  s = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ");
  return s.trim();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { year, marque, modele } = req.query || {};
  if (!year || !marque || !modele) {
    return res.status(400).json({
      ok: false,
      error: "Missing required query parameters: year, marque, modele",
    });
  }

  const payload = {
    year,
    marque: normalize(marque),
    modele: normalize(modele),
    full_name: `${year}, ${normalize(marque)}, ${normalize(modele)}`,
  };

  // Retry logic (up to 3 attempts)
  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    try {
      const upstream = await fetch(UPSTREAM, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json(data);
    } catch (err) {
      attempts++;
      console.error(`[vehicle-lookup] Attempt ${attempts} failed:`, err);
      if (attempts === maxAttempts) {
        return res.status(502).json({
          ok: false,
          error: `Failed after ${maxAttempts} attempts: ${err.message || "Proxy error"}`,
        });
      }
      // Wait 1s before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}