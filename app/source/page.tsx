'use client';

import React from "react";
import {
  Box, Stack, HStack, VStack, Grid, GridItem,
  Heading, Text, Button, Tag, Icon, Input
} from "@chakra-ui/react";
import {
  Paperclip, Trash2, Copy, Plus, HelpCircle, Lock, Calendar
} from "lucide-react";

/** Palette */
const COL = {
  bg: "#f3f5f2",
  surface: "#ffffff",
  surfaceMuted: "#edf1ec",
  section: "#f7f9f6",
  border: "rgba(0,0,0,0.08)",
  greenBar: "#1f3f33",
  greenPill: "#2f5b47",
  textMuted: "#647067",
  textBody: "#2d332f",
  inputBorder: "#E8ECE7",
  faintLine: "rgba(0,0,0,0.12)",
};

export default function Mobiles2Screenshot() {
  const cardShadow = "0 8px 24px rgba(0,0,0,0.08)";

  return (
    <Box bg={COL.bg} minH="100vh" px={{ base: 4, md: 8 }} py={{ base: 6, md: 10 }} color={COL.textBody}>
      <Stack maxW="1200px" mx="auto" spacing={6}>
        {/* Title + help */}
        <HStack justify="space-between" align="center">
          <Heading as="h1" size="lg">Émissions directes</Heading>
          <Icon as={HelpCircle} boxSize={4} />
        </HStack>

        {/* Tabs (kept as previously) */}
        <HStack mt={2} spacing={4}>
          {[
            { title: "Combustions fixes", active: false },
            { title: "Combustions mobiles", active: true },
            { title: "Procédés", active: false },
            { title: "Réfrigérants", active: false },
            { title: "Sols et forêts", active: false },
          ].map(tab => (
            <Box
              key={tab.title}
              as="button"
              px={4}
              h="32px"
              rounded="16px"
              border="1px solid"
              borderColor={tab.active ? COL.greenPill : "#DAD7CD"}
              bg={tab.active ? COL.greenPill : "white"}
              color={tab.active ? "white" : COL.textBody}
              fontWeight={tab.active ? "bold" : "normal"}
              fontSize="sm"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              _hover={!tab.active ? { borderColor: COL.greenPill, color: COL.textBody } : {}}
            >
              {tab.title}
            </Box>
          ))}
        </HStack>

        {/* Intro + right stat card */}
        <HStack align="stretch" spacing={6}>
          <Box
            flex="1"
            bg={COL.surface}
            rounded="2xl"
            p={{ base: 5, md: 6 }}
            border="1px solid"
            borderColor={COL.border}
            boxShadow={cardShadow}
          >
            <VStack align="flex-start" spacing={2}>
              <Heading as="h2" size="md">Vos combustions mobiles</Heading>
              <Text color={COL.textMuted}>
                Ici, vous pouvez entrer vos véhicules et équipements mobiles pour mesurer l’impact
                de leurs déplacements et de leur utilisation. Qu’il s’agisse de <b>voitures, camions,
                camionnettes, équipements de levage, bateaux</b> ou <b>autres</b> fonctionnant au combustible
                fossile, la plateforme calcule pour vous les émissions correspondantes.
              </Text>
            </VStack>
          </Box>

          {/* RIGHT CARD — as in your last design */}
          <Box
            w={{ base: "100%", md: "380px" }}
            bg={COL.surfaceMuted}
            rounded="2xl"
            p={{ base: 6, md: 7 }}
            border="1px solid"
            borderColor={COL.border}
            boxShadow={cardShadow}
          >
            <VStack spacing={4} align="stretch">
              <Heading as="h3" size="sm" color={COL.textBody}>Votre consommation totale :</Heading>
              <Heading as="p" size="lg" lineHeight="1.1" color={COL.greenBar}>
                10,257 t de CO²eq
              </Heading>
              <HStack
                alignSelf="flex-start"
                bg="white"
                rounded="full"
                px={5}
                h="40px"
                spacing={3}
                boxShadow="0 8px 16px rgba(0,0,0,0.15)"
                border="1px solid"
                borderColor="rgba(0,0,0,0.06)"
              >
                <Text fontWeight="semibold" color={COL.textMuted}>Section en cours</Text>
                <Box
                  as="span"
                  w="22px"
                  h="22px"
                  rounded="full"
                  bg="#e7ebe6"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="xs"
                  color={COL.textMuted}
                >
                  x
                </Box>
              </HStack>
            </VStack>
          </Box>
        </HStack>

        {/* ===== 2A1 (with new row design) ===== */}
        <SectionHeader
          title="2A1 – Véhicules (Quantité de combustible utilisé)"
          buttonLabel="Ajouter un document"
        />
        <DataTable
          columns={["Véhicule", "Nom du site", "Type de véhicule", "Quantité", "Référence", "Date"]}
        >
          <DataRowVehicleV2
            vehicle="2023 - Ford F150"
            site="Usine - 542 blvd. Ar"
            type="Camion léger"
            qty="343 L"
            reference="-"
            date="14 août 2025"
            result="0,793 t de CO²e"
          />
          <TemplateRowV2 />
        </DataTable>

        {/* ===== 2A3 (same styling) ===== */}
        <SectionHeader
          title="2A3 – Véhicules (Distance parcourue ; L/100km)"
          buttonLabel="Ajouter un document"
          mt={6}
        />
        <DataTable
          columns={["Véhicule", "Nom du site", "Type de véhicule", "Distance", "Référence", "Date"]}
        >
          <DataRowVehicleV2
            vehicle="2015 - Mazda CX-5"
            site="Usine - 542 blvd. Ar"
            type="Voiture légère"
            qty="11606 km"
            reference="-"
            date="08 sept. 2025"
            result="4,831 t de CO²e"
          />
          <TemplateRowV2 />
        </DataTable>
      </Stack>
    </Box>
  );
}

