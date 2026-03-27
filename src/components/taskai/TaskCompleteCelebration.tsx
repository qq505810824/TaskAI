'use client'

import { AnimatePresence, motion } from 'framer-motion'

const PARTICLES = Array.from({ length: 24 }).map((_, i) => ({
    id: i,
    left: (i * 17) % 100,
    delay: (i % 8) * 0.04,
    duration: 0.8 + (i % 5) * 0.12,
    rotate: (i % 2 === 0 ? 1 : -1) * (20 + (i % 7) * 8),
    color:
        i % 4 === 0
            ? 'bg-emerald-400'
            : i % 4 === 1
              ? 'bg-indigo-400'
              : i % 4 === 2
                ? 'bg-amber-400'
                : 'bg-fuchsia-400',
}))

export function TaskCompleteCelebration({
    open,
    points,
    message,
}: {
    open: boolean
    points: number
    message?: string
}) {
    return (
        <AnimatePresence>
            {open ? (
                <div className="pointer-events-none fixed inset-0 z-90 overflow-hidden">
                    {PARTICLES.map((p) => (
                        <motion.span
                            key={p.id}
                            initial={{ y: -20, opacity: 0, x: 0, rotate: 0 }}
                            animate={{ y: 420, opacity: [0, 1, 1, 0], x: [0, 8, -8, 0], rotate: p.rotate }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
                            className={`absolute top-0 h-3 w-1.5 rounded-sm ${p.color}`}
                            style={{ left: `${p.left}%` }}
                        />
                    ))}
                    <motion.div
                        initial={{ y: -14, opacity: 0, scale: 0.96 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -8, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute left-1/2 top-12 -translate-x-1/2 rounded-2xl border border-emerald-200 bg-white/95 px-5 py-3 text-center shadow-xl backdrop-blur"
                    >
                        <div className="text-base font-bold text-emerald-700">+{points} pts! Task completed! 🎉</div>
                        {message ? <div className="mt-0.5 text-xs text-slate-500">{message}</div> : null}
                    </motion.div>
                </div>
            ) : null}
        </AnimatePresence>
    )
}
