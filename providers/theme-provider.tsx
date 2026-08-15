'use client'

/**
 * Theme provider using next-themes.
 *
 * Sets dark mode as the default theme and enables system preference detection.
 * The `attribute="class"` option applies the `dark` class to <html> for Tailwind.
 */
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
