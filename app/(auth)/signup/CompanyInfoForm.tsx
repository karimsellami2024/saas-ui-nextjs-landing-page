import React, { useState } from "react";
import { Box, Button, Input, VStack, Text } from "@chakra-ui/react";
import { supabase } from "../../../lib/supabaseClient";

interface CompanyInfoFormProps {
  userId: string;
  onComplete: () => void;
}

type Poste = {
  id: string;
  label: string;
  num: number;
  enabled: boolean;
  company_id: string;
};

type PosteInsert = {
  label: string;
  num: number;
  enabled: boolean;
  company_id: string;
};

type PostSourceInsert = {
  poste_id: string;
  source_code: string;
  label: string;
  enabled: boolean;
};

export default function CompanyInfoForm({ userId, onComplete }: CompanyInfoFormProps) {
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      /* ------------------------------------------------------------------ */
      /* 1) Create company                                                   */
      /* ------------------------------------------------------------------ */
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .insert([{ name: company }])
        .select()
        .single();

      if (companyError) throw new Error(companyError.message);

      /* ------------------------------------------------------------------ */
      /* 2) Create postes                                                    */
      /* ------------------------------------------------------------------ */
      // ✅ IMPORTANT: Catégorie 1 = poste 1, Catégorie 2 = poste 2, Catégorie 3 = poste 3
      // We DO NOT create an extra poste 6 anymore (it was causing confusion).
      const defaultPostes: PosteInsert[] = [
        {
          label: "Catégorie 1 - Émissions directs",
          num: 1,
          enabled: true,
          company_id: companyData.id,
        },
        {
          label: "Catégorie 2 - Émissions indirects de l'énergie importée",
          num: 2,
          enabled: true,
          company_id: companyData.id,
        },
        {
          // ✅ This is now explicitly poste 3
          label: "Catégorie 3 - Émissions indirects des transports",
          num: 3,
          enabled: true,
          company_id: companyData.id,
        },
      ];

      const { data: postesData, error: postesError } = await supabase
        .from("postes")
        .insert(defaultPostes)
        .select();

      if (postesError) throw new Error(postesError.message);

      /* ------------------------------------------------------------------ */
      /* 3) Build poste map                                                  */
      /* ------------------------------------------------------------------ */
      const postesByNum: Record<number, Poste> = {};
      (postesData as Poste[]).forEach((p) => {
        postesByNum[p.num] = p;
      });

      const poste1Id = postesByNum[1]?.id;
      const poste2Id = postesByNum[2]?.id;
      const poste3Id = postesByNum[3]?.id;

      if (!poste1Id) throw new Error("Poste 1 introuvable");
      if (!poste2Id) throw new Error("Poste 2 introuvable");
      if (!poste3Id) throw new Error("Poste 3 introuvable");

      /* ------------------------------------------------------------------ */
      /* 4) Assign sources                                                   */
      /* ------------------------------------------------------------------ */
      // ✅ Poste 1 = category 1 (directs) → 1A1 + (2A1/2A3/2B1) + (4A1/4B1/4B2)
      // ✅ Poste 2 = category 2 (énergie importée) → 6A1 + 6B1
      // ✅ Poste 3 = category 3 (transports) → 3A1 (Navettage)
      const sourcesToInsert: PostSourceInsert[] = [
        /* ---------- POSTE 1 : Catégorie 1 – Émissions directs ---------- */
        {
          poste_id: poste1Id,
          source_code: "1A1",
          label: "Quantité de combustible comptabilisé à partir des factures",
          enabled: true,
        },
        {
          poste_id: poste1Id,
          source_code: "2A1",
          label: "Quantité de combustible comptabilisé à partir des factures",
          enabled: true,
        },
        {
          poste_id: poste1Id,
          source_code: "2B1",
          label: "Par la distance parcourue (Marque, modèle, année connus)",
          enabled: true,
        },
        {
          poste_id: poste1Id,
          source_code: "2A3",
          label: "À partir des coûts d'essence",
          enabled: true,
        },
        {
          poste_id: poste1Id,
          source_code: "4A1",
          label: "Quantité rapportée par le frigoriste",
          enabled: true,
        },
        {
          poste_id: poste1Id,
          source_code: "4B1",
          label: "Moyenne de l'industrie (climatisation véhicules)",
          enabled: true,
        },
        {
          poste_id: poste1Id,
          source_code: "4B2",
          label: "Données des véhicules (climatisation véhicules)",
          enabled: true,
        },

        /* ---------- POSTE 2 : Catégorie 2 – Énergie importée ---------- */
        {
          poste_id: poste2Id,
          source_code: "6A1",
          label: "Quantité d'électricité comptabilisée à partir des factures (Location-based)",
          enabled: true,
        },
        {
          poste_id: poste2Id,
          source_code: "6B1",
          label: "Quantité d'électricité comptabilisée à partir des factures (Market-based)",
          enabled: true,
        },

        /* ---------- POSTE 3 : Catégorie 3 – Transports ---------- */
        {
          poste_id: poste3Id,
          source_code: "3A1",
          label: "Navettage des employés",
          enabled: true,
        },
      ];

      const { error: sourcesError } = await supabase.from("poste_sources").insert(sourcesToInsert);
      if (sourcesError) throw new Error(sourcesError.message);

      /* ------------------------------------------------------------------ */
      /* 5) Visibility defaults                                              */
      /* ------------------------------------------------------------------ */
      const posteVisibilityRows = (postesData as Poste[]).map((p) => ({
        user_id: userId,
        poste_id: p.id,
        is_hidden: false,
      }));

      const { error: visError } = await supabase.from("poste_visibility").insert(posteVisibilityRows);
      // don't block signup on duplicates etc
      if (visError) {
        // optionally console.log(visError)
      }

      const posteSourceVisibilityRows = sourcesToInsert.map((s) => ({
        user_id: userId,
        poste_id: s.poste_id,
        source_code: s.source_code,
        is_hidden: false,
      }));

      const { error: srcVisError } = await supabase
        .from("poste_source_visibility")
        .insert(posteSourceVisibilityRows);

      if (srcVisError) {
        // optionally console.log(srcVisError)
      }

      /* ------------------------------------------------------------------ */
      /* 6) Update user profile                                              */
      /* ------------------------------------------------------------------ */
      const { error: profileError } = await supabase
        .from("user_profiles")
        .upsert(
          [
            {
              id: userId,
              company_id: companyData.id,
              role: "admin",
            },
          ],
          { onConflict: "id" }
        );

      if (profileError) throw new Error(profileError.message);

      setLoading(false);
      onComplete();
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Erreur inconnue");
    }
  }

  return (
    <Box mt={8} p={6} rounded="xl" bg="white" boxShadow="md">
      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <Text fontWeight="bold" fontSize="xl" color="#00496F">
            Renseignez votre entreprise
          </Text>

          <Input
            placeholder="Nom de l'entreprise"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />

          <Button type="submit" colorScheme="teal" isLoading={loading} width="100%">
            Valider
          </Button>

          {error && <Text color="red.500">{error}</Text>}
        </VStack>
      </form>
    </Box>
  );
}

