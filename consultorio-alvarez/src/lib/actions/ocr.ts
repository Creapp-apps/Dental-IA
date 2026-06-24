'use server'

import { createClient } from '@/lib/supabase/server'

interface PatientOcrResult {
    nombre: string
    apellido: string
    dni: string
    cuit: string
    fecha_nacimiento: string
    genero: 'M' | 'F' | 'X' | ''
    telefono: string
    email: string
    direccion: string
    ciudad: string
    obra_social_id: string // Obra social name
    plan_obra_social: string
    n_afiliado: string
    alergias: string
    medicacion_actual: string
    antecedentes: string
}

export async function processPatientCardOcr(base64Image: string): Promise<{ success: boolean; data?: PatientOcrResult; error?: string }> {
    try {
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return { 
                success: false, 
                error: 'La clave GEMINI_API_KEY no está configurada en las variables de entorno del servidor (.env.local).' 
            }
        }

        // Clean base64 string (remove data:image/jpeg;base64, prefix if present)
        const matches = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/)
        let mimeType = 'image/jpeg'
        let base64Data = base64Image

        if (matches && matches.length === 3) {
            mimeType = matches[1]
            base64Data = matches[2]
        }

        const prompt = `Analiza esta imagen que corresponde a una ficha o tarjeta física de registro de paciente odontológico/médico.
Tu tarea es extraer toda la información disponible y estructurarla en un formato JSON específico. 

Ten en cuenta las siguientes reglas para cada campo:
- "apellido" y "nombre": Si figuran juntos (por ejemplo, "Ruiz de Gove Javier Alberto" o "Perez, Juan"), sepáralos correctamente. Si no está claro cuál es cuál, infiérelo por las convenciones de apellidos hispanos.
- "dni": Extrae sólo números (sin puntos ni guiones). Ej: "24365165".
- "cuit": Si figura en la ficha, extráelo. Si no figura, pero tienes el DNI y el género, intenta calcular el CUIL/CUIT correspondiente (prefijo 20 para hombres, 27 para mujeres, o bien deja vacío si no estás seguro).
- "fecha_nacimiento": Extráela en formato DD/MM/AAAA (por ejemplo: "10/02/1975" o "10/02/75", prefiere año completo de 4 dígitos si es posible).
- "genero": Debe ser estrictamente una de estas opciones: "M" (Masculino), "F" (Femenino), "X" (No binario), o "" si no está especificado ni se puede deducir.
- "telefono": Extrae el número de teléfono limpio. Ej: "1131562532".
- "email": Extrae la dirección de correo electrónico si figura.
- "direccion": Extrae la calle y número (por ejemplo: "Gral Paz 431 2 D").
- "ciudad": Extrae la localidad/ciudad (por ejemplo: "San Isidro" o "S. Isidro").
- "obra_social_id": Nombre de la obra social o prepaga (por ejemplo: "MEDICUS" o "OSDE").
- "plan_obra_social": Nombre del plan de salud si figura (por ejemplo: "Plan 210", "310", etc.).
- "n_afiliado": Número de afiliado o tarjeta de la obra social.
- "alergias": Cualquier alergia especificada.
- "medicacion_actual": Medicamentos o tratamientos actuales mencionados.
- "antecedentes": Antecedentes médicos, familiares o patologías previas mencionadas.

Responde únicamente con un objeto JSON válido que contenga estas claves exactamente:
{
  "nombre": string,
  "apellido": string,
  "dni": string,
  "cuit": string,
  "fecha_nacimiento": string,
  "genero": "M" | "F" | "X" | "",
  "telefono": string,
  "email": string,
  "direccion": string,
  "ciudad": string,
  "obra_social_id": string,
  "plan_obra_social": string,
  "n_afiliado": string,
  "alergias": string,
  "medicacion_actual": string,
  "antecedentes": string
}`

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt },
                                {
                                    inlineData: {
                                        mimeType: mimeType,
                                        data: base64Data
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: 'application/json'
                    }
                })
            }
        )

        if (!response.ok) {
            const errText = await response.text()
            console.error('Error llamando a Gemini API:', errText)
            return { success: false, error: `Error de API de Gemini: ${response.statusText}` }
        }

        const resJson = await response.json()
        const textResult = resJson?.candidates?.[0]?.content?.parts?.[0]?.text

        if (!textResult) {
            return { success: false, error: 'No se obtuvo respuesta del modelo de IA.' }
        }

        try {
            const parsedData = JSON.parse(textResult.trim()) as PatientOcrResult
            return { success: true, data: parsedData }
        } catch (parseError) {
            console.error('Error parseando JSON de Gemini:', textResult)
            return { success: false, error: 'La IA no devolvió un formato JSON válido.' }
        }
    } catch (e: any) {
        console.error('Error en processPatientCardOcr Server Action:', e)
        return { success: false, error: e.message || 'Error interno del servidor.' }
    }
}
