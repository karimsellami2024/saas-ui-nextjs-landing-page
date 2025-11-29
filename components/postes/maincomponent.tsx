'use client';

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Stack,
  HStack,
  VStack,
  Heading,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { FiHelpCircle as HelpCircle } from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";

// Sidebar
import SidebarRail from "./SidebarRail";

// Pages
import NewDashboard from "#components/newdashboard";
import DashboardPage from "#components/postes/dash";
import Poste1Page from "#components/postes/poste1/main";
import Poste2Page from "#components/postes/poste2/main";
import RefrigerantsPage from "#components/postes/poste4/main";
import Poste6Page from "#components/postes/poste6/main";
import ProductsAndFleetPage from "#components/postes/entreprise";
import NotificationsPage from "#components/postes/entreprise"; // ← NEW

// Placeholder when a poste is hidden for this user
import { HiddenPostePlaceholder } from "../../components/postes/HiddenPostePlaceholder";

/* ----------------- tokens to match your design ----------------- */
const pageBg = "#F3F6EF";
const cardShadow = "0 10px 28px rgba(0,0,0,0.07)";
const COL = {
  textBody: "#213A2E",
  textMuted: "#51645B",
  surface: "#FFFFFF",
  surfaceMuted: "#EAF1EC",
  border: "#E1E7E3",
  greenPill: "#264a3b",
  greenBar: "#214B3A",
  section: "#F8FAF8",
};

/* --------------------------- types --------------------------- */
type PosteRow = { id: string | number; poste_label: string };

type DirectKey =
  | "combustion_fixes"
  | "combustion_mobiles"
  | "procedes"
  | "refrigerants"
  | "sols";

type EnergieKey = "products" | "autre_energie";
type GroupKey = "direct" | "energie" | "indirect";
type TopKey = "dashboard" | "bilan" | "rapport";

/* --------------------------- constants --------------------------- */
const posteLabelByMenu: Record<string, string> = {
  combustion_fixes:   "Émissions directes des sources de combustions fixes",
  combustion_mobiles: "Combustion Mobile",
  refrigerants:       "Émissions fugitives directes (Réfrigérants)",
  products:           "Electricite",
  autre_energie:      "Consommation autres énergies",
};

const POSTE_META: Record<string, { groupTitle: string; posteTitle: string; description: string }> = {
  combustion_fixes: {
    groupTitle: "Émissions directes",
    posteTitle: "Poste 1",
    description:
      "Saisissez vos consommations de combustibles fixes (chaudières, fours, etc.). La plateforme calcule automatiquement les émissions associées.",
  },
  combustion_mobiles: {
    groupTitle: "Émissions directes",
    posteTitle: "Poste 2",
    description:
      "Entrez vos véhicules et équipements mobiles pour mesurer l’impact de leurs déplacements et de leur utilisation (voitures, camions, bateaux, etc.).",
  },
  refrigerants: {
    groupTitle: "Émissions directes",
    posteTitle: "Poste 4",
    description:
      "Suivez les réfrigérants (fuites, remplissages, mises au rebut) pour estimer les émissions fugitives de vos équipements.",
  },
  products: {
    groupTitle: "Énergie",
    posteTitle: "Poste 6 — Électricité",
    description:
      "Indiquez vos consommations d’électricité par site/période. Le facteur d’émission approprié est appliqué pour obtenir vos tCO²e.",
  },
  autre_energie: {
    groupTitle: "Énergie",
    posteTitle: "Poste 7 — Autres énergies",
    description:
      "Renseignez la consommation de combustibles non électriques (vapeur, chaleur achetée, etc.) pour compléter votre bilan énergétique.",
  },
  // Indirect (generic)
  p8:  { groupTitle: "Émissions indirectes", posteTitle: "Poste 8",  description: "Production et distribution d’énergie achetée." },
  p9:  { groupTitle: "Émissions indirectes", posteTitle: "Poste 9",  description: "Achats de biens et services." },
  p10: { groupTitle: "Émissions indirectes", posteTitle: "Poste 10", description: "Biens immobiliers (capitaux)." },
  p11: { groupTitle: "Émissions indirectes", posteTitle: "Poste 11", description: "Génération de déchets." },
  p12: { groupTitle: "Émissions indirectes", posteTitle: "Poste 12", description: "Transport et distribution en amont." },
  p13: { groupTitle: "Émissions indirectes", posteTitle: "Poste 13", description: "Déplacements (business travel)." },
  p14: { groupTitle: "Émissions indirectes", posteTitle: "Poste 14", description: "Location d’actifs en amont." },
  p15: { groupTitle: "Émissions indirectes", posteTitle: "Poste 15", description: "Investissements." },
  p16: { groupTitle: "Émissions indirectes", posteTitle: "Poste 16", description: "Clients et visiteurs." },
  p17: { groupTitle: "Émissions indirectes", posteTitle: "Poste 17", description: "Transport et distribution en aval." },
  p18: { groupTitle: "Émissions indirectes", posteTitle: "Poste 18", description: "Utilisation des produits vendus." },
  p19: { groupTitle: "Émissions indirectes", posteTitle: "Poste 19", description: "Fin de vie des produits." },
  p20: { groupTitle: "Émissions indirectes", posteTitle: "Poste 20", description: "Franchises en aval." },
  p21: { groupTitle: "Émissions indirectes", posteTitle: "Poste 21", description: "Location d’actifs en aval." },
  p22: { groupTitle: "Émissions indirectes", posteTitle: "Poste 22", description: "Navettages des employés." },
  p23: { groupTitle: "Émissions indirectes", posteTitle: "Poste 23", description: "Autres sources d’émissions." },
};

