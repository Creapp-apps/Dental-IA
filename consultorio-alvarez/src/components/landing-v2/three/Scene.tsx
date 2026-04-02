'use client'

import { Canvas } from '@react-three/fiber'
import { Environment, Float } from '@react-three/drei'
import { DentalSculpture } from './DentalSculpture'
import { ParticleField } from './ParticleField'
import { CameraController } from './CameraController'

interface SceneProps {
    scrollProgress: number
}

export function Scene({ scrollProgress }: SceneProps) {
    const sculptureOpacity = scrollProgress < 0.5
        ? 1
        : scrollProgress < 0.65
            ? 1 - (scrollProgress - 0.5) / 0.15
            : 0

    const particlesOpacity = scrollProgress > 0.45 && scrollProgress < 0.85
        ? scrollProgress < 0.55
            ? (scrollProgress - 0.45) / 0.1
            : scrollProgress > 0.75
                ? 1 - (scrollProgress - 0.75) / 0.1
                : 1
        : 0

    return (
        <Canvas
            camera={{ position: [1.5, 0, 5], fov: 50 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1,
                pointerEvents: 'none',
            }}
            onCreated={({ gl }) => {
                // Handle WebGL context loss gracefully
                gl.domElement.addEventListener('webglcontextlost', (e) => {
                    e.preventDefault()
                    console.warn('WebGL context lost — will restore automatically')
                })
                gl.domElement.addEventListener('webglcontextrestored', () => {
                    console.info('WebGL context restored')
                })
            }}
        >
            <CameraController scrollProgress={scrollProgress} />

            <Environment preset="studio" environmentIntensity={0.6} />
            <ambientLight intensity={0.3} />
            <directionalLight position={[5, 5, 5]} intensity={0.5} color="#e0f2fe" />
            <directionalLight position={[-3, 2, 4]} intensity={0.3} color="#ccfbf1" />

            {sculptureOpacity > 0 && (
                <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.6}>
                    <DentalSculpture
                        scrollProgress={scrollProgress}
                        opacity={sculptureOpacity}
                    />
                </Float>
            )}

            {particlesOpacity > 0 && (
                <ParticleField opacity={particlesOpacity} />
            )}
        </Canvas>
    )
}
