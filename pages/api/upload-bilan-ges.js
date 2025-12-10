// pages/api/upload-bilan-ges.js
import { IncomingForm } from 'formidable';
import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Disable body parsing for multipart/form-data
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('BILAN BACKEND: Method not allowed', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('BILAN BACKEND: Parsing form at', new Date().toISOString());

  const parseForm = () =>
    new Promise((resolve, reject) => {
      const form = new IncomingForm({
        keepExtensions: true,
        uploadDir: require('os').tmpdir(),
        multiples: true, // allow multiple bilans in one request
      });
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

  try {
    const { fields, files } = await parseForm();
    console.log('BILAN BACKEND: Parsed fields:', fields);
    console.log('BILAN BACKEND: Parsed files:', files);

    let fileArr = files.file;
    if (!fileArr) {
      console.warn('BILAN BACKEND: No valid file received', { files, fields });
      return res.status(400).json({
        error: 'No file uploaded.',
        debug: { files: Object.keys(files || {}), fields: Object.keys(fields || {}) },
      });
    }
    if (!Array.isArray(fileArr)) fileArr = [fileArr];
    fileArr = fileArr.filter((f) => f && f.filepath);

    if (!fileArr.length) {
      return res.status(400).json({
        error: 'No file uploaded.',
        debug: { files: Object.keys(files || {}), fields: Object.keys(fields || {}) },
      });
    }

    // Sanity check: can we read each temp file?
    for (const file of fileArr) {
      try {
        await fsPromises.access(file.filepath);
        console.log('BILAN BACKEND: File accessible at', file.filepath);
      } catch (err) {
        console.error('BILAN BACKEND: File access error:', err, file.filepath);
        return res
          .status(500)
          .json({ error: 'File not accessible', debug: { filepath: file.filepath } });
      }
    }

    // Build multipart/form-data to send to Cloud Run backend
    const proxyForm = new FormData();
    for (const file of fileArr) {
      const stream = fs.createReadStream(file.filepath);
      stream.on('error', (err) => console.error('BILAN BACKEND: Stream error:', err));
      stream.on('open', () => console.log('BILAN BACKEND: Stream opened for', file.filepath));

      proxyForm.append('file', stream, {
        filename: file.originalFilename || file.newFilename,
        contentType: file.mimetype,
      });
    }

    console.log('BILAN BACKEND: Proxy headers:', proxyForm.getHeaders());
    console.log(
      'BILAN BACKEND: Proxying to Cloud Run bilan GES backend at',
      new Date().toISOString()
    );


    const CLOUD_RUN_URL =
      'https://upload-bilan-ges-129138384907.us-central1.run.app/api/upload-bilan-ges';

    const response = await fetch(CLOUD_RUN_URL, {
      method: 'POST',
      body: proxyForm,
      headers: proxyForm.getHeaders(),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      console.error('BILAN BACKEND: Proxy error:', errorMsg);
      return res.status(response.status).json({ error: `Cloud Run failed: ${errorMsg}` });
    }

    const resultData = await response.json();
    console.log('BILAN BACKEND: Cloud Run data:', resultData);

    // Clean up tmp files
    for (const file of fileArr) {
      await fsPromises.unlink(file.filepath).catch((err) =>
        console.error('BILAN BACKEND: Cleanup error:', err)
      );
    }

    // Pass through the structured result (array of bilans)
    return res.status(200).json(resultData);
  } catch (err) {
    console.error('BILAN BACKEND: Error processing request:', err);
    return res.status(500).json({ error: 'Something went wrong', debug: { error: err.message } });
  }
}
