'use client'
import { SideMenuLayout } from "../../components/SideMenuLayout";
import SidebarMenu from '../../components/postes/multilevelsidebar';
import Section from "../../components/postes/maincomponent";
import Example  from "../../components/postes/bardashboard"; // or your file path

import { ElectricityForm } from "#components/postes/ElectricityForm";
import { CombustionMobileForm } from "#components/postes/2combustionmobile";
import { GesDashboard } from "#components/postes/dashboard";
import DashboardPage from "#components/postes/dash"
import {
  Box,
  ButtonGroup,
  Container,
  Flex,
  HStack,
  Heading,
  Icon,
  IconButton,
  Stack,
  Tag,
  Text,
  VStack,
  Wrap,
  useClipboard,
} from '@chakra-ui/react'
import { Br, Link } from '@saas-ui/react'
import type { Metadata, NextPage } from 'next'
import Image from 'next/image'
import {
  FiArrowRight,
  FiBox,
  FiCheck,
  FiCode,
  FiCopy,
  FiFlag,
  FiGrid,
  FiLock,
  FiSearch,
  FiSliders,
  FiSmile,
  FiTerminal,
  FiThumbsUp,
  FiToggleLeft,
  FiTrendingUp,
  FiUserPlus,
} from 'react-icons/fi'

import * as React from 'react'

import { ButtonLink } from '#components/button-link/button-link'
import { Faq } from '#components/faq'
import { Features } from '#components/features'
import { BackgroundGradient } from '#components/gradients/background-gradient'
import { Hero } from '#components/hero'
import {
  Highlights,
  HighlightsItem,
  HighlightsTestimonialItem,
} from '#components/highlights'
import { ChakraLogo, NextjsLogo } from '#components/logos'
import { FallInPlace } from '#components/motion/fall-in-place'
import { Testimonial, Testimonials } from '#components/testimonials'
import { Em } from '#components/typography'
import faq from '#data/faq'
import pricing from '#data/pricing'
import testimonials from '#data/testimonials'
import {  FiFileText,  FiUsers } from "react-icons/fi";
import {  FiBarChart2, FiMap } from 'react-icons/fi';
import { FaGlobe } from "react-icons/fa";
import BillUploader from "#components/postes/dropzone"
// export const meta: Metadata = {
//   title: 'Saas UI Landingspage',
//   description: 'Free SaaS landingspage starter kit',
// }
const COLORS = {
  tealBlue: "#265966",
  blueGray: "#8A9992",
  black: "#08131F",
  forest: "#273F2A",
  gold: "#DC9807",
  olive: "#93A55A",
}

const Home: NextPage = () => {
  return (
    <Box>
      <HeroSection />

      <HighlightsSection />

      <FeaturesSection />

      <TestimonialsSection />
      <BillUploader />

      <Section/>

      {/* <Box width="100%" height="400px">
  <Example />
</Box> */}


      <FaqSection />
    </Box>
  )
}


