'use client'

import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
    scrollProgress: number
}

export function CameraController({ scrollProgress }: Props) {
    const { camera } = useThree()

    useFrame(() => {
        // Camera positions for each section
        let targetPos: [number, number, number]
        let targetLookAt: [number, number, number] = [0, 0, 0]

        if (scrollProgress < 0.25) {
            // Hero: wide shot
            targetPos = [0, 0.5, 5]
        } else if (scrollProgress < 0.55) {
            // Services: zoom in + orbit
            const t = (scrollProgress - 0.25) / 0.3
            const angle = t * Math.PI * 0.5
            targetPos = [
                Math.sin(angle) * 3,
                0.5 - t * 0.5,
                Math.cos(angle) * 3 + 2,
            ]
        } else if (scrollProgress < 0.8) {
            // Team: pull back, cenital soft
            const t = (scrollProgress - 0.55) / 0.25
            targetPos = [0, 2 + t * 3, 4 - t * 2]
            targetLookAt = [0, 0, 0]
        } else {
            // Booking: cenital
            targetPos = [0, 6, 2]
            targetLookAt = [0, 0, 0]
        }

        camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetPos[0], 0.03)
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetPos[1], 0.03)
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetPos[2], 0.03)

        const lookTarget = new THREE.Vector3(...targetLookAt)
        const currentLook = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
        const desiredDir = lookTarget.clone().sub(camera.position).normalize()
        const blended = currentLook.lerp(desiredDir, 0.03).add(camera.position)
        camera.lookAt(blended)
    })

    return null
}
