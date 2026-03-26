
'use client';

export function LoadingIndicator({ text = '正在加载...' }: { text?: string }) {
    return (
        <div className="flex items-center justify-center py-16">
            <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">{text}</p>
            </div>
        </div>
    );
}
