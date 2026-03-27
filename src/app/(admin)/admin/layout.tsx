"use client";

import { Header } from "@/components/layout/Header";
import SwrInitor from "@/contexts/swr-initor";
import { usePathname } from "next/navigation";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isTaskaiAdmin = pathname.startsWith("/admin/taskai");

    return (
        <SwrInitor>
            <div className={isTaskaiAdmin ? "min-h-screen bg-slate-50" : "min-h-screen bg-gray-50"}>
                <Header
                    taskaiBrand={isTaskaiAdmin}
                    showMarketingNav={!isTaskaiAdmin}
                    brandHref={isTaskaiAdmin ? "/admin/taskai/tasks" : "/"}
                />
                <main className="h-full">{children}</main>
            </div>
        </SwrInitor>
    );
}