const HeroSection: React.FC = () => {
  return (
    <Box position="relative" overflow="hidden" bg="#F3FAF9">
      {/* Fading green glow */}
      <Box
  position="absolute"
  top="-15vw"
  left="-15vw"
  zIndex={2}
  width="150vw"
  height="70vh"
  pointerEvents="none"
  filter="blur(100px)"
  opacity={0.50}
  background="
    radial-gradient(
      circle at top left,
      #265966 0%,
      #265966 30%,
      transparent 85%
    )
  "
/>




      <BackgroundGradient height="100%" zIndex="-1" />
      <Container maxW="container.xl" pt={{ base: 40, lg: 60 }} pb="40">
        <Stack direction={{ base: 'column', lg: 'row' }} alignItems="center">
          <Hero
  id="home"
  justifyContent="flex-start"
  px="0"
  title={
    <FallInPlace>
      <Text as="span" fontSize={{ base: "3xl", md: "5xl" }} fontWeight="bold" color={COLORS.tealBlue}>
        Calculez vos <span style={{ color: COLORS.gold }}>émissions GES</span>
      </Text>
      <Br />
      <Text as="span" fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold" color={COLORS.black}>
        en moins de 2 minutes avec Carbone Québec
      </Text>
    </FallInPlace>
  }
  description={
    <FallInPlace delay={0.4} fontWeight="medium">
      <Text fontSize="lg" color={COLORS.tealBlue}>
        Mesurez et comprenez votre impact climatique avec notre calculateur gratuit et convivial. Recevez un rapport PDF instantané et des conseils personnalisés pour réduire vos émissions.
      </Text>
    </FallInPlace>
  }
>
  <FallInPlace delay={0.2}>
    <ButtonGroup spacing={4} alignItems="center" pt="8" pb="10">
      <ButtonLink
        colorScheme="teal"
        size="lg"
        href="/calculateur"
        bg={COLORS.tealBlue}
        color="#fff"
        fontWeight="bold"
        _hover={{ bg: COLORS.gold, color: COLORS.black }}
        px={8}
        py={6}
        fontSize="xl"
        rounded="xl"
      >
        Essayez gratuitement
      </ButtonLink>
      <ButtonLink
        size="lg"
        href="#avantages"
        variant="outline"
        color={COLORS.tealBlue}
        borderColor={COLORS.tealBlue}
        _hover={{ bg: COLORS.blueGray, color: COLORS.black, borderColor: COLORS.gold }}
        rightIcon={
          <Icon
            as={FiArrowRight}
            sx={{
              transitionProperty: 'common',
              transitionDuration: 'normal',
              '.chakra-button:hover &': {
                transform: 'translate(5px)',
              },
            }}
          />
        }
      >
        Voir les avantages
      </ButtonLink>
    </ButtonGroup>
  </FallInPlace>
</Hero>


          {/* Floating framed image with shadow, just like Saas UI demo */}
          <Box
            height="600px"
            position="absolute"
            display={{ base: 'none', lg: 'block' }}
            left={{ lg: '60%', xl: '55%' }}
            width="80vw"
            maxW="1100px"
            margin="0 auto"
            zIndex={2}
          >
            <FallInPlace delay={0.2}>
              <Box
                overflow="hidden"
                height="100%"
                width="100%"
                bg="white"
                borderRadius="2xl"
                boxShadow="2xl"
                p={2}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Image
                  src="/static/images/pexels-singkham-178541-1108572.jpg"
                  width={1200}
                  height={762}
                  alt="Innovation verte: ampoule avec plante"
                  quality={85}
                  priority
                  style={{
                    objectFit: "cover",
                    borderRadius: "1.25rem", // Chakra's 2xl
                    boxShadow: "0 8px 40px 0 rgba(0,0,0,0.18)",
                    background: "white"
                  }}
                />
              </Box>
            </FallInPlace>
          </Box>
        </Stack>
      </Container>

      {/* <Features
  id="benefits"
  columns={[1, 2, 4]}
  iconSize={4}
  innerWidth="container.xl"
  pt="20"
  features={[
    {
      title: "Calcul immédiat et gratuit",
      icon: () => <Icon as={FiSmile} color="#49C3AC" boxSize={6} />,
      description: "Accédez à votre bilan GES sans compte, en moins de 2 minutes. Simple, rapide et accessible à tous.",
      iconPosition: "left",
      delay: 0.6,
    },
    {
      title: "Conseils personnalisés",
      icon: () => <Icon as={FiTrendingUp} color="#49C3AC" boxSize={6} />,
      description: "Obtenez des recommandations sur mesure pour réduire vos émissions et gagner en efficacité environnementale.",
      iconPosition: "left",
      delay: 0.8,
    },
    {
      title: "Rapport professionnel (PDF)",
      icon: () => <Icon as={FiFileText} color="#49C3AC" boxSize={6} />,
      description: "Recevez instantanément un rapport détaillé prêt à partager avec vos équipes, clients ou partenaires.",
      iconPosition: "left",
      delay: 1,
    },
    {
      title: "Conforme aux standards du Québec",
      icon: () => <Icon as={FiCheck} color="#49C3AC" boxSize={6} />,
      description: "Méthodologies reconnues, données à jour et calculs adaptés à la réalité québécoise.",
      iconPosition: "left",
      delay: 1.1,
    },
    {
      title: "Données 100% sécurisées",
      icon: () => <Icon as={FiLock} color="#49C3AC" boxSize={6} />,
      description: "Vos informations sont protégées et ne sont jamais partagées sans votre accord.",
      iconPosition: "left",
      delay: 1.2,
    },
    {
      title: "Accompagnement local",
      icon: () => <Icon as={FiUsers} color="#49C3AC" boxSize={6} />,
      description: "Une équipe d’experts basée au Québec pour répondre à vos questions et vous guider dans votre démarche.",
      iconPosition: "left",
      delay: 1.3,
    },
    {
      title: "Comparaison sectorielle",
      icon: () => <Icon as={FiBarChart2} color="#49C3AC" boxSize={6} />,
      description: "Situez vos émissions par rapport à celles de votre secteur d’activité pour cibler vos priorités.",
      iconPosition: "left",
      delay: 1.4,
    },
    {
      title: "Pour entreprises, villes & citoyens",
      icon: () => <Icon as={FiMap} color="#49C3AC" boxSize={6} />,
      // Or use FaGlobe for a real globe: icon: () => <Icon as={FaGlobe} color="#49C3AC" boxSize={6} />,
      description: "Un outil conçu pour tous les acteurs souhaitant agir pour le climat, quelle que soit leur taille.",
      iconPosition: "left",
      delay: 1.5,
    },
  ]}
  reveal={FallInPlace}
/> */}

    </Box>
  )
}

