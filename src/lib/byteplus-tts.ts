import { Buffer } from 'buffer';

const DEFAULT_TTS_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse';
const DEFAULT_TTS_RESOURCE_ID = 'seed-tts-2.0';
const DEFAULT_TTS_VOICE = 'en_female_dacey_uranus_bigtts';
const DEFAULT_TTS_ENCODING = 'mp3';

type TtsRequest = {
    appId: string;
    accessToken: string;
    voiceType: string;
    encoding: string;
    url: string;
    resourceId: string;
    body: string;
};

function requireEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} is missing.`);
    return value;
}

function getSpeechAppId() {
    // 优先 TTS_APP_ID，兼容 speaking-avatar 的读取顺序
    return (
        process.env.BYTEPLUS_TTS_APP_ID?.trim() ||
        process.env.BYTEPLUS_APP_ID?.trim() ||
        requireEnv('BYTEPLUS_TTS_APP_ID')
    );
}

function getSpeechAccessToken() {
    return (
        process.env.BYTEPLUS_TTS_TOKEN?.trim() ||
        process.env.BYTEPLUS_ACCESS_TOKEN?.trim() ||
        requireEnv('BYTEPLUS_TTS_TOKEN')
    );
}

function buildTtsRequest(text: string): TtsRequest {
    const appId = getSpeechAppId();
    const accessToken = getSpeechAccessToken();
    const voiceType = process.env.BYTEPLUS_TTS_VOICE_TYPE?.trim() || DEFAULT_TTS_VOICE;
    const encoding = process.env.BYTEPLUS_TTS_ENCODING?.trim() || DEFAULT_TTS_ENCODING;
    const url = process.env.BYTEPLUS_TTS_URL?.trim() || DEFAULT_TTS_URL;
    const resourceId = process.env.BYTEPLUS_TTS_RESOURCE_ID?.trim() || DEFAULT_TTS_RESOURCE_ID;

    return {
        appId,
        accessToken,
        voiceType,
        encoding,
        url,
        resourceId,
        body: JSON.stringify({
            user: { uid: 'student-avatar-demo' },
            req_params: {
                text,
                speaker: voiceType,
                audio_params: {
                    format: encoding,
                    sample_rate: 24000,
                },
            },
        }),
    };
}

function parseTtsEventLine(line: string): Buffer | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return null;

    const jsonPart = trimmed.slice(5).trim();
    if (!jsonPart || jsonPart === '[DONE]') return null;

    const event = JSON.parse(jsonPart) as {
        code?: number;
        message?: string;
        data?: string | null;
    };

    if (event.code && event.code !== 0 && event.code !== 20000000) {
        throw new Error(event.message ?? `TTS event failed with code ${event.code}`);
    }

    return event.data ? Buffer.from(event.data, 'base64') : null;
}

/**
 * BytePlus TTS: 返回可用于客户端 MediaSource 的流式音频（mp3/wav）
 */
export async function synthesizeSpeechStream(text: string) {
    const { appId, accessToken, voiceType, encoding, url, resourceId, body } =
        buildTtsRequest(text);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-App-Id': appId,
            'X-Api-Access-Key': accessToken,
            'X-Api-Resource-Id': resourceId,
        },
        body,
    });

    if (!response.ok || !response.body) {
        const payloadText = await response.text().catch(() => '');
        throw new Error(`BytePlus TTS failed: ${payloadText}`);
    }

    const textDecoder = new TextDecoder();
    let pendingText = '';

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const reader = response.body!.getReader();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (!value) continue;

                    pendingText += textDecoder.decode(value, { stream: true });
                    const lines = pendingText.split('\n');
                    pendingText = lines.pop() ?? '';

                    for (const line of lines) {
                        const audioChunk = parseTtsEventLine(line);
                        if (audioChunk && audioChunk.length) controller.enqueue(new Uint8Array(audioChunk));
                    }
                }

                // flush tail
                pendingText += textDecoder.decode();
                for (const line of pendingText.split('\n')) {
                    const audioChunk = parseTtsEventLine(line);
                    if (audioChunk && audioChunk.length) controller.enqueue(new Uint8Array(audioChunk));
                }

                controller.close();
            } catch (err) {
                controller.error(err instanceof Error ? err : new Error('BytePlus TTS stream failed.'));
            } finally {
                reader.releaseLock();
            }
        },
    });

    return {
        stream,
        audioMimeType: encoding === 'mp3' ? 'audio/mpeg' : 'audio/wav',
        voiceType,
        resourceId,
    };
}

