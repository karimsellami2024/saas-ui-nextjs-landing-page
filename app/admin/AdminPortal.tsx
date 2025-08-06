import React, { useEffect, useState } from "react";
import {
  Box, Table, Thead, Tbody, Tr, Th, Td, Switch, Spinner,
  Text, Heading, useToast, Stack
} from "@chakra-ui/react";
import { supabase } from '../../lib/supabaseClient';

// Types
interface User {
  id: string;
  email: string;
  name?: string;
  company_id?: string;
  role?: string;
}
interface Poste {
  id: string;
  label: string;
  num: number;
  enabled: boolean;
}
interface Source {
  id: string;
  poste_id: string;
  source_code: string;
  label: string;
  enabled: boolean;
}
interface VisibilityRow {
  user_id: string;
  poste_id: string;
  source_code: string;
  is_hidden: boolean;
}
interface Company {
  id: string;
  name: string;
}

const AdminPortal: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [sourcesByPoste, setSourcesByPoste] = useState<Record<string, Source[]>>({});
  const [visibilities, setVisibilities] = useState<VisibilityRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // For add employee form
  const [creating, setCreating] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    name: "",
    password: "",
    company_id: "",
  });

  const toast = useToast();

  // Lookup: user_poste_source -> is_hidden
  const visMap: Record<string, boolean> = {};
  visibilities.forEach(row => {
    visMap[`${row.user_id}_${row.poste_id}_${row.source_code}`] = !!row.is_hidden;
  });
  const companyMap: Record<string, string> = {};
  companies.forEach(c => { companyMap[c.id] = c.name; });

  // Refresh user list (call after creation)
  const refreshUserList = async (companyId: string, role: string) => {
    let usersQuery = supabase.from("full_user_profiles").select("*");
    if (role !== "super_admin") {
      usersQuery = usersQuery.eq("company_id", companyId);
    }
    const { data: users } = await usersQuery;
    setUsers(users ?? []);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      // 1. Get current user
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) {
        setLoading(false);
        return;
      }
      // 2. Get user profile (role, company)
      const { data: profile } = await supabase
        .from("full_user_profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (!profile) {
        toast({
          title: "Erreur",
          description: "Impossible de charger votre profil utilisateur.",
          status: "error",
          duration: 8000,
          isClosable: true,
        });
        setLoading(false);
        return;
      }
      setCurrentUser(profile);
      const companyId = profile.company_id;
      const role = profile.role;

      // 3. Fetch users
      await refreshUserList(companyId, role);

      // 4. Fetch postes for the admin's company (enabled only)
      const { data: postes } = await supabase
        .from("postes")
        .select("*")
        .eq("enabled", true)
        .eq("company_id", companyId);
      setPostes(postes ?? []);

      // 5. Fetch sources for those postes (direct from poste_sources)
      let sourcesByPosteObj: Record<string, Source[]> = {};
      const posteIds = (postes ?? []).map((p: Poste) => p.id);
      if (posteIds.length > 0) {
        const { data: allSources } = await supabase
          .from("poste_sources")
          .select("*")
          .in("poste_id", posteIds);
        if (allSources) {
          posteIds.forEach(pid => {
            sourcesByPosteObj[pid] = allSources.filter((s: any) => s.poste_id === pid);
          });
        }
      }
      setSourcesByPoste(sourcesByPosteObj);

      // 6. Fetch visibilities for those users/postes
      const { data: usersList } = await supabase
        .from("full_user_profiles")
        .select("*")
        .eq("company_id", companyId);

      const userIds = (usersList ?? []).map((u: User) => u.id);
      let visData: VisibilityRow[] = [];
      if (userIds.length && posteIds.length) {
        const { data: visibilities } = await supabase
          .from("poste_source_visibility")
          .select("*")
          .in("user_id", userIds)
          .in("poste_id", posteIds);
        visData = visibilities ?? [];
      }
      setVisibilities(visData);

      // 7. Fetch all companies (for super_admin only)
      if (role === "super_admin") {
        const { data: companies } = await supabase.from("companies").select("id, name");
        setCompanies(companies ?? []);
      } else {
        // Fetch just the current company for label
        if (companyId) {
          const { data: company } = await supabase
            .from("companies")
            .select("id, name")
            .eq("id", companyId)
            .single();
          setCompanies(company ? [company] : []);
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, []);

  // Toggle handler for per-source switch
  const handleToggle = async (
    user_id: string,
    poste_id: string,
    source_code: string,
    isHidden: boolean
  ) => {
    // Only super_admin OR admin (not on themselves or other admins) can toggle
    if (
      !currentUser ||
      (currentUser.role !== "super_admin" &&
        (currentUser.role !== "admin" || currentUser.id === user_id))
    ) {
      toast({
        title: "Action non autorisée",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    const resp = await fetch("/api/admin/set-poste-source-visibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id,
        poste_id,
        source_code,
        is_hidden: isHidden,
      }),
    });
    const result = await resp.json();
    if (!resp.ok) {
      toast({
        title: "Erreur",
        description: result.error || "Une erreur est survenue",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    setVisibilities((prev) => {
      const idx = prev.findIndex(
        (v) =>
          v.user_id === user_id &&
          v.poste_id === poste_id &&
          v.source_code === source_code
      );
      if (idx !== -1) {
        const newArr = [...prev];
        newArr[idx] = { ...newArr[idx], is_hidden: isHidden };
        return newArr;
      } else {
        return [...prev, { user_id, poste_id, source_code, is_hidden: isHidden }];
      }
    });
    toast({
      title: isHidden ? "Source masquée" : "Source affichée",
      status: "success",
      duration: 1500,
      isClosable: true,
    });
  };

  // Employee creation handler (fixed: only insert available columns)
  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      // 1. Signup with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: newEmployee.email,
        password: newEmployee.password,
      });
      if (error) throw error;

      // 2. Determine company assignment
      let company_id = "";
      if (currentUser?.role === "super_admin") {
        company_id = newEmployee.company_id;
      } else {
        company_id = currentUser?.company_id || "";
      }
      if (!company_id) {
        throw new Error("Aucune entreprise sélectionnée !");
      }

      // 3. Insert in user_profiles (ONLY columns that exist)
      if (data.user) {
        const { error: insertError } = await supabase
          .from("user_profiles")
          .insert([
            {
              id: data.user.id,
              company_id,
              role: "user",
            }
          ]);
        if (!currentUser) {
          toast({
            title: "Erreur",
            description: "Utilisateur non identifié.",
            status: "error",
            duration: 4000,
            isClosable: true,
          });
          setCreating(false);
          return;
        }
        await refreshUserList(company_id, currentUser.role!);
        if (insertError) throw insertError;
      }
      toast({
        title: "Employé créé !",
        description: "Un email d’activation a été envoyé.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setNewEmployee({ email: "", name: "", password: "", company_id: "" });
    } catch (err: any) {
      toast({
        title: "Erreur à la création",
        description: err.message,
        status: "error",
        duration: 7000,
        isClosable: true,
      });
    }
    setCreating(false);
  }

  if (loading) return <Spinner size="xl" mt={10} />;

  return (
    <Box maxW="95vw" mx="auto" mt={10}>
      <Heading as="h1" size="lg" mb={8} color="#00496F">
        {currentUser?.role === "super_admin"
          ? "Super Admin : Gestion de la visibilité des sources GES"
          : "Admin : Gestion de la visibilité des sources GES par utilisateur"}
      </Heading>

      {/* --- Add Employee Section --- */}
      {(currentUser?.role === "super_admin" || currentUser?.role === "admin") && (
        <Box mb={8} p={6} bg="gray.50" rounded="xl" boxShadow="md">
          <Heading size="sm" mb={3}>Ajouter un employé</Heading>
          <form onSubmit={handleCreateEmployee}>
            <Stack direction={{ base: "column", md: "row" }} spacing={4}>
              <input
                type="email"
                placeholder="Email"
                required
                value={newEmployee.email}
                onChange={e => setNewEmployee(n => ({ ...n, email: e.target.value }))}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
              />
              <input
                type="text"
                placeholder="Nom"
                value={newEmployee.name}
                onChange={e => setNewEmployee(n => ({ ...n, name: e.target.value }))}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Mot de passe (min. 6 caractères)"
                value={newEmployee.password}
                onChange={e => setNewEmployee(n => ({ ...n, password: e.target.value }))}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
              />
              {/* Add company selector for super_admin */}
              {currentUser?.role === "super_admin" && (
                <select
                  required
                  value={newEmployee['company_id'] || ""}
                  onChange={e => setNewEmployee(n => ({ ...n, company_id: e.target.value }))}
                  style={{ padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}
                >
                  <option value="" disabled>Sélectionner une entreprise</option>
                  {companies.map(c => (
                    <option value={c.id} key={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              <button
                type="submit"
                disabled={creating || !newEmployee.email || !newEmployee.password || (currentUser?.role === "super_admin" && !newEmployee['company_id'])}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "#005c7a",
                  color: "#fff",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  opacity: creating ? 0.6 : 1,
                }}
              >
                {creating ? "Création..." : "Créer"}
              </button>
            </Stack>
            <Text fontSize="sm" mt={2} color="gray.500">
              L’utilisateur recevra un email d’activation et devra cliquer sur le lien pour activer son compte.
            </Text>
          </form>
        </Box>
      )}

      {/* --- Main Table --- */}
      <Box overflowX="auto">
        <Table size="sm" variant="striped">
          <Thead>
            <Tr>
              <Th minW="170px">Utilisateur (email)</Th>
              {currentUser?.role === "super_admin" && <Th>Entreprise</Th>}
              {postes.map((poste) =>
                (sourcesByPoste[poste.id] || []).map((source) => (
                  <Th key={poste.id + source.source_code}>
                    {poste.label} <br />({source.source_code})
                  </Th>
                ))
              )}
            </Tr>
          </Thead>
          <Tbody>
            {users.map((user) => (
              <Tr key={user.id}>
                <Td>
                  <Text fontWeight="bold">{user.email}</Text>
                </Td>
                {currentUser?.role === "super_admin" && (
                  <Td>
                    {user.company_id ? companyMap[user.company_id] || user.company_id : ""}
                  </Td>
                )}
                {postes.map((poste) =>
                  (sourcesByPoste[poste.id] || []).map((source) => {
                    const key = `${user.id}_${poste.id}_${source.source_code}`;
                    const isHidden = visMap[key] || false;
                    // --- Only show toggle for:
                    //   - super_admin always
                    //   - admin, but only for their employees (not for themselves or other admins)
                    const canEdit =
                      currentUser?.role === "super_admin" ||
                      (currentUser?.role === "admin" &&
                        user.company_id === currentUser.company_id &&
                        user.id !== currentUser.id &&
                        user.role !== "admin" &&
                        user.role !== "super_admin");
                    return (
                      <Td key={poste.id + source.source_code} textAlign="center">
                        {canEdit ? (
                          <>
                            <Switch
                              isChecked={!isHidden}
                              colorScheme="teal"
                              onChange={(e) =>
                                handleToggle(user.id, poste.id, source.source_code, !e.target.checked)
                              }
                              size="md"
                            />
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {isHidden ? "Masqué" : "Affiché"}
                            </Text>
                          </>
                        ) : (
                          <Text fontSize="xs" color="gray.400">
                            {isHidden ? "Masqué" : "Affiché"}
                          </Text>
                        )}
                      </Td>
                    );
                  })
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default AdminPortal;






// import React, { useEffect, useState } from "react";
// import {
//   Box,
//   Table,
//   Thead,
//   Tbody,
//   Tr,
//   Th,
//   Td,
//   Switch,
//   Spinner,
//   Text,
//   Heading,
//   useToast,
// } from "@chakra-ui/react";
// import { supabase } from '../../lib/supabaseClient'

// // Types
// interface User {
//   id: string;
//   email: string;
//   name?: string;
//   company_id?: string;
//   role?: string;
// }

// interface Poste {
//   id: string;
//   poste_num: number;
//   poste_label: string;
// }

// interface VisibilityRow {
//   user_id: string;
//   poste_id: string;
//   is_hidden: boolean;
// }

// interface Company {
//   id: string;
//   name: string;
// }

// // Component
// const AdminPortal: React.FC = () => {
//   const [users, setUsers] = useState<User[]>([]);
//   const [postes, setPostes] = useState<Poste[]>([]);
//   const [visibilities, setVisibilities] = useState<VisibilityRow[]>([]);
//   const [companies, setCompanies] = useState<Company[]>([]);
//   const [currentUser, setCurrentUser] = useState<User | null>(null);
//   const [loading, setLoading] = useState(true);
//   const toast = useToast();

//   // Build visMap for lookup
//   const visMap: Record<string, boolean> = {};
//   visibilities.forEach((row) => {
//     visMap[`${row.user_id}_${row.poste_id}`] = !!row.is_hidden;
//   });

//   // Build companyId => name map for easy lookup
//   const companyMap: Record<string, string> = {};
//   companies.forEach(c => { companyMap[c.id] = c.name; });

//   useEffect(() => {
//     (async () => {
//       setLoading(true);

//       // 1. Get current user
//       const { data: authData } = await supabase.auth.getUser();
//       const authUser = authData?.user;
//       if (!authUser) {
//         setLoading(false);
//         return;
//       }

//       // 2. Get current user profile for role/company
//       const { data: profile, error: profileError } = await supabase
//         .from("user_profiles")
//         .select("*")
//         .eq("id", authUser.id)
//         .single();

//       if (profileError || !profile) {
//         toast({
//           title: "Erreur",
//           description: "Impossible de charger votre profil utilisateur.",
//           status: "error",
//           duration: 8000,
//           isClosable: true,
//         });
//         setLoading(false);
//         return;
//       }

//       setCurrentUser(profile);

//       // 3. Fetch users (all for super_admin, filtered for admin)
//       let usersQuery = supabase.from("user_profiles").select("*");
//       if (profile.role !== "super_admin") {
//         usersQuery = usersQuery.eq("company_id", profile.company_id);
//       }
//       const { data: users, error: usersError } = await usersQuery;
//       setUsers(users ?? []);

//       // 4. Fetch postes (all)
//       const { data: postes } = await supabase.from("postes").select("*");
//       setPostes(postes ?? []);

//       // 5. Fetch visibilities for these users
//       const userIds = (users ?? []).map((u: User) => u.id);
//       let visData: VisibilityRow[] = [];
//       if (userIds.length > 0) {
//         const { data: visibilities } = await supabase
//           .from("poste_visibility")
//           .select("*")
//           .in("user_id", userIds);
//         visData = visibilities ?? [];
//       }
//       setVisibilities(visData);

//       // 6. Fetch all companies (only needed for super_admin)
//       if (profile.role === "super_admin") {
//         const { data: companies } = await supabase.from("companies").select("id, name");
//         setCompanies(companies ?? []);
//       } else {
//         setCompanies([]); // No need for company name lookup
//       }

//       setLoading(false);
//     })();
//     // eslint-disable-next-line
//   }, []);

//   // Toggle handler
//   const handleToggle = async (user_id: string, poste_id: string, isHidden: boolean) => {
//     const resp = await fetch("/api/admin/set-poste-visibility", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         user_id,
//         poste_id,
//         is_hidden: isHidden,
//       }),
//     });
//     const result = await resp.json();
//     if (!resp.ok) {
//       toast({
//         title: "Erreur",
//         description: result.error || "Une erreur est survenue",
//         status: "error",
//         duration: 4000,
//         isClosable: true,
//       });
//       return;
//     }
//     // Update visibilities in state
//     setVisibilities((prev) => {
//       const idx = prev.findIndex((v) => v.user_id === user_id && v.poste_id === poste_id);
//       if (idx !== -1) {
//         const newArr = [...prev];
//         newArr[idx] = { ...newArr[idx], is_hidden: isHidden };
//         return newArr;
//       } else {
//         return [...prev, { user_id, poste_id, is_hidden: isHidden }];
//       }
//     });
//     toast({
//       title: isHidden ? "Poste masqué" : "Poste affiché",
//       status: "success",
//       duration: 1500,
//       isClosable: true,
//     });
//   };

//   if (loading) return <Spinner size="xl" mt={10} />;

//   return (
//     <Box maxW="95vw" mx="auto" mt={10}>
//       <Heading as="h1" size="lg" mb={8} color="#00496F">
//         {currentUser?.role === "super_admin"
//           ? "Super Admin : Gestion de la visibilité des postes GES"
//           : "Admin : Gestion de la visibilité des postes GES par utilisateur"}
//       </Heading>
//       <Box overflowX="auto">
//         <Table size="sm" variant="striped">
//           <Thead>
//             <Tr>
//               <Th minW="170px">Utilisateur</Th>
//               {currentUser?.role === "super_admin" && <Th>Entreprise</Th>}
//               {postes.map((poste) => (
//                 <Th key={poste.id}>
//                   {poste.poste_label || `Poste ${poste.poste_num}`}
//                 </Th>
//               ))}
//             </Tr>
//           </Thead>
//           <Tbody>
//             {users.map((user) => (
//               <Tr key={user.id}>
//                 <Td>
//                   <Text fontWeight="bold">{user.name || user.email}</Text>
//                 </Td>
//                 {currentUser?.role === "super_admin" && (
//                   <Td>
//                     {user.company_id ? companyMap[user.company_id] || user.company_id : ""}
//                   </Td>
//                 )}
//                 {postes.map((poste) => {
//                   const key = `${user.id}_${poste.id}`;
//                   const isHidden = visMap[key] || false;
//                   return (
//                     <Td key={poste.id} textAlign="center">
//                       <Switch
//                         isChecked={!isHidden}
//                         colorScheme="teal"
//                         onChange={(e) =>
//                           handleToggle(user.id, poste.id, !e.target.checked)
//                         }
//                         size="md"
//                         isDisabled={
//                           currentUser?.role !== "super_admin" &&
//                           currentUser?.id === user.id &&
//                           user.role === "admin"
//                         }
//                       />
//                       <Text fontSize="xs" color="gray.500" mt={1}>
//                         {isHidden ? "Masqué" : "Affiché"}
//                       </Text>
//                     </Td>
//                   );
//                 })}
//               </Tr>
//             ))}
//           </Tbody>
//         </Table>
//       </Box>
//     </Box>
//   );
// };

// export default AdminPortal;



// import React, { useEffect, useState } from "react";
// import {
//   Box,
//   Table,
//   Thead,
//   Tbody,
//   Tr,
//   Th,
//   Td,
//   Switch,
//   Spinner,
//   Text,
//   Heading,
//   useToast,
// } from "@chakra-ui/react";

// // Types
// interface User {
//   id: string;
//   email: string;
//   name?: string;
// }

// interface Poste {
//   id: string;
//   poste_num: number;
//   poste_label: string;
// }

// interface VisibilityRow {
//   user_id: string;
//   poste_id: string;
//   is_hidden: boolean;
// }

// // Component
// const AdminPortal: React.FC = () => {
//   const [users, setUsers] = useState<User[]>([]);
//   const [postes, setPostes] = useState<Poste[]>([]);
//   const [visibilities, setVisibilities] = useState<VisibilityRow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const toast = useToast();

//   // Map for quick lookups
//   const visMap: Record<string, boolean> = {};
//   visibilities.forEach((row) => {
//     visMap[`${row.user_id}_${row.poste_id}`] = !!row.is_hidden;
//   });

//   // Fetch everything from backend
//   useEffect(() => {
//     setLoading(true);
//     fetch("/api/admin/list-all")
//       .then((res) => res.json())
//       .then((data) => {
//         setUsers(data.users || []);
//         setPostes(data.postes || []);
//         setVisibilities(data.visibilities || []);
//         setLoading(false);
//       })
//       .catch((err) => {
//         toast({
//           title: "Erreur lors du chargement des données.",
//           description: err.message,
//           status: "error",
//           duration: 8000,
//           isClosable: true,
//         });
//         setLoading(false);
//       });
//     // eslint-disable-next-line
//   }, []);

//   // Toggle handler
//   const handleToggle = async (user_id: string, poste_id: string, isHidden: boolean) => {
//     const resp = await fetch("/api/admin/set-poste-visibility", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         user_id,
//         poste_id,
//         is_hidden: isHidden,
//       }),
//     });
//     const result = await resp.json();
//     if (!resp.ok) {
//       toast({
//         title: "Erreur",
//         description: result.error || "Une erreur est survenue",
//         status: "error",
//         duration: 4000,
//         isClosable: true,
//       });
//       return;
//     }
//     // Update visibilities in state
//     setVisibilities((prev) => {
//       // Find if exists
//       const idx = prev.findIndex((v) => v.user_id === user_id && v.poste_id === poste_id);
//       if (idx !== -1) {
//         // Update existing
//         const newArr = [...prev];
//         newArr[idx] = { ...newArr[idx], is_hidden: isHidden };
//         return newArr;
//       } else {
//         // Add new entry
//         return [...prev, { user_id, poste_id, is_hidden: isHidden }];
//       }
//     });
//     toast({
//       title: isHidden ? "Poste masqué" : "Poste affiché",
//       status: "success",
//       duration: 1500,
//       isClosable: true,
//     });
//   };

//   if (loading) return <Spinner size="xl" mt={10} />;

//   return (
//     <Box maxW="95vw" mx="auto" mt={10}>
//       <Heading as="h1" size="lg" mb={8} color="#00496F">
//         Admin : Gestion de la visibilité des postes GES par utilisateur
//       </Heading>
//       <Box overflowX="auto">
//         <Table size="sm" variant="striped">
//           <Thead>
//             <Tr>
//               <Th minW="170px">Utilisateur</Th>
//               {postes.map((poste) => (
//                 <Th key={poste.id}>
//                   {poste.poste_label || `Poste ${poste.poste_num}`}
//                 </Th>
//               ))}
//             </Tr>
//           </Thead>
//           <Tbody>
//             {users.map((user) => (
//               <Tr key={user.id}>
//                 <Td>
//                   <Text fontWeight="bold">{user.name || user.email}</Text>
//                 </Td>
//                 {postes.map((poste) => {
//                   const key = `${user.id}_${poste.id}`;
//                   const isHidden = visMap[key] || false;
//                   return (
//                     <Td key={poste.id} textAlign="center">
//                       <Switch
//                         isChecked={!isHidden}
//                         colorScheme="teal"
//                         onChange={(e) =>
//                           handleToggle(user.id, poste.id, !e.target.checked)
//                         }
//                         size="md"
//                       />
//                       <Text fontSize="xs" color="gray.500" mt={1}>
//                         {isHidden ? "Masqué" : "Affiché"}
//                       </Text>
//                     </Td>
//                   );
//                 })}
//               </Tr>
//             ))}
//           </Tbody>
//         </Table>
//       </Box>
//     </Box>
//   );
// };

// export default AdminPortal;