// const HeroSection: React.FC = () => {
//   return (
//     <Box position="relative" overflow="hidden">
//       <BackgroundGradient height="100%" zIndex="-1" />
//       <Container maxW="container.xl" pt={{ base: 40, lg: 60 }} pb="40">
//         <Stack direction={{ base: 'column', lg: 'row' }} alignItems="center">
//           <Hero
//             id="home"
//             justifyContent="flex-start"
//             px="0"
//             title={
//               <FallInPlace>
//                 Build beautiful
//                 <Br /> software faster
//               </FallInPlace>
//             }
//             description={
//               <FallInPlace delay={0.4} fontWeight="medium">
//                 Saas UI is a <Em>React component library</Em>
//                 <Br /> that doesn&apos;t get in your way and helps you <Br />{' '}
//                 build intuitive SaaS products with speed.
//               </FallInPlace>
//             }
//           >
//             <FallInPlace delay={0.8}>
//               <HStack pt="4" pb="12" spacing="8">
//                 <NextjsLogo height="28px" /> <ChakraLogo height="20px" />
//               </HStack>

//               <ButtonGroup spacing={4} alignItems="center">
//                 <ButtonLink colorScheme="primary" size="lg" href="/signup">
//                   Sign Up
//                 </ButtonLink>
//                 <ButtonLink
//                   size="lg"
//                   href="https://demo.saas-ui.dev"
//                   variant="outline"
//                   rightIcon={
//                     <Icon
//                       as={FiArrowRight}
//                       sx={{
//                         transitionProperty: 'common',
//                         transitionDuration: 'normal',
//                         '.chakra-button:hover &': {
//                           transform: 'translate(5px)',
//                         },
//                       }}
//                     />
//                   }
//                 >
//                   View demo
//                 </ButtonLink>
//               </ButtonGroup>
//             </FallInPlace>
//           </Hero>
//           <Box
//             height="600px"
//             position="absolute"
//             display={{ base: 'none', lg: 'block' }}
//             left={{ lg: '60%', xl: '55%' }}
//             width="80vw"
//             maxW="1100px"
//             margin="0 auto"
//           >
//             <FallInPlace delay={1}>
//               <Box overflow="hidden" height="100%">
//                 <Image
//                   src="/static/screenshots/list.png"
//                   width={1200}
//                   height={762}
//                   alt="Screenshot of a ListPage in Saas UI Pro"
//                   quality="75"
//                   priority
//                 />
//               </Box>
//             </FallInPlace>
//           </Box>
//         </Stack>
//       </Container>

