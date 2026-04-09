import { Button } from '@chakra-ui/react'
import { Link } from '@saas-ui/react'
import { NextSeoProps } from 'next-seo'
import { FaGithub, FaTwitter } from 'react-icons/fa'
import { FiCheck } from 'react-icons/fi'
import { Logo } from './logo'

const siteConfig = {
  logo: Logo,
  seo: {
    title: 'Saas UI',
    description: 'The React component library for startups',
  } as NextSeoProps,
  termsUrl: '#',
  privacyUrl: '#',
  header: {
    links: [
      {
        id: 'features',
        label: 'Features',
      },
      {
        id: 'pricing',
        label: 'Pricing',
      },
      {
        id: 'faq',
        label: 'FAQ',
      },
      {
        label: 'Login',
        href: '/login',
      },
      {
        label: 'Sign Up',
        href: '/signup',
        variant: 'primary',
      },
    ],
  },
  footer: {
    copyright: (
      <>
        Built by{' '}
        <Link href="https://twitter.com/Pagebakers">Eelco Wiersma</Link>
      </>
    ),
    links: [
      {
        href: 'mailto:hello@saas-ui.dev',
        label: 'Contact',
      },
      {
        href: 'https://twitter.com/saas_js',
        label: <FaTwitter size="14" />,
      },
      {
        href: 'https://github.com/saas-js/saas-ui',
        label: <FaGithub size="14" />,
      },
    ],
  },
  signup: {
    title: 'Mesurez et réduisez vos émissions GES',
    features: [
      {
        icon: FiCheck,
        title: 'Conforme ISO 14064 & GHG Protocol',
        description:
          'Calculez vos émissions Scope 1, 2 et 3 selon les normes internationalement reconnues.',
      },
      {
        icon: FiCheck,
        title: 'Facteurs d\'émission officiels',
        description:
          'Données ECCC et ADEME intégrées — vos résultats sont précis et défendables pour vos rapports.',
      },
      {
        icon: FiCheck,
        title: 'Bilan en temps réel',
        description:
          'Chaque saisie met à jour instantanément votre bilan carbone en tCO₂eq par catégorie.',
      },
      {
        icon: FiCheck,
        title: 'Assistant GES intégré',
        description:
          'Un assistant IA contextuel vous guide à chaque étape de la collecte et de l\'analyse.',
      },
    ],
  },
}

export default siteConfig
