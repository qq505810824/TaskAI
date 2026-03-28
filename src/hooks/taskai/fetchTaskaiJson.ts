'use client'

type TaskaiFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const inflightJsonRequests = new Map<string, Promise<unknown>>()

export async function fetchTaskaiJson<T>(
    taskaiFetch: TaskaiFetch,
    input: RequestInfo | URL,
    init?: RequestInit,
    options?: {
        dedupeKey?: string
        force?: boolean
    }
): Promise<T> {
    const dedupeKey = options?.dedupeKey

    if (!dedupeKey || options?.force) {
        const res = await taskaiFetch(input, init)
        return (await res.json()) as T
    }

    const existing = inflightJsonRequests.get(dedupeKey)
    if (existing) {
        return (await existing) as T
    }

    const request = (async () => {
        const res = await taskaiFetch(input, init)
        return (await res.json()) as T
    })().finally(() => {
        inflightJsonRequests.delete(dedupeKey)
    })

    inflightJsonRequests.set(dedupeKey, request)
    return (await request) as T
}
