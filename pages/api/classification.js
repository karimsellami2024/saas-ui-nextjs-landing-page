// pages/api/agent/classification.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawPayload = req.body;

    const cleanJson = extractJson(rawPayload);
    if (!cleanJson) {
      return res.status(400).json({
        error: "Unable to extract valid JSON from payload",
      });
    }

    const methodologies = extractMethodologyNames(cleanJson);

    return res.status(200).json({
      ok: true,
      company_name: cleanJson.company_name || null,
      classification_date: cleanJson.classification_date || null,
      methodologies,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to process agent payload",
      details: err?.message || String(err),
    });
  }
}

/* ================= helpers ================= */

function extractJson(payload) {
  if (!payload) return null;

  // n8n may send an array
  if (Array.isArray(payload)) {
    return extractJson(payload[0]);
  }

  // Already JSON object
  if (typeof payload === "object") {
    const text =
      payload?.choices?.[0]?.message?.content ||
      payload?.message?.content ||
      payload?.text;

    if (typeof text === "string") {
      return parseJsonFromText(text);
    }

    return payload;
  }

  // Raw string
  if (typeof payload === "string") {
    return parseJsonFromText(payload);
  }

  return null;
}

function parseJsonFromText(text) {
  if (!text) return null;

  // ```json ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }

  // fallback: first {...}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }

  return null;
}

function extractMethodologyNames(json) {
  const out = new Set();

  const scopes = ["scope_1_sources", "scope_2_sources", "scope_3_sources"];

  for (const scope of scopes) {
    const arr = json?.[scope];
    if (!Array.isArray(arr)) continue;

    for (const item of arr) {
      if (item?.category) out.add(String(item.category).trim());
      if (item?.methodology) out.add(String(item.methodology).trim());
      if (item?.code) out.add(String(item.code).trim());
    }
  }

  return Array.from(out);
}
