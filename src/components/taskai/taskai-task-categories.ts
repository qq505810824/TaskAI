/** Category options aligned with docs/AIText.html create-task modal */
export const TASKAI_TASK_CATEGORY_OPTIONS = [
    'Engineering',
    'Design',
    'Marketing',
    'Operations',
    'Security',
    'Analytics',
    'Documentation',
    'General',
] as const

export type TaskaiTaskCategory = (typeof TASKAI_TASK_CATEGORY_OPTIONS)[number]
