
'use client';

import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface OverviewCardProps {
    title: string;
    value: string | number;
    subValue?: string;
    icon: LucideIcon;
    colorClass?: string;
    trend?: {
        value: number;
        isUp: boolean;
    };
    isLoading?: boolean;
}

export const OverviewCard = ({
    title,
    value,
    subValue,
    icon: Icon,
    colorClass = 'text-indigo-600 bg-indigo-50',
    trend,
    isLoading
}: OverviewCardProps) => {
    return (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 duration-300 ${colorClass}`}>
                        <Icon size={28} />
                    </div>
                    <span className="font-semibold text-gray-700 text-lg">{title}</span>
                </div>
                {trend && !isLoading && (
                    <span className={`text-sm font-bold flex items-center gap-1 px-2.5 py-1 rounded-full ${
                        trend.isUp ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                    }`}>
                        {trend.isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {trend.value}%
                    </span>
                )}
            </div>
            
            {isLoading ? (
                <div className="space-y-3">
                    <div className="h-10 w-24 bg-gray-100 animate-pulse rounded-lg" />
                    <div className="h-4 w-32 bg-gray-50 animate-pulse rounded-md" />
                </div>
            ) : (
                <>
                    <div className="text-5xl font-bold text-gray-900 tracking-tight">{value}</div>
                    {subValue && (
                        <p className="text-base text-gray-500 mt-3 font-medium">{subValue}</p>
                    )}
                </>
            )}
            
            {/* Background Decoration */}
            <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-500 pointer-events-none">
                <Icon size={120} />
            </div>
        </div>
    );
};