/* --------------------------- component --------------------------- */
export default function Section() {
  // auth & data
  const [userId, setUserId] = useState<string | null>(null);
  const [posteVisibility, setPosteVisibility] = useState<Record<string | number, boolean>>({});
  const [postes, setPostes] = useState<PosteRow[]>([]);
  const [loading, setLoading] = useState(true);

  // routing
  const [selectedMenu, setSelectedMenu] = useState<TopKey | string>("dashboard");

  // groups / top rail
  const [activeGroup, setActiveGroup] = useState<GroupKey | null>("direct");
  const [activeTop, setActiveTop] = useState<TopKey>("dashboard");

  // useful for direct default
  const activeDirectKey = useMemo<DirectKey>(() => "refrigerants", []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: postesData } = await supabase
          .from("postes")
          .select("id, poste_label");
        setPostes((postesData ?? []) as PosteRow[]);

        const { data: visRows } = await supabase
          .from("poste_visibility")
          .select("poste_id, is_hidden")
          .eq("user_id", userId);

        const visMap: Record<string | number, boolean> = {};
        (visRows ?? []).forEach((row: any) => {
          visMap[row.poste_id] = row.is_hidden;
        });
        setPosteVisibility(visMap);
      } catch {
        setPosteVisibility({});
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  // helpers
  const posteIdForMenu = (menuKey: string) => {
    const label = posteLabelByMenu[menuKey];
    const poste = postes.find((p) => p.poste_label === label);
    return poste?.id;
  };

  const renderOrPlaceholder = (menuKey: string, component: JSX.Element) => {
    const poste_id = posteIdForMenu(menuKey);
    const isHidden = poste_id ? posteVisibility[poste_id] : false;
    const label = posteLabelByMenu[menuKey] || menuKey;
    if (poste_id && isHidden) return <HiddenPostePlaceholder label={label} />;
    return component;
  };

  const isPosteKey = (k: string) =>
    ["combustion_fixes","combustion_mobiles","refrigerants","products","autre_energie"].includes(k) ||
    ["p8","p9","p10","p11","p12","p13","p14","p15","p16","p17","p18","p19","p20","p21","p22","p23"].includes(k);

  const currentMeta = typeof selectedMenu === "string" ? POSTE_META[selectedMenu] : undefined;
  const groupTitle =
    currentMeta?.groupTitle ??
    (typeof selectedMenu === "string" && selectedMenu.startsWith("p")
      ? "Émissions indirectes"
      : "Section");

  // pills dataset for current group
  const currentPills = useMemo(() => {
    if (!activeGroup) {
      return [];
    }
    if (activeGroup === "direct") {
      return [
        { key: "combustion_fixes",   title: "Combustions fixes" },
        { key: "combustion_mobiles", title: "Combustions mobiles" },
        { key: "procedes",           title: "Procédés", disabled: true },
        { key: "refrigerants",       title: "Réfrigérants" },
        { key: "sols",               title: "Sols et forêts", disabled: true },
      ];
    }
    if (activeGroup === "energie") {
      return [
        { key: "products",      title: "Électricité" },
        { key: "autre_energie", title: "Autres énergies" },
      ];
    }
    // indirect (only visual for now)
    return [
      { key: "p8",  title: "Prod. & distr. d’énergie" },
      { key: "p9",  title: "Achat de biens" },
      { key: "p10", title: "Biens immobiliers" },
      { key: "p11", title: "Déchets" },
      { key: "p12", title: "Transp. amont" },
      { key: "p13", title: "Déplacements" },
    ];
  }, [activeGroup]);

  // totals placeholder; wire to your store when ready
  const totalTco2e = 4.255;

  // UI states
  if (!userId && !loading) {
    return (
      <Box bg={pageBg} minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text fontSize="lg" color="gray.600">Veuillez vous connecter.</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box bg={pageBg} minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  const isBilan = selectedMenu === "bilan" || activeTop === "bilan";
  const isDashboard = selectedMenu === "dashboard";

  return (
    <Box display="flex" bg={pageBg} minH="100vh">
      {/* Left: compact rail */}
      <SidebarRail
        activeGroup={isBilan ? null : activeGroup}
        activeTop={activeTop}
        onGroupChange={(g) => {
          setActiveTop("dashboard");
          setActiveGroup(g);
          if (g === "direct") setSelectedMenu(activeDirectKey || "refrigerants");
          if (g === "energie") setSelectedMenu("products");
          if (g === "indirect") setSelectedMenu("p8");
        }}
        onTopSelect={(k) => {
          setActiveTop(k);
          if (k === "dashboard") setSelectedMenu("dashboard");
          if (k === "bilan") { setActiveGroup(null); setSelectedMenu("bilan"); }
          if (k === "rapport") setSelectedMenu("rapport");
        }}
        onNotificationsClick={() => {
          setActiveTop("dashboard");
          setActiveGroup(null);
          setSelectedMenu("notifications");
        }}
      />

      {/* Right side */}
      <Box
        flex={1}
        bg={pageBg}
        px={isDashboard ? 0 : { base: 4, md: 8 }}
        py={isDashboard ? 0 : { base: 6, md: 10 }}
        color={COL.textBody}
      >
        {isDashboard ? (
          /* 🔥 Full-width dashboard (minus sidebar), no maxW wrapper */
          <NewDashboard />
        ) : (
          <Stack maxW="1200px" mx="auto" spacing={6}>
            {/* Title + help icon */}
            {!isBilan &&
              typeof selectedMenu === "string" &&
              isPosteKey(selectedMenu) && (
                <HStack justify="space-between" align="center">
                  <Heading as="h1" size="lg">{groupTitle}</Heading>
                  <HelpCircle size={18} />
                </HStack>
              )
            }

            {/* Pills */}
            {!isBilan && currentPills.length > 0 && (
              <HStack mt={2} spacing={4} wrap="wrap">
                {currentPills.map((tab) => {
                  const active = selectedMenu === tab.key;
                  const disabled = (tab as any).disabled;
                  return (
                    <Box
                      key={String(tab.key)}
                      as="button"
                      onClick={() => !disabled && setSelectedMenu(String(tab.key))}
                      px={4}
                      h="32px"
                      rounded="16px"
                      border="1px solid"
                      borderColor={active ? COL.greenPill : "#DAD7CD"}
                      bg={active ? COL.greenPill : "white"}
                      color={active ? "white" : COL.textBody}
                      fontWeight={active ? "bold" : "normal"}
                      fontSize="sm"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor={disabled ? "not-allowed" : "pointer"}
                      opacity={disabled ? 0.45 : 1}
                      _hover={!active && !disabled ? { borderColor: COL.greenPill } : {}}
                    >
                      {tab.title}
                    </Box>
                  );
                })}
              </HStack>
            )}

            {/* Header cards (left description + right total) */}
            {!isBilan &&
              typeof selectedMenu === "string" &&
              isPosteKey(selectedMenu) && (
                <HStack align="stretch" spacing={6}>
                  <Box
                    flex="1"
                    bg={COL.surface}
                    rounded="2xl"
                    p={{ base: 5, md: 6 }}
                    border="1px solid"
                    borderColor={COL.border}
                    boxShadow={cardShadow}
                  >
                    <VStack align="flex-start" spacing={2}>
                      <Heading as="h2" size="md">{currentMeta?.posteTitle ?? "Poste"}</Heading>
                      <Text color={COL.textMuted}>
                        {currentMeta?.description ?? "Section — page à venir."}
                      </Text>
                    </VStack>
                  </Box>

                  <Box
                    w={{ base: "100%", md: "380px" }}
                    bg={COL.surfaceMuted}
                    rounded="2xl"
                    p={{ base: 6, md: 7 }}
                    border="1px solid"
                    borderColor={COL.border}
                    boxShadow={cardShadow}
                  >
                    <VStack spacing={4} align="stretch">
                      <Heading as="h3" size="sm" color={COL.textBody}>
                        Votre consommation totale :
                      </Heading>
                      <Heading as="p" size="lg" lineHeight="1.1" color={COL.greenBar}>
                        {Number(totalTco2e).toLocaleString("fr-CA", { maximumFractionDigits: 3 })} t de CO²e
                      </Heading>
                      <HStack
                        alignSelf="flex-start"
                        bg="white"
                        rounded="full"
                        px={5}
                        h="40px"
                        spacing={3}
                        boxShadow="0 8px 16px rgba(0,0,0,0.15)"
                        border="1px solid"
                        borderColor="rgba(0,0,0,0.06)"
                      >
                        <Text fontWeight="semibold" color={COL.textMuted}>Section en cours</Text>
                        <Box
                          as="span"
                          w="22px"
                          h="22px"
                          rounded="full"
                          bg="#e7ebe6"
                          display="inline-flex"
                          alignItems="center"
                          justifyContent="center"
                          fontSize="xs"
                          color={COL.textMuted}
                        >
                          2
                        </Box>
                      </HStack>
                    </VStack>
                  </Box>
                </HStack>
              )
            }

            {/* --------- Dynamic content (non-dashboard) --------- */}
            {selectedMenu === "notifications" && <NotificationsPage />}

            {selectedMenu === "bilan" && <DashboardPage />}

            {selectedMenu === "combustion_fixes" &&
              renderOrPlaceholder("combustion_fixes", <Poste1Page />)}
            {selectedMenu === "combustion_mobiles" &&
              renderOrPlaceholder("combustion_mobiles", <Poste2Page />)}
            {selectedMenu === "refrigerants" &&
              renderOrPlaceholder("refrigerants", <RefrigerantsPage />)}

            {selectedMenu === "products" &&
              renderOrPlaceholder("products", <Poste6Page />)}
            {selectedMenu === "autre_energie" &&
              renderOrPlaceholder(
                "autre_energie",
                <Box bg="white" p={6} rounded="lg" border="1px solid" borderColor={COL.border}>
                  <Text>Autres énergies (poste 7) — Page à venir.</Text>
                </Box>
              )}

            {/* simple placeholder for indirects for now */}
            {["p8","p9","p10","p11","p12","p13","p14","p15","p16","p17","p18","p19","p20","p21","p22","p23"].includes(String(selectedMenu)) && (
              <Box bg="white" p={6} rounded="lg" border="1px solid" borderColor={COL.border}>
                <Text>
                  Section « {POSTE_META[String(selectedMenu)]?.posteTitle ?? selectedMenu} » — page à venir.
                </Text>
              </Box>
            )}

            {selectedMenu === "rapport" && (
              <Box bg="white" p={6} rounded="lg" border="1px solid" borderColor={COL.border}>
                <Text>Rapport — page à venir.</Text>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

// 'use client';

// import { useEffect, useMemo, useState } from "react";
// import {
//   Box,
//   Stack,
//   HStack,
//   VStack,
//   Heading,
//   Text,
//   Spinner,
// } from "@chakra-ui/react";
// import { FiHelpCircle as HelpCircle } from "react-icons/fi";
// import { supabase } from "../../lib/supabaseClient";

// // Sidebar
// import SidebarRail from "./SidebarRail";

// // Pages
// import NewDashboard from "#components/newdashboard";
// import DashboardPage from "#components/postes/dash";
// import Poste1Page from "#components/postes/poste1/main";
// import Poste2Page from "#components/postes/poste2/main";
// import RefrigerantsPage from "#components/postes/poste4/main";
// import Poste6Page from "#components/postes/poste6/main";
// import ProductsAndFleetPage from "#components/postes/entreprise";
// import NotificationsPage from "#components/postes/entreprise"; // ← NEW

// // Placeholder when a poste is hidden for this user
// import { HiddenPostePlaceholder } from "../../components/postes/HiddenPostePlaceholder";

// /* ----------------- tokens to match your design ----------------- */
// const pageBg = "#F3F6EF";
// const cardShadow = "0 10px 28px rgba(0,0,0,0.07)";
// const COL = {
//   textBody: "#213A2E",
//   textMuted: "#51645B",
//   surface: "#FFFFFF",
//   surfaceMuted: "#EAF1EC",
//   border: "#E1E7E3",
//   greenPill: "#264a3b",
//   greenBar: "#214B3A",
//   section: "#F8FAF8",
// };

// /* --------------------------- types --------------------------- */
// type PosteRow = { id: string | number; poste_label: string };

// type DirectKey =
//   | "combustion_fixes"
//   | "combustion_mobiles"
//   | "procedes"
//   | "refrigerants"
//   | "sols";

// type EnergieKey = "products" | "autre_energie";
// type GroupKey = "direct" | "energie" | "indirect";
// type TopKey = "dashboard" | "bilan" | "rapport";

// /* --------------------------- constants --------------------------- */
// const posteLabelByMenu: Record<string, string> = {
//   combustion_fixes:   "Émissions directes des sources de combustions fixes",
//   combustion_mobiles: "Combustion Mobile",
//   refrigerants:       "Émissions fugitives directes (Réfrigérants)",
//   products:           "Electricite",
//   autre_energie:      "Consommation autres énergies",
// };

// const POSTE_META: Record<string, { groupTitle: string; posteTitle: string; description: string }> = {
//   combustion_fixes: {
//     groupTitle: "Émissions directes",
//     posteTitle: "Poste 1",
//     description:
//       "Saisissez vos consommations de combustibles fixes (chaudières, fours, etc.). La plateforme calcule automatiquement les émissions associées.",
//   },
//   combustion_mobiles: {
//     groupTitle: "Émissions directes",
//     posteTitle: "Poste 2",
//     description:
//       "Entrez vos véhicules et équipements mobiles pour mesurer l’impact de leurs déplacements et de leur utilisation (voitures, camions, bateaux, etc.).",
//   },
//   refrigerants: {
//     groupTitle: "Émissions directes",
//     posteTitle: "Poste 4",
//     description:
//       "Suivez les réfrigérants (fuites, remplissages, mises au rebut) pour estimer les émissions fugitives de vos équipements.",
//   },
//   products: {
//     groupTitle: "Énergie",
//     posteTitle: "Poste 6 — Électricité",
//     description:
//       "Indiquez vos consommations d’électricité par site/période. Le facteur d’émission approprié est appliqué pour obtenir vos tCO²e.",
//   },
//   autre_energie: {
//     groupTitle: "Énergie",
//     posteTitle: "Poste 7 — Autres énergies",
//     description:
//       "Renseignez la consommation de combustibles non électriques (vapeur, chaleur achetée, etc.) pour compléter votre bilan énergétique.",
//   },
//   // Indirect (generic)
//   p8:  { groupTitle: "Émissions indirectes", posteTitle: "Poste 8",  description: "Production et distribution d’énergie achetée." },
//   p9:  { groupTitle: "Émissions indirectes", posteTitle: "Poste 9",  description: "Achats de biens et services." },
//   p10: { groupTitle: "Émissions indirectes", posteTitle: "Poste 10", description: "Biens immobiliers (capitaux)." },
//   p11: { groupTitle: "Émissions indirectes", posteTitle: "Poste 11", description: "Génération de déchets." },
//   p12: { groupTitle: "Émissions indirectes", posteTitle: "Poste 12", description: "Transport et distribution en amont." },
//   p13: { groupTitle: "Émissions indirectes", posteTitle: "Poste 13", description: "Déplacements (business travel)." },
//   p14: { groupTitle: "Émissions indirectes", posteTitle: "Poste 14", description: "Location d’actifs en amont." },
//   p15: { groupTitle: "Émissions indirectes", posteTitle: "Poste 15", description: "Investissements." },
//   p16: { groupTitle: "Émissions indirectes", posteTitle: "Poste 16", description: "Clients et visiteurs." },
//   p17: { groupTitle: "Émissions indirectes", posteTitle: "Poste 17", description: "Transport et distribution en aval." },
//   p18: { groupTitle: "Émissions indirectes", posteTitle: "Poste 18", description: "Utilisation des produits vendus." },
//   p19: { groupTitle: "Émissions indirectes", posteTitle: "Poste 19", description: "Fin de vie des produits." },
//   p20: { groupTitle: "Émissions indirectes", posteTitle: "Poste 20", description: "Franchises en aval." },
//   p21: { groupTitle: "Émissions indirectes", posteTitle: "Poste 21", description: "Location d’actifs en aval." },
//   p22: { groupTitle: "Émissions indirectes", posteTitle: "Poste 22", description: "Navettages des employés." },
//   p23: { groupTitle: "Émissions indirectes", posteTitle: "Poste 23", description: "Autres sources d’émissions." },
// };

// /* --------------------------- component --------------------------- */
// export default function Section() {
//   // auth & data
//   const [userId, setUserId] = useState<string | null>(null);
//   const [posteVisibility, setPosteVisibility] = useState<Record<string | number, boolean>>({});
//   const [postes, setPostes] = useState<PosteRow[]>([]);
//   const [loading, setLoading] = useState(true);

//   // routing
//   const [selectedMenu, setSelectedMenu] = useState<TopKey | string>("dashboard");

//   // groups / top rail
//   const [activeGroup, setActiveGroup] = useState<GroupKey | null>("direct");
//   const [activeTop, setActiveTop] = useState<TopKey>("dashboard");

//   // useful for direct default
//   const activeDirectKey = useMemo<DirectKey>(() => "refrigerants", []);

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       const { data: { user } } = await supabase.auth.getUser();
//       setUserId(user?.id ?? null);
//       setLoading(false);
//     })();
//   }, []);

//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       setLoading(true);
//       try {
//         const { data: postesData } = await supabase
//           .from("postes")
//           .select("id, poste_label");
//         setPostes((postesData ?? []) as PosteRow[]);

//         const { data: visRows } = await supabase
//           .from("poste_visibility")
//           .select("poste_id, is_hidden")
//           .eq("user_id", userId);

//         const visMap: Record<string | number, boolean> = {};
//         (visRows ?? []).forEach((row: any) => {
//           visMap[row.poste_id] = row.is_hidden;
//         });
//         setPosteVisibility(visMap);
//       } catch {
//         setPosteVisibility({});
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [userId]);

//   // helpers
//   const posteIdForMenu = (menuKey: string) => {
//     const label = posteLabelByMenu[menuKey];
//     const poste = postes.find((p) => p.poste_label === label);
//     return poste?.id;
//   };

//   const renderOrPlaceholder = (menuKey: string, component: JSX.Element) => {
//     const poste_id = posteIdForMenu(menuKey);
//     const isHidden = poste_id ? posteVisibility[poste_id] : false;
//     const label = posteLabelByMenu[menuKey] || menuKey;
//     if (poste_id && isHidden) return <HiddenPostePlaceholder label={label} />;
//     return component;
//   };

//   const isPosteKey = (k: string) =>
//     ["combustion_fixes","combustion_mobiles","refrigerants","products","autre_energie"].includes(k) ||
//     ["p8","p9","p10","p11","p12","p13","p14","p15","p16","p17","p18","p19","p20","p21","p22","p23"].includes(k);

//   const currentMeta = typeof selectedMenu === "string" ? POSTE_META[selectedMenu] : undefined;
//   const groupTitle =
//     currentMeta?.groupTitle ??
//     (typeof selectedMenu === "string" && selectedMenu.startsWith("p")
//       ? "Émissions indirectes"
//       : "Section");

//   // pills dataset for current group
//   const currentPills = useMemo(() => {
//     if (!activeGroup) {
//       return [];
//     }
//     if (activeGroup === "direct") {
//       return [
//         { key: "combustion_fixes",   title: "Combustions fixes" },
//         { key: "combustion_mobiles", title: "Combustions mobiles" },
//         { key: "procedes",           title: "Procédés", disabled: true },
//         { key: "refrigerants",       title: "Réfrigérants" },
//         { key: "sols",               title: "Sols et forêts", disabled: true },
//       ];
//     }
//     if (activeGroup === "energie") {
//       return [
//         { key: "products",      title: "Électricité" },
//         { key: "autre_energie", title: "Autres énergies" },
//       ];
//     }
//     // indirect (only visual for now)
//     return [
//       { key: "p8",  title: "Prod. & distr. d’énergie" },
//       { key: "p9",  title: "Achat de biens" },
//       { key: "p10", title: "Biens immobiliers" },
//       { key: "p11", title: "Déchets" },
//       { key: "p12", title: "Transp. amont" },
//       { key: "p13", title: "Déplacements" },
//     ];
//   }, [activeGroup]);

//   // totals placeholder; wire to your store when ready
//   const totalTco2e = 4.255;

//   // UI states
//   if (!userId && !loading) {
//     return (
//       <Box bg={pageBg} minH="100vh" display="flex" alignItems="center" justifyContent="center">
//         <Text fontSize="lg" color="gray.600">Veuillez vous connecter.</Text>
//       </Box>
//     );
//   }

//   if (loading) {
//     return (
//       <Box bg={pageBg} minH="100vh" display="flex" alignItems="center" justifyContent="center">
//         <Spinner size="xl" />
//       </Box>
//     );
//   }

//   const isBilan = selectedMenu === "bilan" || activeTop === "bilan";

//   return (
//     <Box display="flex" bg={pageBg} minH="100vh">
//       {/* Left: compact rail */}
//       <SidebarRail
//         activeGroup={isBilan ? null : activeGroup}
//         activeTop={activeTop}
//         onGroupChange={(g) => {
//           setActiveTop("dashboard");
//           setActiveGroup(g);
//           if (g === "direct") setSelectedMenu(activeDirectKey || "refrigerants");
//           if (g === "energie") setSelectedMenu("products");
//           if (g === "indirect") setSelectedMenu("p8");
//         }}
//         onTopSelect={(k) => {
//           setActiveTop(k);
//           if (k === "dashboard") setSelectedMenu("dashboard");
//           if (k === "bilan") { setActiveGroup(null); setSelectedMenu("bilan"); }
//           if (k === "rapport") setSelectedMenu("rapport");
//         }}
//         onNotificationsClick={() => {
//           setActiveTop("dashboard");
//           setActiveGroup(null);
//           setSelectedMenu("notifications");
//         }}
//       />

//       {/* Right: page container */}
//       <Box flex={1} px={{ base: 4, md: 8 }} py={{ base: 6, md: 10 }} color={COL.textBody}>
//         <Stack maxW="1200px" mx="auto" spacing={6}>
//           {/* Title + help icon */}
//           {!isBilan &&
//             typeof selectedMenu === "string" &&
//             isPosteKey(selectedMenu) && (
//               <HStack justify="space-between" align="center">
//                 <Heading as="h1" size="lg">{groupTitle}</Heading>
//                 <HelpCircle size={18} />
//               </HStack>
//             )
//           }

//           {/* Pills */}
//           {!isBilan && currentPills.length > 0 && (
//             <HStack mt={2} spacing={4} wrap="wrap">
//               {currentPills.map((tab) => {
//                 const active = selectedMenu === tab.key;
//                 const disabled = (tab as any).disabled;
//                 return (
//                   <Box
//                     key={String(tab.key)}
//                     as="button"
//                     onClick={() => !disabled && setSelectedMenu(String(tab.key))}
//                     px={4}
//                     h="32px"
//                     rounded="16px"
//                     border="1px solid"
//                     borderColor={active ? COL.greenPill : "#DAD7CD"}
//                     bg={active ? COL.greenPill : "white"}
//                     color={active ? "white" : COL.textBody}
//                     fontWeight={active ? "bold" : "normal"}
//                     fontSize="sm"
//                     display="flex"
//                     alignItems="center"
//                     justifyContent="center"
//                     cursor={disabled ? "not-allowed" : "pointer"}
//                     opacity={disabled ? 0.45 : 1}
//                     _hover={!active && !disabled ? { borderColor: COL.greenPill } : {}}
//                   >
//                     {tab.title}
//                   </Box>
//                 );
//               })}
//             </HStack>
//           )}

//           {/* Header cards (left description + right total) */}
//           {!isBilan &&
//             typeof selectedMenu === "string" &&
//             isPosteKey(selectedMenu) && (
//               <HStack align="stretch" spacing={6}>
//                 <Box
//                   flex="1"
//                   bg={COL.surface}
//                   rounded="2xl"
//                   p={{ base: 5, md: 6 }}
//                   border="1px solid"
//                   borderColor={COL.border}
//                   boxShadow={cardShadow}
//                 >
//                   <VStack align="flex-start" spacing={2}>
//                     <Heading as="h2" size="md">{currentMeta?.posteTitle ?? "Poste"}</Heading>
//                     <Text color={COL.textMuted}>
//                       {currentMeta?.description ?? "Section — page à venir."}
//                     </Text>
//                   </VStack>
//                 </Box>

//                 <Box
//                   w={{ base: "100%", md: "380px" }}
//                   bg={COL.surfaceMuted}
//                   rounded="2xl"
//                   p={{ base: 6, md: 7 }}
//                   border="1px solid"
//                   borderColor={COL.border}
//                   boxShadow={cardShadow}
//                 >
//                   <VStack spacing={4} align="stretch">
//                     <Heading as="h3" size="sm" color={COL.textBody}>
//                       Votre consommation totale :
//                     </Heading>
//                     <Heading as="p" size="lg" lineHeight="1.1" color={COL.greenBar}>
//                       {Number(totalTco2e).toLocaleString("fr-CA", { maximumFractionDigits: 3 })} t de CO²e
//                     </Heading>
//                     <HStack
//                       alignSelf="flex-start"
//                       bg="white"
//                       rounded="full"
//                       px={5}
//                       h="40px"
//                       spacing={3}
//                       boxShadow="0 8px 16px rgba(0,0,0,0.15)"
//                       border="1px solid"
//                       borderColor="rgba(0,0,0,0.06)"
//                     >
//                       <Text fontWeight="semibold" color={COL.textMuted}>Section en cours</Text>
//                       <Box
//                         as="span"
//                         w="22px"
//                         h="22px"
//                         rounded="full"
//                         bg="#e7ebe6"
//                         display="inline-flex"
//                         alignItems="center"
//                         justifyContent="center"
//                         fontSize="xs"
//                         color={COL.textMuted}
//                       >
//                         2
//                       </Box>
//                     </HStack>
//                   </VStack>
//                 </Box>
//               </HStack>
//             )
//           }

//           {/* --------- Dynamic content --------- */}
//           {selectedMenu === "dashboard" && <NewDashboard />}

//           {selectedMenu === "notifications" && <NotificationsPage />}

//           {selectedMenu === "bilan" && <DashboardPage />}

//           {selectedMenu === "combustion_fixes" &&
//             renderOrPlaceholder("combustion_fixes", <Poste1Page />)}
//           {selectedMenu === "combustion_mobiles" &&
//             renderOrPlaceholder("combustion_mobiles", <Poste2Page />)}
//           {selectedMenu === "refrigerants" &&
//             renderOrPlaceholder("refrigerants", <RefrigerantsPage />)}

//           {selectedMenu === "products" &&
//             renderOrPlaceholder("products", <Poste6Page />)}
//           {selectedMenu === "autre_energie" &&
//             renderOrPlaceholder(
//               "autre_energie",
//               <Box bg="white" p={6} rounded="lg" border="1px solid" borderColor={COL.border}>
//                 <Text>Autres énergies (poste 7) — Page à venir.</Text>
//               </Box>
//             )}

//           {/* simple placeholder for indirects for now */}
//           {["p8","p9","p10","p11","p12","p13","p14","p15","p16","p17","p18","p19","p20","p21","p22","p23"].includes(String(selectedMenu)) && (
//             <Box bg="white" p={6} rounded="lg" border="1px solid" borderColor={COL.border}>
//               <Text>
//                 Section « {POSTE_META[String(selectedMenu)]?.posteTitle ?? selectedMenu} » — page à venir.
//               </Text>
//             </Box>
//           )}

//           {selectedMenu === "rapport" && (
//             <Box bg="white" p={6} rounded="lg" border="1px solid" borderColor={COL.border}>
//               <Text>Rapport — page à venir.</Text>
//             </Box>
//           )}
//         </Stack>
//       </Box>
//     </Box>
//   );
// }
