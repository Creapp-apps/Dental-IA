/**
 * Generador dinámico de tokens CSS armonizados para la temática integral multi-tenant.
 * Convierte el color primario del consultorio (ej: naranja #ea580c, azul #2563eb, etc.)
 * en una paleta armónica para inputs, popovers, dropdowns, checkboxes y borders.
 */

export function hexToHsl(hex: string) {
    hex = hex.replace('#', '')
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
    const r = parseInt(hex.substring(0, 2), 16) / 255
    const g = parseInt(hex.substring(2, 4), 16) / 255
    const b = parseInt(hex.substring(4, 6), 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0, l = (max + min) / 2

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break
            case g: h = (b - r) / d + 2; break
            case b: h = (r - g) / d + 4; break
        }
        h /= 6
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    }
}

export function generateTenantCssTheme(primaryHex: string): string {
    const { r, g, b, h } = hexToHsl(primaryHex || '#2563eb')

    return `
        /* ── TEMA INTEGRAL DEL TENANT ── */
        /* Tokens Globales y Base (Modo Claro) */
        :root {
            --primary: ${primaryHex} !important;
            --primary-foreground: #ffffff !important;
            --ring: ${primaryHex} !important;
            --sidebar-primary: ${primaryHex} !important;
            --sidebar-ring: ${primaryHex} !important;
            --color-primary: ${primaryHex} !important;
            --landing-primary: ${primaryHex} !important;
            
            /* Modo Claro: Superficies y Textos Limpios */
            --background: hsl(${h}, 25%, 98%) !important;
            --foreground: hsl(${h}, 25%, 12%) !important;
            --card: #ffffff !important;
            --card-foreground: hsl(${h}, 25%, 12%) !important;
            
            /* Inputs, Selectores y Bordes en Modo Claro */
            --input: hsl(${h}, 15%, 93%) !important;
            --border: hsl(${h}, 15%, 88%) !important;
            --muted: hsl(${h}, 15%, 94%) !important;
            --muted-foreground: hsl(${h}, 12%, 46%) !important;
            
            /* Menús Dropdown, Popovers y Modales en Modo Claro */
            --popover: #ffffff !important;
            --popover-foreground: hsl(${h}, 25%, 15%) !important;
            
            /* Estados Hover / Focus en Modo Claro */
            --accent: hsl(${h}, 45%, 94%) !important;
            --accent-foreground: hsl(${h}, 80%, 25%) !important;
            
            /* Sidebar en Modo Claro (Limpio, luminoso y armónico) */
            --sidebar: hsl(${h}, 20%, 98.5%) !important;
            --sidebar-foreground: hsl(${h}, 25%, 15%) !important;
            --sidebar-accent: hsl(${h}, 25%, 93%) !important;
            --sidebar-accent-foreground: hsl(${h}, 80%, 25%) !important;
            --sidebar-border: hsl(${h}, 15%, 88%) !important;

            accent-color: ${primaryHex} !important;
        }

        /* Tokens exclusivos para Modo Oscuro (.dark) */
        .dark, [data-theme="dark"] {
            --primary: ${primaryHex} !important;
            --primary-foreground: #ffffff !important;
            --ring: ${primaryHex} !important;
            --sidebar-primary: ${primaryHex} !important;
            --sidebar-ring: ${primaryHex} !important;
            --color-primary: ${primaryHex} !important;
            --landing-primary: ${primaryHex} !important;
            
            /* Fondos y superficies oscuras armónicas con la marca */
            --background: hsl(${h}, 22%, 7%) !important;
            --foreground: hsl(${h}, 10%, 96%) !important;
            --card: hsl(${h}, 18%, 10%) !important;
            --card-foreground: hsl(${h}, 10%, 96%) !important;
            
            /* Inputs y Selectores en Modo Oscuro */
            --input: hsl(${h}, 22%, 14%) !important;
            --border: hsl(${h}, 20%, 18%) !important;
            --muted: hsl(${h}, 20%, 14%) !important;
            --muted-foreground: hsl(${h}, 15%, 60%) !important;
            
            /* Menús Dropdown, Popovers y Modales en Modo Oscuro */
            --popover: hsl(${h}, 22%, 9%) !important;
            --popover-foreground: hsl(${h}, 10%, 96%) !important;
            
            /* Estados Hover / Focus en Modo Oscuro */
            --accent: hsl(${h}, 50%, 18%) !important;
            --accent-foreground: #ffffff !important;
            
            /* Sidebar y navegación en Modo Oscuro */
            --sidebar: hsl(${h}, 22%, 6%) !important;
            --sidebar-foreground: hsl(${h}, 10%, 94%) !important;
            --sidebar-accent: hsl(${h}, 32%, 14%) !important;
            --sidebar-border: hsl(${h}, 20%, 15%) !important;
            
            accent-color: ${primaryHex} !important;
        }

        /* Checkboxes y Radio buttons adaptados a la marca */
        input[type="checkbox"], input[type="radio"] {
            accent-color: ${primaryHex} !important;
        }

        /* Selección de texto adaptada */
        ::selection {
            background-color: rgba(${r}, ${g}, ${b}, 0.35) !important;
            color: #ffffff !important;
        }
    `
}
