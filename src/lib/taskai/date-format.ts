export function formatTaskaiDateTime(value: string | null | undefined, fallback = 'n/a') {
    if (!value) return fallback
    try {
        return new Date(value).toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        })
    } catch {
        return value
    }
}

export function formatTaskaiTime(
    value: string | null | undefined,
    fallback = '',
    options?: { includeSeconds?: boolean }
) {
    if (!value) return fallback
    try {
        return new Date(value).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: options?.includeSeconds ? '2-digit' : undefined,
            hour12: true,
        })
    } catch {
        return fallback
    }
}
