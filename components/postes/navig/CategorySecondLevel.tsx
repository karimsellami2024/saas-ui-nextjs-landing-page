// 'use client';
// import React from "react";
// import { VStack, Text } from "@chakra-ui/react";
// import { Pill, ScrollRow } from "./Pills";
// import type { IsoCategoryKey } from "./iso14906";

// export type CategoryItem = {
//   key: IsoCategoryKey;
//   label: string;       // "Catégorie 1"
//   title: string;       // "Émissions directs"
//   active?: boolean;
//   selected?: boolean;  // si tu veux multi-select
//   disabled?: boolean;
// };

// export default function CategorySecondLevel({
//   items,
//   onToggleSelect,
//   onActivate,
// }: {
//   items: CategoryItem[];
//   onToggleSelect?: (key: IsoCategoryKey) => void;
//   onActivate?: (key: IsoCategoryKey) => void;
// }) {
//   return (
//     <VStack align="start" spacing={2}>
//       <Text fontWeight="800" fontSize="lg">Catégories (ISO 14904)</Text>
//       <ScrollRow>
//         {items.map((it) => (
//           <Pill
//             key={it.key}
//             label={it.label}
//             selected={it.selected}
//             active={it.active}
//             disabled={it.disabled}
//             onClick={() => (it.disabled ? undefined : (onActivate?.(it.key), onToggleSelect?.(it.key)))}
//           />
//         ))}
//       </ScrollRow>
//       {/* Optionnel: afficher le titre en dessous */}
//       <Text fontSize="sm" color="gray.600">
//         {items.find(i => i.active)?.title ?? ""}
//       </Text>
//     </VStack>
//   );
// }
