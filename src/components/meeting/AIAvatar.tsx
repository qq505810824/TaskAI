'use client';

import { motion } from 'framer-motion';

interface AIAvatarProps {
    isSpeaking: boolean;
}

export const AIAvatar = ({ isSpeaking }: AIAvatarProps) => {
    return (
        <div className="relative z-10 scale-110">
            {/* 脉冲动画 */}
            {isSpeaking && (
                <motion.div
                    className="absolute inset-0 bg-teal-500/20 rounded-full"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                    }}
                />
            )}

            {/* 头像圆圈 */}
            <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-teal-400 to-emerald-300 flex items-center justify-center shadow-2xl relative overflow-hidden border-4 border-white/10">
                {/* 眼睛 */}
                <motion.div
                    className="absolute top-[35%] left-[28%] w-4 h-5 bg-gray-900 rounded-full"
                    animate={isSpeaking ? {
                        scaleY: [1, 0.3, 1],
                    } : {}}
                    transition={{
                        duration: 0.5,
                        repeat: isSpeaking ? Infinity : 0,
                    }}
                />
                <motion.div
                    className="absolute top-[35%] right-[28%] w-4 h-5 bg-gray-900 rounded-full"
                    animate={isSpeaking ? {
                        scaleY: [1, 0.3, 1],
                    } : {}}
                    transition={{
                        duration: 0.5,
                        repeat: isSpeaking ? Infinity : 0,
                        delay: 0.1,
                    }}
                />
                {/* 微笑 */}
                <div className="absolute bottom-[30%] w-14 h-7 border-b-[5px] border-gray-900 rounded-full opacity-80" />
                {/* 光泽 */}
                <div className="absolute top-6 right-8 w-10 h-5 bg-white/40 rounded-full rotate-[-20deg]" />
            </div>

            {/* {isSpeaking && (
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="bg-gray-800/90 text-white/90 px-5 py-2 rounded-full text-sm backdrop-blur-md shadow-lg border border-white/5">
            Speaking...
          </span>
        </motion.div>
      )} */}
        </div>
    );
};
