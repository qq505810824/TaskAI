
export const formatMeetingCode = (code: string) => {
    const digits = code.replace(/\D/g, '');
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ');
};

export const formatDateTime = (iso: string | null) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString();
};

export const getStatusLabel = (status: string) => {
    switch (status) {
        case 'in_progress':
            return '进行中';
        case 'completed':
            return '已完成';
        case 'cancelled':
            return '已取消';
        case 'archived':
            return '已归档';
        default:
            return status;
    }
};

export const getStatusColor = (status: string) => {
    switch (status) {
        case 'in_progress':
            return 'bg-blue-100 text-blue-700';
        case 'completed':
            return 'bg-green-100 text-green-700';
        case 'cancelled':
            return 'bg-red-100 text-red-700';
        case 'archived':
            return 'bg-gray-100 text-gray-600';
        default:
            return 'bg-gray-100 text-gray-700';
    }
};
