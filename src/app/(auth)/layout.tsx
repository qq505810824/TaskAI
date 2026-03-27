import Link from 'next/link'

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md px-6 sticky top-0 z-50">
                <Link href="/" className="flex items-center gap-2 text-xl font-bold text-indigo-700 hover:text-indigo-600 transition-all transform hover:scale-105">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center overflow-hidden">
                        <img src="/icon.jpeg" className="h-full w-full object-cover" alt="Logo" />
                    </div>
                    <span className="tracking-tight">TaskAI</span>
                </Link>
            </header>

            <main className="flex-1 flex items-center justify-center p-4 py-12">
                {children}
            </main>

            <footer className="py-8 text-center text-sm text-gray-500 border-t border-gray-100 bg-white">
                <p>© {new Date().getFullYear()} TaskAI. All rights reserved.</p>
            </footer>
        </div>
    )
}
