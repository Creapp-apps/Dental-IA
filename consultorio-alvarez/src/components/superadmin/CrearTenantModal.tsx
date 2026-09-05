'use client'

import { useState, useTransition } from 'react'
import { crearNuevoTenantSaaS } from '@/lib/actions/superadmin'
import { X, Plus, Check, Loader2, Sparkles, Copy, ExternalLink, ShieldCheck } from 'lucide-react'

interface CrearTenantModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function CrearTenantModal({ isOpen, onClose, onSuccess }: CrearTenantModalProps) {
    const [nombre, setNombre] = useState('')
    const [slug, setSlug] = useState('')
    const [adminEmail, setAdminEmail] = useState('')
    const [adminPassword, setAdminPassword] = useState('DentalIA2026!')
    const [montoAbono, setMontoAbono] = useState(125000)
    const [diasPrueba, setDiasPrueba] = useState(30)
    const [telefono, setTelefono] = useState('')
    const [colorPrimario, setColorPrimario] = useState('#2563eb')

    const [isPending, startTransition] = useTransition()
    const [errorMsg, setErrorMsg] = useState('')
    const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string; slug: string } | null>(null)
    const [copied, setCopied] = useState(false)

    if (!isOpen) return null

    // Generar slug automático a partir del nombre
    const handleNombreChange = (val: string) => {
        setNombre(val)
        if (!slug || slug === cleanToSlug(nombre)) {
            setSlug(cleanToSlug(val))
        }
    }

    function cleanToSlug(text: string) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg('')

        startTransition(async () => {
            try {
                const res = await crearNuevoTenantSaaS({
                    nombre,
                    slug,
                    adminEmail,
                    adminPassword,
                    montoAbono: Number(montoAbono),
                    diasPrueba: Number(diasPrueba),
                    telefono,
                    colorPrimario
                })

                setCreatedCredentials({
                    email: res.credentials.email,
                    pass: res.credentials.password,
                    slug: res.tenant.slug
                })
                onSuccess()
            } catch (err: any) {
                setErrorMsg(err.message || 'Error al crear el consultorio.')
            }
        })
    }

    const copyCreds = () => {
        if (!createdCredentials) return
        const text = `Acceso a Dental-IA (${nombre}):\nURL: http://localhost:3001/login?slug=${createdCredentials.slug}\nEmail: ${createdCredentials.email}\nContraseña: ${createdCredentials.pass}`
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/40">
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            Alta de Nuevo Consultorio (Tenant)
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Crea un consultorio aislado con su landing y usuario administrador
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {createdCredentials ? (
                    // Pantalla de Éxito con Credenciales
                    <div className="p-6 space-y-5">
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-2">
                                <Check className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-bold text-white">¡Consultorio Creado con Éxito!</h4>
                            <p className="text-xs text-slate-300 mt-1">
                                El tenant <span className="text-cyan-400 font-mono font-bold">{createdCredentials.slug}</span> y su administrador ya están operativos.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-2 text-xs font-mono">
                            <div>
                                <span className="text-slate-500">Link de Acceso:</span>
                                <p className="text-cyan-300 truncate">http://localhost:3001/login?slug={createdCredentials.slug}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Email Administrador:</span>
                                <p className="text-white">{createdCredentials.email}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Contraseña Provisoria:</span>
                                <p className="text-white">{createdCredentials.pass}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={copyCreds}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-white/10 transition-all"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                {copied ? '¡Copiado al portapapeles!' : 'Copiar Credenciales'}
                            </button>
                            <button
                                onClick={onClose}
                                className="py-2.5 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
                            >
                                Listo
                            </button>
                        </div>
                    </div>
                ) : (
                    // Formulario de creación
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        {errorMsg && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                                {errorMsg}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Nombre del Consultorio / Clínica *
                            </label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={e => handleNombreChange(e.target.value)}
                                placeholder="ej: Clínica Odontológica San Martín"
                                className="w-full px-3 py-2 text-sm bg-slate-950/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Slug / Subdominio *
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={e => setSlug(cleanToSlug(e.target.value))}
                                        placeholder="sanmartin"
                                        className="w-full px-3 py-2 text-sm bg-slate-950/60 border border-white/10 rounded-xl text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Color de Marca
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={colorPrimario}
                                        onChange={e => setColorPrimario(e.target.value)}
                                        className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                                    />
                                    <input
                                        type="text"
                                        value={colorPrimario}
                                        onChange={e => setColorPrimario(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-white/10 rounded-xl text-slate-300 font-mono focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 space-y-3">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Credenciales del Administrador
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] text-slate-400 mb-1">Email del Admin *</label>
                                    <input
                                        type="email"
                                        value={adminEmail}
                                        onChange={e => setAdminEmail(e.target.value)}
                                        placeholder="admin@clinica.com"
                                        className="w-full px-3 py-1.5 text-xs bg-slate-950/60 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-400 mb-1">Contraseña Inicial</label>
                                    <input
                                        type="text"
                                        value={adminPassword}
                                        onChange={e => setAdminPassword(e.target.value)}
                                        placeholder="DentalIA2026!"
                                        className="w-full px-3 py-1.5 text-xs bg-slate-950/60 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Abono Mensual (ARS)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-xs text-slate-400">$</span>
                                    <input
                                        type="number"
                                        value={montoAbono}
                                        onChange={e => setMontoAbono(Number(e.target.value))}
                                        className="w-full pl-6 pr-3 py-1.5 text-xs bg-slate-950/60 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                    Días de Prueba Gratis
                                </label>
                                <input
                                    type="number"
                                    value={diasPrueba}
                                    onChange={e => setDiasPrueba(Number(e.target.value))}
                                    className="w-full px-3 py-1.5 text-xs bg-slate-950/60 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="px-5 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Creando Consultorio...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-3.5 h-3.5" />
                                        Crear Consultorio
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
