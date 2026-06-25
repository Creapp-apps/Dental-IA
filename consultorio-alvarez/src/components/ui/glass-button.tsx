'use client'

import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const glassButtonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.97] hover:scale-[1.02] active:opacity-95 transform-gpu',
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground shadow-glass hover:shadow-glass-lg',
                glass:
                    'glass shadow-glass hover:shadow-glass-lg text-foreground',
                secondary:
                    'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
                destructive:
                    'bg-destructive text-white shadow-glass hover:shadow-glass-lg',
                ghost:
                    'hover:bg-accent hover:text-accent-foreground',
                outline:
                    'border border-border bg-background hover:bg-accent hover:text-accent-foreground shadow-sm',
                success:
                    'bg-success text-success-foreground shadow-glass hover:shadow-glass-lg',
                link:
                    'text-primary underline-offset-4 hover:underline',
            },
            size: {
                sm: 'h-8 px-3 text-xs rounded-lg',
                default: 'h-10 px-5 py-2',
                lg: 'h-12 px-8 text-base rounded-2xl',
                xl: 'h-14 px-10 text-lg rounded-2xl',
                icon: 'h-10 w-10',
                'icon-sm': 'h-8 w-8',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
)

export interface GlassButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
    asChild?: boolean
    loading?: boolean
}

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
    ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {

        if (asChild) {
            return (
                <Slot
                    ref={ref as React.Ref<HTMLElement>}
                    className={cn(glassButtonVariants({ variant, size, className }))}
                >
                    {children}
                </Slot>
            )
        }

        return (
            <button
                className={cn(glassButtonVariants({ variant, size, className }))}
                ref={ref}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span className="opacity-70">{children}</span>
                    </>
                ) : (
                    children
                )}
            </button>
        )
    }
)
GlassButton.displayName = 'GlassButton'

export { GlassButton, glassButtonVariants }
