import Link from 'next/link'

export function Footer() {
    return (
        <footer className="border-t border-tea-100 bg-tea-50/50">
            <div className="container mx-auto px-4 py-12 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                    {/* Brand Column */}
                    <div className="space-y-4">
                        <Link href="/" className="flex flex-row items-center gap-2 text-xl font-bold text-tea-700 hover:text-tea-600 transition-colors">
                            <img src="/icon.png" className="h-6 w-6" /><span className="tracking-wide">TaskAI</span>
                        </Link>
                        <p className="text-sm text-earth-600 leading-relaxed max-w-xs">
                            TaskAI is a platform that helps you find the right talent for your project.
                        </p>
                    </div>

                    {/* Links Column 1 */}
                    <div>
                        <h3 className="font-bold text-tea-800 mb-4 md:mb-6">探索</h3>
                        <ul className="space-y-3 text-sm text-earth-600">

                        </ul>
                    </div>

                    {/* Links Column 2 */}
                    <div>
                        <h3 className="font-bold text-tea-800 mb-4 md:mb-6">关于</h3>
                        <ul className="space-y-3 text-sm text-earth-600">
                            {/* <li><FooterLink href="/contact">联系方式</FooterLink></li>
                            <li><FooterLink href="/privacy">隐私政策</FooterLink></li>
                            <li><FooterLink href="/terms">服务条款</FooterLink></li> */}
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-tea-200/60 text-center text-sm text-earth-500">
                    <p>© {new Date().getFullYear()} TaskAI. All rights reserved.</p>
                </div>
            </div>
        </footer>
    )
}

function FooterLink({ href, children }: { href: string, children: React.ReactNode }) {
    return (
        <Link href={href} className="hover:text-tea-600 hover:translate-x-1 transition-all inline-block">
            {children}
        </Link>
    )
}

function SocialLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
    return (
        <a
            href={href}
            className="text-earth-400 hover:text-tea-600 transition-colors p-1 hover:bg-tea-100 rounded-full"
            aria-label={label}
        >
            {icon}
        </a>
    )
}
