
'use client';

export function EmptyState({ message }: { message: string }) {
    return (
        <div className="py-16 text-center text-gray-500 text-sm">
            {message}
        </div>
    );
}
