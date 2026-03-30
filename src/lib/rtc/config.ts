import { buildRtcPromptFromTemplate, getDefaultTaskaiPromptTemplate } from '@/lib/taskai/prompt-templates';

/**
 * RTC Tutor Prompt Template
 */
export const RTC_TUTOR_PROMPT_TEMPLATE = getDefaultTaskaiPromptTemplate('taskai_rtc_tutor_template').content;

/**
 * Builds the final prompt by replacing placeholders in the template
 */
export function buildRtcPrompt(topic: string, description: string): string {
    return buildRtcPromptFromTemplate(RTC_TUTOR_PROMPT_TEMPLATE, topic, description);
}
