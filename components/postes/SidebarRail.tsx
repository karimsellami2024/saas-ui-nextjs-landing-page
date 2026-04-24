'use client';

import React from "react";
import {
  Box, Flex, VStack, Text, Icon, Avatar, Tooltip, useBreakpointValue,
} from "@chakra-ui/react";
import {
  FiGrid, FiBarChart2, FiBatteryCharging, FiTruck,
  FiPackage, FiRepeat, FiMoreHorizontal, FiPieChart,
  FiFileText, FiHelpCircle, FiHome, FiCheckSquare,
} from "react-icons/fi";
import { useRouter } from "next/navigation";

/* ── Types ── */
type GroupKey =
  | "direct" | "energie_importee" | "transports"
  | "produits_utilises" | "utilisation_produits" | "autres_indirects";
type TopKey = "dashboard" | "bilan" | "rapport" | "wizard";

export type SidebarRailProps = {
  activeGroup: GroupKey | null;
  activeTop?: TopKey;
  onGroupChange: (g: GroupKey) => void;
  onTopSelect?: (k: TopKey) => void;
  onNotificationsClick?: () => void;
};

/* ── Tokens ── */
const GREEN = "#264a3b";
const MUTED = "#F2F4F7";
const ICON  = "#6B7280";

/* ── Component ── */
export default function SidebarRail({
  activeGroup,
  activeTop = "dashboard",
  onGroupChange,
  onTopSelect,
  onNotificationsClick,
}: SidebarRailProps) {
  const railW = useBreakpointValue({ base: "72px", md: "150px" });
  const router = useRouter();

  return (
    <Box
      as="nav"
      position="sticky"
      top={0}
      h="100vh"
      w={railW}
      boxShadow="0px 4px 6px 4px rgba(0,0,0,0.25)"
      bg="#FFFFFF"
      overflow="hidden"
    >
      <Flex direction="column" h="full" align="center">

        {/* ── TOP: Home button ── */}
        <Box w="full" px={3} pt={3} pb={2} borderBottom="1px solid #F2F4F7">
          <Tooltip label="Retour à l'accueil" placement="right">
            <Box
              as="button"
              onClick={() => router.push('/')}
              w="full"
              py={2}
              rounded="lg"
              display="flex"
              flexDir="column"
              alignItems="center"
              gap={1}
              color={ICON}
              _hover={{ bg: MUTED, color: GREEN }}
              transition="all .15s"
            >
              <Icon as={FiHome} boxSize={4} />
              <Text fontSize="10px" fontWeight={500}>Accueil</Text>
            </Box>
          </Tooltip>
        </Box>

        {/* ── Avatar + date ── */}
        <VStack spacing={1} py={3} borderBottom="1px solid #F2F4F7" w="full" align="center">
          <Tooltip label="Entreprise" placement="right">
            <Box
              as="button"
              onClick={onNotificationsClick}
              _hover={{ transform: "translateY(-1px)" }}
              transition="all 0.15s"
              rounded="full"
            >
              <Avatar name="Carbone Québec" src="/avatar.png" size="sm" />
            </Box>
          </Tooltip>
          <Text fontSize="9px" color="#8F8F8F" textAlign="center" lineHeight="1.3">
            Oct 2023<br />Août 2024
          </Text>
        </VStack>

        {/* ── Scrollable nav ── */}
        <VStack
          flex={1}
          overflowY="auto"
          overflowX="hidden"
          spacing={2}
          w="full"
          px={2}
          py={2}
          align="stretch"
          css={{ '&::-webkit-scrollbar': { width: '0px' } }}
        >
          {/* Dashboard */}
          <SidebarBlock>
            <SidebarItem
              icon={FiGrid}
              label="Tableau de bord"
              active={activeTop === "dashboard"}
              onClick={() => onTopSelect?.("dashboard")}
            />
          </SidebarBlock>

          {/* Emission categories */}
          <SidebarBlock>
            <SidebarMini icon={FiBarChart2}       label="Émissions directes"          active={activeGroup === "direct"}               onClick={() => onGroupChange("direct")} />
            <SidebarMini icon={FiBatteryCharging} label="Énergie importée"            active={activeGroup === "energie_importee"}     onClick={() => onGroupChange("energie_importee")} />
            <SidebarMini icon={FiTruck}           label="Transports"                  active={activeGroup === "transports"}           onClick={() => onGroupChange("transports")} />
            <SidebarMini icon={FiPackage}         label="Produits utilisés"           active={activeGroup === "produits_utilises"}    onClick={() => onGroupChange("produits_utilises")} />
            <SidebarMini icon={FiRepeat}          label="Utilisation produits"        active={activeGroup === "utilisation_produits"} onClick={() => onGroupChange("utilisation_produits")} />
            <SidebarMini icon={FiMoreHorizontal} label="Autres indirects"            active={activeGroup === "autres_indirects"}     onClick={() => onGroupChange("autres_indirects")} />
          </SidebarBlock>

          {/* Outputs */}
          <SidebarBlock>
            <SidebarMini icon={FiCheckSquare} label="Saisie guidée" active={activeTop === "wizard"}  onClick={() => onTopSelect?.("wizard")} />
            <SidebarMini icon={FiPieChart}    label="Bilan"         active={activeTop === "bilan"}   onClick={() => onTopSelect?.("bilan")} />
            <SidebarMini icon={FiFileText}    label="Rapport"       active={activeTop === "rapport"} onClick={() => onTopSelect?.("rapport")} />
          </SidebarBlock>
        </VStack>

        {/* ── BOTTOM: Help ── */}
        <Box w="full" px={3} pb={3} pt={2} borderTop="1px solid #F2F4F7">
          <Tooltip label="Aide" placement="right">
            <Box
              as="button"
              w="full"
              py={2}
              rounded="lg"
              display="flex"
              flexDir="column"
              alignItems="center"
              gap={1}
              color={ICON}
              _hover={{ bg: MUTED }}
              transition="all .15s"
            >
              <Icon as={FiHelpCircle} boxSize={4} />
              <Text fontSize="10px">Aide</Text>
            </Box>
          </Tooltip>
        </Box>

      </Flex>
    </Box>
  );
}

/* ── UI atoms ── */
function SidebarBlock({ children }: { children: React.ReactNode }) {
  return (
    <VStack bg={MUTED} w="full" p={1.5} spacing={1} rounded="xl">
      {children}
    </VStack>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Box
      as="button" onClick={onClick} w="full" px={2} py={1.5} rounded="lg"
      bg={active ? GREEN : "#fff"} color={active ? "#fff" : ICON}
      border="1px solid" borderColor={active ? GREEN : "#E5E7EB"}
      display="flex" flexDir="column" alignItems="center" gap={1}
      transition="all .15s" _hover={{ bg: active ? GREEN : "#F9FAFB" }}
    >
      <Icon as={icon} boxSize={4} />
      <Text fontSize="10px" textAlign="center" lineHeight="1.2">{label}</Text>
    </Box>
  );
}

function SidebarMini({ icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Box
      as="button" onClick={onClick} w="full" px={2} py={1.5} rounded="lg"
      bg={active ? GREEN : "transparent"} color={active ? "#fff" : ICON}
      display="flex" flexDir="column" alignItems="center" gap={0.5}
      transition="all .15s" _hover={{ bg: active ? GREEN : "#F3F4F6" }}
    >
      <Icon as={icon} boxSize={3.5} />
      <Text fontSize="9px" textAlign="center" lineHeight="1.2">{label}</Text>
    </Box>
  );
}
