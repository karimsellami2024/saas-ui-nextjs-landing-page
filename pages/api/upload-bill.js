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
    console.log('BACKEND: Method not allowed', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('BACKEND: Parsing form at', new Date().toISOString());

  // Wrap form.parse in a Promise
  const parseForm = () =>
    new Promise((resolve, reject) => {
      const form = new IncomingForm({
        keepExtensions: true,
        uploadDir: require('os').tmpdir(),
        multiples: true, // <--- Enable multiple!
      });
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

  try {
    // Parse the uploaded files
    const { fields, files } = await parseForm();
    console.log('BACKEND: Parsed fields:', fields);
    console.log('BACKEND: Parsed files:', files);

    let fileArr = files.file;
    if (!fileArr) {
      console.warn('BACKEND: No valid file received', { files, fields });
      return res.status(400).json({
        error: 'No file uploaded.',
        debug: { files: Object.keys(files), fields: Object.keys(fields) },
      });
    }
    if (!Array.isArray(fileArr)) fileArr = [fileArr];
    fileArr = fileArr.filter(f => f && f.filepath); // skip empties

    if (!fileArr.length) {
      return res.status(400).json({
        error: 'No file uploaded.',
        debug: { files: Object.keys(files), fields: Object.keys(fields) },
      });
    }

    // Verify accessibility for each file
    for (const file of fileArr) {
      try {
        await fsPromises.access(file.filepath);
        console.log('BACKEND: File is accessible at', file.filepath);
      } catch (err) {
        console.error('BACKEND: File access error:', err, file.filepath);
        return res.status(500).json({ error: 'File not accessible', debug: { filepath: file.filepath } });
      }
    }

    // Create FormData for proxying *all* files to Flask backend
    const proxyForm = new FormData();
    for (const file of fileArr) {
      const stream = fs.createReadStream(file.filepath);
      stream.on('error', (err) => console.error('BACKEND: Stream error:', err));
      stream.on('open', () => console.log('BACKEND: Stream opened for', file.filepath));
      proxyForm.append('file', stream, {
        filename: file.originalFilename || file.newFilename,
        contentType: file.mimetype,
      });
    }

    console.log('BACKEND: Proxy headers:', proxyForm.getHeaders());
    console.log('BACKEND: Proxying to external backend at', new Date().toISOString());

    // Proxy to Flask backend (multi-file support)
    const response = await fetch(
      'https://upload-bill-129138384907.us-central1.run.app/api/upload-bill',
      {
        method: 'POST',
        body: proxyForm,
        headers: proxyForm.getHeaders(),
      }
    );

    if (!response.ok) {
      const errorMsg = await response.text();
      console.error('BACKEND: Proxy error:', errorMsg);
      return res.status(response.status).json({ error: `Webhook failed: ${errorMsg}` });
    }

    const resultData = await response.json();
    console.log('BACKEND: External backend data:', resultData);

    // Clean up all temp files
    for (const file of fileArr) {
      await fsPromises.unlink(file.filepath).catch((err) =>
        console.error('BACKEND: Cleanup error:', err)
      );
    }

    // Return response (array of results, one per file)
    return res.status(200).json(resultData);
  } catch (err) {
    console.error('BACKEND: Error processing request:', err);
    return res.status(500).json({ error: 'Something went wrong', debug: { error: err.message } });
  }
}



// import { IncomingForm } from 'formidable';
// import { promises as fsPromises } from 'fs';
// import * as fs from 'fs';
// import FormData from 'form-data';
// import fetch from 'node-fetch';

// // Disable body parsing for multipart/form-data
// export const config = {
//   api: { bodyParser: false },
// };

// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     console.log('BACKEND: Method not allowed', req.method);
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   console.log('BACKEND: Parsing form at', new Date().toISOString());

//   // Wrap form.parse in a Promise
//   const parseForm = () =>
//     new Promise((resolve, reject) => {
//       const form = new IncomingForm({
//         keepExtensions: true,
//         uploadDir: require('os').tmpdir(),
//         multiples: false,
//       });
//       form.parse(req, (err, fields, files) => {
//         if (err) return reject(err);
//         resolve({ fields, files });
//       });
//     });

//   try {
//     // Parse the uploaded file
//     const { fields, files } = await parseForm();
//     console.log('BACKEND: Parsed fields:', fields);
//     console.log('BACKEND: Parsed files:', files);

//     let file = files.file;
//     if (Array.isArray(file)) file = file[0];
//     if (!file || !file.filepath) {
//       console.warn('BACKEND: No valid file received', { files, fields });
//       return res.status(400).json({
//         error: 'No file uploaded.',
//         debug: { files: Object.keys(files), fields: Object.keys(fields) },
//       });
//     }

//     console.log('BACKEND: File details:', {
//       filepath: file.filepath,
//       originalFilename: file.originalFilename,
//       newFilename: file.newFilename,
//       mimetype: file.mimetype,
//       size: file.size,
//     });

//     // Verify file accessibility
//     try {
//       await fsPromises.access(file.filepath);
//       console.log('BACKEND: File is accessible at', file.filepath);
//     } catch (err) {
//       console.error('BACKEND: File access error:', err);
//       return res.status(500).json({ error: 'File not accessible', debug: { filepath: file.filepath } });
//     }

//     // Create FormData for proxying to mimic Postman
//     const proxyForm = new FormData();
//     const stream = fs.createReadStream(file.filepath);
//     stream.on('error', (err) => console.error('BACKEND: Stream error:', err));
//     stream.on('open', () => console.log('BACKEND: Stream opened for', file.filepath));

//     // Try 'file' field first, as per Postman
//     proxyForm.append('file', stream, {
//       filename: file.originalFilename || file.newFilename,
//       contentType: file.mimetype,
//     });

//     console.log('BACKEND: Proxy headers:', proxyForm.getHeaders());
//     console.log('BACKEND: Proxying to external backend at', new Date().toISOString());

//     // Proxy to external backend
//     let response = await fetch(
//       'https://upload-bill-592102073404.us-central1.run.app/api/upload-bill',
//       {
//         method: 'POST',
//         body: proxyForm,
//         headers: proxyForm.getHeaders(),
//       }
//     );

//     // If 'file' fails, try 'upload' field
//     if (!response.ok) {
//       const errorData = await response.json();
//       if (errorData.error === 'No file uploaded.') {
//         console.log('BACKEND: Retrying with "upload" field');
//         const retryForm = new FormData();
//         const retryStream = fs.createReadStream(file.filepath);
//         retryForm.append('upload', retryStream, {
//           filename: file.originalFilename || file.newFilename,
//           contentType: file.mimetype,
//         });

//         response = await fetch(
//           'https://upload-bill-592102073404.us-central1.run.app/api/upload-bill',
//           {
//             method: 'POST',
//             body: retryForm,
//             headers: retryForm.getHeaders(),
//           }
//         );
//       }
//     }

//     if (!response.ok) {
//       const errorMsg = await response.text();
//       console.error('BACKEND: Proxy error:', errorMsg);
//       return res.status(response.status).json({ error: `Webhook failed: ${errorMsg}` });
//     }

//     const resultData = await response.json();
//     console.log('BACKEND: External backend data:', resultData);

//     // Clean up temporary file
//     await fsPromises.unlink(file.filepath).catch((err) => console.error('BACKEND: Cleanup error:', err));

//     // Return response in a consistent format
//     return res.status(200).json(resultData);
//   } catch (err) {
//     console.error('BACKEND: Error processing request:', err);
//     return res.status(500).json({ error: 'Something went wrong', debug: { error: err.message } });
//   }
// }