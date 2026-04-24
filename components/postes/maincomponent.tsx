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

import SidebarRail from "./SidebarRail";

import NewDashboard from "#components/newdashboard";
import DashboardPage from "#components/postes/dash";

import Categorie1Page from "#components/postes/Categorie1/main";
import Categorie2EnergiePage from "#components/postes/-Categorie2-poste6/main";
import Categorie3Page from "#components/postes/Categorie 3/main";
import Categorie4Page from "#components/postes/Categorie4/main";
import Categorie5Page from "#components/postes/Categorie5/main";

import NotificationsPage from "#components/postes/entreprise";
import WizardPage from "#components/postes/WizardPage";
import UserSourcesPopup from "#components/UserSourcesPopup";
import SaisieGuidePage from "#components/postes/SaisieGuidePage";
import RapportPage from "#components/postes/RapportPage";
import { HiddenPostePlaceholder } from "../../components/postes/HiddenPostePlaceholder";

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
};

type PosteRow = { id: string; label: string; num?: number };
type TopKey = "dashboard" | "bilan" | "rapport" | "wizard";

type GroupKey =
  | "direct"
  | "energie_importee"
  | "transports"
  | "produits_utilises"
  | "utilisation_produits"
  | "autres_indirects";

type IsoCategoryKey = "cat1" | "cat2" | "cat3" | "cat4" | "cat5" | "cat6";

/**
 * ✅ REMOVED old p7..p23 logic for Cat 3
 * Cat 3 now uses only:
 * - p31 => 3.1 Transport en amont
 * - p32 => 3.2 Transport en aval
 * - p33 => 3.3 Navettage des employés
 * - p34 => 3.4 Déplacement des clients
 * - p35 => 3.5 Déplacement d'affaires
 */
const menuToIsoCategory = (menuKey: string): IsoCategoryKey => {
  if (["combustion_fixes", "combustion_mobiles", "procedes", "refrigerants", "sols"].includes(menuKey)) return "cat1";
  if (["products", "autre_energie"].includes(menuKey)) return "cat2";
  if (["p31", "p32", "p33", "p34", "p35"].includes(menuKey)) return "cat3";
  if (["p41", "p43"].includes(menuKey)) return "cat4";
  if (["p51", "p52"].includes(menuKey)) return "cat5";
  return "cat6";
};

const defaultMenuForCategory: Record<IsoCategoryKey, string> = {
  cat1: "combustion_fixes",
  cat2: "products",
  cat3: "p31",
  cat4: "p41",
  cat5: "p51",
  cat6: "p23",
};

const isoToGroup = (cat: IsoCategoryKey): GroupKey => {
  if (cat === "cat1") return "direct";
  if (cat === "cat2") return "energie_importee";
  if (cat === "cat3") return "transports";
  if (cat === "cat4") return "produits_utilises";
  if (cat === "cat5") return "utilisation_produits";
  return "autres_indirects";
};

const groupToIso = (g: GroupKey): IsoCategoryKey => {
  if (g === "direct") return "cat1";
  if (g === "energie_importee") return "cat2";
  if (g === "transports") return "cat3";
  if (g === "produits_utilises") return "cat4";
  if (g === "utilisation_produits") return "cat5";
  return "cat6";
};

/** ✅ DB TRUTH: categories map to poste.num */
const isoToPosteNum: Record<IsoCategoryKey, number> = {
  cat1: 1,
  cat2: 2,
  cat3: 3,
  cat4: 4,
  cat5: 5,
  cat6: 6,
};

const ALL_SOURCES_IN_ORDER = [
  "combustion_fixes", "combustion_mobiles", "procedes", "refrigerants", "sols",
  "products", "autre_energie",
  "p31", "p32", "p33", "p34", "p35",
  "p41", "p43",
  "p51", "p52",
];

const DISABLED_SOURCES = new Set(["procedes", "sols", "autre_energie"]);

const SOURCE_TO_POSTE_NUM: Record<string, number> = {
  combustion_fixes: 1, combustion_mobiles: 1, procedes: 1, refrigerants: 1, sols: 1,
  products: 2, autre_energie: 2,
  p31: 3, p32: 3, p33: 3, p34: 3, p35: 3,
  p41: 4, p43: 4,
  p51: 5, p52: 5,
};

const SOURCE_TO_ISO: Record<string, IsoCategoryKey> = {
  combustion_fixes: 'cat1', combustion_mobiles: 'cat1', procedes: 'cat1', refrigerants: 'cat1', sols: 'cat1',
  products: 'cat2', autre_energie: 'cat2',
  p31: 'cat3', p32: 'cat3', p33: 'cat3', p34: 'cat3', p35: 'cat3',
  p41: 'cat4', p43: 'cat4',
  p51: 'cat5', p52: 'cat5',
};