// import React, { useState } from 'react';
// import { Box, Button, Input, VStack, Text } from '@chakra-ui/react';
// import { supabase } from '../../../lib/supabaseClient';

// interface CompanyInfoFormProps {
//   userId: string;
//   onComplete: () => void;
// }

// type Poste = {
//   id: string;
//   label: string;
//   num: number;
//   enabled: boolean;
//   company_id: string;
// };

// type PosteInsert = {
//   label: string;
//   num: number;
//   enabled: boolean;
//   company_id: string;
// };

// type PostSourceInsert = {
//   poste_id: string;
//   source_code: string;
//   label: string;
//   enabled: boolean;
// };

// export default function CompanyInfoForm({ userId, onComplete }: CompanyInfoFormProps) {
//   const [company, setCompany] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setLoading(true);
//     setError('');

//     try {
//       /* ------------------------------------------------------------------ */
//       /* 1) Create company                                                   */
//       /* ------------------------------------------------------------------ */
//       const { data: companyData, error: companyError } = await supabase
//         .from('companies')
//         .insert([{ name: company }])
//         .select()
//         .single();

//       if (companyError) throw new Error(companyError.message);

//       /* ------------------------------------------------------------------ */
//       /* 2) Create postes                                                    */
//       /* ------------------------------------------------------------------ */
//       const defaultPostes: PosteInsert[] = [
//         {
//           label: 'Catégorie 1 - Émissions directs',
//           num: 1,
//           enabled: true,
//           company_id: companyData.id,
//         },
//         {
//           // ✅ UPDATED LABEL
//           label: "Catégorie 2 - Émissions indirects de l'énergie importée",
//           num: 2,
//           enabled: true,
//           company_id: companyData.id,
//         },
//         {
//           // ✅ UPDATED LABEL
//           label: 'Catégorie 3 - Émissions indirects des transports',
//           num: 3,
//           enabled: true,
//           company_id: companyData.id,
//         },
//         {
//           // kept empty (structure only)
//           label: "Émissions indirectes provenant de la consommation d'électricité",
//           num: 6,
//           enabled: true,
//           company_id: companyData.id,
//         },
//       ];

//       const { data: postesData, error: postesError } = await supabase
//         .from('postes')
//         .insert(defaultPostes)
//         .select();

//       if (postesError) throw new Error(postesError.message);

//       /* ------------------------------------------------------------------ */
//       /* 3) Build poste map                                                  */
//       /* ------------------------------------------------------------------ */
//       const postesByNum: Record<number, Poste> = {};
//       (postesData as Poste[]).forEach((p) => {
//         postesByNum[p.num] = p;
//       });

