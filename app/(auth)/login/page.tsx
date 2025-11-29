'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Flex,
  VStack,
  HStack,
  Heading,
  Text,
  Divider,
  Center,
  Image,
  Icon,
  Link as ChakraLink,
  Spinner,
  useColorModeValue,
  Badge,
} from '@chakra-ui/react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../../../lib/supabaseClient'
import NextLink from 'next/link'
import { BackgroundGradient } from 'components/gradients/background-gradient'
import { PageTransition } from 'components/motion/page-transition'
import { Section } from 'components/section'
import { ShieldCheck } from 'lucide-react'

export default function Login() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  // Brand tokens (align with your Carbone Québec palette)
  const brand = {
    primary: '#264a3b',
    primaryAccent: '#1f3b2f',
    ring: '#3b6b57',
  }

  const cardBg = useColorModeValue('white', 'gray.800')
  const cardBorder = useColorModeValue('gray.200', 'gray.700')
  const subtle = useColorModeValue('gray.600', 'gray.300')

  useEffect(() => {
    const boot = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const role = session.user.user_metadata?.role
        router.replace(role === 'admin' ? '/admin' : '/')
        return
      }
      setChecking(false)
    }
    boot()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role
        router.replace(role === 'admin' ? '/admin' : '/')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <Flex w="100%" minH="100vh" bg="#0e1512" position="relative" overflow="hidden">
      {/* Left brand / hero panel */}
      <Box
        flex={{ base: '0 0 0', md: '0 0 48%' }}
        display={{ base: 'none', md: 'block' }}
        position="relative"
      >
        <BackgroundGradient zIndex="0" />
        <Flex position="absolute" inset={0} p={{ md: 10, lg: 14 }} direction="column">
          <HStack spacing={3}>
            <Image src="/logo.svg" alt="Carbone Québec" boxSize="40px" />
            <Heading size="md" color="white">Carbone Québec</Heading>
            <Badge colorScheme="green" variant="subtle">Calculateur</Badge>
          </HStack>

          <Flex flex="1" align="center">
            <VStack align="start" spacing={4} maxW="lg">
              <Heading size="xl" lineHeight="1.1" color="white">
                Mesurez, réduisez et pilotez vos émissions GES
              </Heading>
              <Text fontSize="md" color="whiteAlpha.800">
                Une plateforme moderne pour collecter vos données, appliquer les facteurs d’émission,
                et générer des bilans conformes automatiquement.
              </Text>
              <HStack spacing={2} color="whiteAlpha.800">
                <Icon as={ShieldCheck} />
                <Text fontSize="sm">SSO, MFA, secrets chiffrés, journaux d’accès</Text>
              </HStack>
            </VStack>
          </Flex>

          <Text fontSize="xs" color="whiteAlpha.700">© {new Date().getFullYear()} Carbone Québec</Text>
        </Flex>
      </Box>

      {/* Right auth card */}
      <Box flex="1" position="relative" bg={useColorModeValue('gray.50', 'black')}>
        <Section height="100vh" innerWidth="container.sm" px={{ base: 4, md: 8 }}>
          <PageTransition style={{ height: '100%' }}>
            <Center height="100%">
              <Box
                w="full"
                bg={cardBg}
                border="1px solid"
                borderColor={cardBorder}
                rounded="2xl"
                p={{ base: 6, md: 8 }}
                boxShadow="xl"
              >
                <VStack spacing={1} textAlign="center" mb={4}>
                  <Heading size="lg">Connexion</Heading>
                  <Text fontSize="sm" color={subtle}>
                    Accédez à votre espace Carbone Québec
                  </Text>
                </VStack>

                <Divider mb={4} />

                {checking ? (
                  <Center py={10}>
                    <Spinner />
                  </Center>
                ) : (
                  <Box>
                    <Auth
                      supabaseClient={supabase}
                      providers={['google', 'github']}
                      view="sign_in"
                      showLinks={false}
                      magicLink={false}
                      redirectTo={process.env.NEXT_PUBLIC_REDIRECT_URL || undefined}
                      appearance={{
                        theme: ThemeSupa,
                        variables: {
                          default: {
                            colors: {
                              brand: brand.primary,
                              brandAccent: brand.primaryAccent,
                              inputText: '#111827',
                              inputBackground: 'white',
                              inputBorder: cardBorder as string,
                            },
                            radii: {
                              borderRadiusButton: '12px',
                              buttonBorderRadius: '12px',
                              inputBorderRadius: '12px',
                            },
                          },
                        },
                        className: {
                          container: 'cq-auth-container',
                          button: 'cq-auth-button',
                          anchor: 'cq-auth-anchor',
                          input: 'cq-auth-input',
                          label: 'cq-auth-label',
                        },
                      }}
                    />

                    <Text mt={4} fontSize="sm" color={subtle} textAlign="center">
                      Pas de compte ?{' '}
                      <ChakraLink as={NextLink} href="/signup" color={brand.primary}>
                        Inscrivez-vous
                      </ChakraLink>
                    </Text>

                    <Text mt={2} fontSize="xs" color={subtle} textAlign="center">
                      En continuant, vous acceptez nos{' '}
                      <ChakraLink as={NextLink} href="/terms">Conditions</ChakraLink>{' '}
                      et notre{' '}
                      <ChakraLink as={NextLink} href="/privacy">Politique de confidentialité</ChakraLink>.
                    </Text>
                  </Box>
                )}
              </Box>
            </Center>
          </PageTransition>
        </Section>
      </Box>

      {/* Soft foreground gradient accent on mobile */}
      <Box
        pointerEvents="none"
        position="absolute"
        inset={0}
        bgGradient={{
          base: 'radial(1200px 600px at 20% 10%, rgba(38,74,59,0.2), transparent)',
          md: 'none',
        }}
      />
    </Flex>
  )
}

// 'use client' // ⬅️ Must be the very first line!

// import { useEffect } from 'react'
// import { useRouter } from 'next/navigation'
// import { Center } from '@chakra-ui/react'
// import { Auth } from '@supabase/auth-ui-react'
// import { ThemeSupa } from '@supabase/auth-ui-shared'
// import { supabase } from '../../../lib/supabaseClient'
// import { Link } from '@saas-ui/react'
// import { BackgroundGradient } from 'components/gradients/background-gradient'
// import { PageTransition } from 'components/motion/page-transition'
// import { Section } from 'components/section'

// export default function Login() {
//   const router = useRouter();

//   useEffect(() => {
//     // Listen for auth state changes (login/signup)
//     const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
//       if (session?.user) {
//         const role = session.user.user_metadata?.role
//         if (role === 'admin') {
//           router.replace('/admin')
//         } else {
//           router.replace('/') // <---- redirect here
//         }
//       }
//     })
//     // Cleanup the listener on unmount
//     return () => subscription.unsubscribe()
//   }, [router])

//   return (
//     <Section height="calc(100vh - 200px)" innerWidth="container.sm">
//       <BackgroundGradient zIndex="-1" />

//       <Center height="100%" pt="20">
//         <PageTransition width="100%">
//           <Auth
//             supabaseClient={supabase}
//             appearance={{ theme: ThemeSupa }}
//             providers={['google', 'github']}
//             view="sign_in"
//             showLinks={false}
//             redirectTo={process.env.NEXT_PUBLIC_REDIRECT_URL || undefined}
//             magicLink={false}
//           />
//           <Link href="/signup" color="blue.500" display="block" textAlign="center" mt={4}>
//             Sign up
//           </Link>
//         </PageTransition>
//       </Center>
//     </Section>
//   )
// }

