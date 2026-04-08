'use client';

import { TodoListEditable } from '@/components/todo/TodoListEditable';
import { useMeets } from '@/hooks/useMeets';
import { useTodos } from '@/hooks/useTodos';
import type { Conversation, Todo } from '@/types/meeting';
import { ArrowLeft, Clock, MessageSquare, User } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function MeetSummaryPageContent() {
    const params = useParams();
    const router = useRouter();
    const meetingCode = params.code as string;
    const searchParams = useSearchParams();
    const userMeetId = searchParams.get('userMeetId');

    const { getMeetByCode, getMeetById } = useMeets();
    const { getTodos, generateTodos, updateTodo, confirmTodo } = useTodos();
    const [todos, setTodos] = useState<Todo[]>([]);
    const [summary, setSummary] = useState<string>('');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    /** loadData 执行期间（含 /api/my/meet-summary 与 getMeetByCode 等） */
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meetingCode, userMeetId]);

    const loadData = async () => {
        setLoadingData(true);
        try {
            // 如果带有 userMeetId，则按“个人会议实例”加载数据
            if (userMeetId) {
                try {
                    setIsGenerating(false);
                    const res = await fetch(`/api/my/meet-summary?userMeetId=${encodeURIComponent(userMeetId)}`);
                    const data = await res.json();
                    if (!data.success) {
                        throw new Error(data.error || data.message || 'Failed to fetch my meet summary');
                    }

                    const conversationsData = data.data.conversations || [];
                    const todosData = data.data.todos || [];
                    const summaryData = data.data.summary || null;

                    if (Array.isArray(conversationsData)) {
                        const sortedConversations = [...conversationsData].sort(
                            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        );
                        setConversations(sortedConversations);
                    }

                    if (Array.isArray(todosData)) {
                        setTodos(todosData);
                    }

                    if (summaryData && typeof summaryData === 'object' && 'summary' in summaryData) {
                        setSummary((summaryData as any).summary || '');
                    }
                } catch (err) {
                    console.error('Failed to load my meet summary:', err);
                }
                return;
            }

            // 否则走原有基于整个会议的逻辑（兼容旧流程）
            const meetData = await getMeetByCode(meetingCode);
            if (meetData) {
                // 获取完整会议信息（包含summary、conversations、todos）
                const fullMeet = await getMeetById(meetData.id);

                // 从会议详情中获取对话记录、todos和summary
                if (fullMeet) {
                    // 设置对话记录（从Supabase获取）
                    if (fullMeet.conversations && Array.isArray(fullMeet.conversations)) {
                        const sortedConversations = [...fullMeet.conversations].sort(
                            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        );
                        setConversations(sortedConversations);
                    }

                    // 设置todos（从Supabase获取）
                    if (fullMeet.todos && Array.isArray(fullMeet.todos)) {
                        setTodos(fullMeet.todos);
                    }

                    // 设置summary（从Supabase获取）
                    if (fullMeet.summary && typeof fullMeet.summary === 'object' && 'summary' in fullMeet.summary) {
                        setSummary((fullMeet.summary as any).summary || '');
                    }
                }

                // 检查是否已有summary和todos
                const todosData = await getTodos({ meetId: meetData.id });
                const hasSummary = (fullMeet as any)?.summary && typeof (fullMeet as any).summary === 'object';
                const hasTodos = todosData && todosData.todos.length > 0;

                // 基础数据已拉取完毕，结束全屏「加载」；若需 LLM 补全则走 isGenerating
                setLoadingData(false);

                // 如果还没有summary和todos，则生成（会议刚结束时）
                if (!hasSummary && !hasTodos) {
                    setIsGenerating(true);
                    try {
                        const generated = await generateTodos(meetData.id);
                        if (generated) {
                            setTodos(generated.todos);
                            // generated.summary 是 MeetSummary 对象
                            if (generated.summary && typeof generated.summary === 'object' && 'summary' in generated.summary) {
                                setSummary((generated.summary as any).summary);
                            }
                        }
                    } catch (err) {
                        console.error('Failed to generate todos:', err);
                    } finally {
                        setIsGenerating(false);
                    }
                } else if (hasTodos && !hasSummary) {
                    // 如果已有todos但没有summary，只生成summary
                    setIsGenerating(true);
                    try {
                        const generated = await generateTodos(meetData.id);
                        if (generated && generated.summary) {
                            if (typeof generated.summary === 'object' && 'summary' in generated.summary) {
                                setSummary((generated.summary as any).summary);
                            }
                        }
                    } catch (err) {
                        console.error('Failed to generate summary:', err);
                    } finally {
                        setIsGenerating(false);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load data:', err);
            setIsGenerating(false);
        } finally {
            setLoadingData(false);
        }
    };

    const handleUpdateTodo = async (id: string, updates: Partial<Todo>) => {
        try {
            await updateTodo(id, updates);
            setTodos(todos.map(t => t.id === id ? { ...t, ...updates } : t));
        } catch (err) {
            console.error('Failed to update todo:', err);
        }
    };

    const handleConfirmTodo = async (id: string) => {
        try {
            await confirmTodo(id);
            setTodos(todos.map(t => t.id === id ? { ...t, status: 'confirmed' as const } : t));
        } catch (err) {
            console.error('Failed to confirm todo:', err);
        }
    };

    if (loadingData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50/80">
                <div className="text-center rounded-2xl bg-white px-10 py-12 shadow-lg border border-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-600 border-t-transparent mx-auto mb-5" />
                    <p className="text-gray-700 font-medium">正在加载会议数据...</p>
                    <p className="text-sm text-gray-500 mt-2">请稍候</p>
                </div>
            </div>
        );
    }

    if (isGenerating) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50/80">
                <div className="text-center rounded-2xl bg-white px-10 py-12 shadow-lg border border-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-600 border-t-transparent mx-auto mb-5" />
                    <p className="text-gray-700 font-medium">正在生成会议总结与任务...</p>
                    <p className="text-sm text-gray-500 mt-2">AI 处理中，请稍候</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-3xl font-bold text-gray-900">会议总结</h1>
            </div>

            {summary && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">会议总结</h2>
                    <p className="text-gray-700 leading-relaxed">{summary}</p>
                </div>
            )}

            {/* 对话记录区域 */}
            {conversations.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <div className="flex items-center gap-2 mb-6">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-xl font-bold text-gray-900">对话记录</h2>
                        <span className="text-sm text-gray-500 ml-2">({conversations.length} 条)</span>
                    </div>
                    <div className="space-y-4 ">
                        {conversations.map((conv, index) => (
                            <div
                                key={conv.id}
                                className="border-l-4 border-indigo-500 pl-4 py-3 bg-gray-50 rounded-r-lg"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs text-gray-500 font-mono">
                                        {new Date(conv.user_sent_at).toLocaleString('zh-CN', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                        })}
                                    </span>
                                    <span className="text-xs text-gray-400">#{index + 1}</span>
                                </div>

                                {/* 用户消息 */}
                                <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User className="w-4 h-4 text-indigo-600" />
                                        <span className="text-sm font-semibold text-indigo-600">您</span>
                                    </div>
                                    <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200 ml-6">
                                        {conv.user_message_text}
                                    </p>
                                    {conv.user_audio_duration && (
                                        <span className="text-xs text-gray-400 ml-6">
                                            录音时长: {conv.user_audio_duration}秒
                                        </span>
                                    )}
                                </div>

                                {/* AI回复 */}
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <MessageSquare className="w-4 h-4 text-teal-600" />
                                        <span className="text-sm font-semibold text-teal-600">AI助手</span>
                                    </div>
                                    <p className="text-sm text-gray-700 bg-teal-50 p-3 rounded-lg border border-teal-200 ml-6">
                                        {conv.ai_response_text}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">任务列表</h2>
                <TodoListEditable
                    todos={todos}
                    onConfirmTodo={handleConfirmTodo}
                    onUpdateTodo={handleUpdateTodo}
                />
            </div>
        </div>
    );
}

export default function MeetSummaryPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-gray-50/80">
                    <div className="text-center rounded-2xl bg-white px-10 py-12 shadow-lg border border-gray-100">
                        <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-600 border-t-transparent mx-auto mb-5" />
                        <p className="text-gray-700 font-medium">正在加载会议总结...</p>
                        <p className="text-sm text-gray-500 mt-2">请稍候</p>
                    </div>
                </div>
            }
        >
            <MeetSummaryPageContent />
        </Suspense>
    );
}
