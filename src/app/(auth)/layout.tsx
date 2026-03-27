import { Header } from '@/components/layout/Header'

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <Header
                taskaiBrand={false}
                showMarketingNav={false}
                brandHref={"/"}
            />

            <main className="flex-1 flex items-center justify-center p-4 py-12">
                {children}
            </main>

            <footer className="py-8 text-center text-sm text-gray-500 border-t border-gray-100 bg-white">
                <p>© {new Date().getFullYear()} TaskAI. All rights reserved.</p>
            </footer>
        </div>
    )
}
