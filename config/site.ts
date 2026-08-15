/**
 * Site-wide configuration constants.
 *
 * Flights, Hotels, and Cinema are future modules — not listed publicly yet.
 */
export const siteConfig = {
  name: 'SWITCH',
  description:
    'The modern booking platform — events, bus travel, tourism, parking, and more in one seamless experience.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://switchapp.io',
  ogImage: '/og.png',
  twitterHandle: '@switchapp',
  keywords: ['tickets', 'events', 'booking', 'bus', 'tourism', 'parking', 'membership', 'commerce'],

  /** Navigation links — only live modules */
  mainNav: [
    { title: 'Events', href: '/events' },
    { title: 'About', href: '/about' },
    { title: 'Blog', href: '/blog' },
  ],

  /** Footer link groups */
  footerLinks: [
    {
      title: 'Product',
      links: [
        { title: 'Events', href: '/events' },
        { title: 'Bus', href: '/bus' },
        { title: 'Tourism', href: '/tourism' },
        { title: 'Parking', href: '/parking' },
        { title: 'Membership', href: '/membership' },
      ],
    },
    {
      title: 'Company',
      links: [
        { title: 'About', href: '/about' },
        { title: 'Blog', href: '/blog' },
        { title: 'Careers', href: '/careers' },
        { title: 'Press', href: '/press' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { title: 'Privacy', href: '/privacy' },
        { title: 'Terms', href: '/terms' },
        { title: 'Cookies', href: '/cookies' },
      ],
    },
  ],
} as const

export type SiteConfig = typeof siteConfig
