'use client';

import { motion } from 'framer-motion';
import { Brain, Loader2, Mic, Volume2 } from 'lucide-react';

type Status = 'idle' | 'recording' | 'transcribing' | 'processing' | 'speaking' | 'listening';

interface StatusIndicatorProps {
    status: Status;
}

export const StatusIndicator = ({ status }: StatusIndicatorProps) => {
    const statusConfig = {
        idle: {
            text: '等待中...',
            icon: null,
            color: 'text-gray-500',
        },
        recording: {
            text: '正在连接...',
            icon: Loader2,
            color: 'text-red-500',
        },
        listening: {
            text: '正在聆听...',
            icon: Mic,
            color: 'text-blue-500',
        },
        transcribing: {
            text: '正在理解您的话...',
            icon: Loader2,
            color: 'text-blue-500',
        },
        processing: {
            text: 'AI正在思考...',
            icon: Brain,
            color: 'text-indigo-500',
        },
        speaking: {
            text: 'AI正在说话...',
            icon: Volume2,
            color: 'text-green-500',
        },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2"
        >
            {Icon && (
                <motion.div
                    animate={status === 'transcribing' || status === 'processing' ? {
                        rotate: 360,
                    } : {}}
                    transition={{
                        duration: 1,
                        repeat: status === 'transcribing' || status === 'processing' ? Infinity : 0,
                        ease: 'linear',
                    }}
                >
                    <Icon className={`w-5 h-5 ${config.color}`} />
                </motion.div>
            )}
            <span className={`text-sm font-medium ${config.color}`}>
                {config.text}
            </span>
        </motion.div>
    );
};
