'use client'

import { motion } from 'framer-motion'

/**
 * Thin client wrapper that owns only the entrance animation.
 * The surrounding shell (`EventsHero`) is a Server Component so its
 * markup is included in the initial HTML without blocking CSS chunks.
 */
export function HeroAnimatedContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-2xl"
    >
      {children}
    </motion.div>
  )
}
