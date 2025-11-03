
'use client';

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  VStack,
  Text,
  Collapse,
  Icon,
  Divider,
  HStack,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import {
  FiBarChart2,
  FiShoppingBag,
  FiHome,
  FiSettings,
} from "react-icons/fi";

// --- Theme Colors ---
const OLIVE = "#778056";
const BEIGE = "#F3F6EF";
const BLACK = "#181B1A";
const OLIVE_800 = "#5E6646";
const OLIVE_600 = "#8B946B";
const BORDER = "rgba(255,255,255,0.08)";

type SidebarProps = {
  onSelect: (key: string) => void;
  selectedMenu: string;
};

type NavItem = {
  label: string;
  key: string;
  icon?: any;
  children?: NavItem[];
};

const NAV: NavItem[] = [
  { label: "Tableau de bord", key: "dashboard", icon: FiBarChart2 },
  {
    label: "Catégories GES",
    key: "ecommerce",
    icon: FiShoppingBag,
    children: [
      { label: "Émissions directes des sources de combustions fixes", key: "Émissions directes des sources de combustions fixes" },
      { label: "Électricité", key: "products" },
      { label: "Combustion mobile", key: "sales" },
      { label: "Émissions fugitives directes (Réfrigérants)", key: "Émissions fugitives directes (Réfrigérants)" },
    ],
  },
  { label: "Paramètres", key: "settings", icon: FiSettings },
];

export default function SidebarWithContent({ onSelect, selectedMenu }: SidebarProps) {
  // Which parent group is open
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Auto-open the parent if the selectedMenu belongs to a group
  useEffect(() => {
    const parent = NAV.find(
      (n) => n.children?.some((c) => c.key === selectedMenu)
    );
    if (parent) setOpenKey(parent.key);
  }, [selectedMenu]);

  // derive bg for active & hover
  const activeBg = useMemo(
    () => `linear-gradient(90deg, ${OLIVE_800}40 0%, ${OLIVE_600}20 100%)`,
    []
  );

  return (
    <Box
      bg={BLACK}
      color={BEIGE}
      minH="100vh"
      w="260px"
      p={3}
      rounded="2xl"
      boxShadow="xl"
      fontFamily="Inter, system-ui, sans-serif"
      display="flex"
      flexDirection="column"
    >
      {/* Top brand / compact header */}
      <HStack px={3} py={3} mb={2} justify="space-between">
        <HStack spacing={2}>
          <Box w="10px" h="10px" rounded="full" bg={OLIVE} />
          <Text fontWeight="bold" letterSpacing="0.3px">Carbone Québec</Text>
        </HStack>
      </HStack>
      <Divider borderColor={BORDER} mb={3} />

      {/* Scrollable nav */}
      <VStack align="stretch" spacing={1} flex="1" overflowY="auto" pr={1}>
        <SectionLabel>ENTREPRISE</SectionLabel>
        <NavLeaf
          label="Entreprise"
          keyName="refunds"
          isActive={selectedMenu === "refunds"}
          onClick={() => onSelect("refunds")}
          leftAccent
        />

        <Divider borderColor={BORDER} my={2} />

        <SectionLabel>NAVIGATION</SectionLabel>

        {/* Dashboard root item */}
        <NavLeaf
          label="Dashboard"
          icon={FiBarChart2}
          keyName="dashboard"
          isActive={selectedMenu === "dashboard"}
          onClick={() => onSelect("dashboard")}
          leftAccent
        />

        {/* Group with children */}
        <NavGroup
          label="Catégories GES"
          icon={FiShoppingBag}
          groupKey="ecommerce"
          isOpen={openKey === "ecommerce"}
          onToggle={() => setOpenKey(openKey === "ecommerce" ? null : "ecommerce")}
        >
          <VStack align="stretch" pl={3} spacing={1}>
            {NAV.find(n => n.key === "ecommerce")?.children?.map((c) => (
              <NavLeaf
                key={c.key}
                label={c.label}
                keyName={c.key}
                isActive={selectedMenu === c.key}
                onClick={() => onSelect(c.key)}
                size="sm"
              />
            ))}
          </VStack>
        </NavGroup>

        {/* Settings */}
        <NavLeaf
          label="Paramètres"
          icon={FiSettings}
          keyName="settings"
          isActive={selectedMenu === "settings"}
          onClick={() => onSelect("settings")}
          leftAccent
        />
      </VStack>

      <Divider borderColor={BORDER} mt={3} mb={2} />
      {/* Footer mini */}
      <Box px={3} py={2} opacity={0.75} fontSize="12px">
        © {new Date().getFullYear()} Carbone Québec
      </Box>
    </Box>
  );
}

