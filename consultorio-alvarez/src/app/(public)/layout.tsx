import type { ReactNode } from 'react'
import { ForceLightMode } from '@/components/landing-saas/ForceLightMode'

export default function LandingLayout({ children }: { children: ReactNode }) {
    return (
        <div 
            className="w-full max-w-full overflow-x-clip relative bg-white text-slate-900 min-h-screen"
            style={{ 
                fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
                overscrollBehaviorX: 'none'
            }}
        >
            <ForceLightMode />
            {children}
        </div>
    )
}
