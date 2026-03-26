
'use client';

interface OverviewStatusBadgeProps {
    status: string;
    time?: string;
}

export const OverviewStatusBadge = ({ status, time }: OverviewStatusBadgeProps) => {
    const getStatusStyles = (s: string) => {
        switch (s.toLowerCase()) {
            case 'live':
            case 'ongoing':
                return 'bg-green-100 text-green-700 animate-pulse border-green-200';
            case 'upcoming':
            case 'pending':
                return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'completed':
            case 'ended':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'cancelled':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusLabel = (s: string) => {
        switch (s.toLowerCase()) {
            case 'live':
            case 'ongoing':
                return 'LIVE NOW';
            case 'upcoming':
            case 'pending':
                return time || 'UPCOMING';
            case 'completed':
            case 'ended':
                return 'COMPLETED';
            case 'cancelled':
                return 'CANCELLED';
            default:
                return s.toUpperCase();
        }
    };

    return (
        <span className={`text-[10px]  px-2 py-1 rounded-full uppercase tracking-wider border ${getStatusStyles(status)}`}>
            {getStatusLabel(status)}
        </span>
    );
};
