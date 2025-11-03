'use client';

import { useState, useEffect, useMemo } from "react";
import { Box, Spinner, Text, VStack } from "@chakra-ui/react";
import { supabase } from "../../lib/supabaseClient";

// compact rail
import SidebarRail from "./SidebarRail";

// 2nd-level navs
import DirectSecondLevel from "./navig/DirectSecondLevel";
import EnergieSecondLevel from "./navig/EnergieSecondLevel";
import IndirectSecondLevel from "./navig/IndirectSecondLevel";

// Hidden placeholder + your poste screens
import { HiddenPostePlaceholder } from "../../components/postes/HiddenPostePlaceholder";
import DashboardPage from "#components/postes/dash";

// Directes
import Poste1Page from "#components/postes/poste1/main";
import Poste2Page from "#components/postes/poste2/main";
import RefrigerantsPage from "#components/postes/poste4/main";

// Énergie
import Poste6Page from "#components/postes/poste6/main";

// Entreprise / misc
import ProductsAndFleetPage from "#components/postes/entreprise";

// ---------------------------
type PosteRow = { id: string | number; poste_label: string };

type DirectKey =
  | "combustion_fixes"
  | "combustion_mobiles"
  | "procedes"
  | "refrigerants"
  | "sols";

type DirectItem = {
  key: DirectKey;
  label: string;
  selected?: boolean;
  active?: boolean;
  disabled?: boolean;
};

type EnergieKey = "products" | "autre_energie";
type EnergieItem = { key: EnergieKey; label: string };

type IndirectItem = { key: string; label: string; disabled?: boolean };

type GroupKey = "direct" | "energie" | "indirect";
type TopKey = "dashboard" | "bilan" | "rapport";

// ---------------------------
const DIRECT_ITEMS: DirectItem[] = [
  { key: "combustion_fixes",   label: "Combustions fixes",  selected: true,  active: false },
  { key: "combustion_mobiles", label: "Combustions mobiles", selected: true, active: false },
  { key: "procedes",           label: "Procédés",            disabled: true },
  { key: "refrigerants",       label: "Réfrigérants",        active: true },
  { key: "sols",               label: "Sols et forêts",      disabled: true },
];

const ENERGIE_ITEMS: EnergieItem[] = [
  { key: "products",       label: "Électricité" },
  { key: "autre_energie",  label: "Autres énergies" },
];

const INDIRECT_ITEMS: IndirectItem[] = [
  { key: "p8",  label: "Prod. et distr. d’énergie" },
  { key: "p9",  label: "Achat de biens" },
  { key: "p10", label: "Biens immobiliers" },
  { key: "p11", label: "Génération de déchets" },
  { key: "p12", label: "Transp. et distr. amont" },
  { key: "p13", label: "Déplacements" },
  { key: "p14", label: "Location d’actif en amont", disabled: true },
  { key: "p15", label: "Investissements" },
  { key: "p16", label: "Clients & visiteurs" },
  { key: "p17", label: "Transp. et distr. aval" },
  { key: "p18", label: "Produits vendus (usage)" },
  { key: "p19", label: "Fin de vie des produits" },
  { key: "p20", label: "Franchises en aval" },
  { key: "p21", label: "Location d’actif en aval" },
  { key: "p22", label: "Navettages des employés" },
  { key: "p23", label: "Autres sources" },
];

// DB label mapping
const posteLabelByMenu: Record<string, string> = {
  combustion_fixes:   "Émissions directes des sources de combustions fixes",
  combustion_mobiles: "Combustion Mobile",
  refrigerants:       "Émissions fugitives directes (Réfrigérants)",
  products:           "Electricite",
  autre_energie:      "Consommation autres énergies",
};