/* ----------------------------- Pieces ----------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      px={3}
      py={2}
      fontSize="11px"
      letterSpacing="0.08em"
      color="rgba(243,246,239,0.7)"
    >
      {children}
    </Text>
  );
}

type NavLeafProps = {
  label: string;
  keyName: string;
  icon?: any;
  isActive?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
  leftAccent?: boolean;
};

function NavLeaf({
  label,
  keyName,
  icon,
  isActive,
  onClick,
  size = "md",
  leftAccent = false,
}: NavLeafProps) {
  const padY = size === "sm" ? 2 : 2.5;
  const fontSize = size === "sm" ? "sm" : "md";

  return (
    <Box
      role="button"
      aria-current={isActive ? "page" : undefined}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.()}
      tabIndex={0}
      display="flex"
      alignItems="center"
      gap={2}
      px={3}
      py={padY}
      rounded="md"
      position="relative"
      cursor="pointer"
      bg={isActive ? "transparent" : "transparent"}
      _hover={{ bg: "rgba(255,255,255,0.06)" }}
      transition="all 0.15s ease"
      userSelect="none"
      fontWeight={isActive ? "bold" : "normal"}
      fontSize={fontSize}
    >
      {leftAccent && (
        <Box
          position="absolute"
          left="0"
          top="6px"
          bottom="6px"
          w="3px"
          rounded="full"
          bg={isActive ? OLIVE : "transparent"}
        />
      )}
      {icon && <Icon as={icon} fontSize={18} opacity={0.9} />}
      <Text flex="1">{label}</Text>
    </Box>
  );
}

type NavGroupProps = {
  label: string;
  icon?: any;
  groupKey: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function NavGroup({
  label,
  icon,
  groupKey,
  isOpen,
  onToggle,
  children,
}: NavGroupProps) {
  return (
    <Box>
      <Box
        role="button"
        aria-expanded={isOpen}
        aria-controls={`group-${groupKey}`}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle()}
        tabIndex={0}
        display="flex"
        alignItems="center"
        gap={2}
        px={3}
        py={2.5}
        rounded="md"
        cursor="pointer"
        _hover={{ bg: "rgba(255,255,255,0.06)" }}
        transition="all 0.15s ease"
      >
        {icon && <Icon as={icon} fontSize={18} opacity={0.9} />}
        <Text flex="1">{label}</Text>
        <ChevronDownIcon
          aria-hidden
          transform={isOpen ? "rotate(180deg)" : "rotate(0deg)"}
          transition="0.2s"
        />
      </Box>
      <Collapse in={isOpen} animateOpacity>
        <Box id={`group-${groupKey}`} pl={1} pt={1}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}


// 'use client';

// import React, { useState } from "react";
// import {
//   Box,
//   VStack,
//   Text,
//   Collapse,
//   Icon,
//   useColorModeValue,
// } from "@chakra-ui/react";
// import { ChevronDownIcon } from "@chakra-ui/icons";
// import { FiInbox, FiUser, FiShoppingBag, FiBarChart2 } from "react-icons/fi";

// // --- Theme Colors ---
// const OLIVE = "#778056";
// const BEIGE = "#F3F6EF";
// const BLACK = "#181B1A";

// type SidebarProps = {
//   onSelect: (key: string) => void;
//   selectedMenu: string;
// };

// export default function SidebarWithContent({ onSelect, selectedMenu }: SidebarProps) {
//   const [openMenu, setOpenMenu] = useState<string | null>(null);

//   return (
//     <Box
//       bg={BLACK}
//       color={BEIGE}
//       minH="100vh"
//       w="250px"
//       p={4}
//       rounded="2xl"
//       boxShadow="xl"
//       fontFamily="sans-serif"
//       display="flex"
//       flexDirection="column"
//       gap={4}
//     >
//       <VStack align="stretch" spacing={2}>
//         <SidebarItem
//                 label="ENTREPRISE"
//                 isActive={selectedMenu === "refunds"}
//                 onClick={() => onSelect("refunds")}
//                 fontSize="sm"
//               />
//         {/* Dashboard */}
//         <SidebarItem
//           label="Dashboard"
//           icon={FiBarChart2}
//           isActive={selectedMenu === "dashboard"}
//           onClick={() => onSelect("dashboard")}
//         />

