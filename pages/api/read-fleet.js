import { IncomingForm } from 'formidable';
import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parseForm = () =>
    new Promise((resolve, reject) => {
      const form = new IncomingForm({
        keepExtensions: true,
        uploadDir: require('os').tmpdir(),
      });
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

  try {
    const { files } = await parseForm();
    let file = files.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded.' });
    if (Array.isArray(file)) file = file[0];
    if (!file?.filepath) return res.status(400).json({ error: 'No file uploaded.' });

    await fsPromises.access(file.filepath);

    const proxyForm = new FormData();
    proxyForm.append('file', fs.createReadStream(file.filepath), {
      filename: file.originalFilename || file.newFilename,
      contentType: file.mimetype,
    });

    const response = await fetch(
      'https://read-fleet-129138384907.us-central1.run.app/api/read-fleet',
      { method: 'POST', body: proxyForm, headers: proxyForm.getHeaders() }
    );

    const resultData = await response.json();
    await fsPromises.unlink(file.filepath).catch(() => {});

    return res.status(response.ok ? 200 : response.status).json(resultData);
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong', debug: { error: err.message } });
  }
}
