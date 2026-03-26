
'use client';

import type { MyUserMeet } from '@/types/meet';
import { MeetListItem } from './MeetListItem';

export function MeetList({ userMeets }: { userMeets: MyUserMeet[] }) {
    return (
        <div className="space-y-3">
            {userMeets.map((um) => (
                <MeetListItem key={um.id} userMeet={um} />
            ))}
        </div>
    );
}
