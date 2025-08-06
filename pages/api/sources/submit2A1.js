// utils/submit2A1.js

// Replace with your actual Cloud Run URL!
const CLOUD_RUN_WEBHOOK = "https://allposteswebhook-592102073404.us-central1.run.app/submit/2A1";

/**
 * Sends data to the Cloud Run webhook for source 2A1.
 * @param {Object} payload - The full payload, including user_id, poste_source_id, etc.
 * @returns {Promise<Object>} Response from the API.
 */
export async function submit2A1(payload) {
  const response = await fetch(CLOUD_RUN_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur lors de la soumission');
  }
  return data; // Will include .results, etc.
}
