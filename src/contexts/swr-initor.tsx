'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

type SwrInitorProps = {
    children: ReactNode;
};
const SwrInitor = ({ children }: SwrInitorProps) => {
    const router = useRouter();
    const [init, setInit] = useState(false);

    useEffect(() => {
        // 注意：该组件在 Next.js 里仍可能经历 SSR 预渲染阶段
        // 因此必须把 localStorage 访问放在 useEffect 内，避免 localStorage is not defined。
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('talent_token');
        if (!token) {
            const fullPath = window.location.pathname + window.location.search;
            router.replace(`/login?redirect=${encodeURIComponent(fullPath)}`);
            return;
        }

        setInit(true);
    }, []);

    return init ? (
        <>
            {children}
        </>
    ) : null;
};

export default SwrInitor;
