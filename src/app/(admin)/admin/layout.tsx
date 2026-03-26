import { Header } from "@/components/layout/Header";
import SwrInitor from "@/contexts/swr-initor";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SwrInitor>
            <div className="min-h-screen bg-gray-50">
                <Header />
                <main className="h-full">{children}</main>
            </div>
        </SwrInitor>
    );
}
