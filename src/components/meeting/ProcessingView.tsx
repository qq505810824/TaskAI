'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProcessingViewProps {
    /** 动画结束回调（可选）。会议结束流程的跳转应由业务在保存/生成完成后再触发，避免与异步逻辑重复导航 */
    onComplete?: () => void;
    steps?: string[];
}

export const ProcessingView = ({ onComplete, steps }: ProcessingViewProps) => {
    const defaultSteps = [
        '正在分析会议内容...',
        '正在提取任务事项...',
        '正在生成会议总结...',
    ];

    const processingSteps = steps || defaultSteps;
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (step < processingSteps.length) {
            const timeout = setTimeout(() => {
                setStep(s => s + 1);
            }, 1200);
            return () => clearTimeout(timeout);
        } else {
            setTimeout(() => onComplete?.(), 800);
        }
    }, [step, onComplete, processingSteps.length]);

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-lg bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center"
            >
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Loader2 size={40} className="animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-8">正在处理会议</h2>

                <div className="space-y-5 text-left pl-4">
                    {processingSteps.map((text, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{
                                opacity: step >= idx ? 1 : 0.3,
                                x: step >= idx ? 0 : -10,
                            }}
                            className="flex items-center gap-4"
                        >
                            {step > idx ? (
                                <div className="text-green-500 bg-green-50 p-1 rounded-full">
                                    <CheckCircle size={20} />
                                </div>
                            ) : step === idx ? (
                                <div className="w-7 h-7 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <div className="w-7 h-7 border-[3px] border-gray-200 rounded-full"></div>
                            )}
                            <span
                                className={`text-base ${step === idx
                                        ? 'font-bold text-indigo-900'
                                        : 'text-gray-600 font-medium'
                                    }`}
                            >
                                {text}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};
