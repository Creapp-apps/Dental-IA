'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uBlend;
  varying vec2 vUv;

  // Simplex-ish noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    float n1 = snoise(vUv * 1.8 + uTime * 0.03);
    float n2 = snoise(vUv * 2.5 - uTime * 0.02 + 10.0);
    float n = (n1 + n2 * 0.4) * 0.3 + 0.5;

    vec3 baseColor = mix(uColor1, uColor2, n * 0.4);
    vec3 finalColor = mix(baseColor, uColor3, uBlend * 0.85);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

interface Props {
    scrollProgress: number
}

export function BackgroundShader({ scrollProgress }: Props) {
    const meshRef = useRef<THREE.Mesh>(null)
    const { size } = useThree()

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uColor1: { value: new THREE.Color('#f7f8fc') }, // near-white pearl
            uColor2: { value: new THREE.Color('#eef2f7') }, // very faint blue-gray
            uColor3: { value: new THREE.Color('#0c1e3a') }, // deep navy
            uBlend: { value: 0 },
        }),
        []
    )

    useFrame(({ clock }) => {
        uniforms.uTime.value = clock.getElapsedTime()

        // Color transitions based on scroll
        if (scrollProgress < 0.25) {
            // Hero: almost pure white with barely perceptible blue warmth
            uniforms.uColor1.value.lerp(new THREE.Color('#f7f8fc'), 0.06)
            uniforms.uColor2.value.lerp(new THREE.Color('#eef2f7'), 0.06)
            uniforms.uBlend.value += (0 - uniforms.uBlend.value) * 0.06
        } else if (scrollProgress < 0.55) {
            // Services: transition to deep clinical navy
            const t = (scrollProgress - 0.25) / 0.3
            uniforms.uColor1.value.lerp(new THREE.Color('#0b1628'), 0.04)
            uniforms.uColor2.value.lerp(new THREE.Color('#0e2a3d'), 0.04)
            uniforms.uBlend.value += (t * 0.95 - uniforms.uBlend.value) * 0.05
        } else if (scrollProgress < 0.8) {
            // Team: stay dark navy
            uniforms.uColor1.value.lerp(new THREE.Color('#0a1525'), 0.04)
            uniforms.uColor2.value.lerp(new THREE.Color('#0d2233'), 0.04)
            uniforms.uBlend.value += (0.7 - uniforms.uBlend.value) * 0.05
        } else {
            // Booking: lighten back to clean white
            uniforms.uColor1.value.lerp(new THREE.Color('#fafbfe'), 0.05)
            uniforms.uColor2.value.lerp(new THREE.Color('#f0f3f8'), 0.05)
            uniforms.uBlend.value += (0 - uniforms.uBlend.value) * 0.05
        }
    })

    return (
        <mesh ref={meshRef} renderOrder={-1}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                depthTest={false}
                depthWrite={false}
            />
        </mesh>
    )
}
