
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Todo } from '@/types/meeting';

interface TodoEditModalProps {
    isOpen: boolean;
    todo: Todo | null;
    onSave: (id: string, updates: Partial<Todo>) => Promise<void> | void;
    onClose: () => void;
}

export const TodoEditModal = ({
    isOpen,
    todo,
    onSave,
    onClose,
}: TodoEditModalProps) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [dueDate, setDueDate] = useState('');
    const [reminderTime, setReminderTime] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (todo) {
            setTitle(todo.title);
            setDescription(todo.description || '');
            setPriority(todo.priority);
            setDueDate(todo.due_date ? new Date(todo.due_date).toISOString().slice(0, 16) : '');
            setReminderTime(todo.reminder_time ? new Date(todo.reminder_time).toISOString().slice(0, 16) : '');
        }
    }, [todo, isOpen]);

    const handleSave = async () => {
        if (!todo || !title.trim()) return;

        setIsSaving(true);
        try {
            const updates: Partial<Todo> = {
                title: title.trim(),
                description: description.trim() || null,
                priority,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
                reminder_time: reminderTime ? new Date(reminderTime).toISOString() : null,
            };
            await onSave(todo.id, updates);
            onClose();
        } catch (error) {
            console.error('Failed to save todo:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* 背景遮罩 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                        onClick={onClose}
                    />

                    {/* Modal 内容 */}
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 顶部标题栏 */}
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h2 className="text-xl font-bold text-gray-900">编辑任务</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* 表单内容 */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        任务标题 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm outline-none"
                                        placeholder="输入任务标题"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        任务描述
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm outline-none min-h-[100px] resize-none"
                                        placeholder="输入任务详细描述（可选）"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            优先级
                                        </label>
                                        <select
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value as any)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm outline-none appearance-none bg-white"
                                        >
                                            <option value="low">低优先级</option>
                                            <option value="medium">中优先级</option>
                                            <option value="high">高优先级</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            截止时间
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        提醒时间
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={reminderTime}
                                        onChange={(e) => setReminderTime(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm outline-none"
                                    />
                                </div>
                            </div>

                            {/* 底部操作栏 */}
                            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 bg-gray-50/50">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-white transition-all active:scale-[0.98] text-sm"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!title.trim() || isSaving}
                                    className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    {isSaving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            保存修改
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
