'use client'

import { Box, Center, Stack, Text } from '@chakra-ui/react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../../../lib/supabaseClient'
import { Link } from '@saas-ui/react'
import NextLink from 'next/link'
import { Features } from '#components/features'
import { BackgroundGradient } from '#components/gradients/background-gradient'
import { PageTransition } from '#components/motion/page-transition'
import { Section } from '#components/section'
import siteConfig from '#data/config'
import { useEffect, useState } from 'react'
import CompanyInfoForm from '../signup/CompanyInfoForm'

export default function SignUp() {
  const [step, setStep] = useState<'signup' | 'company'>('signup')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Listen to sign up and session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUserId(session.user.id)
        setStep('company')
      }
    })
    // If the user is already logged in (refresh case)
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id)
        setStep('company')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // After submitting company info
  function handleCompanyComplete() {
    // Redirect or show a thank you message, etc.
    window.location.href = "/"
  }

  return (
    <Section height="100vh" innerWidth="container.xl">
      <BackgroundGradient
        zIndex="-1"
        width={{ base: 'full', lg: '50%' }}
        left="auto"
        right="0"
        borderLeftWidth="1px"
        borderColor="gray.200"
        _dark={{
          borderColor: 'gray.700',
        }}
      />
      <PageTransition height="100%" display="flex" alignItems="center">
        <Stack
          width="100%"
          alignItems={{ base: 'center', lg: 'flex-start' }}
          spacing="20"
          flexDirection={{ base: 'column', lg: 'row' }}
        >
          <Box pe="20">
            <NextLink href="/">
              <Box
                as={siteConfig.logo}
                width="160px"
                ms="4"
                mb={{ base: 0, lg: 16 }}
              />
            </NextLink>
            <Features
              display={{ base: 'none', lg: 'flex' }}
              columns={1}
              iconSize={4}
              flex="1"
              py="0"
              ps="0"
              maxW={{ base: '100%', xl: '80%' }}
              features={siteConfig.signup.features.map((feature) => ({
                iconPosition: 'left',
                variant: 'left-icon',
                ...feature,
              }))}
            />
          </Box>
          <Center height="100%" flex="1">
            <Box width="container.sm" pt="8" px="8">
              {step === "signup" && (
                <>
                  <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    providers={['google', 'github']}
                    view="sign_up"
                    showLinks={false}
                    redirectTo={undefined} // Don't redirect yet!
                    magicLink={false}
                  />
                  <Text color="gray.600" fontSize="sm" mt={2}>
                    By signing up you agree to our{' '}
                    <Link href={siteConfig.termsUrl} color="blue.500" isExternal>
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href={siteConfig.privacyUrl} color="blue.500" isExternal>
                      Privacy Policy
                    </Link>
                  </Text>
                  <Text mt={2}>
                    Already have an account?{' '}
                    <Link href="/login" color="blue.500">
                      Log in
                    </Link>
                  </Text>
                </>
              )}
              {step === "company" && userId && (
                <CompanyInfoForm userId={userId} onComplete={handleCompanyComplete} />
              )}
            </Box>
          </Center>
        </Stack>
      </PageTransition>
    </Section>
  )
}
