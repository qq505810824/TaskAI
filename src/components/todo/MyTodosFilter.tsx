import { ChevronDown, Search, XCircle } from 'lucide-react';
import { type Dispatch, type SetStateAction } from 'react';

type Props = {
    titleFilter: string;
    statusFilter: string;
    priorityFilter: string;
    meetingCodeFilter: string;
    showMoreFilters: boolean;
    setTitleFilter: Dispatch<SetStateAction<string>>;
    setStatusFilter: Dispatch<SetStateAction<string>>;
    setPriorityFilter: Dispatch<SetStateAction<string>>;
    setMeetingCodeFilter: Dispatch<SetStateAction<string>>;
    setShowMoreFilters: Dispatch<SetStateAction<boolean>>;
    onSearch: () => void;
    onReset: () => void;
};

const formatMeetingCode = (code: string) => {
    const digits = code.replace(/\D/g, '');
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ');
};

export function MyTodosFilter({
    titleFilter,
    statusFilter,
    priorityFilter,
    meetingCodeFilter,
    showMoreFilters,
    setTitleFilter,
    setStatusFilter,
    setPriorityFilter,
    setMeetingCodeFilter,
    setShowMoreFilters,
    onSearch,
    onReset,
}: Props) {
    return (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                    <div className="relative">
                        <input
                            type="text"
                            value={titleFilter}
                            onChange={(e) => setTitleFilter(e.target.value)}
                            placeholder="输入任务标题关键字"
                            className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                    <button
                        type="button"
                        onClick={onSearch}
                        className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
                    >
                        <Search className="w-3.5 h-3.5 mr-1" />
                        搜索
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowMoreFilters((v) => !v)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                        aria-label={showMoreFilters ? '收起筛选' : '展开更多筛选'}
                    >
                        <ChevronDown
                            className={`w-4 h-4 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`}
                        />
                    </button>
                </div>
            </div>

            {showMoreFilters && (
                <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                状态
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">全部</option>
                                <option value="draft">草稿</option>
                                <option value="confirmed">已确认</option>
                                <option value="in_progress">进行中</option>
                                <option value="completed">已完成</option>
                                <option value="cancelled">已取消</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                优先级
                            </label>
                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">全部</option>
                                <option value="high">高</option>
                                <option value="medium">中</option>
                                <option value="low">低</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                会议号
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={formatMeetingCode(meetingCodeFilter)}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                                    setMeetingCodeFilter(digits);
                                }}
                                placeholder="100 083 426"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onReset}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            重置筛选
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

