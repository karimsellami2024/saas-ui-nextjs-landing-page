'use client'

import { HStack, Button, Box } from '@chakra-ui/react'
import { useDisclosure, useUpdateEffect } from '@chakra-ui/react'
import { usePathname, useRouter } from 'next/navigation'
import * as React from 'react'

import { MobileNavButton } from '#components/mobile-nav'
import { MobileNavContent } from '#components/mobile-nav'
import { supabase } from '../../lib/supabaseClient'

/* ── Design tokens matching the app palette ── */
const BRAND  = '#344E41'
const ACCENT = '#588157'
const SOFT   = '#DDE5E0'

interface NavigationProps { transparent?: boolean }

const Navigation: React.FC<NavigationProps> = ({ transparent = false }) => {
  const mobileNav  = useDisclosure()
  const router     = useRouter()
  const path       = usePathname()
  const [loggedIn, setLoggedIn] = React.useState(false)

  /* When header is transparent (over dark hero), use white text */
  const textColor   = transparent ? 'white' : BRAND
  const hoverBg     = transparent ? 'rgba(255,255,255,0.12)' : SOFT
  const outlineBorder = transparent ? 'rgba(255,255,255,0.5)' : BRAND

  const mobileNavBtnRef = React.useRef<HTMLButtonElement>()

  useUpdateEffect(() => {
    mobileNavBtnRef.current?.focus()
  }, [mobileNav.isOpen])

  /* Check auth state on mount + subscribe to changes */
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <HStack spacing="3" flexShrink={0}>

      {!loggedIn && (
        <>
          {/* Se connecter */}
          <Button
            display={['none', null, 'inline-flex']}
            size="sm"
            variant="ghost"
            color={textColor}
            fontWeight="600"
            borderRadius="full"
            px={5}
            _hover={{ bg: hoverBg }}
            onClick={() => router.push('/login')}
          >
            Se connecter
          </Button>

          {/* S'inscrire */}
          <Button
            display={['none', null, 'inline-flex']}
            size="sm"
            bg={transparent ? 'white' : BRAND}
            color={transparent ? BRAND : 'white'}
            fontWeight="700"
            borderRadius="full"
            px={6}
            _hover={{ bg: transparent ? SOFT : ACCENT, transform: 'translateY(-1px)', boxShadow: 'md' }}
            transition="all 0.2s"
            onClick={() => router.push('/signup')}
          >
            S&apos;inscrire
          </Button>
        </>
      )}

      {loggedIn && (
        <>
          {/* Tableau de bord */}
          <Button
            display={['none', null, 'inline-flex']}
            size="sm"
            variant="ghost"
            color={textColor}
            fontWeight="600"
            borderRadius="full"
            px={5}
            _hover={{ bg: hoverBg }}
            onClick={() => router.push('/chart')}
          >
            Tableau de bord
          </Button>

          {/* Se déconnecter */}
          <Button
            display={['none', null, 'inline-flex']}
            size="sm"
            variant="outline"
            color={textColor}
            borderColor={outlineBorder}
            fontWeight="600"
            borderRadius="full"
            px={5}
            _hover={{ bg: hoverBg }}
            onClick={handleLogout}
          >
            Se déconnecter
          </Button>
        </>
      )}

      {/* Divider before mobile toggle */}
      <Box display={['none', null, 'block']} w="1px" h="20px" bg={SOFT} />

      <MobileNavButton
        ref={mobileNavBtnRef}
        aria-label="Ouvrir le menu"
        onClick={mobileNav.onOpen}
      />

      <MobileNavContent isOpen={mobileNav.isOpen} onClose={mobileNav.onClose} />
    </HStack>
  )
}

export default Navigation
