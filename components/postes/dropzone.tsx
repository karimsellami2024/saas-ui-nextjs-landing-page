import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Button, Text, VStack, Spinner, Alert, AlertIcon } from '@chakra-ui/react';

export default function BillUploader() {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('DROPZONE acceptedFiles:', acceptedFiles);
    if (!acceptedFiles.length) {
      setError('No files dropped');
      return;
    }
    setUploading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    acceptedFiles.forEach(file => {
      formData.append('file', file); // send all files as "file"
      console.log('FORMDATA file:', { fileName: file.name, type: file.type, size: file.size });
    });

    try {
      const response = await fetch('/api/upload-bill', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('FETCH response JSON:', data);

      if (!response.ok) {
        setError(data.error || 'Upload failed');
      } else {
        setResults(Array.isArray(data) ? data : [data]);
      }
    } catch (err: any) {
      setError('Upload failed: ' + (err?.message || err));
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    multiple: true, // <---- MULTIPLE!
  });

  return (
    <VStack spacing={4} w="100%" maxW={520}>
      <Box
        {...getRootProps()}
        p={6}
        borderWidth={2}
        borderStyle="dashed"
        borderRadius="md"
        bg={isDragActive ? 'gray.100' : 'white'}
        textAlign="center"
        cursor="pointer"
        w="100%"
      >
        <input {...getInputProps()} />
        <Text>
          {isDragActive
            ? 'Drop the files here...'
            : 'Drag & drop one or more PDFs or images, or click to select'}
        </Text>
      </Box>
      {acceptedFiles.length > 0 && (
        <Box fontSize="sm" w="100%">
          <Text fontWeight="semibold">Files:</Text>
          <ul>
            {acceptedFiles.map(file => (
              <li key={file.name}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
            ))}
          </ul>
        </Box>
      )}
      {uploading && <Spinner />}
      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      {results && (
        <Box w="100%" textAlign="left">
          <Text fontWeight="semibold">Extracted Data:</Text>
          <pre style={{
            background: "#f7fafc",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "smaller",
            marginTop: "8px",
            overflowX: "auto"
          }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </Box>
      )}
      {(results || error) && (
        <Button size="sm" onClick={() => {
          setResults(null);
          setError(null);
        }}>
          Clear
        </Button>
      )}
    </VStack>
  );
}


// import { useCallback } from 'react';
// import { useDropzone } from 'react-dropzone';
// import { Box, Button, Text, VStack } from '@chakra-ui/react';

// export default function BillUploader() {
//   const onDrop = useCallback(async (acceptedFiles) => {
//     console.log('DROPZONE acceptedFiles:', acceptedFiles);
//     if (!acceptedFiles.length) {
//       console.warn('No files dropped');
//       return;
//     }

//     const file = acceptedFiles[0];
//     const formData = new FormData();
//     formData.append('file', file); // Matches backend's 'file' field
//     console.log('FORMDATA file:', { fileName: file.name, type: file.type, size: file.size });

//     try {
//       const response = await fetch('/api/upload-bill', {
//         method: 'POST',
//         body: formData,
//       });

//       const data = await response.json();
//       console.log('FETCH response JSON:', data);

//       if (!response.ok) {
//         throw new Error(data.error || 'Upload failed');
//       }

//       console.log('Upload successful:', data);
//     } catch (err) {
      
//     }
//   }, []);

//   const { getRootProps, getInputProps, isDragActive } = useDropzone({
//     onDrop,
//     accept: {
//       'application/pdf': ['.pdf'],
//       'image/*': ['.png', '.jpg', '.jpeg'],
//     },
//     maxFiles: 1,
//   });

//   return (
//     <VStack spacing={4}>
//       <Box
//         {...getRootProps()}
//         p={6}
//         borderWidth={2}
//         borderStyle="dashed"
//         borderRadius="md"
//         bg={isDragActive ? 'gray.100' : 'white'}
//         textAlign="center"
//         cursor="pointer"
//       >
//         <input {...getInputProps()} />
//         <Text>
//           {isDragActive ? 'Drop the file here...' : 'Drag & drop a PDF or image, or click to select'}
//         </Text>
//       </Box>
//       <Button colorScheme="blue" onClick={() => console.log('Manual upload trigger')}>
//         Upload File
//       </Button>
//     </VStack>
//   );
// }