import type { Todo } from '@/types/meeting';
import { CheckCircle, Clock, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { TodoEditModal } from './TodoEditModal';

export interface TodoListEditableProps<T extends Todo = Todo> {
    todos: T[];
    onConfirmTodo: (id: string) => Promise<void> | void;
    onUpdateTodo: (id: string, updates: Partial<Todo>) => Promise<void> | void;
    /** 自定义在标题下方展示的额外信息（例如会议信息） */
    renderMeta?: (todo: T) => React.ReactNode;
    /** 自定义右侧操作区域的附加操作（例如“查看会议”按钮） */
    renderExtraActions?: (todo: T) => React.ReactNode;
}

export function TodoListEditable<T extends Todo = Todo>({
    todos,
    onConfirmTodo,
    onUpdateTodo,
    renderMeta,
    renderExtraActions,
}: TodoListEditableProps<T>) {
    const [editingTodo, setEditingTodo] = useState<T | null>(null);

    const canEdit = (status: string) => {
        return status === 'draft' || status === 'confirmed';
    };

    const getPriorityColor = (priority: string) => {
        const colorMap: Record<string, string> = {
            low: 'bg-green-100 text-green-700',
            medium: 'bg-yellow-100 text-yellow-700',
            high: 'bg-red-100 text-red-700',
        };
        return colorMap[priority] || 'bg-gray-100 text-gray-700';
    };

    const getPriorityText = (priority: string) => {
        const textMap: Record<string, string> = {
            low: '低',
            medium: '中',
            high: '高',
        };
        return textMap[priority] || priority;
    };

    const handleStartEdit = (todo: T) => {
        if (!canEdit(todo.status)) return;
        setEditingTodo(todo);
    };

    const handleCloseModal = () => {
        setEditingTodo(null);
    };

    const handleConfirm = async (id: string) => {
        // 确认任务时强制退出编辑模式
        if (editingTodo?.id === id) {
            setEditingTodo(null);
        }
        await onConfirmTodo(id);
    };

    return (
        <div className="space-y-4">
            {todos.map((todo) => {
                const editable = canEdit(todo.status);

                return (
                    <div
                        key={todo.id}
                        className={`p-4 rounded-xl border transition-all ${todo.status === 'confirmed'
                            ? 'bg-green-50 border-green-200 shadow-sm'
                            : todo.status === 'completed'
                                ? 'bg-gray-50 border-gray-200 opacity-60'
                                : todo.status === 'in_progress'
                                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                                    : 'bg-white border-gray-200 shadow-sm'
                            }`}
                    >
                        <div className="flex items-start flex-col sm:flex-row sm:justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 mb-1 flex-wrap break-words">{todo.title}</h3>

                                {renderMeta && (
                                    <div className="mb-1 text-xs text-gray-500">
                                        {renderMeta(todo)}
                                    </div>
                                )}

                                {todo.description && (
                                    <p className="text-sm text-gray-600 mb-3">{todo.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-xs flex-wrap">
                                    <span
                                        className={`px-2 py-0.5 rounded-full font-medium ${getPriorityColor(todo.priority)}`}
                                    >
                                        {getPriorityText(todo.priority)}优先级
                                    </span>
                                    {todo.due_date && (
                                        <div className="flex items-center gap-1 text-gray-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>
                                                截止:{' '}
                                                {new Date(todo.due_date).toLocaleString('zh-CN', {
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    )}
                                    {todo.reminder_time && (
                                        <div className="flex items-center gap-1 text-gray-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>
                                                提醒:{' '}
                                                {new Date(todo.reminder_time).toLocaleString('zh-CN', {
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex w-full sm:w-auto items-center justify-end gap-2 shrink-0">
                                {editable && todo.status !== 'confirmed' && (
                                    <button
                                        onClick={() => handleStartEdit(todo)}
                                        className="p-2 text-indigo-600 hover:bg-indigo-100/50 rounded-xl transition-all active:scale-95"
                                        title="编辑任务"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                )}
                                {todo.status === 'draft' && (
                                    <button
                                        onClick={() => handleConfirm(todo.id)}
                                        className="p-2 text-green-600 hover:bg-green-100/50 rounded-xl transition-all active:scale-95"
                                        title="确认任务"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                    </button>
                                )}
                                {todo.status === 'confirmed' && (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                        已确认
                                    </span>
                                )}
                                {todo.status === 'completed' && (
                                    <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                        已完成
                                    </span>
                                )}
                                {todo.status === 'in_progress' && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                        进行中
                                    </span>
                                )}
                                {renderExtraActions && renderExtraActions(todo)}
                            </div>
                        </div>
                    </div>
                );
            })}

            {todos.length === 0 && (
                <div className="text-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                    <p className="text-gray-500 text-sm italic">暂无任务</p>
                </div>
            )}

            {/* 编辑 Modal */}
            <TodoEditModal
                isOpen={!!editingTodo}
                todo={editingTodo}
                onSave={onUpdateTodo}
                onClose={handleCloseModal}
            />
        </div>
    );
}


