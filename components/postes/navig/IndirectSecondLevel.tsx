// components/nav/IndirectSecondLevel.tsx
'use client';
import React from "react";
import { VStack, Text } from "@chakra-ui/react";
import { Pill, ScrollRow } from "./Pills";

export default function IndirectSecondLevel({
  items,
  activeKey,
  onChange,
  onHelp,
}: {
  items: { key: string; label: string; disabled?: boolean }[];
  activeKey: string;
  onChange: (key: string) => void;
  onHelp?: () => void;
}) {
  return (
    <VStack align="start" spacing={2}>
      <Text fontWeight="800" fontSize="lg">Émissions indirectes</Text>
      <ScrollRow showArrows showHelp onHelp={onHelp}>
        {items.map((it) => (
          <Pill
            key={it.key}
            label={it.label}
            active={activeKey === it.key}
            disabled={it.disabled}
            onClick={() => !it.disabled && onChange(it.key)}
          />
        ))}
      </ScrollRow>
    </VStack>
  );
}
