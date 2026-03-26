'use client';

import { useMeets } from '@/hooks/useMeets';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
    const router = useRouter();
    const { getMeetByCode, loading, error } = useMeets();
    const { user: authUser, isLoading: authLoading } = useAuth();
    const [meetingCode, setMeetingCode] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    const digitsOnly = meetingCode.replace(/\D/g, '');
    const isNineDigits = digitsOnly.length === 9;
    // 仅用于显示：每三位数字中间加空格，如 100083426 -> "100 083 426"
    const displayCode = digitsOnly.replace(/(\d{3})(?=\d)/g, '$1 ');

    const handleJoinMeeting = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isNineDigits) {
            setValidationError('请输入9位数字会议号');
            return;
        }

        setIsValidating(true);
        setValidationError(null);

        try {
            const meetData = await getMeetByCode(digitsOnly);

            if (meetData) {
                // 检查会议状态
                if (meetData.status === 'cancelled') {
                    setValidationError('该会议已取消');
                    setIsValidating(false);
                    return;
                }

                // 验证成功，准备跳转
                const code = digitsOnly;
                const nextPath =
                    meetData.status === 'ended' ? `/meet/${code}/summary` : `/meet/${code}`;

                // 需要登录：先判断登录态
                if (authLoading) {
                    setValidationError('正在加载登录状态，请稍候');
                    setIsValidating(false);
                    return;
                }
                if (!authUser) {
                    router.replace(`/login?redirect=${encodeURIComponent(nextPath)}`);
                    setIsValidating(false);
                    return;
                }

                router.push(nextPath);
                // 注意：跳转后组件会卸载，不需要重置状态
            } else {
                setValidationError('会议不存在');
                setIsValidating(false);
            }
        } catch (err) {
            const errorMessage = '会议不存在或已过期';
            setValidationError(errorMessage);
            setIsValidating(false);
        }
    };

    return (
        <div className="h-full mt-14  flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                    {/* Logo/标题区域 */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
                            <LogIn className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">加入会议</h1>
                        <p className="text-gray-600">输入会议号以加入AI语音对话会议</p>
                    </div>

                    {/* 输入表单 */}
                    <form onSubmit={handleJoinMeeting} className="space-y-6">
                        <div>
                            <label htmlFor="meetingCode" className="block text-sm font-medium text-gray-700 mb-2">
                                会议号
                            </label>
                            <input
                                id="meetingCode"
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                value={displayCode}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                                    setMeetingCode(digits);
                                    setValidationError(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                }}
                                placeholder="请输入会议号(如: 100083426)"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-sm sm:text-lg font-mono tracking-wider"
                                disabled={isValidating}
                                autoFocus
                            />
                        </div>



                        {/* 提交按钮 */}
                        <button
                            type="submit"
                            disabled={isValidating || !isNineDigits}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                            {isValidating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    验证中...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    加入会议
                                </>
                            )}
                        </button>

                        {/* 错误提示 */}
                        {validationError && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                            >
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{validationError}</span>
                            </motion.div>
                        )}

                    </form>

                    {/* 提示信息 */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">
                            提示：会议号通常由9 位数字组成，按 3-3-3 分组，如：100 083 426
                            <br />
                            如果会议已结束，将自动跳转到会议总结页面
                        </p>
                    </div>
                </div>

                {/* 底部链接 */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/admin/meets')}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        管理员入口 →
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
