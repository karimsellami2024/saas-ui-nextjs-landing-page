import { useState, useEffect } from "react";
import { Box, Spinner, Text } from "@chakra-ui/react";
import SidebarWithContent from "../../components/postes/multilevelsidebar";
import { supabase } from "../../lib/supabaseClient";
import { HiddenPostePlaceholder } from "../../components/postes/HiddenPostePlaceholder";
import Poste6Page from "#components/postes/poste6/main"
import Poste1Page from "#components/postes/poste1/main"
import Réfrigérants from "#components/postes/poste4/main"
import { ElectricityForm } from "#components/postes/ElectricityForm";
import { CombustionMobileForm } from "#components/postes/2combustionmobile";
import DashboardPage from "#components/postes/dash";
import ProductsAndFleetPage from '#components/postes/entreprise'
import Poste2Page from "#components/postes/poste2/main"
// Map menu keys to poste_label
const posteLabelByMenu = {
  products: "Electricite",
  sales: "Combustion Mobile",
  // refunds: "GesDashboard", // add others as needed
};

function Section() {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedMenu, setSelectedMenu] = useState("dashboard");
  const [posteVisibility, setPosteVisibility] = useState<{ [poste_id: string]: boolean }>({});
  const [postes, setPostes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current user
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id) setUserId(user.id);
      else setUserId(null);
    })();
  }, []);

  // Fetch postes and visibility
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    async function fetchData() {
      try {
        // Fetch all postes
        const { data: postesData } = await supabase.from("postes").select("*");
        setPostes(postesData ?? []);

        // Fetch visibility for current user (poste_visibility table)
        const { data: visRows } = await supabase
          .from("poste_visibility")
          .select("poste_id, is_hidden")
          .eq("user_id", userId);

        // Map poste_id -> is_hidden
        const visMap: { [poste_id: string]: boolean } = {};
        (visRows ?? []).forEach((row: any) => {
          visMap[row.poste_id] = row.is_hidden;
        });
        setPosteVisibility(visMap);
      } catch (e) {
        setPosteVisibility({});
        console.error("[Section] Error fetching poste visibility:", e);
      }
      setLoading(false);
    }

    fetchData();
  }, [userId]);

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

  // Helper: find poste_id for a given menu key
  function posteIdForMenu(menuKey: string) {
    const label = posteLabelByMenu[menuKey];
    const poste = postes.find((p) => p.poste_label === label);
    return poste?.id;
  }

  // Render component or placeholder if poste is hidden
  function renderOrPlaceholder(menuKey: string, Component: React.ReactNode) {
    const poste_id = posteIdForMenu(menuKey);
    const isHidden = poste_id ? posteVisibility[poste_id] : false;
    const label = posteLabelByMenu[menuKey] || menuKey;
    if (poste_id && isHidden) {
      return <HiddenPostePlaceholder label={label} />;
    }
    return Component;
  }

  return (
    <Box display="flex">
      <SidebarWithContent onSelect={setSelectedMenu} selectedMenu={selectedMenu} />
      <Box flex={1} p={8} bg="#F3F6EF" minH="120vh">
        {/* {selectedMenu === "dashboard" && <ProductsAndFleetPage />} */}

        {selectedMenu === "dashboard" && <DashboardPage />}
        {selectedMenu === "Émissions directes des sources de combustions fixes" && renderOrPlaceholder("Émissions directes des sources de combustions fixes", <Poste1Page/>)}
        {selectedMenu === "products" && renderOrPlaceholder("products", <Poste6Page />)}
        {selectedMenu === "sales" && renderOrPlaceholder("sales", <Poste2Page />)}
        {selectedMenu === "Émissions fugitives directes (Réfrigérants)" && renderOrPlaceholder("Émissions fugitives directes (Réfrigérants)", <Réfrigérants/>)}
        {selectedMenu === "refunds" && renderOrPlaceholder("sales", <ProductsAndFleetPage />)}
        {/* add more menu items as needed */}
      </Box>
    </Box>
  );
}

export default Section;



// 'use client'

// import { useState, useEffect } from "react";
// import { Box, Spinner, Text } from "@chakra-ui/react";
// import SidebarWithContent from "../../components/postes/multilevelsidebar";
// import { supabase } from "../../lib/supabaseClient";
// import { HiddenPostePlaceholder } from "../../components/postes/HiddenPostePlaceholder";

// import { ElectricityForm } from "#components/postes/ElectricityForm";
// import { CombustionMobileForm } from "#components/postes/2combustionmobile";
// import { GesDashboard } from "#components/postes/dashboard";
// import DashboardPage from "#components/postes/dash";

// // Map menu keys to poste_label
// const posteLabelByMenu = {
//   products: "Electricite",
//   sales: "Combustion Mobile",
//   refunds: "GesDashboard", // adjust as needed
// };

// function Section() {
//     const [userId, setUserId] = useState<string | null>(null);

//   const [selectedMenu, setSelectedMenu] = useState("dashboard");
//   const [posteVisibility, setPosteVisibility] = useState({});
//   const [loading, setLoading] = useState(true);
  

//   // Instead of useSession, get user from supabase.auth
//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       const { data: { user } } = await supabase.auth.getUser();
//       if (user && user.id) {
//         setUserId(user.id);
//       } else {
//         setUserId(null);
//         setLoading(false);
//       }
//     })();
//   }, []);

//   useEffect(() => {
//     // Only fetch if we have a userId
//     if (!userId) return;
//     setLoading(true);

//     async function fetchVisibility() {
//       try {
//         const res = await fetch(`/api/poste-visibility?user_id=${userId}`);
//         if (!res.ok) throw new Error("API error: " + res.statusText);
//         const data = await res.json();
//         setPosteVisibility(data.posteVisibility || {});
//       } catch (e) {
//         setPosteVisibility({});
//         console.error("[Section] Error fetching poste visibility:", e);
//       }
//       setLoading(false);
//     }

//     fetchVisibility();
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

//   // Helper to render component or placeholder if hidden
//   function renderOrPlaceholder(menuKey, Component) {
//     const label = posteLabelByMenu[menuKey];
//     const isHidden = posteVisibility[label];
//     if (label && isHidden) {
//       return <HiddenPostePlaceholder label={label} />;
//     }
//     return Component;
//   }

//   return (
//     <Box display="flex">
//       <SidebarWithContent onSelect={setSelectedMenu} selectedMenu={selectedMenu} />
//       <Box flex={1} p={8} bg="#F3F6EF" minH="100vh">
//         {selectedMenu === "dashboard" && <DashboardPage />}
//         {selectedMenu === "products" && renderOrPlaceholder("products", <ElectricityForm />)}
//         {selectedMenu === "sales" && renderOrPlaceholder("sales", <CombustionMobileForm />)}
//         {/* {selectedMenu === "refunds" && renderOrPlaceholder("refunds", <GesDashboard />)}
//         {selectedMenu === "inbox" && <Text fontSize="xl">Inbox content...</Text>}
//         {selectedMenu === "users" && <Text fontSize="xl">Users content...</Text>}
//         {selectedMenu === "signIn" && <Text fontSize="xl">Sign in form...</Text>}
//         {selectedMenu === "signUp" && <Text fontSize="xl">Sign up form...</Text>} */}
//       </Box>
//     </Box>
//   );
// }

// export default Section;
