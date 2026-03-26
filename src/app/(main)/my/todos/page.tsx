
'use client';

import { AuthRequired } from '@/components/common/AuthRequired';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { MyTodosFilter } from '@/components/todo/MyTodosFilter';
import { TodoListEditable } from '@/components/todo/TodoListEditable';
import { useMyTodos } from '@/hooks/useMyTodos';
import { formatMeetingCode } from '@/utils/meet-helpers';
import { MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function MyTodosPage() {
    const router = useRouter();
    const [showMoreFilters, setShowMoreFilters] = useState(false);
    const {
        user,
        todos,
        isLoading,
        error,
        titleFilter,
        statusFilter,
        priorityFilter,
        meetingCodeFilter,
        setTitleFilter,
        setStatusFilter,
        setPriorityFilter,
        setMeetingCodeFilter,
        fetchTodos,
        handleConfirmTodo,
        handleUpdateTodo,
        handleResetFilters
    } = useMyTodos();

    if (isLoading) {
        return <LoadingIndicator text="正在加载你的任务列表..." />;
    }

    if (!user) {
        return <AuthRequired />;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
                <h1 className="text-2xl font-bold text-gray-900">我的任务</h1>
                <p className="text-sm text-gray-500">查看你在所有会议中生成的 Todo</p>
            </div>

            <MyTodosFilter
                titleFilter={titleFilter}
                statusFilter={statusFilter}
                priorityFilter={priorityFilter}
                meetingCodeFilter={meetingCodeFilter}
                showMoreFilters={showMoreFilters}
                setTitleFilter={setTitleFilter}
                setStatusFilter={setStatusFilter}
                setPriorityFilter={setPriorityFilter}
                setMeetingCodeFilter={setMeetingCodeFilter}
                setShowMoreFilters={setShowMoreFilters}
                onSearch={() => void fetchTodos()}
                onReset={handleResetFilters}
            />

            <ErrorDisplay error={error} />

            {!error && todos.length === 0 ? (
                <EmptyState message="暂无任务。完成一次会议后将自动为你生成 Todo。" />
            ) : (
                <TodoListEditable
                    todos={todos}
                    onConfirmTodo={handleConfirmTodo}
                    onUpdateTodo={handleUpdateTodo}
                    renderMeta={(todo) => {
                        const meet = todo.meet;
                        const meetingCode = meet?.meeting_code ? formatMeetingCode(meet.meeting_code) : '';
                        if (!meet) return null;
                        return (
                            <span>
                                会议：{meet.title || '未命名会议'}
                                {meetingCode && (
                                    <>
                                        {' '}
                                        · <span className="font-mono tracking-wider">{meetingCode}</span>
                                    </>
                                )}
                            </span>
                        );
                    }}
                    renderExtraActions={(todo) => {
                        const meet = todo.meet;
                        if (!meet) return null;
                        return (
                            <button
                                onClick={() =>
                                    router.push(
                                        todo.user_meet_id
                                            ? `/meet/${meet.meeting_code}/summary?userMeetId=${todo.user_meet_id}`
                                            : `/meet/${meet.meeting_code}/summary`
                                    )
                                }
                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
                            >
                                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                查看会议
                            </button>
                        );
                    }}
                />
            )}
        </div>
    );
}