const CQ_LAST_SOURCE_KEY = 'cq_last_source';

const POSTE_META: Record<string, { groupTitle: string; posteTitle: string; description: string }> = {
  combustion_fixes: {
    groupTitle: "Émissions directs",
    posteTitle: "Poste 1",
    description: "Saisissez vos combustibles fixes (chaudières, fours, etc.).",
  },
  combustion_mobiles: {
    groupTitle: "Émissions directs",
    posteTitle: "Poste 1",
    description: "Saisissez vos véhicules / équipements mobiles.",
  },
  refrigerants: {
    groupTitle: "Émissions directs",
    posteTitle: "Poste 1",
    description: "Suivez les réfrigérants (fuites, remplissages, etc.).",
  },
  procedes: {
    groupTitle: "Émissions directs",
    posteTitle: "Poste 1",
    description: "Procédés — à venir.",
  },
  sols: {
    groupTitle: "Émissions directs",
    posteTitle: "Poste 1",
    description: "Usage des sols — à venir.",
  },

  products: {
    groupTitle: "Émissions indirects de l'énergie importée",
    posteTitle: "Poste 2",
    description: "Énergie importée (électricité).",
  },
  autre_energie: {
    groupTitle: "Émissions indirects de l'énergie importée",
    posteTitle: "Poste 2",
    description: "Autres énergies importées — à venir.",
  },

  // Cat 4
  p41: {
    groupTitle: "Émissions indirectes hors énergie et transport",
    posteTitle: "Catégorie 4",
    description: "4.1 — Technologies numériques et consommables de bureau.",
  },
  p43: {
    groupTitle: "Émissions indirectes hors énergie et transport",
    posteTitle: "Catégorie 4",
    description: "4.3 — Traitement des eaux usées.",
  },

  // Cat 3 (new)
  p31: {
    groupTitle: "Émissions indirects des transports",
    posteTitle: "Poste 3",
    description: "3.1 — Transport en amont.",
  },
  p32: {
    groupTitle: "Émissions indirects des transports",
    posteTitle: "Poste 3",
    description: "3.2 — Transport en aval.",
  },
  p33: {
    groupTitle: "Émissions indirects des transports",
    posteTitle: "Poste 3",
    description: "3.3 — Navettage des employés.",
  },
  p34: {
    groupTitle: "Émissions indirects des transports",
    posteTitle: "Poste 3",
    description: "3.4 — Déplacement des clients.",
  },
  p35: {
    groupTitle: "Émissions indirects des transports",
    posteTitle: "Poste 3",
    description: "3.5 — Déplacement d'affaires.",
  },

  // Cat 5
  p51: {
    groupTitle: "Émissions indirectes liées à l'utilisation des produits vendus",
    posteTitle: "Catégorie 5",
    description: "5.1 — Utilisation directe des produits vendus (énergie).",
  },
  p52: {
    groupTitle: "Émissions indirectes liées à l'utilisation des produits vendus",
    posteTitle: "Catégorie 5",
    description: "5.2 — Fin de vie des produits vendus.",
  },
};

