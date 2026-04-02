'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
    scrollProgress: number
    opacity: number
}

export function DentalSculpture({ scrollProgress, opacity }: Props) {
    const meshRef = useRef<THREE.Mesh>(null)
    const materialRef = useRef<THREE.MeshPhysicalMaterial>(null)

    useFrame(({ clock, pointer }) => {
        if (!meshRef.current) return

        // Slow auto-rotation
        meshRef.current.rotation.y += 0.003

        // Subtle cursor parallax
        meshRef.current.rotation.x = THREE.MathUtils.lerp(
            meshRef.current.rotation.x,
            pointer.y * 0.15,
            0.05
        )
        meshRef.current.position.x = THREE.MathUtils.lerp(
            meshRef.current.position.x,
            pointer.x * 0.3,
            0.03
        )

        // Scale based on scroll (zoom in during services section)
        const targetScale = scrollProgress < 0.25
            ? 1
            : scrollProgress < 0.55
                ? 1 + (scrollProgress - 0.25) * 2.5
                : 1.75

        meshRef.current.scale.setScalar(
            THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.04)
        )

        // Opacity
        if (materialRef.current) {
            materialRef.current.opacity = THREE.MathUtils.lerp(
                materialRef.current.opacity,
                opacity,
                0.08
            )
        }
    })

    return (
        <mesh ref={meshRef} position={[1.5, 0, 0]} scale={0.7}>
            <torusKnotGeometry args={[1, 0.35, 256, 64, 2, 3]} />
            <meshPhysicalMaterial
                ref={materialRef}
                color="#e8f5f0"
                roughness={0.08}
                metalness={0.1}
                clearcoat={1}
                clearcoatRoughness={0.05}
                transmission={0.15}
                thickness={1.5}
                ior={1.5}
                envMapIntensity={1.2}
                transparent
                opacity={opacity}
                side={THREE.DoubleSide}
            />
        </mesh>
    )
}
