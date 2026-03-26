import type { ApiResponse, TTSGenerateRequest } from '@/types/meeting';
import { useCallback, useState } from 'react';

export const useTTS = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateSpeech = useCallback(async (text: string, voice?: string, language?: string) => {
        setLoading(true);
        setError(null);

        try {
            const request: TTSGenerateRequest = { text, voice, language };
            const response = await fetch('/api/tts/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            const data: ApiResponse<{
                audioUrl: string;
                duration: number;
                provider: string;
            }> = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to generate speech');
            }

            return data.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const playAudio = useCallback(async (audioUrl: string) => {
        return new Promise<void>((resolve, reject) => {
            const audio = new Audio(audioUrl);
            audio.onended = () => resolve();
            audio.onerror = (err) => reject(err);
            audio.play().catch(reject);
        });
    }, []);

    const text_to_audio = useCallback(async (text: string): Promise<string> => {
        setLoading(true);
        setError(null);

        try {
            const speechKey =
                process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || '5c6abcbff83643d1900b89bb8ec14243';
            const speechRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || 'eastus';
            const ttsUrl = `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;

            // SSML 格式，不包含速率设置
            const ssml = `<speak version='1.0' xml:lang='en-US'>
                <voice xml:lang='en-US' xml:gender='Female' name='en-US-AriaNeural'>
                    ${text}
                </voice>
            </speak>`;

            const response = await fetch(ttsUrl, {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': speechKey,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
                    'User-Agent': 'curl',
                },
                body: ssml,
            });

            if (!response.ok) {
                throw new Error(`Azure TTS API error: ${response.statusText}`);
            }

            const data = await response.arrayBuffer();
            const blob = new Blob([data], { type: 'audio/mp3' });
            const url = URL.createObjectURL(blob);

            return url;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const speakTtsStream = useCallback(async (text: string): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/voice/tts-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                const t = await response.text().catch(() => '');
                throw new Error(`tts-stream failed: ${response.status} ${response.statusText} ${t}`);
            }

            if (!response.body) {
                throw new Error('tts-stream response body is empty');
            }

            const mimeType = response.headers.get('Content-Type') || 'audio/mpeg';

            const canUseMediaSource =
                typeof window !== 'undefined' &&
                'MediaSource' in window &&
                typeof (window as unknown as { MediaSource?: unknown }).MediaSource === 'function';

            if (!canUseMediaSource) {
                // 兜底：不支持 MSE 时退化为“缓冲后播放”
                const data = await response.arrayBuffer();
                const blob = new Blob([data], { type: mimeType });
                const url = URL.createObjectURL(blob);
                await playAudio(url);
                URL.revokeObjectURL(url);
                return;
            }

            await new Promise<void>((resolve, reject) => {
                const mediaSource = new MediaSource();
                const objectUrl = URL.createObjectURL(mediaSource);
                const audio = new Audio(objectUrl);

                const cleanup = () => {
                    audio.onended = null;
                    audio.onerror = null;
                    try {
                        URL.revokeObjectURL(objectUrl);
                    } catch {
                        // ignore
                    }
                };

                audio.onended = () => {
                    cleanup();
                    resolve();
                };
                audio.onerror = () => {
                    cleanup();
                    reject(new Error('Audio element error during tts-stream playback'));
                };

                const mime = mimeType.includes('mpeg') ? 'audio/mpeg' : mimeType;

                const sourceOpenHandler = () => {
                    let sourceBuffer: SourceBuffer;
                    try {
                        sourceBuffer = mediaSource.addSourceBuffer(mime);
                    } catch {
                        // MSE 不支持 MP3/当前 mime 时，退化为“缓冲后播放”
                        void (async () => {
                            try {
                                const data = await response.arrayBuffer();
                                const blob = new Blob([data], { type: mimeType });
                                const url = URL.createObjectURL(blob);
                                await playAudio(url);
                                URL.revokeObjectURL(url);
                                cleanup();
                                resolve();
                            } catch (fallbackErr) {
                                cleanup();
                                reject(
                                    fallbackErr instanceof Error
                                        ? fallbackErr
                                        : new Error('Failed to fallback tts-stream playback')
                                );
                            }
                        })();
                        return;
                    }

                    const reader = response.body!.getReader();
                    const queue: Uint8Array[] = [];
                    let readingDone = false;

                    const appendChunk = (chunk: Uint8Array) => {
                        const buf = chunk.buffer.slice(
                            chunk.byteOffset,
                            chunk.byteOffset + chunk.byteLength
                        ) as ArrayBuffer;
                        if (sourceBuffer.updating) {
                            queue.push(chunk);
                            return;
                        }
                        sourceBuffer.appendBuffer(buf);
                    };

                    sourceBuffer.addEventListener('updateend', () => {
                        if (queue.length > 0 && !sourceBuffer.updating) {
                            const next = queue.shift()!;
                            appendChunk(next);
                        } else if (readingDone && queue.length === 0) {
                            try {
                                if (mediaSource.readyState === 'open') {
                                    mediaSource.endOfStream();
                                }
                            } catch {
                                // ignore
                            }
                        }
                    });

                    // start playback
                    audio
                        .play()
                        .catch((e) => {
                            cleanup();
                            reject(e instanceof Error ? e : new Error('Failed to play audio'));
                        });

                    // stream append loop
                    void (async () => {
                        try {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                if (value && value.byteLength > 0) {
                                    appendChunk(value);
                                }
                            }
                            readingDone = true;
                            if (queue.length === 0 && !sourceBuffer.updating) {
                                mediaSource.endOfStream();
                            }
                        } catch (err) {
                            cleanup();
                            reject(err instanceof Error ? err : new Error('tts-stream MSE append failed'));
                        }
                    })();
                };

                mediaSource.addEventListener('sourceopen', sourceOpenHandler, { once: true });
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [playAudio]);

    return {
        loading,
        error,
        generateSpeech,
        playAudio,
        text_to_audio,
        speakTtsStream,
    };
};
