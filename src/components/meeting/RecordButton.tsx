'use client';

import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

interface RecordButtonProps {
  isRecording: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const RecordButton = ({ isRecording, onClick, disabled }: RecordButtonProps) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <motion.button
        onClick={onClick}
        disabled={disabled}
        className={`
          w-24 h-24 rounded-full flex items-center justify-center
          transition-all duration-300 shadow-lg
          ${isRecording
            ? 'bg-red-500 hover:bg-red-600 scale-110'
            : 'bg-indigo-600 hover:bg-indigo-700 scale-100'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        animate={isRecording ? {
          scale: [1, 1.1, 1],
        } : {}}
        transition={{
          duration: 1.5,
          repeat: isRecording ? Infinity : 0,
        }}
      >
        <Mic className="w-10 h-10 text-white" />
      </motion.button>

      {/* 录音波形动画 */}
      {isRecording && (
        <div className="absolute flex items-center justify-center gap-1 mt-32">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-1 bg-red-500 rounded-full"
              animate={{
                height: [8, 24, 8],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-gray-600 font-medium">
        {isRecording ? '正在录音...' : '点击开始说话'}
      </p>
    </div>
  );
};
