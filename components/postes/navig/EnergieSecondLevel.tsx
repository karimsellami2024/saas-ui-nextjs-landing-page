// components/nav/EnergieSecondLevel.tsx
'use client';
import React from "react";
import { VStack, Text } from "@chakra-ui/react";
import { Pill, ScrollRow } from "./Pills";

export default function EnergieSecondLevel({
  items,
  activeKey,
  onChange,
}: {
  items: { key: string; label: string }[];
  activeKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <VStack align="start" spacing={2}>
      <Text fontWeight="800" fontSize="lg">Émissions indirectes liées à l’énergie</Text>
      <ScrollRow>
        {items.map((it) => (
          <Pill
            key={it.key}
            label={it.label}
            active={activeKey === it.key}
            onClick={() => onChange(it.key)}
          />
        ))}
      </ScrollRow>
    </VStack>
  );
}
