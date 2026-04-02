import type { ReactNode } from 'react'

export default function LandingLayout({ children }: { children: ReactNode }) {
    return (
        <div style={{ fontFamily: "'Outfit', 'Inter', system-ui, sans-serif" }}>
            {children}
        </div>
    )
}