export default function Section({ bilanId }: { bilanId?: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showSourcesPopup, setShowSourcesPopup] = useState(false);
  const [posteVisibility, setPosteVisibility] = useState<Record<string, boolean>>({});
  const [postes, setPostes] = useState<PosteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [catTotals, setCatTotals] = useState<Record<string, number>>({});
  const totalTco2e = useMemo(
    () => Object.values(catTotals).reduce((a, b) => a + b, 0),
    [catTotals]
  );
  const [posteIds, setPosteIds] = useState<string[]>([]);

  const [selectedMenu, setSelectedMenu] = useState<TopKey | string>("dashboard");
  const [activeTop, setActiveTop] = useState<TopKey>("dashboard");
  const [activeGroup, setActiveGroup] = useState<GroupKey | null>("direct");
  const [activeCategory, setActiveCategory] = useState<IsoCategoryKey>("cat1");
  const [lastSource, setLastSource] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(CQ_LAST_SOURCE_KEY) : null
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: profile } = await supabase
          .from("user_profiles").select("role").eq("id", uid).single();
        const role = profile?.role ?? null;
        setUserRole(role);
        // Show sources popup once per session for "user" role accounts
        if (role === "user" && typeof sessionStorage !== "undefined") {
          const key = `cq_sources_popup_${uid}`;
          if (!sessionStorage.getItem(key)) {
            setShowSourcesPopup(true);
            sessionStorage.setItem(key, "1");
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  const fetchTotal = async (uid: string) => {
    const qs = new URLSearchParams({ user_id: uid });
    if (bilanId) qs.set("bilan_id", bilanId);
    const dashRes = await fetch(`/api/dashboard?${qs}`);
    if (dashRes.ok) {
      const dashData = await dashRes.json();
      // db total intentionally not stored here — per-category forms supply live totals via onGesChange
    }
  };

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        // Resolve the user's company first, then fetch only that company's postes
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("company_id")
          .eq("id", userId)
          .single();

        const companyId = profile?.company_id;

        if (companyId) {
          const { data: postesData } = await supabase
            .from("postes")
            .select("id, label, num")
            .eq("company_id", companyId)
            .order("num", { ascending: true });
          const rows = (postesData ?? []) as PosteRow[];
          setPostes(rows);
          setPosteIds(rows.map((p) => p.id));
        }

        const { data: visRows } = await supabase
          .from("poste_visibility")
          .select("poste_id, is_hidden")
          .eq("user_id", userId);

        const visMap: Record<string, boolean> = {};
        (visRows ?? []).forEach((row: any) => { visMap[row.poste_id] = row.is_hidden; });
        setPosteVisibility(visMap);

        await fetchTotal(userId);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  // Realtime: refresh total whenever any poste_source row is inserted or updated
  useEffect(() => {
    if (!userId || posteIds.length === 0) return;

    const channel = supabase
      .channel("poste_sources_total")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poste_sources",
        },
        () => {
          fetchTotal(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, posteIds]);

  useEffect(() => {
    if (typeof selectedMenu !== "string") return;
    if (["dashboard", "bilan", "rapport", "notifications"].includes(selectedMenu)) return;

    const cat = menuToIsoCategory(selectedMenu);
    setActiveCategory(cat);
    if (activeTop !== "bilan") setActiveGroup(isoToGroup(cat));
  }, [selectedMenu, activeTop]);

  const posteIdForMenu = (menuKey: string) => {
    const cat = menuToIsoCategory(menuKey);
    const targetNum = isoToPosteNum[cat];
    const poste = postes.find((p) => Number(p.num) === targetNum);
    return poste?.id;
  };

  const renderOrPlaceholder = (menuKey: string, component: JSX.Element) => {
    const poste_id = posteIdForMenu(menuKey);
    const isHidden = poste_id ? posteVisibility[poste_id] : false;
    const label =
      postes.find((p) => p.id === poste_id)?.label ??
      `Poste ${isoToPosteNum[menuToIsoCategory(menuKey)]}`;

    if (poste_id && isHidden) return <HiddenPostePlaceholder label={label} />;
    return component;
  };

  const isPosteKey = (k: string) =>
    ["combustion_fixes", "combustion_mobiles", "refrigerants", "products", "autre_energie", "procedes", "sols"].includes(k) ||
    ["p31", "p32", "p33", "p34", "p35"].includes(k) ||
    ["p41", "p43"].includes(k) ||
    ["p51", "p52"].includes(k);

  const getNextVisibleSource = (currentKey: string): string | null => {
    const idx = ALL_SOURCES_IN_ORDER.indexOf(currentKey);
    if (idx === -1) return null;
    for (let i = idx + 1; i < ALL_SOURCES_IN_ORDER.length; i++) {
      const key = ALL_SOURCES_IN_ORDER[i];
      if (DISABLED_SOURCES.has(key)) continue;
      const posteNum = SOURCE_TO_POSTE_NUM[key];
      const poste = postes.find(p => Number(p.num) === posteNum);
      if (poste && posteVisibility[poste.id]) continue;
      return key;
    }
    return null;
  };

  const getPrevVisibleSource = (currentKey: string): string | null => {
    const idx = ALL_SOURCES_IN_ORDER.indexOf(currentKey);
    if (idx === -1) return null;
    for (let i = idx - 1; i >= 0; i--) {
      const key = ALL_SOURCES_IN_ORDER[i];
      if (DISABLED_SOURCES.has(key)) continue;
      const posteNum = SOURCE_TO_POSTE_NUM[key];
      const poste = postes.find(p => Number(p.num) === posteNum);
      if (poste && posteVisibility[poste.id]) continue;
      return key;
    }
    return null;
  };

  const nextVisibleSource = useMemo(() => {
    if (!isPosteKey(String(selectedMenu))) return null;
    return getNextVisibleSource(String(selectedMenu));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMenu, postes, posteVisibility]);

  const prevVisibleSource = useMemo(() => {
    if (!isPosteKey(String(selectedMenu))) return null;
    return getPrevVisibleSource(String(selectedMenu));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMenu, postes, posteVisibility]);

  const goToSource = (key: string) => {
    setSelectedMenu(key);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Save last source to localStorage whenever the user navigates to a source */
  useEffect(() => {
    const key = String(selectedMenu);
    if (isPosteKey(key)) {
      localStorage.setItem(CQ_LAST_SOURCE_KEY, key);
      setLastSource(key);
    }
  }, [selectedMenu]);

  /* Navigate back to the last visited source, restoring all sidebar state */
  const resumeLastSource = (key: string) => {
    const iso = SOURCE_TO_ISO[key];
    if (iso) {
      setActiveCategory(iso);
      setActiveGroup(isoToGroup(iso));
    }
    setActiveTop("dashboard");
    goToSource(key);
  };

  const currentMeta = typeof selectedMenu === "string" ? POSTE_META[selectedMenu] : undefined;
  const groupTitle = currentMeta?.groupTitle ?? "Section";

  const currentPills = useMemo(() => {
    if (activeCategory === "cat1") {
      return [
        { key: "combustion_fixes", title: "1.1 Combustions fixes" },
        { key: "combustion_mobiles", title: "1.2 Combustions mobiles" },
        { key: "procedes", title: "1.3 Procédés", disabled: true },
        { key: "refrigerants", title: "1.4 Émissions fugitives" },
        { key: "sols", title: "1.5 Usage des sols", disabled: true },
      ];
    }
    if (activeCategory === "cat2") {
      return [
        { key: "products", title: "2.1 Énergie importée (électricité)" },
        { key: "autre_energie", title: "2.2 Autres énergies importées", disabled: true },
      ];
    }
    if (activeCategory === "cat3") {
      return [
        { key: "p31", title: "3.1 Transport en amont" },
        { key: "p32", title: "3.2 Transport en aval" },
        { key: "p33", title: "3.3 Navettage des employés" },
        { key: "p34", title: "3.4 Déplacement des clients" },
        { key: "p35", title: "3.5 Déplacement d'affaires" },
      ];
    }
    if (activeCategory === "cat4") {
      return [
        { key: "p41", title: "4.1 Numérique & consommables" },
        { key: "p43", title: "4.3 Eaux usées" },
      ];
    }
    if (activeCategory === "cat5") {
      return [
        { key: "p51", title: "5.1 Utilisation des produits" },
        { key: "p52", title: "5.2 Fin de vie des produits" },
      ];
    }
    return [];
  }, [activeCategory]);

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
      {/* Sources popup for "user" role — shown once per session */}
      {userId && showSourcesPopup && (
        <UserSourcesPopup
          userId={userId}
          isOpen={showSourcesPopup}
          onClose={() => setShowSourcesPopup(false)}
        />
      )}

      <SidebarRail
        activeGroup={isBilan ? null : activeGroup}
        activeTop={activeTop}
        onGroupChange={(g) => {
          setActiveTop("dashboard");
          setActiveGroup(g);
          const cat = groupToIso(g);
          setActiveCategory(cat);
          setSelectedMenu(defaultMenuForCategory[cat]);
        }}
        onTopSelect={(k) => {
          setActiveTop(k);
          if (k === "dashboard") setSelectedMenu("dashboard");
          if (k === "bilan") { setActiveGroup(null); setSelectedMenu("bilan"); }
          if (k === "rapport") setSelectedMenu("rapport");
          if (k === "wizard") { setActiveGroup(null); setSelectedMenu("wizard"); }
        }}
        onNotificationsClick={() => {
          setActiveTop("dashboard");
          setActiveGroup(null);
          setSelectedMenu("notifications");
        }}
      />

      <Box
        flex={1}
        bg={pageBg}
        px={isDashboard ? 0 : { base: 4, md: 8 }}
        py={isDashboard ? 0 : { base: 6, md: 10 }}
        color={COL.textBody}
      >
        {isDashboard ? (
          <NewDashboard
            hasStarted={!!lastSource}
            onStartGuide={() => {
              if (lastSource) resumeLastSource(lastSource);
              else setSelectedMenu("guide");
            }}
          />
        ) : selectedMenu === "guide" ? (
          <SaisieGuidePage
            onStartWizard={() => { setActiveTop("wizard"); setSelectedMenu("wizard"); setActiveGroup(null); }}
            onGoToCategory={(cat) => {
              const g = cat as GroupKey;
              setActiveTop("dashboard");
              setActiveGroup(g);
              const iso = groupToIso(g);
              setActiveCategory(iso);
              setSelectedMenu(defaultMenuForCategory[iso]);
            }}
          />
        ) : (
          <Stack maxW="1200px" mx="auto" spacing={6}>
            {!isBilan && typeof selectedMenu === "string" && isPosteKey(selectedMenu) && (
              <HStack justify="space-between" align="center">
                <Heading as="h1" size="lg">{groupTitle}</Heading>
                <HelpCircle size={18} />
              </HStack>
            )}

            {!isBilan && selectedMenu !== "notifications" && currentPills.length > 0 && (
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

            {!isBilan && typeof selectedMenu === "string" && isPosteKey(selectedMenu) && (
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
                    <Text color={COL.textMuted}>{currentMeta?.description ?? "Section — page à venir."}</Text>
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
                    <Heading as="h3" size="sm">Votre consommation totale :</Heading>
                    <Heading as="p" size="lg" lineHeight="1.1" color={COL.greenBar}>
                      {Number(totalTco2e).toLocaleString("fr-CA", { maximumFractionDigits: 3 })} t de CO²e
                    </Heading>
                  </VStack>
                </Box>
              </HStack>
            )}

            {/* --------- Dynamic content --------- */}
            {selectedMenu === "notifications" && <NotificationsPage />}
            {selectedMenu === "bilan" && <DashboardPage />}
            {selectedMenu === "wizard" && (
              <WizardPage onFinish={() => { setActiveTop("bilan"); setSelectedMenu("bilan"); }} />
            )}

            {/* ✅ Cat 1 */}
            {["combustion_fixes","combustion_mobiles","refrigerants","procedes","sols"].includes(String(selectedMenu)) &&
              renderOrPlaceholder(
                String(selectedMenu),
                <Categorie1Page
                  activeSubKey={String(selectedMenu)}
                  bilanId={bilanId}
                  onNextSource={nextVisibleSource ? () => goToSource(nextVisibleSource) : undefined}
                  onPrevSource={prevVisibleSource ? () => goToSource(prevVisibleSource) : undefined}
                  onGesChange={(t) => setCatTotals(prev => ({ ...prev, cat1: t }))}
                />
              )
            }

            {/* ✅ Cat 2 */}
            {["products","autre_energie"].includes(String(selectedMenu)) &&
              renderOrPlaceholder(
                String(selectedMenu),
                <Categorie2EnergiePage
                  activeSubKey={String(selectedMenu)}
                  bilanId={bilanId}
                  onNextSource={nextVisibleSource ? () => goToSource(nextVisibleSource) : undefined}
                  onPrevSource={prevVisibleSource ? () => goToSource(prevVisibleSource) : undefined}
                  onGesChange={(t) => setCatTotals(prev => ({ ...prev, cat2: t }))}
                />
              )
            }

            {/* ✅ Cat 3 */}
            {["p31","p32","p33","p34","p35"].includes(String(selectedMenu)) &&
              renderOrPlaceholder(
                String(selectedMenu),
                <Categorie3Page
                  activeSubKey={String(selectedMenu)}
                  bilanId={bilanId}
                  onNextSource={nextVisibleSource ? () => goToSource(nextVisibleSource) : undefined}
                  onPrevSource={prevVisibleSource ? () => goToSource(prevVisibleSource) : undefined}
                  onGesChange={(t) => setCatTotals(prev => ({ ...prev, cat3: t }))}
                />
              )
            }

            {/* ✅ Cat 4 */}
            {["p41","p43"].includes(String(selectedMenu)) &&
              renderOrPlaceholder(
                String(selectedMenu),
                <Categorie4Page
                  activeSubKey={String(selectedMenu)}
                  bilanId={bilanId}
                  onNextSource={nextVisibleSource ? () => goToSource(nextVisibleSource) : undefined}
                  onPrevSource={prevVisibleSource ? () => goToSource(prevVisibleSource) : undefined}
                  onGesChange={(t) => setCatTotals(prev => ({ ...prev, cat4: t }))}
                />
              )
            }

            {/* ✅ Cat 5 */}
            {["p51","p52"].includes(String(selectedMenu)) &&
              renderOrPlaceholder(
                String(selectedMenu),
                <Categorie5Page
                  activeSubKey={String(selectedMenu)}
                  bilanId={bilanId}
                  onNextSource={nextVisibleSource ? () => goToSource(nextVisibleSource) : undefined}
                  onPrevSource={prevVisibleSource ? () => goToSource(prevVisibleSource) : undefined}
                  onGesChange={(t) => setCatTotals(prev => ({ ...prev, cat5: t }))}
                />
              )
            }

            {selectedMenu === "rapport" && <RapportPage bilanId={bilanId} />}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

