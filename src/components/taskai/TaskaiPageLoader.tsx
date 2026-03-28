export function TaskaiPageLoader({
    title = 'Loading TaskAI...',
    description = 'Fetching the latest organization data before showing this page.',
}: {
    title?: string
    description?: string
}) {
    return (
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm">
                <p className="text-base font-semibold text-slate-800">{title}</p>
                <p className="mt-2 text-sm text-slate-500">{description}</p>
            </div>
        </div>
    )
}
