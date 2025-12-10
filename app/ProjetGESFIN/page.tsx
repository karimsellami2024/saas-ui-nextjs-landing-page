// components/postes/fraisExploit/OperatingExpensesGHGCalculator.tsx
"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Icon,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
  NumberInput,
  NumberInputField,
  CloseButton,
  Divider,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import { useDropzone } from "react-dropzone";
import { FiUploadCloud, FiFileText } from "react-icons/fi";

type ExpenseKey =
  | "location_installations"
  | "reparation_entretien"
  | "fournitures_bureau"
  | "informatiques_logiciels"
  | "services_publics"
  | "assurance"
  | "frais_bancaires"
  | "frais_postaux"
  | "marketing"
  | "salaires_admin"
  | "repas_divertissement"
  | "services_conseils"
  | "deplacements";

type ExpenseCategory = {
  key: ExpenseKey;
  label: string;
  factorKgPerDollar: number; // kg CO2e / $ dépensé
};

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    key: "location_installations",
    label: "Frais de location des installations",
    factorKgPerDollar: 0.3115,
  },
  {
    key: "reparation_entretien",
    label: "Réparation et entretien généraux",
    factorKgPerDollar: 0.2242,
  },
  {
    key: "fournitures_bureau",
    label: "Fournitures de bureau",
    factorKgPerDollar: 0.332,
  },
  {
    key: "informatiques_logiciels",
    label: "Informatiques et logiciels",
    factorKgPerDollar: 0.3161,
  },
  {
    key: "services_publics",
    label: "Services publics",
    factorKgPerDollar: 0.1336,
  },
  { key: "assurance", label: "Assurance", factorKgPerDollar: 0.0435 },
  {
    key: "frais_bancaires",
    label: "Frais bancaires",
    factorKgPerDollar: 0.0525,
  },
  {
    key: "frais_postaux",
    label: "Frais postaux",
    factorKgPerDollar: 0.1847,
  },
  { key: "marketing", label: "Marketing", factorKgPerDollar: 0.091 },
  {
    key: "salaires_admin",
    label:
      "Salaires et avantages sociaux du personnel administratif",
    factorKgPerDollar: 0.1356,
  },
  {
    key: "repas_divertissement",
    label: "Repas et divertissement",
    factorKgPerDollar: 0.11,
  },
  {
    key: "services_conseils",
    label: "Services-conseils et professionnels",
    factorKgPerDollar: 0.1014,
  },
  { key: "deplacements", label: "Déplacements", factorKgPerDollar: 0.4528 },
];

type FileWithId = File & { id: string };

// Shape of backend response item
type BackendItem = {
  filename?: string;
  result?: {
    currency?: string;
    categories?: Record<string, number>;
    error?: string;
  };
  error?: string;
};