//       <Features
//         id="benefits"
//         columns={[1, 2, 4]}
//         iconSize={4}
//         innerWidth="container.xl"
//         pt="20"
//         features={[
//           {
//             title: 'Accessible',
//             icon: FiSmile,
//             description: 'All components strictly follow WAI-ARIA standards.',
//             iconPosition: 'left',
//             delay: 0.6,
//           },
//           {
//             title: 'Themable',
//             icon: FiSliders,
//             description:
//               'Fully customize all components to your brand with theme support and style props.',
//             iconPosition: 'left',
//             delay: 0.8,
//           },
//           {
//             title: 'Composable',
//             icon: FiGrid,
//             description:
//               'Compose components to fit your needs and mix them together to create new ones.',
//             iconPosition: 'left',
//             delay: 1,
//           },
//           {
//             title: 'Productive',
//             icon: FiThumbsUp,
//             description:
//               'Designed to reduce boilerplate and fully typed, build your product at speed.',
//             iconPosition: 'left',
//             delay: 1.1,
//           },
//         ]}
//         reveal={FallInPlace}
//       />
//     </Box>
//   )
// }

// const HighlightsSection = () => {
//   const { value, onCopy, hasCopied } = useClipboard('yarn add @saas-ui/react')

//   return (
//     <Highlights>
//       <HighlightsItem colSpan={[1, null, 2]} title="Core components">
//         <VStack alignItems="flex-start" spacing="8">
//           <Text color="muted" fontSize="xl">
//             Get started for free with <Em>30+ open source components</Em>.
//             Including authentication screens with Clerk, Supabase and Magic.
//             Fully functional forms with React Hook Form. Data tables with React
//             Table.
//           </Text>

