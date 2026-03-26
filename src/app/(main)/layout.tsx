import { Header } from "@/components/layout/Header";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 min-h-screen">
            <Header />
            <main className="h-full">{children}</main>
            {/* <Footer /> */}
        </div>
    );
}
