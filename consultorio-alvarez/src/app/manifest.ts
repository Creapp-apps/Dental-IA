import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Consultorio Alvarez - Clinica Virtual',
    short_name: 'Consultorio Alvarez',
    description: 'Plataforma integral de gestión para consultorios odontológicos',
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
    // Splash de arranque: fondo blanco + logo azul (pedido de Eduardo), en lugar del negro con logo violeta.
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/LOGO-ALVAREZ-ICON.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/LOGO-ALVAREZ-ICON.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
