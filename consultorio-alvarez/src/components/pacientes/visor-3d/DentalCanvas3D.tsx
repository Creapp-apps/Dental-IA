'use client'

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { Loader2 } from 'lucide-react'

export type ModoMaterial3D = 'esmalte' | 'yeso' | 'wireframe'

export interface DentalCanvas3DProps {
    stlUpperUrl?: string | null
    stlLowerUrl?: string | null
    mostrarSuperior?: boolean
    mostrarInferior?: boolean
    posicionOclusion?: boolean // true = mordida cerrada, false = arco abierto
    modoMaterial?: ModoMaterial3D
    autoRotar?: boolean
    onLoadingChange?: (loading: boolean) => void
}

export interface DentalCanvas3DRef {
    resetCamera: () => void
    tomarCaptura: () => string | null
}

export const DentalCanvas3D = forwardRef<DentalCanvas3DRef, DentalCanvas3DProps>(
    function DentalCanvas3D(
        {
            stlUpperUrl,
            stlLowerUrl,
            mostrarSuperior = true,
            mostrarInferior = true,
            posicionOclusion = true,
            modoMaterial = 'esmalte',
            autoRotar = false,
            onLoadingChange,
        },
        ref
    ) {
        const containerRef = useRef<HTMLDivElement>(null)
        const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
        const sceneRef = useRef<THREE.Scene | null>(null)
        const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
        const controlsRef = useRef<OrbitControls | null>(null)
        const upperGroupRef = useRef<THREE.Group | null>(null)
        const lowerGroupRef = useRef<THREE.Group | null>(null)
        const [isLoading, setIsLoading] = useState(true)

        // Exponer métodos para resetear cámara y sacar captura
        useImperativeHandle(ref, () => ({
            resetCamera: () => {
                if (cameraRef.current && controlsRef.current) {
                    cameraRef.current.position.set(0, 45, 110)
                    controlsRef.current.target.set(0, 0, 0)
                    controlsRef.current.update()
                }
            },
            tomarCaptura: () => {
                if (rendererRef.current && sceneRef.current && cameraRef.current) {
                    rendererRef.current.render(sceneRef.current, cameraRef.current)
                    return rendererRef.current.domElement.toDataURL('image/png')
                }
                return null
            },
        }))

        // Configuración inicial de Three.js
        useEffect(() => {
            const container = containerRef.current
            if (!container) return

            setIsLoading(true)
            onLoadingChange?.(true)

            // 1. Escena
            const scene = new THREE.Scene()
            scene.background = new THREE.Color(0x0a0c10) // Fondo oscuro moderno dental
            sceneRef.current = scene

            // 2. Cámara
            const camera = new THREE.PerspectiveCamera(
                45,
                container.clientWidth / container.clientHeight,
                0.1,
                1000
            )
            camera.position.set(0, 45, 110)
            cameraRef.current = camera

            // 3. Renderer
            const renderer = new THREE.WebGLRenderer({
                antialias: true,
                preserveDrawingBuffer: true,
                powerPreference: 'high-performance',
            })
            renderer.setSize(container.clientWidth, container.clientHeight)
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
            renderer.toneMapping = THREE.ACESFilmicToneMapping
            renderer.toneMappingExposure = 1.1
            renderer.shadowMap.enabled = true
            renderer.shadowMap.type = THREE.PCFSoftShadowMap

            container.innerHTML = ''
            container.appendChild(renderer.domElement)
            rendererRef.current = renderer

            // 4. OrbitControls
            const controls = new OrbitControls(camera, renderer.domElement)
            controls.enableDamping = true
            controls.dampingFactor = 0.06
            controls.minDistance = 25
            controls.maxDistance = 260
            controls.maxPolarAngle = Math.PI * 0.95
            controls.target.set(0, 0, 0)
            controlsRef.current = controls

            // 5. Iluminación Odontológica Profesional
            // Luz ambiental tenue fría
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
            scene.add(ambientLight)

            // Lámpara cialítica dental cenital (Key Light superior)
            const cialiticaLight = new THREE.DirectionalLight(0xffffff, 1.8)
            cialiticaLight.position.set(20, 90, 60)
            cialiticaLight.castShadow = true
            scene.add(cialiticaLight)

            // Luz de relleno anterior (Fill Light para ver coronas frontales)
            const fillLight = new THREE.DirectionalLight(0xf4f8ff, 1.2)
            fillLight.position.set(0, 10, 80)
            scene.add(fillLight)

            // Luz trasera de contorno (Rim Light para separar la silueta dental)
            const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.7)
            rimLight.position.set(-40, -40, -60)
            scene.add(rimLight)

            // Rejilla de referencia en la base
            const gridHelper = new THREE.GridHelper(90, 18, 0x1e293b, 0x0f172a)
            gridHelper.position.y = -22
            scene.add(gridHelper)

            // Grupos para maxilar superior e inferior
            const upperGroup = new THREE.Group()
            const lowerGroup = new THREE.Group()
            scene.add(upperGroup)
            scene.add(lowerGroup)
            upperGroupRef.current = upperGroup
            lowerGroupRef.current = lowerGroup

            // Cargar o generar modelos anatómicos
            const loader = new STLLoader()

            const cargarOConstruir = async () => {
                let upperCargado = false
                let lowerCargado = false

                if (stlUpperUrl && stlUpperUrl.endsWith('.stl')) {
                    try {
                        const geom = await loader.loadAsync(stlUpperUrl)
                        geom.center()
                        geom.computeVertexNormals()
                        const mat = obtenerMaterial(modoMaterial)
                        const mesh = new THREE.Mesh(geom, mat)
                        mesh.castShadow = true
                        mesh.receiveShadow = true
                        upperGroup.add(mesh)
                        upperCargado = true
                    } catch (e) {
                        console.warn('No se pudo cargar STL superior, usando modelo anatómico:', e)
                    }
                }

                if (stlLowerUrl && stlLowerUrl.endsWith('.stl')) {
                    try {
                        const geom = await loader.loadAsync(stlLowerUrl)
                        geom.center()
                        geom.computeVertexNormals()
                        const mat = obtenerMaterial(modoMaterial)
                        const mesh = new THREE.Mesh(geom, mat)
                        mesh.castShadow = true
                        mesh.receiveShadow = true
                        lowerGroup.add(mesh)
                        lowerCargado = true
                    } catch (e) {
                        console.warn('No se pudo cargar STL inferior, usando modelo anatómico:', e)
                    }
                }

                // Si no se cargaron STLs externos, renderizamos arcada anatómica de alta definición
                if (!upperCargado) {
                    crearArcadaAnatomica(upperGroup, 'superior', modoMaterial)
                }
                if (!lowerCargado) {
                    crearArcadaAnatomica(lowerGroup, 'inferior', modoMaterial)
                }

                setIsLoading(false)
                onLoadingChange?.(false)
            }

            cargarOConstruir()

            // 6. Loop de Animación
            let animationFrameId: number
            const animate = () => {
                animationFrameId = requestAnimationFrame(animate)

                if (controlsRef.current) {
                    controlsRef.current.autoRotate = autoRotar
                    controlsRef.current.autoRotateSpeed = 2.0
                    controlsRef.current.update()
                }

                renderer.render(scene, camera)
            }
            animate()

            // Resize observer
            const handleResize = () => {
                if (!container || !camera || !renderer) return
                camera.aspect = container.clientWidth / container.clientHeight
                camera.updateProjectionMatrix()
                renderer.setSize(container.clientWidth, container.clientHeight)
            }
            window.addEventListener('resize', handleResize)

            return () => {
                cancelAnimationFrame(animationFrameId)
                window.removeEventListener('resize', handleResize)
                renderer.dispose()
                if (container.contains(renderer.domElement)) {
                    container.removeChild(renderer.domElement)
                }
            }
        }, [stlUpperUrl, stlLowerUrl])

        // Actualizar visibilidad y posición de oclusión
        useEffect(() => {
            if (upperGroupRef.current) {
                upperGroupRef.current.visible = mostrarSuperior
                // En posición oclusal se juntan, en posición abierta se eleva el maxilar
                upperGroupRef.current.position.y = posicionOclusion ? 7 : 17
            }
            if (lowerGroupRef.current) {
                lowerGroupRef.current.visible = mostrarInferior
                lowerGroupRef.current.position.y = posicionOclusion ? -7 : -17
            }
        }, [mostrarSuperior, mostrarInferior, posicionOclusion])

        // Actualizar materiales al cambiar modo
        useEffect(() => {
            const mat = obtenerMaterial(modoMaterial)
            const aplicarMaterialAGrupo = (grupo: THREE.Group | null) => {
                if (!grupo) return
                grupo.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.material = mat
                    }
                })
            }
            aplicarMaterialAGrupo(upperGroupRef.current)
            aplicarMaterialAGrupo(lowerGroupRef.current)
        }, [modoMaterial])

        // Actualizar auto-rotación
        useEffect(() => {
            if (controlsRef.current) {
                controlsRef.current.autoRotate = autoRotar
            }
        }, [autoRotar])

        return (
            <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden bg-[#0a0c10]">
                <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-primary gap-2 z-10">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="text-xs font-medium text-white/80">Cargando modelo anatómico 3D...</span>
                    </div>
                )}
            </div>
        )
    }
)

