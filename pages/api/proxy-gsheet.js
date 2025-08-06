export default async function handler(req, res) {
  const url = "https://script.google.com/macros/s/AKfycbydKDPTIexqer8IuAM21MmZrbVq4XXdlGbnM1BXkhQbIRLq8s5pG3BXZczJczHiNPjq/exec";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const text = await response.text();
    res.status(200).send(text);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
