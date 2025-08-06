import { useState } from 'react'
import { Box, Button, Input, VStack, Text } from '@chakra-ui/react'
import { supabase } from '../../../lib/supabaseClient'

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

type PostSourceInsert = {
  poste_id: string;
  source_code: string;
  label: string;
  enabled: boolean;
};

export default function CompanyInfoForm({ userId, onComplete }: CompanyInfoFormProps) {
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 1. Create company (no industry field)
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([{ name: company }])
      .select()
      .single()

    if (companyError) {
      setError(companyError.message)
      setLoading(false)
      return
    }

    // 2. Create postes 6 and 2 for the company
    const defaultPostes = [
      { label: "Poste 6", num: 6, enabled: true, company_id: companyData.id },
      { label: "Poste 2", num: 2, enabled: true, company_id: companyData.id },
    ];

    const { data: postesData, error: postesError } = await supabase
      .from('postes')
      .insert(defaultPostes)
      .select();

    if (postesError) {
      setError(postesError.message)
      setLoading(false)
      return
    }

    // 3. Assign sources to postes
    // Identify ids for Poste 6 and Poste 2
    const poste6 = Array.isArray(postesData) ? postesData.find((p: Poste) => p.num === 6) : null;
    const poste2 = Array.isArray(postesData) ? postesData.find((p: Poste) => p.num === 2) : null;

    const sourcesToInsert: PostSourceInsert[] = [];
    if (poste6) {
      sourcesToInsert.push({
        poste_id: poste6.id,
        source_code: 'A',
        label: "Importation d'énergie par compteurs d'électricité",
        enabled: true
      });
    }
    if (poste2) {
      sourcesToInsert.push(
        {
          poste_id: poste2.id,
          source_code: 'A1',
          label: 'Véhicules (Par la quantité de combustible)',
          enabled: true
        },
        {
          poste_id: poste2.id,
          source_code: 'A3',
          label: 'Véhicules (Par les coûts de carburants)',
          enabled: true
        },
        {
          poste_id: poste2.id,
          source_code: 'B1',
          label: 'Véhicules (Par la distance parcourue; Données GPS, etc.)',
          enabled: true
        }
      );
    }

    if (sourcesToInsert.length > 0) {
      const { error: sourcesError } = await supabase
        .from('poste_sources')
        .insert(sourcesToInsert);
      if (sourcesError) {
        setError(sourcesError.message)
        setLoading(false)
        return
      }
    }

    // 4. Update user_profiles: set company_id and role = 'admin'
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert([{
        id: userId,
        company_id: companyData.id,
        role: 'admin',
      }], { onConflict: 'id' })

    setLoading(false)
    if (profileError) setError(profileError.message)
    else onComplete()
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
            onChange={e => setCompany(e.target.value)}
            required
          />
          <Button type="submit" colorScheme="teal" isLoading={loading} width="100%">
            Valider
          </Button>
          {error && <Text color="red.500">{error}</Text>}
        </VStack>
      </form>
    </Box>
  )
}
