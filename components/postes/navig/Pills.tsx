// components/nav/Pills.tsx
'use client';
import React, { useRef } from "react";
import {
  Box, HStack, IconButton, Text, Flex, chakra, useToken,
} from "@chakra-ui/react";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, QuestionIcon } from "@chakra-ui/icons";

const TOK = {
  primary: "#1f3d2f",
  primaryBorder: "#1f3d2f",
  muted: "#F2F4F7",
  text: "#1F2937",
  disabledText: "#9CA3AF",
};

type PillProps = {
  label: string;
  active?: boolean;        // the one currently shown
  selected?: boolean;      // shows ✓ (for multi-select cases)
  disabled?: boolean;
  onClick?: () => void;
};

export function Pill({ label, active, selected, disabled, onClick }: PillProps) {
  const isActive = !!active;
  const isDisabled = !!disabled;

  return (
    <Box
      as="button"
      onClick={isDisabled ? undefined : onClick}
      px={4}
      h="32px"
      rounded="999px"
      border="1.5px solid"
      borderColor={isActive ? TOK.primaryBorder : "transparent"}
      bg={isActive ? TOK.primary : (isDisabled ? "#F5F6F8" : TOK.muted)}
      color={isActive ? "white" : (isDisabled ? TOK.disabledText : TOK.text)}
      fontWeight={isActive ? 700 : 500}
      fontSize="sm"
      opacity={isDisabled ? 0.8 : 1}
      display="inline-flex"
      alignItems="center"
      gap={2}
      _hover={!isDisabled ? { bg: isActive ? TOK.primary : "#E7EAEE" } : {}}
      transition="all .15s"
    >
      <Text noOfLines={1}>{label}</Text>
      {selected && !isDisabled && !isActive ? <CheckIcon boxSize={3} /> : null}
    </Box>
  );
}

/** Horizontal scroll container with optional arrows and a help icon */
export function ScrollRow({
  children,
  showArrows = false,
  showHelp = false,
  onHelp,
}: React.PropsWithChildren<{ showArrows?: boolean; showHelp?: boolean; onHelp?: () => void }>) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollBy = (dx: number) => ref.current?.scrollBy({ left: dx, behavior: "smooth" });

  return (
    <Flex align="center" gap={2}>
      {showArrows && (
        <IconButton
          aria-label="scroll left"
          icon={<ChevronLeftIcon />}
          variant="ghost"
          onClick={() => scrollBy(-220)}
        />
      )}
      <HStack
        ref={ref}
        spacing={3}
        overflowX="auto"
        whiteSpace="nowrap"
        css={{ scrollbarWidth: "none" }}
      >
        {children}
      </HStack>
      {showArrows && (
        <IconButton
          aria-label="scroll right"
          icon={<ChevronRightIcon />}
          variant="ghost"
          onClick={() => scrollBy(220)}
        />
      )}
      {showHelp && (
        <IconButton
          aria-label="help"
          icon={<QuestionIcon />}
          variant="ghost"
          onClick={onHelp}
        />
      )}
    </Flex>
  );
}
