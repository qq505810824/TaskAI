import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const NEWS_TITLES = [
    'Daily English Boost',
    'Speaking Challenge Update',
    'Learning Tip of the Day',
    'Vocabulary Sprint',
    'AIEnglish Community Highlight',
];

const NEWS_DESCRIPTIONS = [
    'Practice 15 minutes of speaking today to keep your streak alive.',
    'Try shadowing one short English video and record your voice.',
    'Review 10 words before sleep to improve long-term memory.',
    'Join today\'s mini challenge and unlock extra motivation points.',
    'Consistency beats intensity. Keep going with one small step today.',
];

function pickRandom(items: string[]) {
    return items[Math.floor(Math.random() * items.length)];
}

function isAuthorized(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return true;
    }

    const authHeader = request.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const querySecret = request.nextUrl.searchParams.get('secret');

    return bearer === cronSecret || querySecret === cronSecret;
}

async function insertRandomNews() {
    const payload = {
        title: pickRandom(NEWS_TITLES),
        description: pickRandom(NEWS_DESCRIPTIONS),
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin.from('news').insert(payload).select().single();
    if (error) {
        throw error;
    }

    return data;
}

export async function GET(request: NextRequest) {
    return handleRequest(request);
}

export async function POST(request: NextRequest) {
    return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
    try {
        if (!isAuthorized(request)) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const data = await insertRandomNews();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error in cron news route:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
