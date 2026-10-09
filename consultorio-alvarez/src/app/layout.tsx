import SentryInit from '@/components/providers/SentryInit';
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Playfair_Display, Montserrat, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

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
  // Título neutro de plataforma: cada consultorio lo reemplaza desde su propio
  // layout (panel, portal) o desde su generateMetadata (landing, login).
  title: 'Dental-IA - Gestión para consultorios odontológicos',
  description: 'Plataforma integral de gestión para consultorios odontológicos',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${montserrat.variable} ${spaceGrotesk.variable}`}>
        <SentryInit />
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