//       const poste1Id = postesByNum[1]?.id;
//       const poste2Id = postesByNum[2]?.id;
//       const poste3Id = postesByNum[3]?.id;

//       if (!poste1Id) throw new Error('Poste 1 introuvable');
//       if (!poste2Id) throw new Error('Poste 2 introuvable');
//       if (!poste3Id) throw new Error('Poste 3 introuvable');

//       /* ------------------------------------------------------------------ */
//       /* 4) Assign sources                                                   */
//       /* ------------------------------------------------------------------ */
//       const sourcesToInsert: PostSourceInsert[] = [
//         /* ---------- POSTE 1 : Catégorie 1 – Émissions directs ---------- */
//         {
//           poste_id: poste1Id,
//           source_code: '1A1',
//           label: 'Quantité de combustible comptabilisé à partir des factures',
//           enabled: true,
//         },
//         {
//           poste_id: poste1Id,
//           source_code: '2A1',
//           label: 'Quantité de combustible comptabilisé à partir des factures',
//           enabled: true,
//         },
//         {
//           poste_id: poste1Id,
//           source_code: '2B1',
//           label: 'Par la distance parcourue (Marque, modèle, année connus)',
//           enabled: true,
//         },
//         {
//           poste_id: poste1Id,
//           source_code: '2A3',
//           label: "À partir des coûts d'essence",
//           enabled: true,
//         },
//         {
//           poste_id: poste1Id,
//           source_code: '4A1',
//           label: 'Quantité rapportée par le frigoriste',
//           enabled: true,
//         },
//         {
//           poste_id: poste1Id,
//           source_code: '4B1',
//           label: "Moyenne de l'industrie (climatisation véhicules)",
//           enabled: true,
//         },
//         {
//           poste_id: poste1Id,
//           source_code: '4B2',
//           label: 'Données des véhicules (climatisation véhicules)',
//           enabled: true,
//         },

//         /* ---------- POSTE 2 : Énergie importée ---------- */
//         {
//           poste_id: poste2Id,
//           source_code: '6A1',
//           label: "Quantité d'électricité comptabilisée à partir des factures (Location-based)",
//           enabled: true,
//         },
//         {
//           poste_id: poste2Id,
//           source_code: '6B1',
//           label: "Quantité d'électricité comptabilisée à partir des factures (Market-based)",
//           enabled: true,
//         },

//         /* ---------- POSTE 3 : Transports indirects ---------- */
//         {
//           poste_id: poste3Id,
//           source_code: '3A1',
//           label: 'Navettage des employés',
//           enabled: true,
//         },
//       ];

//       const { error: sourcesError } = await supabase
//         .from('poste_sources')
//         .insert(sourcesToInsert);

//       if (sourcesError) throw new Error(sourcesError.message);

//       /* ------------------------------------------------------------------ */
//       /* 5) Visibility defaults                                             */
//       /* ------------------------------------------------------------------ */
//       const posteVisibilityRows = (postesData as Poste[]).map((p) => ({
//         user_id: userId,
//         poste_id: p.id,
//         is_hidden: false,
//       }));

//       await supabase.from('poste_visibility').insert(posteVisibilityRows);

//       const posteSourceVisibilityRows = sourcesToInsert.map((s) => ({
//         user_id: userId,
//         poste_id: s.poste_id,
//         source_code: s.source_code,
//         is_hidden: false,
//       }));

//       await supabase.from('poste_source_visibility').insert(posteSourceVisibilityRows);

//       /* ------------------------------------------------------------------ */
//       /* 6) Update user profile                                             */
//       /* ------------------------------------------------------------------ */
//       const { error: profileError } = await supabase
//         .from('user_profiles')
//         .upsert(
//           [
//             {
//               id: userId,
//               company_id: companyData.id,
//               role: 'admin',
//             },
//           ],
//           { onConflict: 'id' }
//         );

//       if (profileError) throw new Error(profileError.message);

//       setLoading(false);
//       onComplete();
//     } catch (err: any) {
//       setLoading(false);
//       setError(err?.message || 'Erreur inconnue');
//     }
//   }

//   return (
//     <Box mt={8} p={6} rounded="xl" bg="white" boxShadow="md">
//       <form onSubmit={handleSubmit}>
//         <VStack spacing={4}>
//           <Text fontWeight="bold" fontSize="xl" color="#00496F">
//             Renseignez votre entreprise
//           </Text>

//           <Input
//             placeholder="Nom de l'entreprise"
//             value={company}
//             onChange={(e) => setCompany(e.target.value)}
//             required
//           />

//           <Button type="submit" colorScheme="teal" isLoading={loading} width="100%">
//             Valider
//           </Button>

//           {error && <Text color="red.500">{error}</Text>}
//         </VStack>
//       </form>
//     </Box>
//   );
// }
