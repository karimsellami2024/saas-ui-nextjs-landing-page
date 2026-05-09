"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react";

const P = {
  brand: "#344E41", accent: "#588157", light: "#A3B18A",
  soft: "#DDE5E0", bg: "#F5F6F4", muted: "#6B7A72", white: "#FFFFFF", dark: "#1B2E25",
};

const PROVINCES = [
  "Québec", "Ontario", "Alberta", "Colombie-Britannique", "Manitoba",
  "Saskatchewan", "Nouvelle-Écosse", "Nouveau-Brunswick",
  "Île-du-Prince-Édouard", "Terre-Neuve-et-Labrador",
  "Nunavut", "Territoires du Nord-Ouest", "Yukon",
];

const BILL_TYPES = [
  { value: "electricity", label: "Électricité" },
  { value: "natural_gas", label: "Gaz naturel" },
  { value: "fuel",        label: "Carburant" },
];

const FUEL_TYPES = [
  { value: "diesel",  label: "Diesel" },
  { value: "essence", label: "Essence" },
  { value: "propane", label: "Propane" },
  { value: "mazout",  label: "Mazout" },
];

export interface QueuedFile {
  file: File;
  id:   string;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
}

export interface BatchConfig {
  bill_type: string;
  province:  string;
  fuel_type: string;
}

interface BatchUploaderProps {
  queue:     QueuedFile[];
  config:    BatchConfig;
  onQueue:   (files: File[]) => void;
  onRemove:  (id: string) => void;
  onConfig:  (c: Partial<BatchConfig>) => void;
  onStart:   () => void;
  loading:   boolean;
}

