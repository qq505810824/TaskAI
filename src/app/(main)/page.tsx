'use client'

import { useAuth } from '@/hooks/useAuth'
import { ArrowRight, Brain, CheckCircle2, FolderKanban, MessageSquareText, Shield } from 'lucide-react'
import Link from 'next/link'

const highlights = [
    {
        title: 'Plan projects faster',
        description: 'Turn project context, uploaded documents, and objectives into structured tasks with AI support.',
        icon: FolderKanban,
    },
    {
        title: 'Brainstorm with AI',
        description: 'Open any task, chat with AI, and keep the conversation grounded in the current project context.',
        icon: Brain,
    },
    {
        title: 'Keep clear progress records',
        description: 'Add progress updates, files, and summaries so teams can track work before marking tasks complete.',
        icon: MessageSquareText,
    },
]

export default function HomePage() {
    const { user, isLoading } = useAuth()

    return (
        <div className="relative overflow-hidden bg-slate-50">
            <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.16),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(248,250,252,1))]" />

            <section className="mx-auto flex max-w-7xl flex-col gap-14 px-6 pb-20 pt-16 sm:px-8 lg:flex-row lg:items-center lg:px-12 lg:pt-24">
                <div className="max-w-3xl flex-1">
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        AI-powered project execution for teams
                    </div>

                    <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
                        Manage projects, generate tasks, and work with AI in one place.
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                        TaskAI helps teams turn project briefs into actionable tasks, collaborate with AI during
                        brainstorming, and keep progress updates visible without losing the full project picture.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        {isLoading ? (
                            <div className="inline-flex items-center justify-center rounded-2xl bg-slate-200 px-6 py-3 text-base font-semibold text-slate-500">
                                Loading...
                            </div>
                        ) : user ? (
                            <>
                                <Link
                                    href="/taskai/tasks"
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
                                >
                                    Open Task Board
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                {user.role === 'admin' ? (
                                    <Link
                                        href="/admin"
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-white px-6 py-3 text-base font-semibold text-indigo-700 transition hover:bg-indigo-50"
                                    >
                                        <Shield className="h-4 w-4" />
                                        Admin Console
                                    </Link>
                                ) : null}
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
                            >
                                Login
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        )}
                    </div>
                </div>

                <div className="flex-1">
                    <div className="rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)] backdrop-blur">
                        <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Project snapshot</p>
                                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">Q2 Mobile Launch</h2>
                                </div>
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                                    Active
                                </span>
                            </div>

                            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl bg-white p-4 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tasks</p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">24</p>
                                </div>
                                <div className="rounded-2xl bg-white p-4 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Open</p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">11</p>
                                </div>
                                <div className="rounded-2xl bg-white p-4 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Completed</p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">8</p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="text-sm font-semibold text-slate-900">AI-generated project task</p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Draft the launch checklist, verify platform readiness, and align rollout
                                        dependencies with the team.
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="text-sm font-semibold text-slate-900">AI brainstorming</p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Use project summaries and current task context to discuss risks, next steps,
                                        and execution ideas.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-8 lg:px-12">
                <div className="grid gap-5 md:grid-cols-3">
                    {highlights.map(({ title, description, icon: Icon }) => (
                        <div
                            key={title}
                            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                                <Icon className="h-6 w-6" />
                            </div>
                            <h3 className="mt-5 text-xl font-semibold text-slate-900">{title}</h3>
                            <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
