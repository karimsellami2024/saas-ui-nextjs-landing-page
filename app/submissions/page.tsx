'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Button, Heading, Spinner, Table, Thead, Tbody, Tr, Th, Td, Text, Center, Stack } from '@chakra-ui/react'
import { supabase } from '../../lib/supabaseClient'

interface Submission {
  id: string
  created_at: string
  status?: string
  // Add any other fields you store!
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true)
      setError('')
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        setLoading(false)
        return
      }
      // Fetch submissions for the user
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else if (data) {
        setSubmissions(data)
      }
      setLoading(false)
    }

    fetchSubmissions()
  }, [])

  const handleOpenSubmission = (id: string) => {
    router.push(`/submissions/${id}`)
  }

  const handleNewSubmission = () => {
    router.push('/submissions/new')
  }

  return (
    <Box maxW="container.md" mx="auto" pt={10}>
      <Heading mb={8} textAlign="center">Mes soumissions</Heading>

      <Stack direction={{ base: 'column', sm: 'row' }} justify="space-between" mb={6}>
        <Button colorScheme="blue" onClick={handleNewSubmission}>
          Nouvelle soumission
        </Button>
      </Stack>

      {loading ? (
        <Center><Spinner size="lg" /></Center>
      ) : error ? (
        <Text color="red.500" textAlign="center">{error}</Text>
      ) : submissions.length === 0 ? (
        <Text textAlign="center" color="gray.500">Aucune soumission trouvée. Créez-en une nouvelle !</Text>
      ) : (
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Date de création</Th>
              <Th>Statut</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {submissions.map(sub => (
              <Tr key={sub.id}>
                <Td>{sub.id}</Td>
                <Td>{new Date(sub.created_at).toLocaleString()}</Td>
                <Td>{sub.status ?? 'N/A'}</Td>
                <Td>
                  <Button size="sm" colorScheme="teal" onClick={() => handleOpenSubmission(sub.id)}>
                    Ouvrir
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  )
}
