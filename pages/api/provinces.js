export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    // Replace with your Cloud Run URL!
    const response = await fetch("https://poste6webhook-592102073404.us-central1.run.app/provinces");
    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch provinces" });
    }
    const data = await response.json();
    return res.status(200).json(data); // {provinces: [...]}
  } catch (err) {
    return res.status(500).json({ error: "Error fetching provinces" });
  }
}
