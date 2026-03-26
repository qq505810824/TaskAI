export function mergeAudioChunks(chunks: Float32Array[]): Float32Array {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }

    return merged;
}

/**
 * 线性降采样（单声道），用于减小 WAV 体积。
 */
export function downsamplePcmLinear(
    input: Float32Array,
    inputSampleRate: number,
    targetSampleRate: number
): Float32Array {
    if (targetSampleRate >= inputSampleRate) return input;
    if (targetSampleRate <= 0) return input;

    const ratio = inputSampleRate / targetSampleRate;
    const outputLength = Math.max(1, Math.floor(input.length / ratio));
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i += 1) {
        const nextI = Math.floor((i + 1) * ratio);
        const start = Math.floor(i * ratio);
        const end = Math.min(nextI, input.length);
        if (end <= start) {
            output[i] = input[start] ?? 0;
            continue;
        }

        let sum = 0;
        for (let j = start; j < end; j += 1) {
            sum += input[j];
        }
        output[i] = sum / (end - start);
    }

    return output;
}

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
    const bytesPerSample = 2;
    const blockAlign = bytesPerSample;
    const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buffer);

    const writeString = (offset: number, value: string) => {
        for (let index = 0; index < value.length; index += 1) {
            view.setUint8(offset + index, value.charCodeAt(index));
        }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * bytesPerSample, true);

    let offset = 44;
    for (let index = 0; index < samples.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, samples[index]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += bytesPerSample;
    }

    return new Blob([buffer], { type: "audio/wav" });
}

