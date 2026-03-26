
'use client';

export function ErrorDisplay({ error }: { error: string | null }) {
    if (!error) return null;
    return (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
        </div>
    );
}
