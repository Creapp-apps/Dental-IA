import type { Metadata } from 'next'
import { Geist, Geist_Mono, Playfair_Display, Montserrat, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
})

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
})

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Consultorio Álvarez — Sistema de Gestión',
  description: 'Sistema de gestión integral para el consultorio odontológico',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${montserrat.variable} ${spaceGrotesk.variable}`}>
        <ThemeProvider>
          {children}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{ duration: 4000 }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
