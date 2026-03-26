import type { ApiResponse } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

const DIFY_SERVER = process.env.NEXT_PUBLIC_DIFY_SERVER || 'https://aienglish-dify.docai.net/v1';
const DIFY_API_KEY = process.env.NEXT_PUBLIC_DIFY_API_KEY || 'app-9d0QgfzhD6Xc0GEGZySmF8wx';

interface ChatBody {
    userId?: string;
    text?: string;
    title?: string;
    topic?: string;
    hints?: string;
    conversationId?: string;
}

/**
 * 处理 SSE 流式响应
 */
async function handleSSEStream(
    response: Response
): Promise<{ aiResponseText: string; conversationId?: string; messageId?: string }> {
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let bufferObj: Record<string, any>;
    let isFirstMessage = true;
    let aiResponseText = '';
    let conversationId: string | undefined;
    let messageId: string | undefined;

    return new Promise((resolve, reject) => {
        function read() {
            if (!reader) {
                reject(new Error('Reader is not available'));
                return;
            }

            reader.read()
                .then((result) => {
                    if (result.done) {
                        resolve({ aiResponseText, conversationId, messageId });
                        return;
                    }

                    buffer += decoder.decode(result.value, { stream: true });
                    const lines = buffer.split('\n');

                    try {
                        lines.forEach((message) => {
                            if (message.startsWith('data: ')) {
                                try {
                                    bufferObj = JSON.parse(message.substring(6)) as Record<string, any>;
                                } catch (e) {
                                    // 处理消息截断，跳过
                                    return;
                                }

                                // 处理错误
                                if (bufferObj.status === 400 || !bufferObj.event) {
                                    reject(new Error(bufferObj?.message || 'Dify API error'));
                                    return;
                                }

                                // 处理消息事件
                                if (bufferObj.event === 'message' || bufferObj.event === 'agent_message') {
                                    const answer = bufferObj.answer || '';
                                    aiResponseText += answer;

                                    if (isFirstMessage && bufferObj.conversation_id) {
                                        conversationId = bufferObj.conversation_id;
                                    }
                                    if (bufferObj.id) {
                                        messageId = bufferObj.id;
                                    }
                                    isFirstMessage = false;
                                } else if (bufferObj.event === 'message_end') {
                                    // 消息结束，可以在这里处理最终数据
                                    console.log('Message ended:', bufferObj);
                                }
                            }
                        });

                        // 保留最后一行（可能不完整）
                        buffer = lines[lines.length - 1];
                    } catch (e) {
                        reject(new Error(`Failed to parse SSE stream: ${e}`));
                        return;
                    }

                    read();
                })
                .catch((error) => {
                    reject(new Error(error.message || String(error)));
                });
        }

        read();
    });
}

export async function POST(request: NextRequest) {
    try {
        const body: ChatBody = await request.json();
        const { userId, text, title, topic, hints, conversationId: clientConversationId } = body;

        if (!userId || !text) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'userId and text are required',
                },
                { status: 400 }
            );
        }

        if (!DIFY_API_KEY) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Configuration error',
                    message: 'Dify API key is not configured',
                },
                { status: 500 }
            );
        }

        const difyResponse = await fetch(`${DIFY_SERVER}/chat-messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${DIFY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user: userId,
                inputs: {
                    title: title || '',
                    topic: topic || '',
                    hints: hints || '',
                },
                query: text,
                ...(clientConversationId && { conversation_id: clientConversationId }),
                response_mode: 'streaming',
            }),
        });

        const { aiResponseText, conversationId } = await handleSSEStream(difyResponse);

        if (!aiResponseText) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Empty response',
                    message: 'Failed to get AI response from Dify',
                },
                { status: 500 }
            );
        }

        const response: ApiResponse<{
            conversation_id: string;
            aiText: string;
        }> = {
            success: true,
            data: {
                conversation_id: conversationId || '',
                aiText: aiResponseText,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in POST /api/llm/chat:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

