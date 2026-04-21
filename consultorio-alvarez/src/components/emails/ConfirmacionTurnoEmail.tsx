import {
    Html,
    Head,
    Body,
    Container,
    Text,
    Heading,
    Hr,
    Preview,
    Section,
} from '@react-email/components'
import * as React from 'react'

interface ConfirmacionTurnoEmailProps {
    pacienteNombre: string
    fecha: string
    hora: string
    tratamiento: string
    profesional: string
}

export const ConfirmacionTurnoEmail = ({
    pacienteNombre,
    fecha,
    hora,
    tratamiento,
    profesional,
}: ConfirmacionTurnoEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Tu turno en Consultorio Alvarez ha sido confirmado para el {fecha} a las {hora}.</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <img
                            src="https://fnrahivsztbwjmvpveae.supabase.co/storage/v1/object/public/tenant_assets/alvarez/logo-dark.png"
                            width="180"
                            alt="Consultorio Alvarez"
                            style={logo}
                        />
                    </Section>
                    <Section style={content}>
                        <Heading style={heading}>¡Turno Confirmado!</Heading>
                        <Text style={paragraph}>Hola {pacienteNombre},</Text>
                        <Text style={paragraph}>Te escribimos para confirmar que tu turno en Consultorio Alvarez ha sido agendado exitosamente.</Text>

                        <Section style={detailsBox}>
                            <Text style={detailItem}><strong>📅 Fecha:</strong> {fecha}</Text>
                            <Text style={detailItem}><strong>⏰ Hora:</strong> {hora}</Text>
                            <Text style={detailItem}><strong>👨‍⚕️ Profesional:</strong> Dr/a. {profesional}</Text>
                            <Text style={detailItem}><strong>🦷 Tratamiento:</strong> {tratamiento}</Text>
                        </Section>

                        <Text style={paragraph}>Si necesitas reprogramar o cancelar tu turno, por favor comunícate con nosotros lo antes posible.</Text>
                        <Text style={paragraph}>¡Te esperamos!</Text>
                    </Section>
                    <Hr style={hr} />
                    <Section style={footer}>
                        <Text style={footerText}>Consultorio Alvarez</Text>
                        <Text style={footerText}>Este es un correo automático, por favor no respondas a este mensaje.</Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
}

const header = {
    padding: '32px 48px',
    backgroundColor: '#09090b', // dark background for the logo
    textAlign: 'center' as const,
}

const logo = {
    margin: '0 auto',
}

const content = {
    padding: '32px 48px',
}

const heading = {
    fontSize: '24px',
    letterSpacing: '-0.5px',
    lineHeight: '1.3',
    fontWeight: '700',
    color: '#09090b',
    padding: '0',
}

const paragraph = {
    fontSize: '16px',
    lineHeight: '26px',
    color: '#3f3f46', // muted foreground
}

const detailsBox = {
    backgroundColor: '#f4f4f5',
    borderRadius: '8px',
    padding: '24px',
    margin: '24px 0',
}

const detailItem = {
    fontSize: '16px',
    color: '#09090b',
    margin: '8px 0',
}

const hr = {
    borderColor: '#e4e4e7',
    margin: '20px 0',
}

const footer = {
    padding: '0 48px',
}

const footerText = {
    fontSize: '12px',
    color: '#71717a',
    textAlign: 'center' as const,
    margin: '4px 0',
}