//         {/* E-commerce - with submenu */}
//         <Box>
          
//           <SidebarItem
//             label="Categorie-1"
//             icon={FiShoppingBag}
//             isActive={openMenu === "ecommerce" || ["products", "sales", "refunds"].includes(selectedMenu)}
//             onClick={() => setOpenMenu(openMenu === "ecommerce" ? null : "ecommerce")}
//             rightIcon={<ChevronDownIcon transform={openMenu === "ecommerce" ? "rotate(180deg)" : "rotate(0deg)"} transition="0.2s" />}
//           />
//           <Collapse in={openMenu === "ecommerce"} animateOpacity>
//             <VStack align="stretch" pl={6} spacing={1}>
//               <SidebarItem
//                 label="Émissions directes des sources de combustions fixes"
//                 isActive={selectedMenu === "Émissions directes des sources de combustions fixes"}
//                 onClick={() => onSelect("Émissions directes des sources de combustions fixes")}
//                 fontSize="sm"
//               />
//               <SidebarItem
//                 label="Electricite"
//                 isActive={selectedMenu === "products"}
//                 onClick={() => onSelect("products")}
//                 fontSize="sm"
//               />
//               <SidebarItem
//                 label="Combustion Mobile"
//                 isActive={selectedMenu === "sales"}
//                 onClick={() => onSelect("sales")}
//                 fontSize="sm"
//               />
//               <SidebarItem
//                 label="Émissions fugitives directes (Réfrigérants)"
//                 isActive={selectedMenu === "Émissions fugitives directes (Réfrigérants)"}
//                 onClick={() => onSelect("Émissions fugitives directes (Réfrigérants)")}
//                 fontSize="sm"
//               />
              
//             </VStack>
//           </Collapse>
//         </Box>

//         {/* <SidebarItem
//           label="Inbox"
//           icon={FiInbox}
//           isActive={selectedMenu === "inbox"}
//           onClick={() => onSelect("inbox")}
//         />

//         <SidebarItem
//           label="Users"
//           icon={FiUser}
//           isActive={selectedMenu === "users"}
//           onClick={() => onSelect("users")}
//         />

//         <SidebarItem
//           label="Sign In"
//           isActive={selectedMenu === "signIn"}
//           onClick={() => onSelect("signIn")}
//         />
//         <SidebarItem
//           label="Sign Up"
//           isActive={selectedMenu === "signUp"}
//           onClick={() => onSelect("signUp")}
//         /> */}
//       </VStack>
//     </Box>
//   );
// }

// type SidebarItemProps = {
//   label: string;
//   icon?: any;
//   isActive?: boolean;
//   onClick?: () => void;
//   rightIcon?: React.ReactNode;
//   fontSize?: string;
// };

// function SidebarItem({
//   label,
//   icon,
//   isActive,
//   onClick,
//   rightIcon,
//   fontSize = "md",
// }: SidebarItemProps) {
//   return (
//     <Box
//       cursor="pointer"
//       px={4}
//       py={2}
//       rounded="md"
//       bg={isActive ? OLIVE : "transparent"}
//       color={isActive ? BEIGE : "#fff"}
//       _hover={{ bg: OLIVE, color: BEIGE }}
//       fontWeight={isActive ? "bold" : "normal"}
//       fontSize={fontSize}
//       onClick={onClick}
//       display="flex"
//       alignItems="center"
//       gap={2}
//       transition="all 0.2s"
//       userSelect="none"
//     >
//       {icon && <Icon as={icon} fontSize={18} mr={2} />}
//       <Text flex={1}>{label}</Text>
//       {rightIcon && <Box>{rightIcon}</Box>}
//     </Box>
//   );
// }
