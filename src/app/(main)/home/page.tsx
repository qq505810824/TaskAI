"use client"

import { AnimatePresence, motion } from 'framer-motion';
import {
    Activity,
    ArrowRight,
    CheckCircle,
    ChevronDown,
    Clock,
    FileText,
    ListTodo,
    Loader2,
    Lock,
    MessageCircle,
    Mic, MicOff,
    MoreVertical,
    Phone,
    Share,
    TrendingUp, UserCheck,
    UserPlus,
    Video,
    VideoOff
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// --- Mock Data ---

const MOCK_TREND_DATA = [
    { name: 'Mon', interviews: 4, tasks: 12 },
    { name: 'Tue', interviews: 6, tasks: 18 },
    { name: 'Wed', interviews: 8, tasks: 24 },
    { name: 'Thu', interviews: 5, tasks: 15 },
    { name: 'Fri', interviews: 9, tasks: 28 },
    { name: 'Sat', interviews: 2, tasks: 5 },
    { name: 'Sun', interviews: 1, tasks: 3 },
];

// Initial state for the call list
const INITIAL_SESSIONS = [
    {
        id: 1,
        employee: "Alex Johnson",
        role: "Senior Frontend Dev",
        type: "Weekly Sync",
        time: "Now",
        status: "live", // This is the active demo one
        avatar: "AJ"
    },
    {
        id: 2,
        employee: "Maria Garcia",
        role: "Product Designer",
        type: "Performance Review",
        time: "2:00 PM",
        status: "upcoming",
        avatar: "MG"
    },
    {
        id: 3,
        employee: "David Chen",
        role: "QA Engineer",
        type: "Onboarding Check-in",
        time: "4:30 PM",
        status: "upcoming",
        avatar: "DC"
    },
    {
        id: 4,
        employee: "Sarah Smith",
        role: "Marketing Lead",
        type: "Strategy Sync",
        time: "10:00 AM",
        status: "completed", // Already talked
        avatar: "SS"
    },
    {
        id: 5,
        employee: "James Wilson",
        role: "Intern",
        type: "Daily Standup",
        time: "9:30 AM",
        status: "completed", // Already talked
        avatar: "JW"
    }
];

const MOCK_TRANSCRIPT = [
    { speaker: "AI Manager", time: "00:05", text: "Hello Alex. Let's review your progress on the dashboard refactor. How are you feeling about the timeline?" },
    { speaker: "Alex (Employee)", time: "00:12", text: "It's going well. I've finished the component library, but I'm hitting some lag with the data fetching." },
    { speaker: "AI Manager", time: "00:15", text: "Understood. Is the lag related to the backend API or client-side rendering?" },
    { speaker: "Alex (Employee)", time: "00:20", text: "Mostly the API response time. I might need help from the backend team to optimize the query." },
    { speaker: "AI Manager", time: "00:25", text: "I see. I will assign a task for you to schedule a pair programming session with the backend lead." },
    { speaker: "Alex (Employee)", time: "00:30", text: "That would be helpful. Also, I'm taking Friday off." },
    { speaker: "AI Manager", time: "00:35", text: "Noted. I will update the sprint capacity accordingly." }
];

const MOCK_GENERATED_TODOS = [
    { id: 101, text: "Schedule pairing session with Backend Lead", owner: "Alex", due: "Tomorrow, 10:00 AM", status: "pending" },
    { id: 102, text: "Profile API query performance", owner: "Alex", due: "Today, 5:00 PM", status: "pending" },
    { id: 103, text: "Update Sprint Capacity for Friday absence", owner: "AI System", due: "Auto-executed", status: "done" },
];

const MOCK_SUMMARY = "Alex is progressing on the dashboard but facing API latency issues. The AI Manager identified a dependency on the backend team. Alex also informed the AI of upcoming time off, which has been logged.";

// --- Components ---

function HomePage() {
    // Views: 'dashboard', 'call', 'processing', 'review'
    const [view, setView] = useState('dashboard');
    const [sessions, setSessions] = useState(INITIAL_SESSIONS);
    const [todos, setTodos] = useState(MOCK_GENERATED_TODOS);
    const [synced, setSynced] = useState(false);

    // Handle flow completion
    const handleSessionComplete = () => {
        // Mark the live session (Alex) as completed
        setSessions(prev => prev.map(s =>
            s.id === 1 ? { ...s, status: 'completed', time: 'Just now' } : s
        ));
        // Return to dashboard
        setView('dashboard');
    };

    // Reset demo helper
    const resetDemo = () => {
        setView('dashboard');
        setSessions(INITIAL_SESSIONS);
        setTodos(MOCK_GENERATED_TODOS);
        setSynced(false);
    };

    return (


        <main className="max-w-[1600px] mx-auto px-8 py-10">
            <AnimatePresence mode="wait">
                {view === 'dashboard' && (
                    <DashboardView key="dashboard" sessions={sessions} onJoin={() => setView('call')} />
                )}
                {view === 'call' && (
                    <ActiveCallView key="call" onEnd={() => setView('processing')} />
                )}
                {view === 'processing' && (
                    <ProcessingView key="processing" onComplete={() => setView('review')} />
                )}
                {view === 'review' && (
                    <ReviewView
                        key="review"
                        todos={todos}
                        setTodos={setTodos}
                        synced={synced}
                        setSynced={setSynced}
                        onBack={handleSessionComplete}
                    />
                )}
            </AnimatePresence>
        </main>
    );
}

// --- View 1: Dashboard (Admin/Manager View) ---

function DashboardView({ sessions, onJoin }: { sessions: any, onJoin: any }) {
    const [scheduleStatus, setScheduleStatus] = useState('idle');
    const [listTab, setListTab] = useState('pending'); // 'pending' or 'completed'
    const [isChartReady, setIsChartReady] = useState(false);

    useEffect(() => {
        setIsChartReady(true);
    }, []);

    const handleSchedule = () => {
        setScheduleStatus('sending');
        setTimeout(() => {
            setScheduleStatus('sent');
            setTimeout(() => setScheduleStatus('idle'), 3000);
        }, 1500);
    };

    const pendingSessions = sessions.filter((s: any) => s.status === 'live' || s.status === 'upcoming');
    const completedSessions = sessions.filter((s: any) => s.status === 'completed');

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
        >
            <div className="flex justify-between items-end pb-2">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">AI Workforce Overview</h1>
                    <p className="text-gray-500 mt-2 text-lg">Real-time monitoring of automated 1-on-1 check-ins and performance analysis.</p>
                </div>

                <button
                    onClick={handleSchedule}
                    disabled={scheduleStatus !== 'idle'}
                    className={`
            px-6 py-3 rounded-xl flex items-center gap-3 shadow-md transition-all duration-300 font-medium text-sm
            ${scheduleStatus === 'sent'
                            ? 'bg-green-600 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg hover:-translate-y-0.5'}
          `}
                >
                    {scheduleStatus === 'idle' && (
                        <>
                            <MessageCircle size={20} />
                            Schedule New Call
                        </>
                    )}
                    {scheduleStatus === 'sending' && (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            Messaging Telegram...
                        </>
                    )}
                    {scheduleStatus === 'sent' && (
                        <>
                            <CheckCircle size={20} />
                            Invites Sent!
                        </>
                    )}
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4 text-indigo-600">
                            <div className="p-3 bg-indigo-50 rounded-lg">
                                <UserCheck size={28} />
                            </div>
                            <span className="font-semibold text-gray-700 text-lg">Employees Interviewed</span>
                        </div>
                        <span className="text-green-500 text-sm font-bold flex items-center gap-1 bg-green-50 px-2 py-1 rounded-md">
                            <TrendingUp size={16} /> +12%
                        </span>
                    </div>
                    <div className="text-5xl font-bold text-gray-900 tracking-tight">142</div>
                    <p className="text-base text-gray-500 mt-3">Total sessions completed this month</p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4 text-purple-600">
                            <div className="p-3 bg-purple-50 rounded-lg">
                                <ListTodo size={28} />
                            </div>
                            <span className="font-semibold text-gray-700 text-lg">Action Items Set</span>
                        </div>
                    </div>
                    <div className="text-5xl font-bold text-gray-900 tracking-tight">384</div>
                    <div className="w-full bg-gray-100 rounded-full h-3 mt-4">
                        <div className="bg-purple-600 h-3 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                    <p className="text-base text-gray-500 mt-3">65% completed by employees</p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4 text-blue-600">
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <Activity size={28} />
                            </div>
                            <span className="font-semibold text-gray-700 text-lg">Sentiment Score</span>
                        </div>
                    </div>
                    <div className="text-5xl font-bold text-gray-900 tracking-tight">8.4<span className="text-2xl text-gray-400 font-normal">/10</span></div>
                    <p className="text-base text-gray-500 mt-3">Average engagement rating across org</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-bold text-gray-900">7-Day Activity Trend</h2>
                        <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-80 w-full">
                        {isChartReady ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={MOCK_TREND_DATA}>
                                    <defs>
                                        <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 500 }} dy={15} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                        itemStyle={{ color: '#374151', fontSize: '14px', fontWeight: 600 }}
                                    />
                                    <Area type="monotone" dataKey="interviews" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorInterviews)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center rounded-xl bg-gray-50">
                                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Call List Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Call List</h2>
                        <div className="flex bg-gray-100 p-1.5 rounded-xl">
                            <button
                                onClick={() => setListTab('pending')}
                                className={`flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all ${listTab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                To Call ({pendingSessions.length})
                            </button>
                            <button
                                onClick={() => setListTab('completed')}
                                className={`flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all ${listTab === 'completed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Completed ({completedSessions.length})
                            </button>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100 overflow-y-auto flex-1 p-2">
                        {listTab === 'pending' ? (
                            pendingSessions.length > 0 ? (
                                pendingSessions.map((session: any) => (
                                    <div key={session.id} className="p-4 hover:bg-gray-50 transition-colors rounded-xl mx-2 my-1">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold border border-indigo-200">
                                                    {session.avatar}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{session.employee}</h3>
                                                    <p className="text-xs text-gray-500 font-medium">{session.role}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${session.status === 'live' ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-orange-100 text-orange-700'}`}>
                                                {session.status === 'live' ? 'LIVE NOW' : session.time}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-2 pl-14">
                                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{session.type}</span>
                                            {session.status === 'live' ? (
                                                <button
                                                    onClick={onJoin}
                                                    className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm font-semibold"
                                                >
                                                    <Video size={14} /> Monitor Call
                                                </button>
                                            ) : (
                                                <button className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 font-medium">
                                                    <Clock size={14} /> Reschedule
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <CheckCircle size={48} className="mb-4 opacity-20" />
                                    <p className="text-base font-medium">All calls completed!</p>
                                </div>
                            )
                        ) : (
                            completedSessions.length > 0 ? (
                                completedSessions.map((session: any) => (
                                    <div key={session.id} className="p-4 hover:bg-gray-50 transition-colors opacity-80 rounded-xl mx-2 my-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold">
                                                    {session.avatar}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{session.employee}</h3>
                                                    <p className="text-xs text-gray-500 font-medium">Talked: {session.time}</p>
                                                </div>
                                            </div>
                                            <div className="text-green-500 bg-green-50 p-1 rounded-full">
                                                <CheckCircle size={18} />
                                            </div>
                                        </div>
                                        <div className="pl-14">
                                            <span className="text-[11px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                                                {session.type}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <Clock size={48} className="mb-4 opacity-20" />
                                    <p className="text-base font-medium">No calls completed yet.</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// --- View 2: Active Call (WhatsApp Style) ---

function ActiveCallView({ onEnd }: { onEnd: () => void }) {
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [time, setTime] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setTime(t => t + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col items-center justify-center h-[80vh]"
        >
            {/* Mobile Frame Container */}
            <div className="relative w-full max-w-[400px] h-[750px] bg-gray-900 rounded-[3rem] overflow-hidden shadow-2xl border-[10px] border-gray-800 flex flex-col ring-1 ring-white/10">

                {/* WhatsApp Top Bar */}
                <div className="absolute top-0 left-0 right-0 p-6 pt-8 z-20 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
                    <ChevronDown className="text-white cursor-pointer hover:opacity-80" size={32} />
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5 text-gray-300 text-[11px] mb-1.5 bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            <Lock size={10} /> End-to-end encrypted
                        </div>
                        <h2 className="text-white text-2xl font-semibold tracking-wide drop-shadow-md">AI Manager</h2>
                        <span className="text-gray-200 text-base font-medium drop-shadow-md">{formatTime(time)}</span>
                    </div>
                    <UserPlus className="text-white cursor-pointer hover:opacity-80" size={28} />
                </div>

                {/* Main Content: Friendly AI Avatar */}
                <div className="flex-1 bg-[#111b21] relative flex flex-col items-center justify-center">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

                    {/* Friendly AI Avatar (CSS Composition) */}
                    <div className="relative z-10 scale-110">
                        {/* Gentle Pulse */}
                        <div className="absolute inset-0 bg-teal-500/20 rounded-full animate-ping scale-150 duration-[3s]"></div>

                        {/* Avatar Circle */}
                        <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-teal-400 to-emerald-300 flex items-center justify-center shadow-2xl relative overflow-hidden border-4 border-white/10">
                            {/* Eyes */}
                            <div className="absolute top-[35%] left-[28%] w-4 h-5 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                            <div className="absolute top-[35%] right-[28%] w-4 h-5 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            {/* Smile */}
                            <div className="absolute bottom-[30%] w-14 h-7 border-b-[5px] border-gray-900 rounded-full opacity-80"></div>
                            {/* Shine */}
                            <div className="absolute top-6 right-8 w-10 h-5 bg-white/40 rounded-full rotate-[-20deg]"></div>
                        </div>

                        <div className="mt-8 text-center">
                            <span className="bg-gray-800/90 text-white/90 px-5 py-2 rounded-full text-sm backdrop-blur-md shadow-lg border border-white/5">
                                Speaking...
                            </span>
                        </div>
                    </div>

                    {/* PIP: User Camera */}
                    <div className="absolute bottom-28 right-5 w-32 h-44 bg-gray-800 rounded-2xl overflow-hidden border-2 border-gray-700 shadow-2xl z-20">
                        {camOn ? (
                            <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover" alt="Me" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-900">
                                <VideoOff size={24} />
                            </div>
                        )}
                    </div>
                </div>

                {/* WhatsApp Bottom Controls */}
                <div className="bg-[#111b21] px-6 pb-10 pt-6">
                    {/* Swipe Up Indicator */}
                    <div className="w-full flex justify-center mb-6">
                        <div className="w-10 h-1.5 bg-gray-600 rounded-full opacity-50"></div>
                    </div>

                    <div className="flex items-center justify-between px-6 bg-[#1f2c34] rounded-full py-4 shadow-lg border border-white/5">
                        <button className="text-gray-400 hover:text-white transition-colors p-1">
                            <MoreVertical size={26} />
                        </button>

                        <button
                            onClick={() => setCamOn(!camOn)}
                            className={`p-3.5 rounded-full transition-all ${!camOn ? 'bg-white text-black' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                        >
                            {camOn ? <Video size={26} /> : <VideoOff size={26} />}
                        </button>

                        <button
                            onClick={() => setMicOn(!micOn)}
                            className={`p-3.5 rounded-full transition-all ${!micOn ? 'bg-white text-black' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                        >
                            {micOn ? <Mic size={26} /> : <MicOff size={26} />}
                        </button>

                        <button
                            onClick={onEnd}
                            className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform hover:bg-red-600"
                        >
                            <Phone size={28} className="fill-current rotate-[135deg]" />
                        </button>
                    </div>
                </div>

            </div>
        </motion.div>
    );
}

// --- View 3: Processing Pipeline ---

function ProcessingView({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState(0);
    const steps = [
        "Uploading 1:1 session audio...",
        "Transcribing conversation (Whisper)...",
        "Analyzing employee sentiment...",
        "Extracting coaching action items...",
        "Syncing with HR dashboard..."
    ];

    useEffect(() => {
        if (step < steps.length) {
            const timeout = setTimeout(() => {
                setStep(s => s + 1);
            }, 1200);
            return () => clearTimeout(timeout);
        } else {
            setTimeout(onComplete, 800);
        }
    }, [step, onComplete]);

    return (
        <div className="h-[60vh] flex flex-col items-center justify-center">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-lg bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center"
            >
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Loader2 size={40} className="animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Processing Check-in</h2>

                <div className="space-y-5 text-left pl-4">
                    {steps.map((text, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{
                                opacity: step >= idx ? 1 : 0.3,
                                x: step >= idx ? 0 : -10
                            }}
                            className="flex items-center gap-4"
                        >
                            {step > idx ? (
                                <div className="text-green-500 bg-green-50 p-1 rounded-full"><CheckCircle size={20} /></div>
                            ) : step === idx ? (
                                <div className="w-7 h-7 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <div className="w-7 h-7 border-[3px] border-gray-200 rounded-full"></div>
                            )}
                            <span className={`text-base ${step === idx ? 'font-bold text-indigo-900' : 'text-gray-600 font-medium'}`}>
                                {text}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}

// --- View 4: Review & Action Items ---

function ReviewView({ todos, setTodos, synced, setSynced, onBack }: { todos: any, setTodos: (todos: any) => void, synced: boolean, setSynced: (synced: boolean) => void, onBack: () => void }) {
    const toggleTodo = (id: string) => {
        setTodos(todos.map((t: any) =>
            t.id === id ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t
        ));
    };

    const handleSync = () => {
        setSynced(true);
        // Note: We do NOT navigate away here. We just update the state.
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Top Navigation Bar for Review Page */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-semibold transition-colors bg-white border border-gray-300 px-4 py-2 rounded-lg shadow-sm hover:shadow-md"
                    >
                        <ArrowRight className="rotate-180" size={18} />
                        Complete Session & Return
                    </button>
                    <span className="text-gray-400 text-2xl font-light">|</span>
                    <h1 className="text-2xl font-bold text-gray-900">Session Review: Alex Johnson</h1>
                </div>
                <div className="flex gap-3">
                    <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg">
                        <Share size={20} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg">
                        <FileText size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Column: Transcript & Summary */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Summary Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                <FileText size={22} />
                            </div>
                            Coaching Summary
                        </h2>
                        <p className="text-gray-700 leading-relaxed bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 text-lg">
                            {MOCK_SUMMARY}
                        </p>
                    </div>

                    {/* Transcript Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900">Session Transcript</h2>
                            <button className="text-sm text-indigo-600 font-semibold hover:underline bg-white px-3 py-1 rounded border border-indigo-100 shadow-sm">Download Log</button>
                        </div>
                        <div className="p-8 max-h-[500px] overflow-y-auto space-y-6 bg-white">
                            {MOCK_TRANSCRIPT.map((entry, idx) => (
                                <div key={idx} className="flex gap-6 group">
                                    <div className="w-24 flex-shrink-0 text-sm text-gray-400 pt-1 text-right font-mono">
                                        {entry.time}
                                    </div>
                                    <div className="flex-1">
                                        <div className={`text-sm font-bold mb-1 ${entry.speaker === 'AI Manager' ? 'text-indigo-600' : 'text-gray-800'}`}>
                                            {entry.speaker}
                                        </div>
                                        <p className="text-gray-700 text-base leading-relaxed">{entry.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Action Items */}
                <div className="space-y-8">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg ring-1 ring-black/5 overflow-hidden sticky top-28">
                        <div className="p-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <ListTodo size={28} />
                                Action Plan
                            </h2>
                            <p className="text-indigo-100 text-base mt-2 opacity-90">
                                Tasks assigned to Employee & AI System
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50/50">
                            {todos.map((todo: any) => (
                                <div
                                    key={todo.id}
                                    className={`p-4 m-2 rounded-xl border transition-all ${todo.status === 'done' ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <button
                                            onClick={() => toggleTodo(todo.id)}
                                            className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${todo.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-indigo-500'}`}
                                        >
                                            {todo.status === 'done' && <CheckCircle size={16} />}
                                        </button>
                                        <div className="flex-1">
                                            <p className={`text-base font-medium ${todo.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                                {todo.text}
                                            </p>
                                            <div className="flex items-center gap-3 mt-3 text-xs font-medium">
                                                <span className={`px-2.5 py-1 rounded-md border ${todo.owner === 'AI System' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                    {todo.owner}
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-md border ${todo.due.includes('Today') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                    Due: {todo.due}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-white">
                            {!synced ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-500 text-center mb-2">Review tasks above before syncing.</p>
                                    <button
                                        onClick={handleSync}
                                        className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-gray-800 transition-all shadow-lg hover:-translate-y-0.5"
                                    >
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/3b/Apple_Reminders_icon.png" className="w-6 h-6" alt="Apple Reminders" />
                                        Sync to Employee's Reminders
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full bg-green-50 text-green-700 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 border border-green-200">
                                    <CheckCircle size={24} />
                                    Synced Successfully
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default HomePage;
