export const TASKAI_EVIDENCE_BUCKET =
    process.env.SUPABASE_STORAGE_TASKAI_EVIDENCE_BUCKET?.trim() || 'taskai-task-evidence';

export function sanitizeTaskaiStoragePathPart(value: string) {
    return value.replace(/[^a-zA-Z0-9-_]/g, '_');
}
