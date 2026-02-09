// components/nav/iso14904.ts
export type IsoCategoryKey = "cat1" | "cat2" | "cat3" | "cat4" | "cat5" | "cat6";

export const ISO_CATEGORIES: { key: IsoCategoryKey; label: string; title: string; description: string }[] = [
  {
    key: "cat1",
    label: "Catégorie 1",
    title: "Émissions directs",
    description: "Émissions directes des sources (combustions, procédés, fuites, usage des sols).",
  },
  {
    key: "cat2",
    label: "Catégorie 2",
    title: "Émissions indirects de l’énergie importée",
    description: "Électricité et autres énergies importées.",
  },
  {
    key: "cat3",
    label: "Catégorie 3",
    title: "Émissions indirects des transports",
    description: "Transport amont/aval, navettage, clients/visiteurs, déplacements d’affaires.",
  },
  {
    key: "cat4",
    label: "Catégorie 4",
    title: "Émissions indirects des produits utilisés par l’organisation",
    description: "Biens/matières, immobilisations, déchets, location amont, services.",
  },
  {
    key: "cat5",
    label: "Catégorie 5",
    title: "Émissions indirects à l’utilisation des produits de l’organisation",
    description: "Utilisation produits vendus, location aval, fin de vie, investissements.",
  },
  {
    key: "cat6",
    label: "Catégorie 6",
    title: "Autres émissions indirects",
    description: "Autres postes indirects (divers / sur mesure).",
  },
];
