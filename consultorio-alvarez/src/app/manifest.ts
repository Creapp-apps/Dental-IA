import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Consultorio Alvarez - Clinica Virtual',
    short_name: 'Consultorio Alvarez',
    description: 'Plataforma integral de gestión para consultorios odontológicos',
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/LOGO-NOTIF.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