const OperatingExpensesGHGCalculator: React.FC = () => {
  const [files, setFiles] = useState<FileWithId[]>([]);
  const [amounts, setAmounts] = useState<Record<ExpenseKey, number>>({
    location_installations: 0,
    reparation_entretien: 0,
    fournitures_bureau: 0,
    informatiques_logiciels: 0,
    services_publics: 0,
    assurance: 0,
    frais_bancaires: 0,
    frais_postaux: 0,
    marketing: 0,
    salaires_admin: 0,
    repas_divertissement: 0,
    services_conseils: 0,
    deplacements: 0,
  });

  const [currency, setCurrency] = useState<string>("CAD");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // === Call backend to analyze files ===
  const uploadAndAnalyze = useCallback(async (newFiles: FileWithId[]) => {
    if (!newFiles.length) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      newFiles.forEach((file) => {
        formData.append("file", file);
      });

      const res = await fetch("/api/upload-bilan-ges", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data: BackendItem[] = await res.json();

      // Aggregate categories from all files
      const aggregated: Record<string, number> = {};

      for (const item of data) {
        if (item.error) {
          console.error(
            "Bilan backend error for file (top-level error):",
            item.filename,
            item.error
          );
          continue;
        }

        const result = item.result;
        if (!result) continue;

        if (result.error) {
          console.error(
            "Bilan backend error inside result:",
            item.filename,
            result.error
          );
        }

        if (result.currency) {
          setCurrency(result.currency);
        }

        if (result.categories) {
          for (const [key, value] of Object.entries(result.categories)) {
            const numericVal = Number(value) || 0;
            if (!aggregated[key]) aggregated[key] = 0;
            aggregated[key] += numericVal;
          }
        }
      }

      setAmounts((prev) => {
        const updated = { ...prev };
        for (const [key, value] of Object.entries(aggregated)) {
          if (key in updated) {
            updated[key as ExpenseKey] = value;
          }
        }
        return updated;
      });
    } catch (err: any) {
      console.error("Upload / analyse bilan error:", err);
      setUploadError(
        err?.message || "Une erreur est survenue pendant l’analyse."
      );
    } finally {
      setIsUploading(false);
    }
  }, []);

  // === Dropzone (PDFs) ===
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const withId: FileWithId[] = acceptedFiles.map((file) =>
        Object.assign(file, {
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
            .toString(36)
            .slice(2)}`,
        })
      );

      setFiles((prev) => [...prev, ...withId]);

      // Trigger backend analysis immediately for the newly added files
      uploadAndAnalyze(withId);
    },
    [uploadAndAnalyze]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    isFocused,
  } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      // si ton backend ne gère plus les images, enlève-les ici
      // "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    multiple: true,
  });

  const borderColor = useColorModeValue("gray.300", "gray.600");
  const activeBorderColor = useColorModeValue("blue.400", "blue.300");
  const rejectBorderColor = useColorModeValue("red.400", "red.300");
  const bgDrop = useColorModeValue("gray.50", "gray.800");

  // === Calculations ===
  const perCategory = useMemo(
    () =>
      EXPENSE_CATEGORIES.map((cat) => {
        const amount = amounts[cat.key] || 0;
        const kg = amount * cat.factorKgPerDollar;
        const tonnes = kg / 1000;
        return { ...cat, amount, kg, tonnes };
      }),
    [amounts]
  );

  const totals = useMemo(() => {
    const totalAmount = perCategory.reduce((sum, c) => sum + c.amount, 0);
    const totalKg = perCategory.reduce((sum, c) => sum + c.kg, 0);
    return {
      totalAmount,
      totalKg,
      totalTonnes: totalKg / 1000,
    };
  }, [perCategory]);

  const handleAmountChange = (key: ExpenseKey, valueStr: string) => {
    const value = parseFloat(valueStr.replace(",", "."));
    setAmounts((prev) => ({
      ...prev,
      [key]: isNaN(value) ? 0 : value,
    }));
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    // Optionnel: tu pourrais recalculer en excluant ce fichier
  };

  const getFileBadge = () => {
    if (isUploading) {
      return { label: "Analyse en cours…", colorScheme: "yellow" as const };
    }
    if (uploadError) {
      return { label: "Erreur d’analyse", colorScheme: "red" as const };
    }
    if (files.length > 0) {
      return { label: "Analysé", colorScheme: "green" as const };
    }
    return { label: "En attente", colorScheme: "gray" as const };
  };

  const fileBadge = getFileBadge();

  return (
    <VStack align="stretch" spacing={6}>
      <Heading size="md">Frais d’exploitation – Calcul automatisé des GES</Heading>

      {/* Upload / Drop zone */}
      <Box>
        <Text fontWeight="semibold" mb={2}>
          1. Importer vos bilans financiers (PDF)
        </Text>
        <Box
          {...getRootProps()}
          borderWidth="2px"
          borderStyle="dashed"
          borderRadius="xl"
          px={6}
          py={10}
          textAlign="center"
          cursor="pointer"
          bg={bgDrop}
          borderColor={
            isDragReject
              ? rejectBorderColor
              : isDragActive || isFocused
              ? activeBorderColor
              : borderColor
          }
          transition="all 0.2s"
        >
          <input {...getInputProps()} />
          <VStack spacing={3}>
            <Icon as={FiUploadCloud} boxSize={10} />
            {isDragActive ? (
              <Text>Déposez les fichiers ici…</Text>
            ) : (
              <Text>
                Glissez-déposez vos PDF ici, ou{" "}
                <Text as="span" fontWeight="bold">
                  cliquez pour sélectionner
                </Text>
                .
              </Text>
            )}
            <Text fontSize="sm" color="gray.500">
              Format accepté : PDF (avec texte extrait automatiquement)
            </Text>
          </VStack>
        </Box>

        {/* Uploaded files list */}
        {files.length > 0 && (
          <Box mt={4}>
            <Text fontWeight="medium" mb={1}>
              Fichiers importés ({files.length})
            </Text>
            <VStack align="stretch" spacing={2}>
              {files.map((file) => (
                <HStack
                  key={file.id}
                  justify="space-between"
                  borderWidth="1px"
                  borderRadius="md"
                  px={3}
                  py={2}
                >
                  <HStack spacing={3}>
                    <Icon as={FiFileText} />
                    <Box>
                      <Text fontSize="sm" noOfLines={1}>
                        {file.name}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {(file.size / 1024).toFixed(1)} Ko
                      </Text>
                    </Box>
                  </HStack>
                  <HStack>
                    {isUploading && <Spinner size="xs" />}
                    <Badge
                      fontSize="0.7rem"
                      colorScheme={fileBadge.colorScheme}
                    >
                      {fileBadge.label}
                    </Badge>
                    <CloseButton
                      size="sm"
                      onClick={() => removeFile(file.id)}
                    />
                  </HStack>
                </HStack>
              ))}
            </VStack>
            {uploadError && (
              <Text mt={2} fontSize="sm" color="red.500">
                {uploadError}
              </Text>
            )}
          </Box>
        )}
      </Box>

      <Divider />

      {/* Manual / auto-filled amounts + results */}
      <Box>
        <Text fontWeight="semibold" mb={2}>
          2. Saisir ou vérifier les montants par catégorie
        </Text>
        <Text fontSize="sm" color="gray.600" mb={3}>
          Chaque dollar ({currency}) est converti en kg CO₂e à partir des
          facteurs d’émission (kg CO₂e / $ dépensé) selon votre tableau de
          frais d’exploitation.
        </Text>

        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Catégorie de frais</Th>
              <Th isNumeric>Montant ({currency})</Th>
              <Th isNumeric>Facteur (kg CO₂e / $)</Th>
              <Th isNumeric>Émissions (kg CO₂e)</Th>
              <Th isNumeric>Émissions (t CO₂e)</Th>
            </Tr>
          </Thead>
          <Tbody>
            {perCategory.map((cat) => (
              <Tr key={cat.key}>
                <Td maxW="260px">
                  <Text fontSize="sm">{cat.label}</Text>
                </Td>
                <Td isNumeric>
                  <NumberInput
                    size="sm"
                    value={cat.amount === 0 ? "" : cat.amount}
                    onChange={(value) => handleAmountChange(cat.key, value)}
                    min={0}
                    precision={2}
                  >
                    <NumberInputField textAlign="right" placeholder="0,00" />
                  </NumberInput>
                </Td>
                <Td isNumeric>
                  <Text>{cat.factorKgPerDollar.toFixed(4)}</Text>
                </Td>
                <Td isNumeric>
                  <Text>{cat.kg === 0 ? "-" : cat.kg.toFixed(2)}</Text>
                </Td>
                <Td isNumeric>
                  <Text>{cat.tonnes === 0 ? "-" : cat.tonnes.toFixed(4)}</Text>
                </Td>
              </Tr>
            ))}
            {/* Totals */}
            <Tr fontWeight="bold">
              <Td>Total</Td>
              <Td isNumeric>{totals.totalAmount.toFixed(2)}</Td>
              <Td />
              <Td isNumeric>{totals.totalKg.toFixed(2)}</Td>
              <Td isNumeric>{totals.totalTonnes.toFixed(4)}</Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>

      {/* Summary card */}
      <Flex
        mt={4}
        p={4}
        borderWidth="1px"
        borderRadius="lg"
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        gap={3}
      >
        <Box>
          <Text fontWeight="semibold">
            Résultat global – Frais d’exploitation
          </Text>
          <Text fontSize="sm" color="gray.600">
            Basé uniquement sur les postes de frais d’exploitation couverts par
            la table de facteurs d’émission.
          </Text>
        </Box>
        <HStack spacing={6}>
          <Box textAlign="right">
            <Text fontSize="xs" color="gray.500">
              Montant total analysé
            </Text>
            <Text fontWeight="bold">
              {totals.totalAmount.toFixed(2)} {currency}
            </Text>
          </Box>
          <Box textAlign="right">
            <Text fontSize="xs" color="gray.500">
              Émissions totales
            </Text>
            <Text fontWeight="bold">
              {totals.totalKg.toFixed(1)} kg CO₂e (
              {totals.totalTonnes.toFixed(3)} t CO₂e)
            </Text>
          </Box>
        </HStack>
      </Flex>
    </VStack>
  );
};

export default OperatingExpensesGHGCalculator;
