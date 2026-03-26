
'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ChartDataPoint {
    name: string;
    [key: string]: any;
}

interface OverviewChartProps {
    data: ChartDataPoint[];
    dataKey: string;
    title: string;
    color?: string;
    isLoading?: boolean;
}

export const OverviewChart = ({
    data,
    dataKey,
    title,
    color = '#4f46e5',
    isLoading
}: OverviewChartProps) => {
    return (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                <div className="flex gap-2">
                    <span className="text-xs text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        Last 7 Days
                    </span>
                </div>
            </div>
            
            <div className="h-80 w-full relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50/30 backdrop-blur-[1px] rounded-xl">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 500 }} 
                                dy={15} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#6b7280', fontSize: 13 }} 
                            />
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: '#fff', 
                                    borderRadius: '16px', 
                                    border: '1px solid #e5e7eb', 
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                                    padding: '16px' 
                                }}
                                itemStyle={{ color: '#374151', fontSize: '14px', fontWeight: 600 }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey={dataKey} 
                                stroke={color} 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill={`url(#color${dataKey})`} 
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
