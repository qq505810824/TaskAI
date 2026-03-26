import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { createRTCToken } from "@/lib/rtc-token";
import { buildRtcPrompt } from "@/lib/rtc/config";
import { getRtcAppConfig, startS2SVoiceChat, stopVoiceChat } from "@/lib/volcengine-rtc";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PROMPT_LENGTH = 50000;

export async function POST(request: Request) {
    try {
        const payload = (await request.json().catch(() => ({}))) as {
            topic?: string;
            hints?: string;
            prompt?: string; // 保留兼容性
        };

        let prompt = "";
        if (payload.topic || payload.hints) {
            prompt = buildRtcPrompt(payload.topic || "", payload.hints || "");
        } else {
            prompt = payload.prompt?.trim() || "You are a friendly English speaking tutor. Speak briefly, naturally, and only in English.";
        }

        // console.log("final prompt", prompt);

        if (prompt.length > MAX_PROMPT_LENGTH) {
            return NextResponse.json(
                { error: `Prompt must be within ${MAX_PROMPT_LENGTH} characters.` },
                { status: 400 }
            );
        }

        const rtc = getRtcAppConfig();
        const roomId = `room_${randomUUID().slice(0, 8)}`;
        const userId = `student_${randomUUID().slice(0, 8)}`;
        const agentUserId = `agent_${randomUUID().slice(0, 8)}`;
        const taskId = `task_${randomUUID().slice(0, 8)}`;

        const token = createRTCToken({
            appId: rtc.appId,
            appKey: rtc.appKey,
            roomId,
            userId,
        });

        await startS2SVoiceChat({
            rtcAppId: rtc.appId,
            roomId,
            taskId,
            targetUserId: userId,
            agentUserId,
            prompt,
        });

        return NextResponse.json({
            rtc: {
                appId: rtc.appId,
                roomId,
                userId,
                token,
            },
            agent: {
                userId: agentUserId,
                taskId,
            },
            s2s: {
                outputMode: 0,
                model: process.env.VOLC_S2S_MODEL?.trim() || "1.2.1.0",
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Could not start the voice session.",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const payload = (await request.json().catch(() => ({}))) as { roomId?: string; taskId?: string };
        const roomId = payload.roomId?.trim();
        const taskId = payload.taskId?.trim();

        if (!roomId || !taskId) {
            return NextResponse.json({ error: "roomId and taskId are required." }, { status: 400 });
        }

        const rtc = getRtcAppConfig();
        await stopVoiceChat({
            rtcAppId: rtc.appId,
            roomId,
            taskId,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Could not stop the voice session.",
            },
            { status: 500 }
        );
    }
}

