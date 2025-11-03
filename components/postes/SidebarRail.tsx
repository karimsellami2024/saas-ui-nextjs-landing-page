'use client';

import React from "react";
import {
  Box, Flex, VStack, Text, Icon, Avatar, Tooltip, useBreakpointValue,
} from "@chakra-ui/react";
import {
  FiGrid,
  FiBarChart2,
  FiBatteryCharging,
  FiCode,
  FiPieChart,
  FiFileText,
  FiHelpCircle,
} from "react-icons/fi";

type GroupKey = "direct" | "energie" | "indirect";
type TopKey = "dashboard" | "bilan" | "rapport";

export type SidebarRailProps = {
  activeGroup: GroupKey | null;               // which group is currently shown
  activeTop?: TopKey;                         // dashboard / bilan / rapport
  onGroupChange: (g: GroupKey) => void;       // click Directe/Énergie/Indirecte
  onTopSelect?: (k: TopKey) => void;          // click Dashboard/Bilan/Rapport
};

const GREEN = "#264a3b";
const MUTED = "#F2F4F7";
const ICON  = "#6B7280";

export default function SidebarRail({
  activeGroup,
  activeTop = "dashboard",
  onGroupChange,
  onTopSelect,
}: SidebarRailProps) {
  const railW = useBreakpointValue({ base: "72px", md: "142px" });

  return (
    <Box
      as="nav"
      position="sticky"
      top={0}
      h="100vh"
      w={railW}
      boxShadow="0px 4px 6px 4px rgba(0,0,0,0.25)"
      bg="#FFFFFF"
    >
      <Flex direction="column" h="full" align="center" pt={8} pb={6}>
        {/* Profile */}
        <VStack spacing={3} mb={8}>
          <Avatar name="Carbone Québec" src="/avatar.png" size="lg" />
          <Text fontSize="sm" color="#8F8F8F" textAlign="center">
            Oct 2023 — Août 2024
          </Text>
        </VStack>

        {/* Primary */}
        <VStack spacing={4} w="full" px={4} mb={6}>
          <SidebarBlock>
            <SidebarItem
              icon={FiGrid}
              label="Tableau de bord"
              active={activeTop === "dashboard"}
              onClick={() => onTopSelect?.("dashboard")}
            />
          </SidebarBlock>

          <SidebarBlock>
            <SidebarMini
              icon={FiBarChart2}
              label="Directe"
              active={activeGroup === "direct"}
              onClick={() => onGroupChange("direct")}
            />
            <SidebarMini
              icon={FiBatteryCharging}
              label="Énergie"
              active={activeGroup === "energie"}
              onClick={() => onGroupChange("energie")}
            />
            <SidebarMini
              icon={FiCode}
              label="Indirecte"
              active={activeGroup === "indirect"}
              onClick={() => onGroupChange("indirect")}
            />
          </SidebarBlock>

          <SidebarBlock>
            <SidebarMini
              icon={FiPieChart}
              label="Bilan"
              active={activeTop === "bilan"}
              onClick={() => onTopSelect?.("bilan")}
            />
            <SidebarMini
              icon={FiFileText}
              label="Rapport"
              active={activeTop === "rapport"}
              onClick={() => onTopSelect?.("rapport")}
            />
          </SidebarBlock>
        </VStack>

        <Box mt="auto" />

        {/* Help button area (bottom) */}
        <VStack spacing={3}>
          <Tooltip label="Aide" placement="right">
            <Box as="button">
              <Icon as={FiHelpCircle} boxSize={7} color="#344E41" />
            </Box>
          </Tooltip>
          <Box h="4" />
        </VStack>
      </Flex>
    </Box>
  );
}

/* ---------- internal atoms ---------- */

function SidebarBlock({ children }: { children: React.ReactNode }) {
  return (
    <VStack bg={MUTED} w="full" p={2} spacing={2} rounded="xl">
      {children}
    </VStack>
  );
}

function SidebarItem({
  icon, label, active, onClick,
}: { icon: any; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Box
      as="button"
      onClick={onClick}
      w="full"
      px={3}
      py={2}
      rounded="lg"
      bg={active ? GREEN : "#fff"}
      color={active ? "#fff" : ICON}
      border="1px solid"
      borderColor={active ? GREEN : "#E5E7EB"}
      display="flex"
      flexDir="column"
      alignItems="center"
      gap={2}
      transition="all .15s"
      _hover={{ bg: active ? GREEN : "#F9FAFB" }}
    >
      <Icon as={icon} boxSize={5} />
      <Text fontSize="11px" textAlign="center">{label}</Text>
    </Box>
  );
}

function SidebarMini({
  icon, label, active, onClick,
}: { icon: any; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Box
      as="button"
      onClick={onClick}
      w="full"
      px={2.5}
      py={2}
      rounded="full"
      bg={active ? GREEN : "#fff"}
      color={active ? "#fff" : ICON}
      border="1px solid"
      borderColor={active ? GREEN : "#D1D5DB"}
      display="flex"
      flexDir="column"
      alignItems="center"
      gap={1}
      transition="all .15s"
      _hover={{ bg: active ? GREEN : "#F3F4F6" }}
    >
      <Icon as={icon} boxSize={4} />
      <Text fontSize="10px">{label}</Text>
    </Box>
  );
}
