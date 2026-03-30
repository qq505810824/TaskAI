import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { createRTCToken } from "@/lib/rtc-token";
import {
    buildRtcPromptFromTemplate,
    getTaskaiPromptContent,
    prependTaskaiRuntimeContext,
    TASKAI_RTC_RUNTIME_INSTRUCTION,
} from "@/lib/taskai/prompt-templates";
import { getRtcAppConfig, startS2SVoiceChat, stopVoiceChat } from "@/lib/volcengine-rtc";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PROMPT_LENGTH = 50000;

export async function POST(request: Request) {
    try {
        const payload = (await request.json().catch(() => ({}))) as {
            topic?: string;
            description?: string;
            projectDocumentSummary?: string;
            currentTaskSummary?: string;
            projectTaskOverview?: string;
        };

        const topic = payload.topic?.trim();
        if (!topic) {
            return NextResponse.json({ error: "topic is required." }, { status: 400 });
        }

        const template = await getTaskaiPromptContent('taskai_rtc_tutor_template');
        let prompt = buildRtcPromptFromTemplate(template, topic, payload.description || "");

        const runtimeSections = [
            ['[Runtime Instruction]', TASKAI_RTC_RUNTIME_INSTRUCTION].join('\n'),
            payload.projectDocumentSummary?.trim()
                ? ["Here's the project background summary:", payload.projectDocumentSummary.trim()].join('\n')
                : '',
            payload.projectTaskOverview?.trim()
                ? ["Here's all the tasks for this project:", payload.projectTaskOverview.trim()].join('\n')
                : '',
            payload.currentTaskSummary?.trim()
                ? ['The current task we are talking about right now is:', payload.currentTaskSummary.trim()].join('\n')
                : '',
        ].filter(Boolean);

        if (runtimeSections.length) {
            prompt = prependTaskaiRuntimeContext(prompt, runtimeSections.join('\n\n'));
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
