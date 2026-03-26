'use client';

import type { Conversation } from '@/types/meeting';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, X } from 'lucide-react';

interface EndMeetingModalProps {
    isOpen: boolean;
    conversations: Conversation[];
    onConfirm: () => void;
    onCancel: () => void;
}

export const EndMeetingModal = ({
    isOpen,
    conversations,
    onConfirm,
    onCancel,
}: EndMeetingModalProps) => {
    // 注意：对话记录打印在确认结束会议时执行（在父组件中）

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
                        onClick={onCancel}
                    />

                    {/* Modal 内容 */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 顶部装饰 - 类似手机挂断效果 */}
                            <div className="bg-gradient-to-b from-red-500 via-red-600 to-red-700 px-6 py-10 text-center relative overflow-hidden">
                                {/* 背景装饰 */}
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
                                </div>

                                <motion.div
                                    initial={{ scale: 0.8, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 135 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                    className="relative z-10 w-24 h-24 mx-auto mb-6 bg-white/25 rounded-full flex items-center justify-center backdrop-blur-md border-4 border-white/30 shadow-lg"
                                >
                                    <Phone
                                        size={48}
                                        className="text-white"
                                    />
                                </motion.div>
                                <h2 className="relative z-10 text-2xl font-bold text-white mb-2 drop-shadow-md">结束会议</h2>
                                <p className="relative z-10 text-red-50 text-sm">
                                    {conversations.length > 0
                                        ? `本次会议共进行了 ${conversations.length} 轮对话`
                                        : '确定要结束会议吗？'}
                                </p>
                            </div>

                            {/* 对话统计信息 */}
                            {conversations.length > 0 && (
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">对话轮数</span>
                                        <span className="font-semibold text-gray-900">
                                            {conversations.length} 轮
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mt-2">
                                        <span className="text-gray-600">总时长</span>
                                        <span className="font-semibold text-gray-900">
                                            {Math.round(
                                                conversations.reduce((sum: number, conv: Conversation) => sum + (conv.user_audio_duration || 0), 0)
                                            )}{' '}
                                            秒
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* 提示信息 */}
                            <div className="px-6 py-6">
                                <p className="text-gray-700 text-center mb-6">
                                    {conversations.length > 0
                                        ? '会议结束后，系统将生成会议总结和任务列表。'
                                        : '会议结束后，将无法继续对话。'}
                                </p>

                                {/* 按钮组 */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={onCancel}
                                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <Phone size={18} className="rotate-[135deg]" />
                                        确认结束
                                    </button>
                                </div>
                            </div>

                            {/* 关闭按钮 */}
                            <button
                                onClick={onCancel}
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
