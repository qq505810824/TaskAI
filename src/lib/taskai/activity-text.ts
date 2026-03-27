export function taskaiActivityText(eventType: string): string {
    switch (eventType) {
        case 'task_claimed':
            return 'claimed'
        case 'task_completed':
            return 'completed'
        case 'member_joined':
            return 'joined'
        case 'new_task':
            return 'created'
        default:
            return eventType
    }
}

export function taskaiRelativeTime(iso: string): string {
    const ts = new Date(iso).getTime()
    if (Number.isNaN(ts)) return ''
    const diff = Date.now() - ts
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour

    if (diff < minute) return 'just now'
    if (diff < hour) return `${Math.floor(diff / minute)}m ago`
    if (diff < day) return `${Math.floor(diff / hour)}h ago`
    return `${Math.floor(diff / day)}d ago`
}
