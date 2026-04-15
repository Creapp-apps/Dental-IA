import { Stethoscope, AlertCircle } from 'lucide-react'
import { loginAction } from '@/lib/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage({
    searchParams,
}: {
    searchParams?: Promise<{ error?: string }>
}) {
    const params = await searchParams
    const errorMsg = params?.error ? decodeURIComponent(params.error) : null

    // Mapeo de mensajes de Supabase a mensajes amigables en español
    const friendlyError = errorMsg?.includes('Invalid login credentials')
        ? 'Email o contraseña incorrectos.'
        : errorMsg ?? null

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm space-y-6">
                {/* Logo */}
                <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
                        <Stethoscope className="h-7 w-7 text-primary-foreground" strokeWidth={1.8} />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Dental-IA
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Plataforma de gestión odontológica
                        </p>
                    </div>
                </div>

                {/* Card */}
                <Card className="shadow-md border-border/60">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base">Iniciar sesión</CardTitle>
                        <CardDescription className="text-sm">
                            Ingresá con tus credenciales
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Error de credenciales */}
                        {friendlyError && (
                            <div className="flex items-center gap-2 mb-4 rounded-lg bg-destructive/10 text-destructive px-3 py-2.5 text-sm border border-destructive/20">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{friendlyError}</span>
                            </div>
                        )}

                        <form action={loginAction} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="password">Contraseña</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full mt-2">
                                Ingresar al sistema
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground">
                    🔒 Acceso restringido — solo personal autorizado
                </p>
            </div>
        </div>
    )
}
