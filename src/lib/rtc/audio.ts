export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export async function getAudioDurationSeconds(blob: Blob): Promise<number | null> {
    try {
        const arrayBuffer = await blob.arrayBuffer();
        const ctx = new AudioContext();
        try {
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
            if (!Number.isFinite(audioBuffer.duration)) return null;
            return Math.ceil(audioBuffer.duration);
        } finally {
            await ctx.close().catch(() => {});
        }
    } catch {
        return null;
    }
}

