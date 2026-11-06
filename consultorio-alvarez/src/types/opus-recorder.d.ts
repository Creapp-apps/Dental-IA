// Declaración mínima para opus-recorder (v8), que no publica tipos propios.
// Solo cubre lo que usamos para grabar notas de voz ogg/opus. Ver node_modules/opus-recorder/README.md.
declare module 'opus-recorder' {
    interface RecorderConfig {
        encoderPath?: string
        numberOfChannels?: number
        /** 2048 = Voz (VoIP), 2049 = Full Band, 2051 = Low Delay. */
        encoderApplication?: number
        encoderSampleRate?: number
        encoderBitRate?: number
        encoderComplexity?: number
        encoderFrameSize?: number
        maxFramesPerPage?: number
        streamPages?: boolean
        monitorGain?: number
        recordingGain?: number
        mediaTrackConstraints?: boolean | MediaTrackConstraints
    }

    export default class Recorder {
        constructor(config?: RecorderConfig)
        static isRecordingSupported(): boolean
        /** Se dispara con los bytes del audio codificado (una vez si streamPages es false). */
        ondataavailable: (typedArray: Uint8Array) => void
        onstart: () => void
        onstop: () => void
        onpause: () => void
        onresume: () => void
        start(): Promise<void>
        stop(): Promise<void>
        pause(flush?: boolean): Promise<void>
        resume(): void
        close(): void
    }
}
