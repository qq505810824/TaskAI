import { Signer } from "@volcengine/openapi";

const RTC_API_URL = "https://rtc.volcengineapi.com";
const RTC_REGION = "cn-north-1";
const DEFAULT_S2S_MODEL = "1.2.1.0";

type RtcApiResponse = {
    ResponseMetadata?: {
        Error?: {
            Code?: string;
            Message?: string;
        };
        RequestId?: string;
        Action?: string;
    };
    Result?: string;
};

function requireEnv(name: string) {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`${name} is required.`);
    }

    return value;
}

export function getRtcAppConfig() {
    return {
        appId: requireEnv("RTC_APP_ID"),
        appKey: requireEnv("RTC_APP_KEY"),
    };
}

export function getS2SConfig() {
    return {
        appId:
            process.env.VOLC_S2S_APP_ID?.trim() ??
            process.env.BYTEPLUS_APP_ID?.trim() ??
            process.env.BYTEPLUS_TTS_APP_ID?.trim() ??
            "",
        token:
            process.env.VOLC_S2S_ACCESS_TOKEN?.trim() ??
            process.env.BYTEPLUS_ACCESS_TOKEN?.trim() ??
            "",
        model: process.env.VOLC_S2S_MODEL?.trim() || DEFAULT_S2S_MODEL,
    };
}

async function callRtcApi(action: string, body: Record<string, unknown>) {
    const accessKeyId = requireEnv("VOLC_ACCESS_KEY_ID");
    const secretKey = requireEnv("VOLC_SECRET_ACCESS_KEY");

    const requestData = {
        region: RTC_REGION,
        method: "POST",
        params: {
            Action: action,
            Version: "2024-12-01",
        },
        headers: {
            Host: "rtc.volcengineapi.com",
            "Content-Type": "application/json",
        },
        body,
    };

    const signer = new Signer(requestData, "rtc");
    signer.addAuthorization({
        accessKeyId,
        secretKey,
    });

    const response = await fetch(`${RTC_API_URL}?Action=${action}&Version=2024-12-01`, {
        method: "POST",
        headers: requestData.headers as Record<string, string>,
        body: JSON.stringify(body),
        cache: "no-store",
    });

    const payload = (await response.json()) as RtcApiResponse;

    if (!response.ok || payload.ResponseMetadata?.Error) {
        throw new Error(
            payload.ResponseMetadata?.Error?.Message ??
            `RTC ${action} failed with status ${response.status}.`
        );
    }

    return payload;
}

export async function startS2SVoiceChat(params: {
    rtcAppId: string;
    roomId: string;
    taskId: string;
    targetUserId: string;
    agentUserId: string;
    prompt: string;
}) {
    const s2s = getS2SConfig();

    if (!s2s.appId || !s2s.token) {
        throw new Error("VOLC_S2S_APP_ID and VOLC_S2S_ACCESS_TOKEN are required.");
    }

    return callRtcApi("StartVoiceChat", {
        AppId: params.rtcAppId,
        RoomId: params.roomId,
        TaskId: params.taskId,
        AgentConfig: {
            TargetUserId: [params.targetUserId],
            WelcomeMessage: "Hello, welcome to TaskAI.",
            UserId: params.agentUserId,
            EnableConversationStateCallback: true,
        },
        Config: {
            S2SConfig: {
                Provider: "volcano",
                OutputMode: 0,
                ProviderParams: {
                    app: {
                        appid: s2s.appId,
                        token: s2s.token,
                    },
                    dialog: {
                        extra: {
                            model: s2s.model,
                        },
                        bot_name: "English Tutor",
                        system_role: params.prompt,
                        speaking_style: "Speak briefly, naturally, and only in English.",
                    },
                },
            },
            SubtitleConfig: {
                SubtitleMode: 1,
            },
            InterruptMode: 0,
        },
    });
}

export async function stopVoiceChat(params: { rtcAppId: string; roomId: string; taskId: string }) {
    return callRtcApi("StopVoiceChat", {
        AppId: params.rtcAppId,
        RoomId: params.roomId,
        TaskId: params.taskId,
    });
}

