// SSE (Server-Sent Events) 处理工具
// 参考 essay-checker/src/service/base.ts

type OnDataMoreInfo = {
    conversationId?: string;
    taskId?: string;
    messageId?: string;
    errorMessage?: string;
    errorCode?: string;
};

type OnData = (message: string, isFirstMessage: boolean, moreInfo: OnDataMoreInfo) => void;
type OnCompleted = (hasError?: boolean, errorMessage?: string) => void;
type OnError = (msg: string, code?: string) => void;

interface SSECallbacks {
    onData?: OnData;
    onCompleted?: OnCompleted;
    onError?: OnError;
    onMessageEnd?: (messageEnd: any) => void;
}

/**
 * 处理 SSE 流
 */
const handleStream = (
    response: Response,
    onData: OnData,
    onCompleted?: OnCompleted,
    onMessageEnd?: (messageEnd: any) => void
) => {
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

    function read() {
        reader?.read().then((result) => {
            if (result.done) {
                onCompleted && onCompleted(false);
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
                            // 处理消息截断
                            onData('', isFirstMessage, {
                                conversationId: bufferObj?.conversation_id,
                                messageId: bufferObj?.message_id || '',
                            });
                            return;
                        }

                        // 处理错误
                        if (bufferObj.status === 400 || !bufferObj.event) {
                            onData('', false, {
                                conversationId: undefined,
                                messageId: '',
                                errorMessage: bufferObj?.message,
                                errorCode: bufferObj?.code,
                            });
                            onCompleted && onCompleted(true, bufferObj?.message);
                            return;
                        }

                        // 处理消息事件
                        if (bufferObj.event === 'message' || bufferObj.event === 'agent_message') {
                            const answer = bufferObj.answer || '';
                            onData(answer, isFirstMessage, {
                                conversationId: bufferObj.conversation_id,
                                taskId: bufferObj.task_id,
                                messageId: bufferObj.id,
                            });
                            isFirstMessage = false;
                        } else if (bufferObj.event === 'message_end') {
                            onMessageEnd && onMessageEnd(bufferObj);
                        }
                    }
                });

                // 保留最后一行（可能不完整）
                buffer = lines[lines.length - 1];
            } catch (e) {
                onData('', false, {
                    conversationId: undefined,
                    messageId: '',
                    errorMessage: `${e}`,
                });
                onCompleted && onCompleted(true, `${e}`);
                return;
            }

            read();
        }).catch((error) => {
            onCompleted && onCompleted(true, error.message || String(error));
        });
    }

    read();
};

/**
 * SSE POST 请求
 * 参考 essay-checker/src/service/base.ts 的 ssePost 实现
 */
export const ssePost = (
    url: string,
    options: {
        body?: Record<string, any>;
        headers?: HeadersInit;
    },
    callbacks: SSECallbacks
) => {
    const { onData, onCompleted, onError, onMessageEnd } = callbacks;

    const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    };

    fetch(url, fetchOptions)
        .then((res) => {
            if (!/^(2|3)\d{2}$/.test(String(res.status))) {
                res.json()
                    .then((data: any) => {
                        const errorMessage = data.message || `Server Error: ${res.status}`;
                        onError && onError(errorMessage, data.code);
                        onCompleted && onCompleted(true, errorMessage);
                    })
                    .catch(() => {
                        const errorMessage = `Server Error: ${res.status}`;
                        onError && onError(errorMessage);
                        onCompleted && onCompleted(true, errorMessage);
                    });
                return;
            }

            return handleStream(
                res,
                (message, isFirst, moreInfo) => {
                    if (moreInfo.errorMessage) {
                        onError && onError(moreInfo.errorMessage, moreInfo.errorCode);
                        return;
                    }
                    onData && onData(message, isFirst, moreInfo);
                },
                onCompleted,
                onMessageEnd
            );
        })
        .catch((e) => {
            const errorMessage = e instanceof Error ? e.message : String(e);
            onError && onError(errorMessage);
            onCompleted && onCompleted(true, errorMessage);
        });
};
