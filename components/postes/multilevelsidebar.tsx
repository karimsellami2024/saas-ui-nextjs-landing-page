'use client';

import React, { useState } from "react";
import {
  Box,
  VStack,
  Text,
  Collapse,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { FiInbox, FiUser, FiShoppingBag, FiBarChart2 } from "react-icons/fi";

// --- Theme Colors ---
const OLIVE = "#778056";
const BEIGE = "#F3F6EF";
const BLACK = "#181B1A";

type SidebarProps = {
  onSelect: (key: string) => void;
  selectedMenu: string;
};

export default function SidebarWithContent({ onSelect, selectedMenu }: SidebarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <Box
      bg={BLACK}
      color={BEIGE}
      minH="100vh"
      w="250px"
      p={4}
      rounded="2xl"
      boxShadow="xl"
      fontFamily="sans-serif"
      display="flex"
      flexDirection="column"
      gap={4}
    >
      <VStack align="stretch" spacing={2}>
        {/* Dashboard */}
        <SidebarItem
          label="Dashboard"
          icon={FiBarChart2}
          isActive={selectedMenu === "dashboard"}
          onClick={() => onSelect("dashboard")}
        />

        {/* E-commerce - with submenu */}
        <Box>
          
          <SidebarItem
            label="Categorie-1"
            icon={FiShoppingBag}
            isActive={openMenu === "ecommerce" || ["products", "sales", "refunds"].includes(selectedMenu)}
            onClick={() => setOpenMenu(openMenu === "ecommerce" ? null : "ecommerce")}
            rightIcon={<ChevronDownIcon transform={openMenu === "ecommerce" ? "rotate(180deg)" : "rotate(0deg)"} transition="0.2s" />}
          />
          <Collapse in={openMenu === "ecommerce"} animateOpacity>
            <VStack align="stretch" pl={6} spacing={1}>
              <SidebarItem
                label="Émissions directes des sources de combustions fixes"
                isActive={selectedMenu === "Émissions directes des sources de combustions fixes"}
                onClick={() => onSelect("Émissions directes des sources de combustions fixes")}
                fontSize="sm"
              />
              <SidebarItem
                label="Electricite"
                isActive={selectedMenu === "products"}
                onClick={() => onSelect("products")}
                fontSize="sm"
              />
              <SidebarItem
                label="Combustion Mobile"
                isActive={selectedMenu === "sales"}
                onClick={() => onSelect("sales")}
                fontSize="sm"
              />
              <SidebarItem
                label="Émissions fugitives directes (Réfrigérants)"
                isActive={selectedMenu === "Émissions fugitives directes (Réfrigérants)"}
                onClick={() => onSelect("Émissions fugitives directes (Réfrigérants)")}
                fontSize="sm"
              />
              <SidebarItem
                label="ENTREPRISE"
                isActive={selectedMenu === "refunds"}
                onClick={() => onSelect("refunds")}
                fontSize="sm"
              />
            </VStack>
          </Collapse>
        </Box>

        {/* <SidebarItem
          label="Inbox"
          icon={FiInbox}
          isActive={selectedMenu === "inbox"}
          onClick={() => onSelect("inbox")}
        />

        <SidebarItem
          label="Users"
          icon={FiUser}
          isActive={selectedMenu === "users"}
          onClick={() => onSelect("users")}
        />

        <SidebarItem
          label="Sign In"
          isActive={selectedMenu === "signIn"}
          onClick={() => onSelect("signIn")}
        />
        <SidebarItem
          label="Sign Up"
          isActive={selectedMenu === "signUp"}
          onClick={() => onSelect("signUp")}
        /> */}
      </VStack>
    </Box>
  );
}

type SidebarItemProps = {
  label: string;
  icon?: any;
  isActive?: boolean;
  onClick?: () => void;
  rightIcon?: React.ReactNode;
  fontSize?: string;
};

function SidebarItem({
  label,
  icon,
  isActive,
  onClick,
  rightIcon,
  fontSize = "md",
}: SidebarItemProps) {
  return (
    <Box
      cursor="pointer"
      px={4}
      py={2}
      rounded="md"
      bg={isActive ? OLIVE : "transparent"}
      color={isActive ? BEIGE : "#fff"}
      _hover={{ bg: OLIVE, color: BEIGE }}
      fontWeight={isActive ? "bold" : "normal"}
      fontSize={fontSize}
      onClick={onClick}
      display="flex"
      alignItems="center"
      gap={2}
      transition="all 0.2s"
      userSelect="none"
    >
      {icon && <Icon as={icon} fontSize={18} mr={2} />}
      <Text flex={1}>{label}</Text>
      {rightIcon && <Box>{rightIcon}</Box>}
    </Box>
  );
}
