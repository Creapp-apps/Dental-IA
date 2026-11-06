// Grabación de notas de voz en el navegador, con salida ogg/opus.
// WhatsApp solo muestra la onda (waveform) de "nota de voz" si el audio es ogg con codec opus.
// MediaRecorder de Chrome produce webm/opus (contenedor equivocado), así que usamos opus-recorder,
// que encodea directo a ogg/opus vía wasm. El worker se sirve desde /public (mismo origen, obligatorio).
//
// opus-recorder toca AudioContext/micrófono, por eso se importa dinámicamente (solo cliente).

export interface GrabadorVoz {
    /** Detiene la grabación y resuelve con el archivo ogg/opus listo para enviar. */
    stop: () => Promise<File>
    /** Cancela: corta el micrófono y descarta el audio. */
    cancel: () => void
}

/**
 * Pide permiso de micrófono, arranca la grabación y devuelve los controles.
 * Debe llamarse desde un gesto del usuario (click), requisito de los navegadores.
 */
export async function iniciarGrabacionVoz(): Promise<GrabadorVoz> {
    const { default: Recorder } = await import('opus-recorder')

    if (!Recorder.isRecordingSupported()) {
        throw new Error('Tu navegador no permite grabar notas de voz')
    }

    const recorder = new Recorder({
        encoderPath: '/opus/encoderWorker.min.js',
        numberOfChannels: 1,
        encoderApplication: 2048, // Voz (VoIP): optimiza para habla
        encoderSampleRate: 48000,
        streamPages: false,
        monitorGain: 0,
        recordingGain: 1
    })

    let resolverStop: ((file: File) => void) | null = null
    let cancelado = false

    recorder.ondataavailable = (typedArray: Uint8Array) => {
        if (cancelado) return
        const blob = new Blob([typedArray as BlobPart], { type: 'audio/ogg; codecs=opus' })
        const file = new File([blob], `nota-de-voz-${Date.now()}.ogg`, { type: 'audio/ogg; codecs=opus' })
        recorder.close() // libera el micrófono
        resolverStop?.(file)
    }

    await recorder.start()

    return {
        stop: () => new Promise<File>((resolve, reject) => {
            resolverStop = resolve
            recorder.onstop = () => {
                // Si el worker terminó sin emitir datos, no dejamos la promesa colgada.
                if (!cancelado) setTimeout(() => reject(new Error('No se grabó audio')), 0)
            }
            recorder.stop()
        }),
        cancel: () => {
            cancelado = true
            recorder.close()
        }
    }
}