export default function BatchUploader({
  queue, config, onQueue, onRemove, onConfig, onStart, loading,
}: BatchUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    const valid = Array.from(fileList).filter(f => allowed.includes(f.type));
    if (valid.length < fileList.length) alert("Certains fichiers ont été ignorés (PDF, JPG, PNG uniquement).");
    if (valid.length > 0) onQueue(valid);
  }, [onQueue]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (!loading) addFiles(e.dataTransfer.files);
  };

  const canStart = queue.length > 0 && config.bill_type && config.province &&
    (config.bill_type !== "fuel" || config.fuel_type) &&
    !loading;

  const pendingCount   = queue.filter(q => q.status === "pending").length;
  const processingCount = queue.filter(q => q.status === "processing").length;
  const doneCount      = queue.filter(q => q.status === "done").length;
  const errorCount     = queue.filter(q => q.status === "error").length;

  return (
    <VStack align="stretch" spacing={4}>
      {/* Config selectors */}
      <Flex gap={3} flexWrap="wrap">
        <Box flex={1} minW="160px">
          <Text fontSize="xs" fontWeight="semibold" color={P.muted} mb={1}>Type de facture</Text>
          <Select
            size="sm" borderRadius="lg" borderColor={P.light}
            value={config.bill_type}
            onChange={e => onConfig({ bill_type: e.target.value })}
            isDisabled={loading}
          >
            <option value="">-- Sélectionner --</option>
            {BILL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Box>

        <Box flex={1} minW="180px">
          <Text fontSize="xs" fontWeight="semibold" color={P.muted} mb={1}>Province</Text>
          <Select
            size="sm" borderRadius="lg" borderColor={P.light}
            value={config.province}
            onChange={e => onConfig({ province: e.target.value })}
            isDisabled={loading}
          >
            <option value="">-- Sélectionner --</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Box>

        {config.bill_type === "fuel" && (
          <Box flex={1} minW="140px">
            <Text fontSize="xs" fontWeight="semibold" color={P.muted} mb={1}>Type de carburant</Text>
            <Select
              size="sm" borderRadius="lg" borderColor={P.light}
              value={config.fuel_type}
              onChange={e => onConfig({ fuel_type: e.target.value })}
              isDisabled={loading}
            >
              <option value="">-- Sélectionner --</option>
              {FUEL_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </Box>
        )}
      </Flex>

      {/* Drop zone */}
      <Box
        border="2px dashed"
        borderColor={dragging ? P.accent : P.light}
        borderRadius="xl"
        bg={dragging ? "#EDF5ED" : P.bg}
        p={6} textAlign="center"
        cursor={loading ? "not-allowed" : "pointer"}
        opacity={loading ? 0.5 : 1}
        transition="all 0.2s"
        _hover={{ borderColor: loading ? P.light : P.accent, bg: loading ? P.bg : "#EDF5ED" }}
        onDragOver={e => { e.preventDefault(); if (!loading) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => { if (!loading) inputRef.current?.click(); }}
      >
        <Input
          ref={inputRef} type="file" display="none"
          accept=".pdf,.jpg,.jpeg,.png" multiple
          onChange={e => { addFiles(e.target.files); e.target.value = ""; }}
        />
        <Text fontSize="2xl">📂</Text>
        <Text fontWeight="semibold" color={P.brand} mt={1}>
          Glissez vos factures ici
        </Text>
        <Text fontSize="sm" color={P.muted}>ou cliquez pour sélectionner plusieurs fichiers</Text>
        <Text fontSize="xs" color={P.light} mt={1}>PDF, JPG, PNG — sélection multiple</Text>
      </Box>

      {/* File queue */}
      {queue.length > 0 && (
        <VStack align="stretch" spacing={1} maxH="220px" overflowY="auto"
          borderWidth="1px" borderColor={P.soft} borderRadius="lg" p={2} bg={P.white}>
          {queue.map(item => (
            <HStack key={item.id} px={2} py={1} borderRadius="md"
              bg={item.status === "done" ? "#EDF5ED" : item.status === "error" ? "#FFF0F0" : P.bg}
            >
              <Text fontSize="xs" flex={1} noOfLines={1} color={P.dark}>
                {item.status === "processing" ? "⏳" : item.status === "done" ? "✅" : item.status === "error" ? "❌" : "📄"}{" "}
                {item.file.name}
              </Text>
              <Badge
                size="xs" fontSize="0.6rem" borderRadius="full"
                colorScheme={item.status === "done" ? "green" : item.status === "error" ? "red" : item.status === "processing" ? "yellow" : "gray"}
              >
                {item.status === "pending" ? "En attente" : item.status === "processing" ? "Traitement…" : item.status === "done" ? "Terminé" : "Erreur"}
              </Badge>
              {item.status === "pending" && (
                <Button size="xs" variant="ghost" color={P.muted} px={1}
                  onClick={() => onRemove(item.id)} isDisabled={loading}>✕</Button>
              )}
            </HStack>
          ))}
        </VStack>
      )}

      {/* Progress summary */}
      {(processingCount > 0 || doneCount > 0) && (
        <HStack fontSize="xs" color={P.muted} spacing={3} flexWrap="wrap">
          {doneCount > 0     && <Text color="green.600">✅ {doneCount} terminé{doneCount > 1 ? "s" : ""}</Text>}
          {processingCount > 0 && <Text color="orange.500">⏳ {processingCount} en cours</Text>}
          {pendingCount > 0  && <Text>🕐 {pendingCount} en attente</Text>}
          {errorCount > 0    && <Text color="red.500">❌ {errorCount} erreur{errorCount > 1 ? "s" : ""}</Text>}
        </HStack>
      )}

      {/* Start button */}
      <Button
        bg={P.brand} color={P.white} borderRadius="lg"
        _hover={{ bg: P.accent }}
        isDisabled={!canStart}
        isLoading={loading}
        loadingText={`Traitement ${doneCount}/${queue.length}…`}
        onClick={onStart}
      >
        Analyser {queue.filter(q => q.status === "pending").length > 0
          ? `${queue.filter(q => q.status === "pending").length} facture${queue.filter(q => q.status === "pending").length > 1 ? "s" : ""}`
          : "les factures"}
      </Button>
    </VStack>
  );
}