function Section() {
  // auth & data
  const [userId, setUserId] = useState<string | null>(null);
  const [posteVisibility, setPosteVisibility] = useState<Record<string | number, boolean>>({});
  const [postes, setPostes] = useState<PosteRow[]>([]);
  const [loading, setLoading] = useState(true);

  // content routing
  const [selectedMenu, setSelectedMenu] = useState<TopKey | string>("dashboard");

  // 2nd-level state
  const [directItems, setDirectItems] = useState<DirectItem[]>(DIRECT_ITEMS);
  const activeDirectKey = useMemo<DirectKey>(
    () => directItems.find((i) => i.active)?.key ?? "refrigerants",
    [directItems]
  );
  const [energieActive, setEnergieActive] = useState<EnergieKey>("products");
  const [indirectActive, setIndirectActive] = useState<string>(INDIRECT_ITEMS[0].key);

  // sidebar rail state
  const [activeGroup, setActiveGroup] = useState<GroupKey | null>("direct");
  const [activeTop, setActiveTop] = useState<TopKey>("dashboard");

  // user
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setLoading(false);
    })();
  }, []);

  // data
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
      } catch (e) {
        console.error("[Section] Error fetching data:", e);
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

  // interactions
  const toggleDirectSelect = (key: DirectKey) =>
    setDirectItems(prev =>
      prev.map(i => (i.key === key ? { ...i, selected: !Boolean(i.selected) } : i))
    );

  const activateDirect = (key: DirectKey) => {
    setDirectItems(prev => prev.map(i => ({ ...i, active: i.key === key })));
    setSelectedMenu(key);
  };

  const changeEnergie = (key: EnergieKey) => {
    setEnergieActive(key);
    setSelectedMenu(key);
  };

  const changeIndirect = (key: string) => {
    setIndirectActive(key);
    setSelectedMenu(key);
  };

  // UI states
  if (!userId && !loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minH="60vh">
        <Text fontSize="xl" color="gray.500">Veuillez vous connecter.</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minH="60vh">
        <Spinner size="xl" />
      </Box>
    );
  }

  const isBilan = selectedMenu === "bilan" || activeTop === "bilan";

  return (
    <Box display="flex">
      {/* Sidebar rail stays; only the TOP nav in content hides on Bilan */}
      <SidebarRail
        activeGroup={isBilan ? null : activeGroup}
        activeTop={activeTop}
        onGroupChange={(g) => {
          // if switching groups, leave 'bilan' mode
          setActiveTop("dashboard");
          setActiveGroup(g);
          if (g === "direct") setSelectedMenu(activeDirectKey || "refrigerants");
          if (g === "energie") setSelectedMenu(energieActive || "products");
          if (g === "indirect") setSelectedMenu(indirectActive || "p8");
        }}
        onTopSelect={(k) => {
          setActiveTop(k);
          if (k === "dashboard") setSelectedMenu("dashboard");
          if (k === "bilan") {
            // hide top second-level bars: set group to null and show bilan
            setActiveGroup(null);
            setSelectedMenu("bilan");
          }
          if (k === "rapport") setSelectedMenu("rapport");
        }}
      />

      {/* Right content */}
      <Box flex={1} p={8} bg="#F3F6EF" minH="120vh">
        <VStack align="stretch" spacing={6}>
          {/* Hide ALL 2nd-level nav bars on Bilan */}
          {!isBilan && activeGroup === "direct" && (
            <DirectSecondLevel
              items={directItems}
              onToggleSelect={toggleDirectSelect}
              onActivate={activateDirect}
            />
          )}

          {!isBilan && activeGroup === "energie" && (
            <EnergieSecondLevel
              items={ENERGIE_ITEMS}
              activeKey={energieActive}
              onChange={changeEnergie}
            />
          )}

          {!isBilan && activeGroup === "indirect" && (
            <IndirectSecondLevel
              items={INDIRECT_ITEMS}
              activeKey={indirectActive}
              onChange={changeIndirect}
              onHelp={() => alert("Aide: explications des catégories indirectes.")}
            />
          )}

          {/* CONTENT AREA */}
          {/* Dashboard blank */}
          {selectedMenu === "dashboard" && <Box bg="transparent" p={0} />}

          {/* Bilan full page (no top nav bars) */}
          {selectedMenu === "bilan" && <DashboardPage />}

          {/* --- Directes --- */}
          {selectedMenu === "combustion_fixes" &&
            renderOrPlaceholder("combustion_fixes", <Poste1Page />)}
          {selectedMenu === "combustion_mobiles" &&
            renderOrPlaceholder("combustion_mobiles", <Poste2Page />)}
          {selectedMenu === "refrigerants" &&
            renderOrPlaceholder("refrigerants", <RefrigerantsPage />)}

          {/* --- Énergie --- */}
          {selectedMenu === "products" &&
            renderOrPlaceholder("products", <Poste6Page />)}
          {selectedMenu === "autre_energie" &&
            renderOrPlaceholder(
              "autre_energie",
              <Box bg="white" p={6} rounded="lg">
                <Text>Autres énergies (poste 7) — Page à venir.</Text>
              </Box>
            )}

          {/* --- Indirectes (placeholders for now) --- */}
          {INDIRECT_ITEMS.some(i => i.key === selectedMenu) && (
            <Box bg="white" p={6} rounded="lg">
              <Text>
                Section « {INDIRECT_ITEMS.find(i => i.key === selectedMenu)?.label} » — page à venir.
              </Text>
            </Box>
          )}

          {/* Rapport placeholder */}
          {selectedMenu === "rapport" && (
            <Box bg="white" p={6} rounded="lg">
              <Text>Rapport — page à venir.</Text>
            </Box>
          )}

          {/* Keep refunds mapping if still used */}
          {selectedMenu === "refunds" &&
            renderOrPlaceholder("sales", <ProductsAndFleetPage />)}
        </VStack>
      </Box>
    </Box>
  );
}

export default Section;