//           <Flex
//             rounded="full"
//             borderWidth="1px"
//             flexDirection="row"
//             alignItems="center"
//             py="1"
//             ps="8"
//             pe="2"
//             bg="primary.900"
//             _dark={{ bg: 'gray.900' }}
//           >
//             <Box>
//               <Text color="yellow.400" display="inline">
//                 yarn add
//               </Text>{' '}
//               <Text color="cyan.300" display="inline">
//                 @saas-ui/react
//               </Text>
//             </Box>
//             <IconButton
//               icon={hasCopied ? <FiCheck /> : <FiCopy />}
//               aria-label="Copy install command"
//               onClick={onCopy}
//               variant="ghost"
//               ms="4"
//               isRound
//               color="white"
//             />
//           </Flex>
//         </VStack>
//       </HighlightsItem>
//       <HighlightsItem title="Solid foundations">
//         <Text color="muted" fontSize="lg">
//           We don&apos;t like to re-invent the wheel, neither should you. We
//           selected the most productive and established tools in the scene and
//           build Saas UI on top of it.
//         </Text>
//       </HighlightsItem>
//       <HighlightsTestimonialItem
//         name="Renata Alink"
//         description="Founder"
//         avatar="/static/images/avatar.jpg"
//         gradient={['pink.200', 'purple.500']}
//       >
//         “Saas UI helped us set up a beautiful modern UI in no time. It saved us
//         hundreds of hours in development time and allowed us to focus on
//         business logic for our specific use-case from the start.”
//       </HighlightsTestimonialItem>
//       <HighlightsItem
//         colSpan={[1, null, 2]}
//         title="Start your next idea two steps ahead"
//       >
//         <Text color="muted" fontSize="lg">
//           We took care of all your basic frontend needs, so you can start
//           building functionality that makes your product unique.
//         </Text>
//         <Wrap mt="8">
//           {[
//             'authentication',
//             'navigation',
//             'crud',
//             'settings',
//             'multi-tenancy',
//             'layouts',
//             'billing',
//             'a11y testing',
//             'server-side rendering',
//             'documentation',
//             'onboarding',
//             'storybooks',
//             'theming',
//             'upselling',
//             'unit testing',
//             'feature flags',
//             'responsiveness',
//           ].map((value) => (
//             <Tag
//               key={value}
//               variant="subtle"
//               colorScheme="purple"
//               rounded="full"
//               px="3"
//             >
//               {value}
//             </Tag>
//           ))}
//         </Wrap>
//       </HighlightsItem>
//     </Highlights>
//   )
// }
const HighlightsSection = () => {
  const { value, onCopy, hasCopied } = useClipboard('https://www.carbonequebec.ca/')

  return (
    <Highlights bg="#F3FAF9">
      <HighlightsItem colSpan={[1, null, 2]} title="Calculateur de GES Carbone Québec">
        <VStack alignItems="flex-start" spacing="8">
          <Text color="#00496F" fontSize="xl" fontWeight="bold">
            Passez à l’action avec notre <Em color="#49C3AC">calculateur de GES en ligne</Em>!
          </Text>
          <Text color="#19516C" fontSize="md">
            Obtenez une estimation instantanée et gratuite de vos émissions de gaz à effet de serre (GES). Notre outil simple et rapide est conçu pour les entreprises, les municipalités et les particuliers souhaitant mesurer leur impact environnemental.
          </Text>
          <Flex
            rounded="full"
            borderWidth="1px"
            borderColor="#49C3AC"
            flexDirection="row"
            alignItems="center"
            py="1"
            ps="8"
            pe="2"
            bg="#00496F"
          >
            <Box>
              <Text color="#B2D235" display="inline" fontWeight="bold">
                Essayez-le maintenant&nbsp;
              </Text>
              <Text color="#49C3AC" display="inline" fontWeight="bold">
                carbonequebec.org/calculateur
              </Text>
            </Box>
            <IconButton
              icon={hasCopied ? <Icon as={FiCheck} color="#49C3AC" /> : <Icon as={FiCopy} color="#49C3AC" />}
              aria-label="Copier le lien du calculateur"
              onClick={onCopy}
              variant="ghost"
              ms="4"
              isRound
              color="#B2D235"
            />
          </Flex>
        </VStack>
      </HighlightsItem>

      <HighlightsItem title="Pourquoi calculer vos GES?">
        <Text color="#00496F" fontSize="lg">
          Réduisez vos coûts, accédez à de nouveaux marchés, et démontrez votre engagement climatique en quantifiant et en suivant vos émissions. Un premier pas concret vers la carboneutralité!
        </Text>
      </HighlightsItem>

      <HighlightsTestimonialItem
        name="Amélie Roy"
        description="Directrice développement durable"
        avatar="/static/images/amelie-avatar.jpg"
        gradient={['#49C3AC', '#B2D235']}
      >
        « Le calculateur de GES de Carbone Québec nous a permis d’obtenir un diagnostic clair, facile à partager, pour mobiliser notre équipe autour de la réduction de nos émissions. »
      </HighlightsTestimonialItem>

      <HighlightsItem colSpan={[1, null, 2]} title="Vos avantages">
        <Text color="#00496F" fontSize="lg">
          Profitez d’une plateforme intuitive, de rapports personnalisés et de ressources pour aller plus loin dans votre démarche environnementale. Que vous débutiez ou soyez déjà engagé, notre calculateur vous accompagne.
        </Text>
        <Wrap mt="8">
          {[
            'Rapport PDF instantané',
            'Calcul simplifié',
            'Pour tous les secteurs',
            'Normes reconnues',
            'Analyse comparative',
            'Support expert',
            'Outil gratuit',
            'Accès sécurisé',
          ].map((value) => (
            <Tag
              key={value}
              variant="subtle"
              bg="#49C3AC"
              color="#00496F"
              rounded="full"
              px="3"
              fontWeight="semibold"
            >
              {value}
            </Tag>
          ))}
        </Wrap>
      </HighlightsItem>
    </Highlights>
  )
}
import { FiUser } from "react-icons/fi";

