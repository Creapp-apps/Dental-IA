// Crystalline animated tooth SVG — Crown Dental + Celestia style
// CSS float animation only (no 'use client' needed)

interface ToothSVGProps {
    className?: string
    size?: number
}

export function ToothSVG({ className = '', size = 420 }: ToothSVGProps) {
    return (
        <div
            className={`relative select-none ${className}`}
            style={{
                animation: 'toothFloat 7s ease-in-out infinite',
                width: size,
                height: size,
                maxWidth: '100%',
            }}
        >
            {/* Ambient glow behind tooth */}
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    background: 'radial-gradient(ellipse 60% 50% at 50% 55%, #3b82f640 0%, #2563eb20 40%, transparent 70%)',
                    animation: 'glowPulse 4s ease-in-out infinite',
                    filter: 'blur(20px)',
                    transform: 'scale(1.2)',
                }}
            />

            <svg
                viewBox="0 0 300 420"
                width={size}
                height={size}
                xmlns="http://www.w3.org/2000/svg"
                style={{ filter: 'drop-shadow(0 8px 32px #2563eb55) drop-shadow(0 2px 8px #1e40af44)' }}
            >
                <defs>
                    {/* Crown radial gradient — bright center, deep edges (crystalline effect) */}
                    <radialGradient id="crownGrad" cx="42%" cy="32%" r="68%" fx="38%" fy="28%">
                        <stop offset="0%" stopColor="#dbeafe" />
                        <stop offset="22%" stopColor="#93c5fd" />
                        <stop offset="52%" stopColor="#3b82f6" />
                        <stop offset="80%" stopColor="#1d4ed8" />
                        <stop offset="100%" stopColor="#1e3a8a" />
                    </radialGradient>

                    {/* Root gradient — vertical blue to deep navy */}
                    <linearGradient id="rootGrad" x1="0.35" y1="0" x2="0.65" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.9" />
                        <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.65" />
                    </linearGradient>

                    {/* Specular highlight gradient */}
                    <linearGradient id="specGrad" x1="0" y1="0" x2="0.6" y2="1">
                        <stop offset="0%" stopColor="white" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>

                    {/* Edge fresnel gradient */}
                    <linearGradient id="fresnelGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="white" stopOpacity="0" />
                        <stop offset="100%" stopColor="white" stopOpacity="0.25" />
                    </linearGradient>

                    {/* Clip path for crown interior details */}
                    <clipPath id="crownClip">
                        <path d="M 52 198 C 46 175 42 150 44 128 C 46 106 54 88 64 74 C 72 62 86 55 98 60 C 108 65 114 78 115 92 C 118 80 122 66 132 58 C 142 50 157 50 165 58 C 174 67 176 83 174 96 C 178 82 184 68 196 60 C 208 52 222 56 230 68 C 238 80 242 98 244 120 C 246 145 242 172 238 194 C 234 210 224 215 212 215 L 88 215 C 68 215 55 210 52 198 Z" />
                    </clipPath>
                </defs>

                {/* ── ROOTS ─────────────────────────────────── */}

                {/* Root left */}
                <path
                    d="M 90 214 C 82 235 70 268 62 308 C 55 340 57 368 70 382 C 82 396 97 388 104 370 C 112 350 112 316 107 282 C 102 252 96 232 90 214 Z"
                    fill="url(#rootGrad)"
                />
                {/* Root left highlight */}
                <path
                    d="M 78 228 C 72 252 70 280 72 310 L 78 308 C 76 279 78 254 84 232 Z"
                    fill="white" fillOpacity="0.18"
                />

                {/* Root center */}
                <path
                    d="M 140 214 C 138 242 134 278 134 318 C 134 356 142 388 155 395 C 168 402 175 390 174 354 C 173 320 168 278 162 242 C 158 226 152 218 140 214 Z"
                    fill="url(#rootGrad)"
                />
                {/* Root center highlight */}
                <path
                    d="M 142 230 C 140 262 140 295 142 325 L 147 324 C 146 295 145 263 147 232 Z"
                    fill="white" fillOpacity="0.15"
                />

                {/* Root right */}
                <path
                    d="M 205 214 C 212 232 218 252 222 282 C 226 316 226 350 232 370 C 240 388 255 396 265 382 C 278 368 280 340 272 308 C 265 268 252 235 242 214 Z"
                    fill="url(#rootGrad)"
                />
                {/* Root right highlight */}
                <path
                    d="M 216 230 C 220 256 222 282 220 310 L 215 308 C 217 280 216 256 214 232 Z"
                    fill="white" fillOpacity="0.15"
                />

                {/* Root separator shadows */}
                <line x1="120" y1="214" x2="110" y2="252" stroke="#1e3a8a" strokeWidth="2" strokeOpacity="0.25" />
                <line x1="178" y1="214" x2="188" y2="252" stroke="#1e3a8a" strokeWidth="2" strokeOpacity="0.25" />

                {/* ── CROWN ─────────────────────────────────── */}

                {/* Crown base shadow */}
                <ellipse cx="148" cy="215" rx="78" ry="6" fill="#1e3a8a" fillOpacity="0.15" />

                {/* Crown main shape */}
                <path
                    d="M 52 198 C 46 175 42 150 44 128 C 46 106 54 88 64 74 C 72 62 86 55 98 60 C 108 65 114 78 115 92 C 118 80 122 66 132 58 C 142 50 157 50 165 58 C 174 67 176 83 174 96 C 178 82 184 68 196 60 C 208 52 222 56 230 68 C 238 80 242 98 244 120 C 246 145 242 172 238 194 C 234 210 224 215 212 215 L 88 215 C 68 215 55 210 52 198 Z"
                    fill="url(#crownGrad)"
                />

                {/* Crown interior — clipped details */}
                <g clipPath="url(#crownClip)">
                    {/* Main specular highlight — upper left bright spot */}
                    <ellipse cx="105" cy="82" rx="42" ry="28" fill="url(#specGrad)" />

                    {/* Light streak 1 — diagonal from top-left */}
                    <path
                        d="M 60 72 L 82 120 L 72 122 L 50 74 Z"
                        fill="white" fillOpacity="0.22"
                    />

                    {/* Light streak 2 — smaller secondary */}
                    <path
                        d="M 170 58 L 192 95 L 184 97 L 163 62 Z"
                        fill="white" fillOpacity="0.18"
                    />

                    {/* Bottom area — slightly darker (depth) */}
                    <path
                        d="M 52 175 L 52 215 L 248 215 L 248 175 C 248 192 240 212 212 215 L 88 215 C 62 215 52 198 52 175 Z"
                        fill="#1e40af" fillOpacity="0.18"
                    />

                    {/* Occlusal groove lines (cusps detail) */}
                    <path
                        d="M 115 92 C 118 102 128 108 142 108 C 156 108 165 102 168 92"
                        fill="none" stroke="#1e3a8a" strokeWidth="1.2" strokeOpacity="0.3"
                        strokeLinecap="round"
                    />
                    <line x1="142" y1="58" x2="142" y2="108" stroke="#1e3a8a" strokeWidth="0.8" strokeOpacity="0.2" />
                </g>

                {/* Crown edge fresnel (left side highlight) */}
                <path
                    d="M 52 198 C 46 175 42 150 44 128 C 46 106 54 88 64 74 C 70 65 80 58 90 60 L 86 65 C 78 64 70 72 65 80 C 56 94 50 114 50 135 C 48 158 52 180 58 200 Z"
                    fill="url(#fresnelGrad)"
                />

                {/* Crown edge fresnel (right side) */}
                <path
                    d="M 248 120 C 246 145 242 172 238 194 C 234 210 224 215 212 215 L 216 210 C 226 208 234 200 237 188 C 240 172 243 150 243 128 Z"
                    fill="white" fillOpacity="0.2"
                />

                {/* Tiny cusp tip specular dots */}
                <circle cx="98" cy="62" r="5" fill="white" fillOpacity="0.35" />
                <circle cx="142" cy="52" r="6" fill="white" fillOpacity="0.4" />
                <circle cx="196" cy="62" r="5" fill="white" fillOpacity="0.3" />

                {/* Crown outline — subtle border for depth */}
                <path
                    d="M 52 198 C 46 175 42 150 44 128 C 46 106 54 88 64 74 C 72 62 86 55 98 60 C 108 65 114 78 115 92 C 118 80 122 66 132 58 C 142 50 157 50 165 58 C 174 67 176 83 174 96 C 178 82 184 68 196 60 C 208 52 222 56 230 68 C 238 80 242 98 244 120 C 246 145 242 172 238 194 C 234 210 224 215 212 215 L 88 215 C 68 215 55 210 52 198 Z"
                    fill="none"
                    stroke="white"
                    strokeWidth="1"
                    strokeOpacity="0.25"
                />
            </svg>

            {/* Pulse ring 1 */}
            <div
                className="absolute rounded-full border pointer-events-none"
                style={{
                    inset: '10%',
                    borderColor: '#3b82f630',
                    borderWidth: '1px',
                    animation: 'ringPulse 3.5s ease-out infinite',
                }}
            />
            {/* Pulse ring 2 */}
            <div
                className="absolute rounded-full border pointer-events-none"
                style={{
                    inset: '5%',
                    borderColor: '#2563eb20',
                    borderWidth: '1px',
                    animation: 'ringPulse 3.5s ease-out 1.2s infinite',
                }}
            />

            <style>{`
                @keyframes toothFloat {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    33%  { transform: translateY(-18px) rotate(1.5deg); }
                    66%  { transform: translateY(-8px) rotate(-0.5deg); }
                }
                @keyframes glowPulse {
                    0%, 100% { opacity: 0.5; transform: scale(1.2); }
                    50%       { opacity: 0.9; transform: scale(1.35); }
                }
                @keyframes ringPulse {
                    0%   { transform: scale(0.92); opacity: 0.7; }
                    100% { transform: scale(1.18); opacity: 0; }
                }
            `}</style>
        </div>
    )
}
