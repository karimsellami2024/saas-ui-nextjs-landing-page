"use client";

import React, { useCallback, useState } from "react";
import {
  Box,
  Text,
  VStack,
  Icon,
  Input,
} from "@chakra-ui/react";

interface BillUploaderProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function BillUploader({ onFileSelected, disabled }: BillUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (!allowed.includes(file.type)) {
        alert("Format non supporté. Veuillez utiliser PDF, JPG ou PNG.");
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <Box
      border="2px dashed"
      borderColor={dragging ? "#588157" : "#A3B18A"}
      borderRadius="xl"
      bg={dragging ? "#EDF5ED" : "#F5F6F4"}
      p={8}
      textAlign="center"
      cursor={disabled ? "not-allowed" : "pointer"}
      opacity={disabled ? 0.5 : 1}
      transition="all 0.2s"
      _hover={{ borderColor: disabled ? "#A3B18A" : "#588157", bg: disabled ? "#F5F6F4" : "#EDF5ED" }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => { if (!disabled) inputRef.current?.click(); }}
    >
      <Input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        display="none"
        onChange={onInputChange}
      />
      <VStack spacing={2}>
        <Text fontSize="2xl">📄</Text>
        <Text fontWeight="semibold" color="#344E41">
          Glissez votre facture ici
        </Text>
        <Text fontSize="sm" color="#6B7A72">
          ou cliquez pour sélectionner un fichier
        </Text>
        <Text fontSize="xs" color="#A3B18A">
          PDF, JPG, PNG acceptés
        </Text>
      </VStack>
    </Box>
  );
}