import {
 
  FiAward,
  FiActivity,
} from "react-icons/fi";

const FeaturesSection = () => {
  return (
    <Features
      id="features"
      title={
        <Heading
          lineHeight="short"
          fontSize={['2xl', null, '4xl']}
          textAlign="left"
          as="p"
          color="#00496F"
        >
          Pourquoi utiliser le <span style={{ color: "#49C3AC" }}>calculateur Carbone Québec</span> ?
        </Heading>
      }
      description={
        <>
          Notre plateforme est conçue pour vous aider à <b>mesurer</b>, <b>comprendre</b> et <b>réduire</b> votre empreinte carbone, facilement et gratuitement.
          <br />
          Profitez de nos fonctionnalités innovantes, adaptées à la réalité du Québec.
        </>
      }
      align="left"
      columns={[1, 2, 4]}
      iconSize={4}
      features={[
        {
          title: "Calcul en temps réel",
          icon: () => <Icon as={FiActivity} color="#49C3AC" boxSize={6} />,
          description:
            "Obtenez instantanément vos émissions de GES avec des résultats clairs et visuels.",
          variant: "inline",
        },
        {
          title: "Rapport PDF complet",
          icon: () => <Icon as={FiFileText} color="#49C3AC" boxSize={6} />,
          description:
            "Recevez un rapport détaillé, prêt à être partagé avec vos équipes ou partenaires.",
          variant: "inline",
        },
        {
          title: "Analyse comparative",
          icon: () => <Icon as={FiBarChart2} color="#49C3AC" boxSize={6} />,
          description:
            "Comparez votre empreinte à celle de votre secteur d'activité pour cibler vos efforts.",
          variant: "inline",
        },
        {
          title: "Conseils personnalisés",
          icon: () => <Icon as={FiTrendingUp} color="#49C3AC" boxSize={6} />,
          description:
            "Recevez des recommandations concrètes pour réduire efficacement vos émissions.",
          variant: "inline",
        },
        {
          title: "Sécurité & confidentialité",
          icon: () => <Icon as={FiLock} color="#49C3AC" boxSize={6} />,
          description:
            "Vos données restent privées et protégées, conformément aux meilleures pratiques.",
          variant: "inline",
        },
        {
          title: "Conforme aux normes québécoises",
          icon: () => <Icon as={FiAward} color="#49C3AC" boxSize={6} />,
          description:
            "Calculs basés sur les méthodologies officielles et standards du Québec.",
          variant: "inline",
        },
        {
          title: "Accompagnement expert local",
          icon: () => <Icon as={FiUsers} color="#49C3AC" boxSize={6} />,
          description:
            "Un support humain et réactif par des spécialistes de l’environnement québécois.",
          variant: "inline",
        },
        {
  title: "Pour tous les profils",
  icon: () => <Icon as={FiUser} color="#49C3AC" boxSize={6} />,
  description:
    "Entreprises, citoyens, municipalités : une solution pensée pour tous ceux qui veulent agir.",
  variant: "inline",
}
,
      ]}
    />
  );
};



