import LoginClient from './LoginClient'

export default async function LoginPage({
    searchParams,
}: {
    searchParams?: Promise<{ error?: string }>
}) {
    const params = await searchParams
    const errorMsg = params?.error ? decodeURIComponent(params.error) : null
    return <LoginClient errorMsg={errorMsg} />
}
