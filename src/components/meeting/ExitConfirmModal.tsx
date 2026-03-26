'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, X } from 'lucide-react';

interface ExitConfirmModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ExitConfirmModal = ({
    isOpen,
    onConfirm,
    onCancel,
}: ExitConfirmModalProps) => {
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
                        onClick={onCancel}
                    />

                    {/* Modal 内容 */}
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 顶部装饰 */}
                            <div className="bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 px-6 py-10 text-center relative overflow-hidden">
                                {/* 背景装饰 */}
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
                                </div>

                                <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                    className="relative z-10 w-24 h-24 mx-auto mb-6 bg-white/25 rounded-full flex items-center justify-center backdrop-blur-md border-4 border-white/30 shadow-lg"
                                >
                                    <LogOut
                                        size={48}
                                        className="text-white"
                                    />
                                </motion.div>
                                <h2 className="relative z-10 text-2xl font-bold text-white mb-2 drop-shadow-md">确认退出？</h2>
                                <p className="relative z-10 text-amber-50 text-sm">
                                    会议正在进行中
                                </p>
                            </div>

                            {/* 提示信息 */}
                            <div className="px-6 py-8">
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-6">
                                    <p className="text-amber-800 text-sm text-center font-medium leading-relaxed">
                                        退出将清除本次对话的所有记录，<br />
                                        且不会生成会议总结。
                                    </p>
                                </div>

                                {/* 按钮组 */}
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={onConfirm}
                                        className="w-full px-4 py-3.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg active:scale-[0.98]"
                                    >
                                        确认退出并清除内容
                                    </button>
                                    <button
                                        onClick={onCancel}
                                        className="w-full px-4 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all active:scale-[0.98]"
                                    >
                                        取消
                                    </button>
                                </div>
                            </div>

                            {/* 关闭按钮 */}
                            <button
                                onClick={onCancel}
                                className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/10"
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
