'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Edit2 } from 'lucide-react'
import { GlassButton } from '@/components/ui/glass-button'
import { cn } from '@/lib/utils'

interface EditarPacienteBtnProps {
    pacienteId: string
    variant?: 'glass' | 'default' | 'secondary' | 'outline'
    size?: 'sm' | 'default' | 'lg'
    className?: string
    label?: string
}

export function EditarPacienteBtn({
    pacienteId,
    variant = 'glass',
    size = 'sm',
    className,
    label = 'Editar Paciente',
}: EditarPacienteBtnProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isLoading, setIsLoading] = useState(false)

    function handleClick() {
        setIsLoading(true)
        startTransition(() => {
            router.push(`/pacientes/${pacienteId}/editar`)
        })
    }

    return (
        <GlassButton
            size={size}
            variant={variant}
            loading={isLoading || isPending}
            onClick={handleClick}
            className={cn('font-semibold', className)}
        >
            {!(isLoading || isPending) && <Edit2 className="h-3.5 w-3.5 mr-1.5" />}
            {label}
        </GlassButton>
    )
}
