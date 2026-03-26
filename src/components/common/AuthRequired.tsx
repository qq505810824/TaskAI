
'use client';

import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AuthRequired() {
    const router = useRouter();
    return (
        <div className="flex items-center justify-center h-[70vh]">
            <div className="text-center space-y-4">
                <LogIn className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="text-gray-600">请先登录后查看。</p>
                <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                    去登录
                </button>
            </div>
        </div>
    );
}
