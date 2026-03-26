import SwrInitor from '@/contexts/swr-initor';
import type { ReactNode } from 'react';

export default function MeetCodeLayout({ children }: { children: ReactNode }) {
    return (
        <SwrInitor>
            {children}
        </SwrInitor>
    );
}

