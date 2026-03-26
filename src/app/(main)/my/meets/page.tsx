
'use client';

import { AuthRequired } from '@/components/common/AuthRequired';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { MeetList } from '@/components/meet/MeetList';
import { useMyMeets } from '@/hooks/useMyMeets';

export default function MyMeetsPage() {
    const { user, userMeets, isLoading, error } = useMyMeets();

    if (isLoading) {
        return <LoadingIndicator text="正在加载你的会议列表..." />;
    }

    if (!user) {
        return <AuthRequired />;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
                <h1 className="text-2xl font-bold text-gray-900">我的会议</h1>
                <p className="text-sm text-gray-500">查看你使用过的所有会议及其状态</p>
            </div>

            <ErrorDisplay error={error} />

            {!error && userMeets.length === 0 ? (
                <EmptyState message="你还没有参加过任何会议，可以先通过会议号加入一场会议。" />
            ) : (
                <MeetList userMeets={userMeets} />
            )}
        </div>
    );
}
