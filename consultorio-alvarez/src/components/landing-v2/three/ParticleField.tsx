'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
    opacity: number
    count?: number
}

export function ParticleField({ opacity, count = 2000 }: Props) {
    const pointsRef = useRef<THREE.Points>(null)

    const { positions, velocities } = useMemo(() => {
        const positions = new Float32Array(count * 3)
        const velocities = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            const i3 = i * 3
            // Spherical distribution
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(2 * Math.random() - 1)
            const r = 1.5 + Math.random() * 2
            positions[i3] = r * Math.sin(phi) * Math.cos(theta)
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)
            positions[i3 + 2] = r * Math.cos(phi)
            velocities[i3] = (Math.random() - 0.5) * 0.005
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.005
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.005
        }
        return { positions, velocities }
    }, [count])

    useFrame(({ pointer }) => {
        if (!pointsRef.current) return
        const geo = pointsRef.current.geometry
        const pos = geo.attributes.position as THREE.BufferAttribute

        for (let i = 0; i < count; i++) {
            const i3 = i * 3
            // Wind effect from mouse
            const windX = pointer.x * 0.002
            const windY = pointer.y * 0.002

            pos.array[i3] += velocities[i3] + windX
            pos.array[i3 + 1] += velocities[i3 + 1] + windY
            pos.array[i3 + 2] += velocities[i3 + 2]

            // Soft bounds
            for (let j = 0; j < 3; j++) {
                if (Math.abs(pos.array[i3 + j]) > 4) {
                    velocities[i3 + j] *= -0.8
                }
            }
        }
        pos.needsUpdate = true

        // Slow rotation
        pointsRef.current.rotation.y += 0.001
    })

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                    args={[positions, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.025}
                color="#2dd4bf"
                transparent
                opacity={opacity * 0.7}
                sizeAttenuation
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    )
}
