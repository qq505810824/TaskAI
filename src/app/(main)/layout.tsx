"use client";

import { Header } from "@/components/layout/Header";
import { usePathname } from "next/navigation";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const pathname = usePathname();
    const isTaskai = pathname.startsWith("/taskai");

    return (
        <div
            className={
                isTaskai
                    ? "min-h-screen bg-slate-50 font-sans text-slate-900"
                    : "min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-indigo-100"
            }
        >
            <Header
                taskaiBrand={isTaskai}
                showMarketingNav={!isTaskai}
                brandHref={isTaskai ? "/taskai/tasks" : "/"}
            />
            <main className="h-full">{children}</main>
        </div>
    );
}