/* ---------------------- building blocks ---------------------- */

function SectionHeader({ title, buttonLabel, mt = 2 }: { title: string; buttonLabel: string; mt?: number }) {
  return (
    <HStack justify="space-between" mt={mt}>
      <Heading as="h3" size="md">{title}</Heading>
      <Button
        leftIcon={<Icon as={Plus} boxSize={4} />}
        bg={COL.greenBar}
        color="white"
        rounded="full"
        px={6}
        h="48px"
        boxShadow="0 10px 16px rgba(0,0,0,0.20)"
        _hover={{ bg: "#20372d" }}
        _active={{ bg: "#1a2f27" }}
      >
        {buttonLabel}
      </Button>
    </HStack>
  );
}

/** Table container with rounded green header */
function DataTable({
  columns,
  children,
}: {
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <Box bg={COL.surface} rounded="2xl" border="1px solid" borderColor={COL.border} overflow="hidden">
      <Grid
        templateColumns="2fr 1.4fr 1.6fr 1fr 1fr 1.2fr 96px"
        bg={COL.greenBar}
        color="white"
        fontWeight={600}
        fontSize="sm"
        alignItems="center"
        px={4}
        py={3}
        gap={3}
        // rounded top to match pill header
        borderTopLeftRadius="16px"
        borderTopRightRadius="16px"
      >
        {columns.map((c, i) => (
          <GridItem key={i}>{c}</GridItem>
        ))}
        <GridItem textAlign="right">Actions</GridItem>
      </Grid>

      <Stack spacing={0}>{children}</Stack>
    </Box>
  );
}

/** NEW row design */
function DataRowVehicleV2({
  vehicle, site, type, qty, reference, date, result,
}: {
  vehicle: string; site: string; type: string; qty: string; reference: string; date: string; result: string;
}) {
  return (
    <Box bg="#f6f8f6" px={3} pt={3}>
      {/* Main inputs row */}
      <Grid
        templateColumns="2fr 1.4fr 1.6fr 1fr 1fr 1.2fr 96px"
        alignItems="center"
        gap={3}
        px={1}
      >
        <GridItem><PillSelect value={vehicle} /></GridItem>
        <GridItem><PillSelect value={site} /></GridItem>
        <GridItem><PillSelect value={type} /></GridItem>
        <GridItem><PillInput value={qty} /></GridItem>
        <GridItem><PillInput value={reference} /></GridItem>
        <GridItem><PillDate value={date} /></GridItem>
        <GridItem>
          <HStack spacing={2} justify="flex-end" pr={1}>
            <MiniIconBtn icon={Lock} ariaLabel="Verrouiller" />
            <MiniIconBtn icon={Copy} ariaLabel="Dupliquer" />
            <MiniIconBtn icon={Trash2} ariaLabel="Supprimer" />
          </HStack>
        </GridItem>
      </Grid>

      {/* Comments + result/right icons */}
      <HStack spacing={3} align="center" px={1} py={3}>
        <PillInput placeholder="Commentaires" full />
        <HStack ml="auto" spacing={3} color={COL.textMuted} fontSize="sm">
          <Text>{result}</Text>
        </HStack>
      </HStack>

      {/* faint bottom divider */}
      <Box h="2px" bg={COL.faintLine} mx={2} rounded="full" />
    </Box>
  );
}

