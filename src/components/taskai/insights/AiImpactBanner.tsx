type Props = {
    completionRate: number
    inProgressTasks: number
    membersCount: number
}

export function AiImpactBanner({ completionRate, inProgressTasks, membersCount }: Props) {
    return (
        <section className="mb-8 overflow-hidden rounded-2xl bg-linear-to-r from-indigo-600 via-purple-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-200">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl">🤖</div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold">AI-Powered Team Snapshot</h3>
                    <p className="mt-1 text-sm text-white/75">
                        Live metrics from your current organization, refreshed from TaskAI data.
                    </p>
                </div>
                <div className="flex gap-6">
                    <Metric value={`${completionRate}%`} label="Completion" />
                    <Metric value={`${inProgressTasks}`} label="In Progress" />
                    <Metric value={`${membersCount}`} label="Contributors" />
                </div>
            </div>
        </section>
    )
}

function Metric({ value, label }: { value: string; label: string }) {
    return (
        <div className="text-center">
            <p className="text-3xl font-extrabold">{value}</p>
            <p className="mt-0.5 text-xs text-white/60">{label}</p>
        </div>
    )
}
