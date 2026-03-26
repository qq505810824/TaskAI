import { AuthProvider } from "@/contexts/AuthContext";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export const metadata: Metadata = {
    title: {
        template: '%s | TalentSyncAI',
        default: 'TalentSyncAI',
    },
    description: '',
    keywords: ['AI'],
    openGraph: {
        title: 'TalentSyncAI',
        description: '',
        type: 'website',
        locale: 'zh_CN',
        siteName: '',
    },
    twitter: {
        card: 'summary_large_image',
        title: '',
        description: '',
    },
    robots: {
        index: true,
        follow: true,
    }
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