/** Template row (faded/inactive) */
function TemplateRowV2() {
  return (
    <Box bg="#f6f8f6" px={3} pt={3} opacity={0.4}>
      <Grid templateColumns="2fr 1.4fr 1.6fr 1fr 1fr 1.2fr 96px" alignItems="center" gap={3} px={1}>
        <GridItem><PillPlaceholder label="Véhicule" /></GridItem>
        <GridItem><PillPlaceholder label="Nom du site" /></GridItem>
        <GridItem><PillPlaceholder label="Type de véhicule" /></GridItem>
        <GridItem><PillPlaceholder label="Qté / Distance" /></GridItem>
        <GridItem><PillPlaceholder label="Réf" /></GridItem>
        <GridItem><PillPlaceholder label="Date" /></GridItem>
        <GridItem>
          <HStack spacing={2} justify="flex-end" pr={1}>
            <MiniIconBtn icon={Lock} ariaLabel="Verrouiller" />
            <MiniIconBtn icon={Copy} ariaLabel="Dupliquer" />
            <MiniIconBtn icon={Trash2} ariaLabel="Supprimer" />
          </HStack>
        </GridItem>
      </Grid>
      <HStack spacing={3} align="center" px={1} py={3}>
        <PillPlaceholder label="Commentaires" full />
      </HStack>
      <Box h="2px" bg={COL.faintLine} mx={2} rounded="full" />
    </Box>
  );
}

/* --------- pill controls used in the row ---------- */

function PillSelect({ value }: { value: string }) {
  return (
    <HStack
      justify="space-between"
      bg="white"
      border="1px solid"
      borderColor={COL.inputBorder}
      rounded="xl"
      px={4}
      h="36px"
      boxShadow="0 2px 4px rgba(0,0,0,0.06)"
      fontSize="sm"
    >
      <Text noOfLines={1}>{value}</Text>
      <Box as="span" aria-hidden>▾</Box>
    </HStack>
  );
}

function PillInput({ value, placeholder, full = false }: { value?: string; placeholder?: string; full?: boolean }) {
  return (
    <Box
      as="div"
      bg="white"
      border="1px solid"
      borderColor={COL.inputBorder}
      rounded="xl"
      px={4}
      h="36px"
      boxShadow="0 2px 4px rgba(0,0,0,0.06)"
      fontSize="sm"
      display="flex"
      alignItems="center"
      flex={full ? 1 : "initial"}
    >
      {value ?? <Text color={COL.textMuted}>{placeholder}</Text>}
    </Box>
  );
}

function PillDate({ value }: { value: string }) {
  return (
    <HStack
      bg="white"
      border="1px solid"
      borderColor={COL.inputBorder}
      rounded="xl"
      px={4}
      h="36px"
      boxShadow="0 2px 4px rgba(0,0,0,0.06)"
      fontSize="sm"
      justify="space-between"
    >
      <Text>{value}</Text>
      <Icon as={Calendar} boxSize={4} color={COL.textMuted} />
    </HStack>
  );
}

function PillPlaceholder({ label, full = false }: { label: string; full?: boolean }) {
  return (
    <Box
      bg="white"
      border="1px dashed"
      borderColor={COL.inputBorder}
      rounded="xl"
      px={4}
      h="36px"
      boxShadow="0 2px 4px rgba(0,0,0,0.06)"
      fontSize="sm"
      color={COL.textMuted}
      display="flex"
      alignItems="center"
      flex={full ? 1 : "initial"}
    >
      {label}
    </Box>
  );
}

/* -------- tiny icon button used on the right -------- */

function MiniIconBtn({ icon, ariaLabel }: { icon: any; ariaLabel: string }) {
  return (
    <Box
      as="button"
      aria-label={ariaLabel}
      p="6px"
      rounded="md"
      color={COL.textMuted}
      _hover={{ bg: "#eef2ee" }}
      border="1px solid"
      borderColor="transparent"
    >
      <Icon as={icon} boxSize={4} />
    </Box>
  );
}