/**
 * Obtiene el material Three.js según el modo seleccionado
 */
function obtenerMaterial(modo: ModoMaterial3D): THREE.Material {
    switch (modo) {
        case 'esmalte':
            // Acabado realista cerámico marfil dental con specular fino
            return new THREE.MeshStandardMaterial({
                color: 0xf6f5ee,
                roughness: 0.28,
                metalness: 0.08,
                envMapIntensity: 0.9,
            })
        case 'yeso':
            // Acabado mate de laboratorio dental (modelo de estudio)
            return new THREE.MeshLambertMaterial({
                color: 0xeadbb8,
            })
        case 'wireframe':
            // Malla poligonal médica
            return new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                wireframe: true,
            })
    }
}

/**
 * Generador procedural de arcada anatómica odontológica 3D
 * Genera la herradura parabólica con encía y dientes individuales para vista preliminar realista
 */
function crearArcadaAnatomica(
    targetGroup: THREE.Group,
    tipo: 'superior' | 'inferior',
    modo: ModoMaterial3D
) {
    targetGroup.clear()

    const materialDiente = obtenerMaterial(modo)

    // Material de encía anatómica rosa pálido
    const materialEncia = new THREE.MeshStandardMaterial({
        color: tipo === 'superior' ? 0xd98282 : 0xcc7575,
        roughness: 0.45,
        metalness: 0.05,
    })

    // Arcada base (forma de U parabólica dental)
    const puntosCurva: THREE.Vector3[] = []
    const numPuntos = 16
    const a = 24 // ancho de arcada
    const b = 28 // profundidad

    for (let i = 0; i <= numPuntos; i++) {
        const t = (i / numPuntos) * Math.PI
        const x = a * Math.cos(t)
        const z = -b * Math.sin(t) + (b * 0.4)
        puntosCurva.push(new THREE.Vector3(x, 0, z))
    }

    // Encía modelada
    const enciaCurve = new THREE.CatmullRomCurve3(puntosCurva)
    const enciaGeo = new THREE.TubeGeometry(enciaCurve, 32, 4.2, 10, false)
    const enciaMesh = new THREE.Mesh(enciaGeo, modo === 'wireframe' ? materialDiente : materialEncia)
    enciaMesh.castShadow = true
    enciaMesh.receiveShadow = true
    targetGroup.add(enciaMesh)

    // Colocar piezas dentales individuales a lo largo de la arcada
    const piezasInfo = [
        { tipo: 'molar', escala: [3.8, 3.2, 4.0] },
        { tipo: 'molar', escala: [3.9, 3.2, 4.1] },
        { tipo: 'premolar', escala: [3.0, 3.4, 3.2] },
        { tipo: 'premolar', escala: [2.9, 3.4, 3.1] },
        { tipo: 'canino', escala: [2.7, 4.2, 2.8] },
        { tipo: 'incisivo_lateral', escala: [2.4, 3.9, 2.2] },
        { tipo: 'incisivo_central', escala: [2.8, 4.2, 2.4] },
    ]

    const colocarDiente = (pos: THREE.Vector3, escala: number[], rotY: number) => {
        // Corona dental con cúspides
        const toothGeo = new THREE.CylinderGeometry(
            escala[0] * 0.9,
            escala[0] * 0.7,
            escala[1],
            7,
            1
        )
        const toothMesh = new THREE.Mesh(toothGeo, materialDiente)
        const offsetY = tipo === 'superior' ? -2.2 : 2.2
        toothMesh.position.set(pos.x, pos.y + offsetY, pos.z)
        toothMesh.rotation.y = rotY
        if (tipo === 'superior') {
            toothMesh.rotation.z = Math.PI // Orientar hacia abajo
        }
        toothMesh.castShadow = true
        toothMesh.receiveShadow = true
        targetGroup.add(toothMesh)
    }

    // Lado derecho e izquierdo de la arcada
    const points = enciaCurve.getSpacedPoints(16)

    for (let i = 1; i <= 7; i++) {
        // Lado izquierdo
        const ptIzq = points[i]
        const pInfo = piezasInfo[7 - i] || piezasInfo[0]
        const rotIzq = Math.atan2(ptIzq.x, ptIzq.z)
        colocarDiente(ptIzq, pInfo.escala, rotIzq)

        // Lado derecho simétrico
        const ptDer = points[16 - i]
        const rotDer = Math.atan2(ptDer.x, ptDer.z)
        colocarDiente(ptDer, pInfo.escala, rotDer)
    }
}
