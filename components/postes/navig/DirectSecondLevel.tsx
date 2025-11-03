// components/nav/DirectSecondLevel.tsx
'use client';
import React from "react";
import { VStack, Text } from "@chakra-ui/react";
import { Pill, ScrollRow } from "./Pills";

export type DirectItem = {
  key: string;
  label: string;
  active?: boolean;     // highlighted (dark green)
  selected?: boolean;   // shows ✓ (like your first screenshot)
  disabled?: boolean;
};

export default function DirectSecondLevel({
  items,
  onToggleSelect,
  onActivate,
}: {
  items: DirectItem[];
  onToggleSelect?: (key: string) => void;  // toggles ✓
  onActivate?: (key: string) => void;      // marks as active (dark)
}) {
  return (
    <VStack align="start" spacing={2}>
      <Text fontWeight="800" fontSize="lg">Émissions directes</Text>
      <ScrollRow>
        {items.map((it) => (
          <Pill
            key={it.key}
            label={it.label}
            selected={it.selected}
            active={it.active}
            disabled={it.disabled}
            onClick={() => (it.disabled ? undefined : (onActivate?.(it.key), onToggleSelect?.(it.key)))}
          />
        ))}
      </ScrollRow>
    </VStack>
  );
}