// import { useState, useEffect } from "react";
// import { Box, Spinner, Text } from "@chakra-ui/react";
// import SidebarWithContent from "../../components/postes/multilevelsidebar";
// import { supabase } from "../../lib/supabaseClient";
// import { HiddenPostePlaceholder } from "../../components/postes/HiddenPostePlaceholder";
// import Poste6Page from "#components/postes/poste6/main"
// import Poste1Page from "#components/postes/poste1/main"
// import Réfrigérants from "#components/postes/poste4/main"
// import { ElectricityForm } from "#components/postes/ElectricityForm";
// import { CombustionMobileForm } from "#components/postes/2combustionmobile";
// import DashboardPage from "#components/postes/dash";
// import ProductsAndFleetPage from '#components/postes/entreprise'
// import Poste2Page from "#components/postes/poste2/main"
// // Map menu keys to poste_label
// const posteLabelByMenu = {
//   products: "Electricite",
//   sales: "Combustion Mobile",
//   // refunds: "GesDashboard", // add others as needed
// };

// function Section() {
//   const [userId, setUserId] = useState<string | null>(null);
//   const [selectedMenu, setSelectedMenu] = useState("dashboard");
//   const [posteVisibility, setPosteVisibility] = useState<{ [poste_id: string]: boolean }>({});
//   const [postes, setPostes] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   // Get current user
//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       const { data: { user } } = await supabase.auth.getUser();
//       if (user && user.id) setUserId(user.id);
//       else setUserId(null);
//     })();
//   }, []);

//   // Fetch postes and visibility
//   useEffect(() => {
//     if (!userId) {
//       setLoading(false);
//       return;
//     }
//     setLoading(true);

//     async function fetchData() {
//       try {
//         // Fetch all postes
//         const { data: postesData } = await supabase.from("postes").select("*");
//         setPostes(postesData ?? []);

//         // Fetch visibility for current user (poste_visibility table)
//         const { data: visRows } = await supabase
//           .from("poste_visibility")
//           .select("poste_id, is_hidden")
//           .eq("user_id", userId);

//         // Map poste_id -> is_hidden
//         const visMap: { [poste_id: string]: boolean } = {};
//         (visRows ?? []).forEach((row: any) => {
//           visMap[row.poste_id] = row.is_hidden;
//         });
//         setPosteVisibility(visMap);
//       } catch (e) {
//         setPosteVisibility({});
//         console.error("[Section] Error fetching poste visibility:", e);
//       }
//       setLoading(false);
//     }

//     fetchData();
//   }, [userId]);

//   if (!userId && !loading) {
//     return (
//       <Box display="flex" alignItems="center" justifyContent="center" minH="60vh">
//         <Text fontSize="xl" color="gray.500">Veuillez vous connecter.</Text>
//       </Box>
//     );
//   }

//   if (loading) {
//     return (
//       <Box display="flex" alignItems="center" justifyContent="center" minH="60vh">
//         <Spinner size="xl" />
//       </Box>
//     );
//   }

//   // Helper: find poste_id for a given menu key
//   function posteIdForMenu(menuKey: string) {
//     const label = posteLabelByMenu[menuKey];
//     const poste = postes.find((p) => p.poste_label === label);
//     return poste?.id;
//   }

//   // Render component or placeholder if poste is hidden
//   function renderOrPlaceholder(menuKey: string, Component: React.ReactNode) {
//     const poste_id = posteIdForMenu(menuKey);
//     const isHidden = poste_id ? posteVisibility[poste_id] : false;
//     const label = posteLabelByMenu[menuKey] || menuKey;
//     if (poste_id && isHidden) {
//       return <HiddenPostePlaceholder label={label} />;
//     }
//     return Component;
//   }

//   return (
//     <Box display="flex">
//       <SidebarWithContent onSelect={setSelectedMenu} selectedMenu={selectedMenu} />
//       <Box flex={1} p={8} bg="#F3F6EF" minH="120vh">
//         {/* {selectedMenu === "dashboard" && <ProductsAndFleetPage />} */}
//         {selectedMenu === "refunds" && renderOrPlaceholder("sales", <ProductsAndFleetPage />)}  
//         {selectedMenu === "dashboard" && <DashboardPage />}
//         {selectedMenu === "Émissions directes des sources de combustions fixes" && renderOrPlaceholder("Émissions directes des sources de combustions fixes", <Poste1Page/>)}
//         {selectedMenu === "products" && renderOrPlaceholder("products", <Poste6Page />)}
//         {selectedMenu === "sales" && renderOrPlaceholder("sales", <Poste2Page />)}
//         {selectedMenu === "Émissions fugitives directes (Réfrigérants)" && renderOrPlaceholder("Émissions fugitives directes (Réfrigérants)", <Réfrigérants/>)}
        
//         {/* add more menu items as needed */}
//       </Box>
//     </Box>
//   );
// }

// export default Section;

