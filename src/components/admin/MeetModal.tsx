'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Meet } from '@/types/meeting';

interface MeetModalProps {
    isOpen: boolean;
    meet?: Meet | null;
    loading?: boolean;
    onClose: () => void;
    onSubmit: (data: {
        title: string;
        description: string;
        startTime: string;
        duration: number;
    }) => void;
}

export const MeetModal = ({ isOpen, meet, loading, onClose, onSubmit }: MeetModalProps) => {
    const isEdit = !!meet;
    const [formData, setFormData] = useState({
        title: meet?.title || '',
        description: meet?.description || '',
        startTime: meet?.start_time
            ? new Date(meet.start_time).toISOString().slice(0, 16)
            : '',
        duration: meet?.duration || 60,
    });

    useEffect(() => {
        if (meet) {
            setFormData({
                title: meet.title || '',
                description: meet.description || '',
                startTime: meet.start_time
                    ? new Date(meet.start_time).toISOString().slice(0, 16)
                    : '',
                duration: meet.duration || 60,
            });
        } else {
            setFormData({
                title: '',
                description: '',
                startTime: '',
                duration: 60,
            });
        }
    }, [meet, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal 内容 */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 头部 */}
                            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {isEdit ? '编辑会议' : '创建新会议'}
                                </h2>
                            </div>

                            {/* 表单内容 */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        会议标题 *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="输入会议标题"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        会议描述
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        rows={3}
                                        placeholder="输入会议描述（可选）"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            开始时间
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={formData.startTime}
                                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            预计时长（分钟）
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.duration}
                                            onChange={(e) =>
                                                setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })
                                            }
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            min="1"
                                        />
                                    </div>
                                </div>

                                {/* 按钮组 */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? (isEdit ? '更新中...' : '创建中...') : isEdit ? '更新会议' : '创建会议'}
                                    </button>
                                </div>
                            </form>

                            {/* 关闭按钮 */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
