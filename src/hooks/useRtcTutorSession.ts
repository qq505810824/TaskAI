import VERTC, {
    MediaType,
    RoomProfileType,
    StreamIndex,
    type IRTCEngine,
} from "@volcengine/rtc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getAudioDurationSeconds } from "@/lib/rtc/audio";
import { tlvToString } from "@/lib/rtc/tlv";
import { downsamplePcmLinear, encodeWav, mergeAudioChunks } from "@/lib/rtc/wav";
import type { ApiResponse, Conversation, Meet } from "@/types/meeting";

type RtcSessionState = "idle" | "connecting" | "listening" | "thinking" | "speaking";

type RealtimeSessionResponse = {
    rtc: {
        appId: string;
        roomId: string;
        userId: string;
        token: string;
    };
    agent: {
        userId: string;
        taskId: string;
    };
    s2s: {
        outputMode: number;
        model: string;
    };
};

type ConversationStagePayload = {
    Stage?: {
        Code?: number;
        Description?: string;
    };
};

type SubtitlePayload = {
    data?: Array<{
        text?: string;
        definite?: boolean;
        userId?: string;
        paragraph?: number;
    }>;
};

type UploadAudioResponse = ApiResponse<{
    url: string;
    path: string;
    bucket: string;
}>;

export function useRtcTutorSession(meet: Meet, userId: string) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const conversationsRef = useRef<Conversation[]>([]);
    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);
    const [rtcStatus, setRtcStatus] = useState<RtcSessionState>("idle");
    const [isRtcActive, setIsRtcActive] = useState(false);

    const [userMeetId, setUserMeetId] = useState<string | null>(null);
    const [userMeetStatus, setUserMeetStatus] = useState<string | null>(null);

    const [teacherDraft, setTeacherDraft] = useState("");
    const [teacherAudioStream, setTeacherAudioStream] = useState<MediaStream | null>(null);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const engineRef = useRef<IRTCEngine | null>(null);
    const sessionRef = useRef<RealtimeSessionResponse | null>(null);

    const activeConversationIdRef = useRef<string | null>(null);
    const teacherRecordingConversationIdRef = useRef<string | null>(null);
    const teacherRecordingStopResolveRef = useRef<null | (() => void)>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaChunksRef = useRef<BlobPart[]>([]);

    const teacherAudioMimeType = useMemo(() => {
        if (typeof MediaRecorder === "undefined") return undefined;
        return MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : MediaRecorder.isTypeSupported("audio/webm")
                ? "audio/webm"
                : undefined;
    }, []);

    // ===== 学生本地录音（WAV） =====
    const [studentDraftLive, setStudentDraftLive] = useState("");
    const studentRecordingAudioContextRef = useRef<AudioContext | null>(null);
    const studentSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const studentProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
    const studentMonitorGainRef = useRef<GainNode | null>(null);
    const studentRecordingStreamRef = useRef<MediaStream | null>(null);
    const studentPcmChunksRef = useRef<Float32Array[]>([]);
    const studentRecordingSampleRateRef = useRef<number>(44100);
    const studentRecordingConversationIdRef = useRef<string | null>(null);
    const uploadedStudentAudioRef = useRef<Record<string, string>>({});
    const uploadingStudentAudioRef = useRef<Record<string, boolean>>({});
    const pendingStudentAudioWithoutConversationRef = useRef(false);
    // 轻量语音门控：仅当检测到学生开始说话后，才把 PCM chunk 写入缓冲，避免前置空白
    const studentVoiceDetectedRef = useRef(false);
    // iOS / WebKit 录音：使用 MediaRecorder（避免 ScriptProcessorNode 在移动端不稳定）
    const studentMediaRecorderRef = useRef<MediaRecorder | null>(null);
    const studentMediaChunksRef = useRef<Blob[]>([]);
    const studentMediaMimeTypeRef = useRef<string | null>(null);
    const joinedUserMeetRef = useRef(false);

    const uploadStudentAudioBlob = useCallback(
        async (blob: Blob, conversationId: string): Promise<string | null> => {
            console.log("[RTC][uploadStudentAudioBlob] start", {
                conversationId,
                blobSize: blob.size,
                blobType: blob.type,
                meetId: meet.id,
                userId,
                userMeetId: userMeetId ?? null,
            });
            if (uploadedStudentAudioRef.current[conversationId]) {
                console.log("[RTC][uploadStudentAudioBlob] skip: already uploaded", {
                    conversationId,
                    url: uploadedStudentAudioRef.current[conversationId],
                });
                return uploadedStudentAudioRef.current[conversationId];
            }
            if (uploadingStudentAudioRef.current[conversationId]) {
                console.log("[RTC][uploadStudentAudioBlob] skip: uploading in flight", {
                    conversationId,
                });
                return null;
            }
            uploadingStudentAudioRef.current[conversationId] = true;

            const formData = new FormData();
            formData.append("file", blob, `user-${conversationId}.wav`);
            formData.append("meetId", meet.id);
            formData.append("userId", userId);
            formData.append("conversationId", conversationId);
            formData.append("userMeetId", userMeetId ?? "");

            try {
                const response = await fetch("/api/storage/audio/upload", {
                    method: "POST",
                    body: formData,
                });
                const payload = (await response.json()) as UploadAudioResponse;
                console.log("[RTC][uploadStudentAudioBlob] upload response", {
                    conversationId,
                    ok: response.ok,
                    status: response.status,
                    success: payload?.success,
                    hasUrl: Boolean(payload?.data?.url),
                    message: payload?.message,
                    error: payload?.error,
                });
                if (!response.ok || !payload.success || !payload.data?.url) {
                    return null;
                }
                uploadedStudentAudioRef.current[conversationId] = payload.data.url;
                console.log("[RTC][uploadStudentAudioBlob] upload success", {
                    conversationId,
                    url: payload.data.url,
                });
                return payload.data.url;
            } catch (error) {
                console.error("[RTC][uploadStudentAudioBlob] upload exception", {
                    conversationId,
                    error,
                });
                return null;
            } finally {
                uploadingStudentAudioRef.current[conversationId] = false;
            }
        },
        [meet.id, userId, userMeetId]
    );

    const isIosWebKit = useCallback(() => {
        if (typeof navigator === "undefined") return false;
        const ua = navigator.userAgent;
        const platform = navigator.platform;
        const isAppleMobile =
            /iP(ad|hone|od)/.test(ua) ||
            (platform === "MacIntel" &&
                typeof navigator.maxTouchPoints === "number" &&
                navigator.maxTouchPoints > 1);
        return isAppleMobile;
    }, []);

    const startStudentLocalRecording = useCallback(
        async (engine: IRTCEngine) => {
            if (typeof window === "undefined") return;

            const AudioContextCtor =
                window.AudioContext ??
                (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

            if (!AudioContextCtor) return;

            // Already recording
            if (studentProcessorNodeRef.current || studentMediaRecorderRef.current) return;

            const localAudioTrack = engine.getLocalStreamTrack(
                StreamIndex.STREAM_INDEX_MAIN,
                "audio"
            );
            if (!localAudioTrack) {
                // microphone track may not be ready yet
                return;
            }

            // Clean old stream if any
            try {
                studentRecordingStreamRef.current?.getTracks().forEach((t) => t.stop());
            } catch {
                // ignore
            }

            studentRecordingConversationIdRef.current = null;
            setStudentDraftLive("");

            // iOS/WebKit：用 MediaRecorder 录制，避免 ScriptProcessorNode 在移动端不稳定
            if (isIosWebKit()) {
                const stream = new MediaStream([localAudioTrack.clone()]);

                // 清空旧的媒体缓存
                studentMediaChunksRef.current = [];
                studentMediaMimeTypeRef.current = null;

                const mimeType =
                    typeof MediaRecorder !== "undefined" &&
                    MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                        ? "audio/webm;codecs=opus"
                        : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm")
                            ? "audio/webm"
                            : undefined;

                try {
                    const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
                    studentMediaRecorderRef.current = mr;
                    studentMediaMimeTypeRef.current = (mr.mimeType as string) || null;
                    mr.ondataavailable = (e) => {
                        if (e.data && e.data.size > 0) {
                            studentMediaChunksRef.current.push(e.data);
                        }
                    };
                    mr.onerror = (e) => {
                        console.warn("[RTC][studentMediaRecorder] error", e);
                    };

                    studentRecordingStreamRef.current = stream;
                    studentRecordingAudioContextRef.current = null;
                    studentSourceNodeRef.current = null;
                    studentProcessorNodeRef.current = null;
                    studentMonitorGainRef.current = null;
                    studentVoiceDetectedRef.current = false;

                    // 200ms timeslice 让 chunks 更及时（也更利于 stop 时拿到完整数据）
                    mr.start(200);
                    return;
                } catch (e) {
                    console.warn("[RTC][studentMediaRecorder] init failed, fallback to WAV path", e);
                    // 继续走下面 PCM/WAV 路径
                }
            }

            const stream = new MediaStream([localAudioTrack.clone()]);
            const audioContext = new AudioContextCtor();
            const sourceNode = audioContext.createMediaStreamSource(stream);
            const processorNode = audioContext.createScriptProcessor(4096, 1, 1);
            const monitorGain = audioContext.createGain();
            monitorGain.gain.value = 0; // don't route back to speaker

            studentPcmChunksRef.current = [];
            studentRecordingSampleRateRef.current = audioContext.sampleRate;
            studentRecordingStreamRef.current = stream;
            studentRecordingAudioContextRef.current = audioContext;
            studentSourceNodeRef.current = sourceNode;
            studentProcessorNodeRef.current = processorNode;
            studentMonitorGainRef.current = monitorGain;
            studentVoiceDetectedRef.current = false;

            processorNode.onaudioprocess = (event) => {
                const channelData = event.inputBuffer.getChannelData(0);
                if (!studentVoiceDetectedRef.current) {
                    let energy = 0;
                    for (let i = 0; i < channelData.length; i += 1) {
                        const sample = channelData[i];
                        energy += sample * sample;
                    }
                    const rms = Math.sqrt(energy / channelData.length);
                    // 门限取经验值，移动端可能因增益/压缩导致幅度偏小
                    // 因此适当调低，避免整段音频被当成静音过滤掉
                    if (rms < 0.008) {
                        return;
                    }
                    studentVoiceDetectedRef.current = true;
                    console.log("[RTC][studentVAD] voice detected, start buffering");
                }
                studentPcmChunksRef.current.push(new Float32Array(channelData));
            };

            sourceNode.connect(processorNode);
            processorNode.connect(monitorGain);
            monitorGain.connect(audioContext.destination);

            if (audioContext.state === "suspended") {
                await audioContext.resume();
            }
        },
        [isIosWebKit]
    );

    const stopStudentLocalRecording = useCallback(async () => {
        console.log("[RTC][stopStudentLocalRecording] called");
        const audioContext = studentRecordingAudioContextRef.current;
        const sourceNode = studentSourceNodeRef.current;
        const processorNode = studentProcessorNodeRef.current;
        const monitorGain = studentMonitorGainRef.current;
        const stream = studentRecordingStreamRef.current;

        let conversationId = studentRecordingConversationIdRef.current;
        studentRecordingConversationIdRef.current = null;

        // iOS/WebKit：如果使用了 MediaRecorder，先 stop 并等待 onstop，确保 chunks 写入完成
        const iosRecorder = studentMediaRecorderRef.current;
        if (iosRecorder && iosRecorder.state !== "inactive") {
            console.log("[RTC][stopStudentLocalRecording] stopping iOS MediaRecorder", {
                conversationId,
                mimeType: iosRecorder.mimeType,
            });
            await new Promise<void>((resolve) => {
                try {
                    iosRecorder.onstop = () => resolve();
                    iosRecorder.stop();
                } catch {
                    resolve();
                }
            });
        }
        studentMediaRecorderRef.current = null;

        // clear nodes first
        try {
            processorNode?.disconnect();
            sourceNode?.disconnect();
            monitorGain?.disconnect();
            stream?.getTracks().forEach((track) => track.stop());
        } catch {
            // ignore
        }

        studentProcessorNodeRef.current = null;
        studentSourceNodeRef.current = null;
        studentMonitorGainRef.current = null;
        studentRecordingStreamRef.current = null;

        if (audioContext && audioContext.state !== "closed") {
            await audioContext.close().catch(() => { });
        }
        studentRecordingAudioContextRef.current = null;

        const chunks = studentPcmChunksRef.current;
        const mediaChunks = studentMediaChunksRef.current;

        studentVoiceDetectedRef.current = false;

        console.log("[RTC][stopStudentLocalRecording] source snapshot", {
            conversationId,
            chunkCount: chunks.length,
            mediaChunkCount: mediaChunks.length,
            sampleRate: studentRecordingSampleRateRef.current,
        });

        // iOS/WebKit 路径：使用 MediaRecorder blob chunks 上传
        if (mediaChunks.length > 0) {
            if (!conversationId) {
                pendingStudentAudioWithoutConversationRef.current = true;
                console.warn("[RTC][stopStudentLocalRecording] defer iOS pending media audio (no conversationId)", {
                    mediaChunkCount: mediaChunks.length,
                });
                return;
            }
            if (uploadedStudentAudioRef.current[conversationId]) {
                console.warn("[RTC][stopStudentLocalRecording] skip iOS already uploaded", {
                    conversationId,
                });
                return;
            }
            if (uploadingStudentAudioRef.current[conversationId]) {
                console.warn("[RTC][stopStudentLocalRecording] skip iOS uploading in-flight", {
                    conversationId,
                });
                return;
            }

            const mimeType = studentMediaMimeTypeRef.current || "audio/webm";
            const blob = new Blob(mediaChunks.slice(), { type: mimeType });

            const durationSeconds = await getAudioDurationSeconds(blob);
            if (durationSeconds == null || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
                console.warn("[RTC][stopStudentLocalRecording] skip iOS invalid duration", {
                    conversationId,
                    durationSeconds,
                    blobSize: blob.size,
                });
                return;
            }

            const audioUrl = await uploadStudentAudioBlob(blob, conversationId);
            if (!audioUrl) {
                console.warn("[RTC][stopStudentLocalRecording] iOS upload returned empty URL", {
                    conversationId,
                });
                return;
            }

            // 上传成功后再清空缓存：避免失败/无效时丢失 pending 音频
            studentMediaChunksRef.current = [];
            pendingStudentAudioWithoutConversationRef.current = false;

            setConversations((prev) => {
                const next = prev.map((conv) =>
                    conv.id === conversationId
                        ? {
                            ...conv,
                            user_audio_url: audioUrl,
                            user_audio_duration: durationSeconds,
                        }
                        : conv
                );
                conversationsRef.current = next;
                return next;
            });
            console.log("[RTC][stopStudentLocalRecording] iOS conversation updated with user_audio_url", {
                conversationId,
                audioUrl,
                durationSeconds,
            });
            return;
        }
        if (!conversationId) {
            if (chunks.length > 0) {
                // 保守回退：如果当前存在 activeConversationIdRef 且该会话已经有学生最终文本，
                // 则把 pending 音频绑定到该会话，避免移动端因为 definite 与 stop 的时序差异导致不上传。
                const fallbackId = activeConversationIdRef.current;
                const fallbackConv = fallbackId
                    ? conversationsRef.current.find((c) => c.id === fallbackId)
                    : undefined;

                if (fallbackConv?.user_message_text?.trim()) {
                    conversationId = fallbackId!;
                    pendingStudentAudioWithoutConversationRef.current = false;
                    console.warn("[RTC][stopStudentLocalRecording] fallback bind pending audio", {
                        conversationId,
                        chunkCount: chunks.length,
                    });
                } else {
                    pendingStudentAudioWithoutConversationRef.current = true;
                    console.warn("[RTC][stopStudentLocalRecording] defer: chunks ready but conversationId missing", {
                        chunkCount: chunks.length,
                        sampleRate: studentRecordingSampleRateRef.current,
                    });
                    return;
                }
            } else {
                console.warn("[RTC][stopStudentLocalRecording] skip: no conversationId and no chunks", {
                    chunkCount: chunks.length,
                });
                return;
            }
        }

        if (!conversationId) return;
        if (chunks.length === 0) {
            console.warn("[RTC][stopStudentLocalRecording] skip: no chunks", {
                conversationId,
                chunkCount: chunks.length,
            });
            return;
        }
        if (uploadedStudentAudioRef.current[conversationId]) {
            console.warn("[RTC][stopStudentLocalRecording] skip: already uploaded", {
                conversationId,
            });
            return;
        }
        if (uploadingStudentAudioRef.current[conversationId]) {
            console.warn("[RTC][stopStudentLocalRecording] skip: uploading in-flight", {
                conversationId,
            });
            return;
        }

        const chunksToUpload = chunks.slice();
        studentPcmChunksRef.current = [];
        pendingStudentAudioWithoutConversationRef.current = false;

        const merged = mergeAudioChunks(chunksToUpload);
        if (merged.length < 1024) {
            console.warn("[RTC][stopStudentLocalRecording] skip: merged too short", {
                conversationId,
                mergedLength: merged.length,
            });
            return;
        }
        const sourceSampleRate = studentRecordingSampleRateRef.current;
        const targetSampleRate = sourceSampleRate > 16000 ? 16000 : sourceSampleRate;
        const compressedSamples = downsamplePcmLinear(merged, sourceSampleRate, targetSampleRate);
        const blob = encodeWav(compressedSamples, targetSampleRate);
        if (blob.size < 1024) {
            console.warn("[RTC][stopStudentLocalRecording] skip: blob too small", {
                conversationId,
                blobSize: blob.size,
            });
            return;
        }
        try {
            const durationSeconds = await getAudioDurationSeconds(blob);
            if (durationSeconds == null || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
                console.warn("[RTC][stopStudentLocalRecording] skip: invalid duration", {
                    conversationId,
                    durationSeconds,
                    blobSize: blob.size,
                });
                return;
            }
            const audioUrl = await uploadStudentAudioBlob(blob, conversationId);
            if (!audioUrl) {
                console.warn("[RTC][stopStudentLocalRecording] upload returned empty URL", {
                    conversationId,
                });
                return;
            }

            setConversations((prev) => {
                const next = prev.map((conv) =>
                    conv.id === conversationId
                        ? {
                            ...conv,
                            user_audio_url: audioUrl,
                            user_audio_duration: durationSeconds,
                        }
                        : conv
                );
                conversationsRef.current = next;
                return next;
            });
            console.log("[RTC][stopStudentLocalRecording] conversation updated with user_audio_url", {
                conversationId,
                audioUrl,
                durationSeconds,
            });
        } catch {
            // ignore persist errors
        } finally {
            uploadingStudentAudioRef.current[conversationId] = false;
        }
    }, [uploadStudentAudioBlob]);

    // 进入页面前，确保为 (meet, user) 获取/创建 user_meet 实例
    useEffect(() => {
        let cancelled = false;

        const joinUserMeet = async () => {
            try {
                if (!meet?.id || !userId) return;
                if (joinedUserMeetRef.current) return;
                joinedUserMeetRef.current = true;

                const response = await fetch("/api/user-meets/join", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ meetId: meet.id, userId }),
                });

                const data = (await response.json()) as ApiResponse<{ id: string; status: string }>;

                if (data.success && data.data) {
                    setUserMeetId(data.data.id);
                    setUserMeetStatus(data.data.status);
                }
            } catch (error) {
                console.error("Failed to join user_meets:", error);
            }
        };

        void joinUserMeet();
        return () => {
            cancelled = true;
        };
    }, [meet?.id, userId]);

    const stopTeacherRecording = useCallback((): Promise<void> => {
        const mr = mediaRecorderRef.current;
        if (!mr) return Promise.resolve();

        if (mr.state === "inactive") return Promise.resolve();

        return new Promise((resolve) => {
            teacherRecordingStopResolveRef.current = resolve;
            try {
                mr.stop();
            } catch {
                teacherRecordingStopResolveRef.current = null;
                resolve();
            }
        });
    }, []);

    const startTeacherRecording = useCallback(async () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") return;

        const engine = engineRef.current;
        const session = sessionRef.current;
        if (!engine || !session) return;

        const targetConversationId = activeConversationIdRef.current;
        if (!targetConversationId) return; // 当前还没有 student 的确定性语句，无法准确归属到某一轮

        teacherRecordingConversationIdRef.current = targetConversationId;

        // 等待远端老师音频 track 可用（订阅可能有微小延迟）
        const waitForTrack = async (timeoutMs: number) => {
            const startedAt = Date.now();
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const track = engine.getRemoteStreamTrack(
                    session.agent.userId,
                    StreamIndex.STREAM_INDEX_MAIN,
                    "audio"
                );
                if (track) return track;
                if (Date.now() - startedAt > timeoutMs) return undefined;
                await new Promise((r) => setTimeout(r, 80));
            }
        };

        const track = await waitForTrack(3500);
        if (!track) return;

        const stream = new MediaStream([track]);
        mediaChunksRef.current = [];

        try {
            const mr = teacherAudioMimeType ? new MediaRecorder(stream, { mimeType: teacherAudioMimeType }) : new MediaRecorder(stream);
            mediaRecorderRef.current = mr;

            mr.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) mediaChunksRef.current.push(e.data);
            };

            mr.onstop = async () => {
                const resolveStop = teacherRecordingStopResolveRef.current;
                teacherRecordingStopResolveRef.current = null;

                try {
                    const conversationId = teacherRecordingConversationIdRef.current;
                    teacherRecordingConversationIdRef.current = null;

                    const chunks = mediaChunksRef.current;
                    mediaChunksRef.current = [];
                    mediaRecorderRef.current = null;

                    if (!conversationId || chunks.length === 0) return;

                    const blob = new Blob(chunks, {
                        type: teacherAudioMimeType || "audio/webm",
                    });

                    // 不再持久化 ai_audio_url，仅保留时长元数据（可选）
                    const durationSeconds = await getAudioDurationSeconds(blob).catch(() => null);
                    if (durationSeconds != null) {
                        setConversations((prev) => {
                            const next = prev.map((conv) =>
                                conv.id === conversationId
                                    ? {
                                        ...conv,
                                        ai_audio_duration: durationSeconds,
                                        ai_audio_url: null,
                                    }
                                    : conv
                            );
                            conversationsRef.current = next;
                            return next;
                        });
                    }
                } finally {
                    resolveStop?.();
                }
            };

            mr.start(200);
        } catch (e) {
            // ignore recorder init error
        }
    }, [teacherAudioMimeType, setConversations]);

    const startRtcSession = useCallback(async () => {
        if (rtcStatus !== "idle") return;
        setErrorMessage(null);
        setTeacherDraft("");
        setRtcStatus("connecting");
        setIsRtcActive(true);
        setTeacherAudioStream(null);

        if (!userMeetId) {
            setErrorMessage("userMeetId not ready yet.");
            setRtcStatus("idle");
            setIsRtcActive(false);
            return;
        }

        try {
            // 兼容：某些移动端/iOS 浏览器可能不存在 navigator.mediaDevices
            // 导致内部调用 getUserMedia 时直接抛 TypeError: navigator.mediaDevices is undefined
            if (typeof window !== "undefined") {
                const nav = navigator as unknown as {
                    mediaDevices?: {
                        getUserMedia?: (...args: any[]) => Promise<any>;
                    };
                    getUserMedia?: any;
                    webkitGetUserMedia?: any;
                };

                if (!nav.mediaDevices?.getUserMedia) {
                    const legacyGetUserMedia = nav.getUserMedia || nav.webkitGetUserMedia;
                    if (legacyGetUserMedia) {
                        if (!nav.mediaDevices) nav.mediaDevices = {};
                        nav.mediaDevices.getUserMedia = legacyGetUserMedia.bind(navigator);
                        console.warn("[RTC] polyfill navigator.mediaDevices.getUserMedia from legacy API");
                    }
                }

                if (!nav.mediaDevices?.getUserMedia) {
                    setErrorMessage(
                        "当前浏览器不支持麦克风权限（getUserMedia 缺失）。请使用 Safari/Chrome 最新版本，或确保为 HTTPS 环境。"
                    );
                    setRtcStatus("idle");
                    setIsRtcActive(false);
                    return;
                }
            }

            const startResponse = await fetch("/api/realtime/session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    topic: meet.title,
                    hints: meet.description
                }),
            });

            const sessionPayload = (await startResponse.json()) as RealtimeSessionResponse & { error?: string };
            if (!startResponse.ok) {
                throw new Error(sessionPayload.error ?? "Could not start the live voice session.");
            }

            const session = sessionPayload as RealtimeSessionResponse;
            sessionRef.current = session;

            const engine = VERTC.createEngine(session.rtc.appId);
            engineRef.current = engine;

            engine.on(VERTC.events.onError, (event: { errorCode?: unknown }) => {
                console.warn("RTC error:", event.errorCode);
                setErrorMessage(event.errorCode ? `RTC error ${String(event.errorCode)}.` : "RTC error.");
            });

            engine.on(VERTC.events.onAutoplayFailed, () => {
                setErrorMessage("Autoplay was blocked. Tap start again and allow audio playback.");
            });

            engine.on(VERTC.events.onUserPublishStream, async (event: { userId: string; mediaType: MediaType }) => {
                if (event.userId !== session.agent.userId) return;
                if (event.mediaType === MediaType.VIDEO) return;

                try {
                    await engine.subscribeStream(event.userId, MediaType.AUDIO);
                } catch (e) {
                    // ignore
                }

                const track = engine.getRemoteStreamTrack(event.userId, StreamIndex.STREAM_INDEX_MAIN, "audio");
                if (track) {
                    setTeacherAudioStream(new MediaStream([track]));
                }
            });

            engine.on(VERTC.events.onRoomBinaryMessageReceived, (event: { userId: string; message: ArrayBuffer }) => {
                const { type, value } = tlvToString(event.message);
                if (type === "conv") {
                    const payload = (() => {
                        try {
                            return JSON.parse(value) as ConversationStagePayload;
                        } catch {
                            return null;
                        }
                    })();

                    const code = payload?.Stage?.Code;
                    if (code === 2) {
                        setRtcStatus("thinking");
                        void stopStudentLocalRecording();
                        void stopTeacherRecording();
                        return;
                    }

                    if (code === 3) {
                        setRtcStatus("speaking");
                        void stopStudentLocalRecording();
                        void startTeacherRecording();
                        return;
                    }

                    if (code === 1 || code === 4 || code === 5) {
                        setRtcStatus("listening");
                        if (engineRef.current) {
                            void startStudentLocalRecording(engineRef.current);
                        }
                        void stopTeacherRecording();
                        return;
                    }
                    return;
                }

                if (type === "subv") {
                    let payload: SubtitlePayload | null = null;
                    try {
                        payload = JSON.parse(value) as SubtitlePayload;
                    } catch {
                        payload = null;
                    }
                    const item = payload?.data?.[0];
                    if (!item?.text || !item.userId) return;

                    const currentSession = sessionRef.current;
                    if (!currentSession) return;

                    const isTeacher = item.userId === currentSession.agent.userId;
                    const isStudent = item.userId === currentSession.rtc.userId;
                    if (!isTeacher && !isStudent) return;

                    const text = String(item.text).trim();
                    if (!text) return;

                    if (item.definite) {
                        if (isStudent) {
                            const newId = `conv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
                            const nowIso = new Date().toISOString();

                            activeConversationIdRef.current = newId;
                            studentRecordingConversationIdRef.current = newId;
                            setStudentDraftLive("");
                            console.log("[RTC][student definite] bind conversationId", {
                                conversationId: newId,
                                pendingChunks: studentPcmChunksRef.current.length,
                                hasDeferredUpload: pendingStudentAudioWithoutConversationRef.current,
                            });

                            setConversations((prev) => {
                                const next: Conversation[] = [
                                    ...prev,
                                    {
                                        id: newId,
                                        meet_id: meet.id,
                                        user_id: userId,
                                        user_meet_id: userMeetId,
                                        user_audio_url: "",
                                        user_message_text: text,
                                        user_audio_duration: null,
                                        ai_response_text: "",
                                        ai_audio_url: null,
                                        ai_audio_duration: null,
                                        user_sent_at: nowIso,
                                        ai_responded_at: nowIso,
                                        created_at: nowIso,
                                    },
                                ];
                                conversationsRef.current = next;
                                return next;
                            });

                            if (
                                pendingStudentAudioWithoutConversationRef.current &&
                                (studentPcmChunksRef.current.length > 0 ||
                                    studentMediaChunksRef.current.length > 0)
                            ) {
                                console.log("[RTC][student definite] flush deferred student audio", {
                                    conversationId: newId,
                                    chunkCount: studentPcmChunksRef.current.length,
                                    mediaChunkCount: studentMediaChunksRef.current.length,
                                });
                                void stopStudentLocalRecording();
                            }
                        }

                        if (isTeacher) {
                            setTeacherDraft("");
                            const conversationId = activeConversationIdRef.current;
                            if (!conversationId) return;

                            setConversations((prev) => {
                                const next = prev.map((conv) =>
                                    conv.id === conversationId
                                        ? {
                                            ...conv,
                                            ai_response_text: conv.ai_response_text
                                                ? `${conv.ai_response_text}${conv.ai_response_text.endsWith(' ') ? '' : ' '}${text}`
                                                : text,
                                            ai_responded_at: new Date().toISOString(),
                                        }
                                        : conv
                                );
                                conversationsRef.current = next;
                                return next;
                            });
                        }

                        return;
                    }

                    // interim subtitle (stream display)
                    if (isTeacher) setTeacherDraft(text);
                    if (isStudent) setStudentDraftLive(text);
                }
            });

            await engine.joinRoom(
                session.rtc.token,
                session.rtc.roomId,
                {
                    userId: session.rtc.userId,
                    extraInfo: JSON.stringify({
                        call_scene: "RTC-AIGC",
                        user_name: session.rtc.userId,
                        user_id: session.rtc.userId,
                    }),
                },
                {
                    isAutoPublish: false,
                    isAutoSubscribeAudio: false,
                    roomProfileType: RoomProfileType.chat,
                }
            );

            await engine.startAudioCapture();
            await engine.publishStream(MediaType.AUDIO);

            setRtcStatus("listening");
        } catch (e) {
            console.error("RTC start failed:", e);
            setErrorMessage(e instanceof Error ? e.message : "Could not start RTC session.");
            await stopRtcSession(true).catch(() => { });
        }
    }, [meet, rtcStatus, startTeacherRecording, stopTeacherRecording, userId, userMeetId]);

    const stopRtcSession = useCallback(
        async (skipServerStop = false) => {
            // allow idempotent stop
            setIsRtcActive(false);
            setRtcStatus("idle");
            setTeacherDraft("");
            console.log("[RTC][stopRtcSession] invoke stopStudentLocalRecording");
            await stopStudentLocalRecording().catch(() => { });
            console.log("[RTC][stopRtcSession] stopStudentLocalRecording finished");
            setTeacherAudioStream(null);
            await stopTeacherRecording();

            const currentSession = sessionRef.current;
            const engine = engineRef.current;

            sessionRef.current = null;
            engineRef.current = null;
            activeConversationIdRef.current = null;

            try {
                if (engine) {
                    await engine.stopAudioCapture().catch(() => { });
                    await engine.leaveRoom().catch(() => { });
                }
            } finally {
                if (engine) {
                    try {
                        VERTC.destroyEngine(engine);
                    } catch {
                        // ignore
                    }
                }
            }

            if (!skipServerStop && currentSession) {
                try {
                    await fetch("/api/realtime/session", {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            roomId: currentSession.rtc.roomId,
                            taskId: currentSession.agent.taskId,
                        }),
                    });
                } catch {
                    // best effort
                }
            }
        },
        [stopTeacherRecording, stopStudentLocalRecording]
    );

    const resetConversation = useCallback(async () => {
        // 最终落库前确保断开 RTC（避免页面停留导致持续占用麦克风/资源）
        try {
            await stopRtcSession(false);
        } catch {
            // ignore
        } finally {
            setConversations([]);
            setTeacherDraft("");
        }
    }, [stopRtcSession]);

    useEffect(() => {
        return () => {
            void stopRtcSession(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        conversations,
        rtcStatus,
        isRtcActive,
        userMeetId,
        userMeetStatus,
        teacherDraft,
        studentDraftLive,
        teacherAudioStream,
        errorMessage,
        startRtcSession,
        stopRtcSession: () => stopRtcSession(false),
        resetConversation,
        getConversationsSnapshot: () => conversationsRef.current,
    };
}