// const FeaturesSection = () => {
//   return (
//     <Features
//       id="features"
//       title={
//         <Heading
//           lineHeight="short"
//           fontSize={['2xl', null, '4xl']}
//           textAlign="left"
//           as="p"
//         >
//           Not your standard
//           <Br /> dashboard template.
//         </Heading>
//       }
//       description={
//         <>
//           Saas UI Pro includes everything you need to build modern frontends.
//           <Br />
//           Use it as a template for your next product or foundation for your
//           design system.
//         </>
//       }
//       align="left"
//       columns={[1, 2, 3]}
//       iconSize={4}
//       features={[
//         {
//           title: '#components.',
//           icon: FiBox,
//           description:
//             'All premium components are available on a private NPM registery, no more copy pasting and always up-to-date.',
//           variant: 'inline',
//         },
//         {
//           title: 'Starterkits.',
//           icon: FiLock,
//           description:
//             'Example apps in Next.JS, Electron. Including authentication, billing, example pages, everything you need to get started FAST.',
//           variant: 'inline',
//         },
//         {
//           title: 'Documentation.',
//           icon: FiSearch,
//           description:
//             'Extensively documented, including storybooks, best practices, use-cases and examples.',
//           variant: 'inline',
//         },
//         {
//           title: 'Onboarding.',
//           icon: FiUserPlus,
//           description:
//             'Add user onboarding flows, like tours, hints and inline documentation without breaking a sweat.',
//           variant: 'inline',
//         },
//         {
//           title: 'Feature flags.',
//           icon: FiFlag,
//           description:
//             "Implement feature toggles for your billing plans with easy to use hooks. Connect Flagsmith, or other remote config services once you're ready.",
//           variant: 'inline',
//         },
//         {
//           title: 'Upselling.',
//           icon: FiTrendingUp,
//           description:
//             '#components and hooks for upgrade flows designed to make upgrading inside your app frictionless.',
//           variant: 'inline',
//         },
//         {
//           title: 'Themes.',
//           icon: FiToggleLeft,
//           description:
//             'Includes multiple themes with darkmode support, always have the perfect starting point for your next project.',
//           variant: 'inline',
//         },
//         {
//           title: 'Generators.',
//           icon: FiTerminal,
//           description:
//             'Extend your design system while maintaininig code quality and consistency with built-in generators.',
//           variant: 'inline',
//         },
//         {
//           title: 'Monorepo.',
//           icon: FiCode,
//           description: (
//             <>
//               All code is available as packages in a high-performance{' '}
//               <Link href="https://turborepo.com">Turborepo</Link>, you have full
//               control to modify and adjust it to your workflow.
//             </>
//           ),
//           variant: 'inline',
//         },
//       ]}
//     />
//   )
// }

const TestimonialsSection = () => {
  const columns = React.useMemo(() => {
    return testimonials.items.reduce<Array<typeof testimonials.items>>(
      (columns, t, i) => {
        columns[i % 3].push(t)

        return columns
      },
      [[], [], []],
    )
  }, [])

  return (
    <Testimonials
      title={testimonials.title}
      columns={[1, 2, 3]}
      innerWidth="container.xl"
    >
      <>
        {columns.map((column, i) => (
          <Stack key={i} spacing="8">
            {column.map((t, i) => (
              <Testimonial key={i} {...t} />
            ))}
          </Stack>
        ))}
      </>
    </Testimonials>
  )
}





// import { useState } from "react";
// import SidebarWithContent from "../../components/postes/multilevelsidebar"; // Update the import path if needed


// function Section() {
//   const [selectedMenu, setSelectedMenu] = useState("dashboard");

//   return (
//     <Box display="flex">
//       <SidebarWithContent onSelect={setSelectedMenu} selectedMenu={selectedMenu} />
//       <Box flex={1} p={8} bg="#F3F6EF" minH="100vh">
//         {selectedMenu === "dashboard" && <DashboardPage/>}
//         {selectedMenu === "products" && <ElectricityForm />}
//         {selectedMenu === "sales" && <CombustionMobileForm/>}
//         {selectedMenu === "refunds" && <GesDashboard/>}
//         {selectedMenu === "inbox" && <Text fontSize="xl">Inbox content...</Text>}
//         {selectedMenu === "users" && <Text fontSize="xl">Users content...</Text>}
//         {selectedMenu === "signIn" && <Text fontSize="xl">Sign in form...</Text>}
//         {selectedMenu === "signUp" && <Text fontSize="xl">Sign up form...</Text>}
//       </Box>
//     </Box>
//   );
// }


// const PricingSection2 = () => {
//   return (
//     <PricingSection/>
//   );
// };



const FaqSection = () => {
  return <Faq {...faq} />
}

export default Home
