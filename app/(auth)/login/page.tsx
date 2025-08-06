'use client' // ⬅️ Must be the very first line!

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Center } from '@chakra-ui/react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../../../lib/supabaseClient'
import { Link } from '@saas-ui/react'
import { BackgroundGradient } from 'components/gradients/background-gradient'
import { PageTransition } from 'components/motion/page-transition'
import { Section } from 'components/section'

export default function Login() {
  const router = useRouter();

  useEffect(() => {
    // Listen for auth state changes (login/signup)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role
        if (role === 'admin') {
          router.replace('/admin')
        } else {
          router.replace('/submissions') // <---- redirect here
        }
      }
    })
    // Cleanup the listener on unmount
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <Section height="calc(100vh - 200px)" innerWidth="container.sm">
      <BackgroundGradient zIndex="-1" />

      <Center height="100%" pt="20">
        <PageTransition width="100%">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google', 'github']}
            view="sign_in"
            showLinks={false}
            redirectTo={process.env.NEXT_PUBLIC_REDIRECT_URL || undefined}
            magicLink={false}
          />
          <Link href="/signup" color="blue.500" display="block" textAlign="center" mt={4}>
            Sign up
          </Link>
        </PageTransition>
      </Center>
    </Section>
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
//           router.replace('/')
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
