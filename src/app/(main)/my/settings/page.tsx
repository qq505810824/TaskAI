'use client'

import { useAuth } from '@/hooks/useAuth'
import { formatTaskaiDateTime, formatTaskaiTime } from '@/lib/taskai/date-format'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
    AlertCircle,
    BellRing,
    Camera,
    CheckCircle2,
    ChevronDown,
    CircleHelp,
    KeyRound,
    Loader2,
    Lock,
    Mail,
    MessageCircle,
    SendHorizontal,
    Save,
    Smartphone,
    User
} from 'lucide-react'
import type { Dispatch, MouseEvent as ReactMouseEvent, SetStateAction } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TaskaiNotificationJob } from '@/types/taskai'

type CountryCodeOption = {
    value: string
    label: string
}

type NotificationToggleOption = {
    label: string
    checked: boolean
    setter: Dispatch<SetStateAction<boolean>>
    help: string
}

type NotificationHelpPopoverState = {
    label: string
    help: string
}

type WhatsappConnectionStatus = 'pending' | 'active' | 'paused' | 'revoked' | 'not_connected'

type WhatsappVerificationSummary = {
    id: string
    phone_number: string
    normalized_phone_number: string
    status: 'pending' | 'verified' | 'expired' | 'cancelled'
    requested_at: string
    expires_at: string
    verified_at: string | null
    attempt_count: number
}

const COUNTRY_CODE_OPTIONS: CountryCodeOption[] = [
    { value: '+853', label: 'Macau (+853)' },
    { value: '+852', label: 'Hong Kong (+852)' },
    { value: '+86', label: 'China (+86)' },
    { value: '+886', label: 'Taiwan (+886)' },
    { value: '+65', label: 'Singapore (+65)' },
    { value: '+60', label: 'Malaysia (+60)' },
    { value: '+1', label: 'United States / Canada (+1)' },
]

function splitWhatsappPhone(phone: string | null | undefined): { countryCode: string; localNumber: string } {
    const raw = (phone ?? '').trim()
    const digits = raw.replace(/[^\d]/g, '')
    if (!digits) {
        return { countryCode: '+853', localNumber: '' }
    }

    const matched = [...COUNTRY_CODE_OPTIONS]
        .sort((a, b) => b.value.length - a.value.length)
        .find((option) => digits.startsWith(option.value.replace(/[^\d]/g, '')))

    if (!matched) {
        return { countryCode: '+853', localNumber: digits }
    }

    return {
        countryCode: matched.value,
        localNumber: digits.slice(matched.value.replace(/[^\d]/g, '').length),
    }
}

function formatWhatsappStatusLabel(status: WhatsappConnectionStatus) {
    switch (status) {
        case 'pending':
            return 'Pending verification'
        case 'active':
            return 'Connected'
        case 'paused':
            return 'Paused'
        case 'revoked':
            return 'Revoked'
        case 'not_connected':
        default:
            return 'Not connected'
    }
}

export default function SettingsPage() {
    const { user, updateUser } = useAuth()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [profileSuccess, setProfileSuccess] = useState(false)
    const [profileError, setProfileError] = useState('')

    // 密码修改相关状态
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [passwordSuccess, setPasswordSuccess] = useState(false)
    const [passwordError, setPasswordError] = useState('')

    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [whatsappCountryCode, setWhatsappCountryCode] = useState('+853')
    const [whatsappLocalNumber, setWhatsappLocalNumber] = useState('')
    const [whatsappStatus, setWhatsappStatus] = useState<WhatsappConnectionStatus>('not_connected')
    const [notificationsEnabled, setNotificationsEnabled] = useState(true)
    const [quietHoursStart, setQuietHoursStart] = useState('')
    const [quietHoursEnd, setQuietHoursEnd] = useState('')
    const [allowNewTask, setAllowNewTask] = useState(true)
    const [allowTaskClaimed, setAllowTaskClaimed] = useState(true)
    const [allowClaimReminder, setAllowClaimReminder] = useState(true)
    const [allowStalledTask, setAllowStalledTask] = useState(true)
    const [allowCompletionMessage, setAllowCompletionMessage] = useState(true)
    const [allowRankMilestone, setAllowRankMilestone] = useState(true)
    const [recentNotificationJobs, setRecentNotificationJobs] = useState<TaskaiNotificationJob[]>([])
    const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false)
    const [isSendingTestMessage, setIsSendingTestMessage] = useState(false)
    const [isDisconnectingWhatsapp, setIsDisconnectingWhatsapp] = useState(false)
    const [isLoadingWhatsappSettings, setIsLoadingWhatsappSettings] = useState(true)
    const [isRefreshingWhatsappStatus, setIsRefreshingWhatsappStatus] = useState(false)
    const [lastWhatsappStatusCheckedAt, setLastWhatsappStatusCheckedAt] = useState<string | null>(null)
    const [whatsappSuccessMessage, setWhatsappSuccessMessage] = useState('')
    const [whatsappError, setWhatsappError] = useState('')
    const [activeNotificationHelp, setActiveNotificationHelp] = useState<NotificationHelpPopoverState | null>(null)
    const [whatsappVerification, setWhatsappVerification] = useState<WhatsappVerificationSummary | null>(null)
    const whatsappSettingsFetchInFlightRef = useRef(false)
    const whatsappSuccessTimeoutRef = useRef<number | null>(null)
    const hadPendingWhatsappVerificationRef = useRef(false)
    const [isRecentLogExpanded, setIsRecentLogExpanded] = useState(false)

    const canSendTestMessage = whatsappStatus === 'active'
    const needsVerification = whatsappStatus !== 'active'
    const hasPendingWhatsappVerification = whatsappStatus === 'pending' || whatsappVerification?.status === 'pending'
    const submitButtonLabel =
        whatsappVerification?.status === 'pending' ? 'Resend verification code' : needsVerification ? 'Send verification code' : 'Save WhatsApp settings'

    const notificationToggleOptions: NotificationToggleOption[] = [
        {
            label: 'New task available',
            checked: allowNewTask,
            setter: setAllowNewTask,
            help: 'Sent when an admin creates a new task that is visible to you and ready to pick up.',
        },
        {
            label: 'Task claimed confirmation',
            checked: allowTaskClaimed,
            setter: setAllowTaskClaimed,
            help: 'Sent immediately after you pick up a task, so you know the claim was successful and can jump into the AI workspace.',
        },
        {
            label: 'Claimed but AI chat not started',
            checked: allowClaimReminder,
            setter: setAllowClaimReminder,
            help: 'Sent after you claim a task but do not start the AI chat within the reminder window.',
        },
        {
            label: 'Claimed for too long without completion',
            checked: allowStalledTask,
            setter: setAllowStalledTask,
            help: 'Sent when a claimed task stays in progress for too long without being completed.',
        },
        {
            label: 'Task completion encouragement',
            checked: allowCompletionMessage,
            setter: setAllowCompletionMessage,
            help: 'Sent right after you complete a task to celebrate the result and share the outcome link when available.',
        },
        {
            label: 'Rank up / points milestone',
            checked: allowRankMilestone,
            setter: setAllowRankMilestone,
            help: 'Sent when your leaderboard rank improves or when you reach an important points milestone.',
        },
    ]

    useEffect(() => {
        return () => {
            if (whatsappSuccessTimeoutRef.current) {
                window.clearTimeout(whatsappSuccessTimeoutRef.current)
            }
        }
    }, [])

    const showWhatsappSuccess = (message: string, durationMs = 3000) => {
        setWhatsappSuccessMessage(message)

        if (whatsappSuccessTimeoutRef.current) {
            window.clearTimeout(whatsappSuccessTimeoutRef.current)
        }

        whatsappSuccessTimeoutRef.current = window.setTimeout(() => {
            setWhatsappSuccessMessage('')
            whatsappSuccessTimeoutRef.current = null
        }, durationMs)
    }

    const fetchUserProfile = useCallback(async () => {
        if (!user?.id) return
        const { data } = await supabase
            .from('users')
            .select('name, avatar_url')
            .eq('id', user.id)
            .single()

        if (data) {
            setName(data.name || user.username || '')
            setAvatarUrl(data.avatar_url || '')
        }
    }, [user?.id, user?.username])

    const fetchWhatsAppSettings = useCallback(async (options?: { showLoading?: boolean; showRefreshingState?: boolean }) => {
        if (!user?.token) {
            setIsLoadingWhatsappSettings(false)
            return
        }

        if (whatsappSettingsFetchInFlightRef.current) {
            return
        }

        whatsappSettingsFetchInFlightRef.current = true
        const showLoading = options?.showLoading ?? true
        const showRefreshingState = options?.showRefreshingState ?? (!showLoading && hasPendingWhatsappVerification)
        if (showLoading) {
            setIsLoadingWhatsappSettings(true)
        }
        if (showRefreshingState) {
            setIsRefreshingWhatsappStatus(true)
        }
        setWhatsappError('')
        try {
            const response = await fetch('/api/taskai/my/whatsapp', {
                cache: 'no-store',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            })
            const result = await response.json()
            if (!result.success) throw new Error(result.message || 'Failed to load WhatsApp settings')

            const connection = result.data.connection
            const verification = (result.data.verification ?? null) as WhatsappVerificationSummary | null
            const preferences = result.data.preferences

            const parsedPhone = splitWhatsappPhone(connection?.phone_number || '')
            setWhatsappCountryCode(parsedPhone.countryCode)
            setWhatsappLocalNumber(parsedPhone.localNumber)
            setWhatsappStatus(connection?.status || 'not_connected')
            setWhatsappVerification(verification)
            setNotificationsEnabled(Boolean(preferences?.enabled ?? true))
            setQuietHoursStart(preferences?.quiet_hours_start ? String(preferences.quiet_hours_start).slice(0, 5) : '')
            setQuietHoursEnd(preferences?.quiet_hours_end ? String(preferences.quiet_hours_end).slice(0, 5) : '')
            setAllowNewTask(Boolean(preferences?.allow_new_task ?? true))
            setAllowTaskClaimed(Boolean(preferences?.allow_task_claimed ?? true))
            setAllowClaimReminder(Boolean(preferences?.allow_claim_reminder ?? true))
            setAllowStalledTask(Boolean(preferences?.allow_stalled_task ?? true))
            setAllowCompletionMessage(Boolean(preferences?.allow_completion_message ?? true))
            setAllowRankMilestone(Boolean(preferences?.allow_rank_milestone ?? true))
            setRecentNotificationJobs((result.data.recentJobs ?? []) as TaskaiNotificationJob[])
            setLastWhatsappStatusCheckedAt(new Date().toISOString())
        } catch (err) {
            setWhatsappError(err instanceof Error ? err.message : 'Failed to load WhatsApp settings')
        } finally {
            whatsappSettingsFetchInFlightRef.current = false
            if (showLoading) {
                setIsLoadingWhatsappSettings(false)
            }
            if (showRefreshingState) {
                setIsRefreshingWhatsappStatus(false)
            }
        }
    }, [hasPendingWhatsappVerification, user?.token])

    useEffect(() => {
        if (!user?.token) return
        if (!hasPendingWhatsappVerification) return

        void fetchWhatsAppSettings({ showLoading: false, showRefreshingState: true })

        const interval = window.setInterval(() => {
            void fetchWhatsAppSettings({ showLoading: false, showRefreshingState: true })
        }, 1000)

        return () => window.clearInterval(interval)
    }, [user?.token, hasPendingWhatsappVerification, fetchWhatsAppSettings])

    useEffect(() => {
        if (user) {
            setName(user.username || '')
            setEmail(user.email || '')
            void fetchUserProfile()
            void fetchWhatsAppSettings()
        }
    }, [user, fetchUserProfile, fetchWhatsAppSettings])

    useEffect(() => {
        if (hadPendingWhatsappVerificationRef.current && whatsappStatus === 'active') {
            setWhatsappError('')

            const successMessage = 'WhatsApp verification completed. This number is now ready to receive TaskAI notifications.'
            setWhatsappSuccessMessage(successMessage)

            if (whatsappSuccessTimeoutRef.current) {
                window.clearTimeout(whatsappSuccessTimeoutRef.current)
            }

            whatsappSuccessTimeoutRef.current = window.setTimeout(() => {
                setWhatsappSuccessMessage('')
                whatsappSuccessTimeoutRef.current = null
            }, 5000)
        }

        hadPendingWhatsappVerificationRef.current = hasPendingWhatsappVerification
    }, [hasPendingWhatsappVerification, whatsappStatus])

    const handleSaveWhatsAppSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user?.token) return

        setIsSavingWhatsapp(true)
        setWhatsappError('')
        setWhatsappSuccessMessage('')

        try {
            const response = await fetch('/api/taskai/my/whatsapp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    phoneNumber: whatsappLocalNumber.trim() ? `${whatsappCountryCode}${whatsappLocalNumber.trim()}` : '',
                    enabled: notificationsEnabled,
                    quietHoursStart: quietHoursStart || null,
                    quietHoursEnd: quietHoursEnd || null,
                    allowNewTask,
                    allowTaskClaimed,
                    allowClaimReminder,
                    allowStalledTask,
                    allowCompletionMessage,
                    allowRankMilestone,
                })
            })

            const result = await response.json()
            if (!result.success) throw new Error(result.message || 'Failed to save WhatsApp settings')

            setWhatsappStatus(result.data.connection?.status || 'pending')
            setWhatsappVerification((result.data.verification ?? null) as WhatsappVerificationSummary | null)
            showWhatsappSuccess(
                result.data.connection?.status === 'active'
                    ? 'WhatsApp settings have been updated successfully.'
                    : 'Verification code sent. Please reply from the same WhatsApp chat to finish linking this number.'
            )
            await fetchWhatsAppSettings()
        } catch (err) {
            setWhatsappError(err instanceof Error ? err.message : 'Failed to save WhatsApp settings')
        } finally {
            setIsSavingWhatsapp(false)
        }
    }

    const handleSendTestMessage = async () => {
        if (!user?.token) return

        setIsSendingTestMessage(true)
        setWhatsappError('')
        setWhatsappSuccessMessage('')
        try {
            const response = await fetch('/api/taskai/my/whatsapp/test', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            })
            const result = await response.json()
            if (!result.success) throw new Error(result.message || 'Failed to enqueue test message')
            showWhatsappSuccess('Test message queued. Please check your WhatsApp.')
            await fetchWhatsAppSettings()
        } catch (err) {
            setWhatsappError(err instanceof Error ? err.message : 'Failed to enqueue test message')
        } finally {
            setIsSendingTestMessage(false)
        }
    }

    const handleDisconnectWhatsApp = async () => {
        if (!user?.token) return

        setIsDisconnectingWhatsapp(true)
        setWhatsappError('')
        setWhatsappSuccessMessage('')

        try {
            const response = await fetch('/api/taskai/my/whatsapp', {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            })

            const result = await response.json()
            if (!result.success) throw new Error(result.message || 'Failed to disconnect WhatsApp')

            setWhatsappCountryCode('+853')
            setWhatsappLocalNumber('')
            setWhatsappStatus('not_connected')
            setWhatsappVerification(null)
            showWhatsappSuccess('WhatsApp number disconnected successfully.')
            await fetchWhatsAppSettings()
        } catch (err) {
            setWhatsappError(err instanceof Error ? err.message : 'Failed to disconnect WhatsApp')
        } finally {
            setIsDisconnectingWhatsapp(false)
        }
    }

    const toggleNotificationHelp = (e: ReactMouseEvent<HTMLButtonElement>, label: string, help: string) => {
        e.preventDefault()
        setActiveNotificationHelp((current) =>
            current?.label === label
                ? null
                : {
                      label,
                      help,
                  }
        )
    }

    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user?.id) return

        setIsUploading(true)
        setProfileError('')

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            // 上传到 users-avatar bucket (此处仍然使用客户端上传以提高效率，但也可以选择通过后端中转)
            const { error: uploadError } = await supabaseAdmin.storage
                .from('users-avatar')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 获取公共 URL
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('users-avatar')
                .getPublicUrl(filePath)

            // 调用 API 接口更新数据库
            const response = await fetch('/api/my/profile/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ avatar_url: publicUrl })
            })

            const result = await response.json()
            if (!result.success) throw new Error(result.error)

            setAvatarUrl(publicUrl)
            updateUser({ avatar: publicUrl })
            setProfileSuccess(true)
            setTimeout(() => setProfileSuccess(false), 3000)
        } catch (err) {
            setProfileError(err instanceof Error ? err.message : '头像上传失败')
        } finally {
            setIsUploading(false)
        }
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user?.id) return

        setIsSavingProfile(true)
        setProfileError('')
        setProfileSuccess(false)

        try {
            // 调用 API 接口更新数据库
            const response = await fetch('/api/my/profile/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ name: name })
            })

            const result = await response.json()
            if (!result.success) throw new Error(result.error)

            updateUser({ username: name })
            setProfileSuccess(true)
            setTimeout(() => setProfileSuccess(false), 3000)
        } catch (err) {
            setProfileError(err instanceof Error ? err.message : 'Save failed')
        } finally {
            setIsSavingProfile(false)
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user?.email) return

        if (newPassword !== confirmPassword) {
            setPasswordError('The new passwords entered twice do not match')
            return
        }

        if (newPassword.length < 6) {
            setPasswordError('The new password length must be at least 6 characters')
            return
        }

        setIsChangingPassword(true)
        setPasswordError('')
        setPasswordSuccess(false)

        try {
            // 调用 API 接口更新密码
            const response = await fetch('/api/my/profile/password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password: newPassword
                })
            })

            const result = await response.json()
            if (!result.success) throw new Error(result.error)

            setPasswordSuccess(true)
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setTimeout(() => setPasswordSuccess(false), 3000)
        } catch (err) {
            setPasswordError(err instanceof Error ? err.message : 'Password modification failed')
        } finally {
            setIsChangingPassword(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12"
            >
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Personal settings</h1>
                    <p className="text-gray-500 mt-2">Manage your personal information and account security</p>
                </div>

                <div className="space-y-12">
                    {/* 上部分：基本信息修改 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-indigo-50 rounded-xl">
                                <User className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900">Basic information</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Your display name and avatar, visible to other users</p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-8">
                            {/* 头像上传 */}
                            <div className="flex flex-col sm:flex-row items-center gap-8 pb-4 border-b border-gray-50">
                                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white bg-gray-50 flex items-center justify-center text-gray-400 group-hover:border-indigo-100 transition-all shadow-md">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-16 h-16" />
                                        )}
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isUploading ? (
                                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                                        ) : (
                                            <Camera className="w-8 h-8 text-white" />
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                                <div className="flex-1 text-center sm:text-left">
                                    <h3 className="text-lg font-medium text-gray-900">Change personal avatar</h3>
                                    <p className="text-sm text-gray-500 mt-1 max-w-sm">
                                        Click the left circular area to upload a new avatar. Supports JPG, PNG or GIF. Maximum 2MB.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleAvatarClick}
                                        className="mt-4 px-4 py-2 border border-indigo-600 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-colors"
                                    >
                                        Upload image
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        User name
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all shadow-sm"
                                            placeholder="Your display name"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            disabled
                                            className="block w-full pl-10 pr-4 py-3 border border-gray-100 bg-gray-50 text-gray-400 rounded-xl text-sm cursor-not-allowed"
                                            placeholder="Your email"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1.5 ml-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Email account is used for login, not supported for modification
                                    </p>
                                </div>
                            </div>

                            {profileError && (
                                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <span>{profileError}</span>
                                </div>
                            )}

                            {profileSuccess && (
                                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-600 text-sm">
                                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                    <span>Personal information has been successfully updated</span>
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={isSavingProfile}
                                    className="flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100 hover:shadow-xl active:scale-95 text-base min-w-[160px]"
                                >
                                    {isSavingProfile ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Save className="w-5 h-5" />
                                    )}
                                    Save settings
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-emerald-50 rounded-xl">
                                <Smartphone className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900">WhatsApp notifications</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Bind your WhatsApp number, manage reminder preferences, and review recent delivery records
                                </p>
                            </div>
                        </div>

                        {isLoadingWhatsappSettings ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                                <div className="mx-auto flex w-fit items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Loading WhatsApp settings...</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <form onSubmit={handleSaveWhatsAppSettings} className="space-y-8">
                                    <div className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">Connection status</p>
                                                <p className="mt-1 inline-flex items-center gap-2 text-sm text-gray-500">
                                                    Current status:
                                                    <span className="inline-flex whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                                                        {formatWhatsappStatusLabel(whatsappStatus)}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                {canSendTestMessage ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleSendTestMessage}
                                                        disabled={isSendingTestMessage}
                                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                                                    >
                                                        {isSendingTestMessage ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <SendHorizontal className="w-4 h-4" />
                                                        )}
                                                        Send test message
                                                    </button>
                                                ) : (
                                                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-800">
                                                        Verify this number first. Test messages are available only after verification.
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={handleDisconnectWhatsApp}
                                                    disabled={isDisconnectingWhatsapp || whatsappStatus === 'not_connected'}
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    {isDisconnectingWhatsapp ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : null}
                                                    Disconnect number
                                                </button>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                                            <p className="font-semibold text-slate-900">How verification works</p>
                                            <p className="mt-2 leading-6">
                                                1. Enter your country code and WhatsApp number, then click <span className="font-semibold">{submitButtonLabel}</span>.
                                            </p>
                                            <p className="leading-6">
                                                2. We send a 6-digit code to your WhatsApp.
                                            </p>
                                            <p className="leading-6">
                                                3. Reply in the same WhatsApp chat with that code to complete verification.
                                            </p>
                                            <p className="leading-6">
                                                4. This page checks automatically and updates as soon as the verification is confirmed.
                                            </p>
                                        </div>

                                        {whatsappVerification?.status === 'pending' ? (
                                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                                                <p className="font-semibold">Pending verification</p>
                                                <p className="mt-1 leading-6">
                                                    We sent a 6-digit verification code to your WhatsApp. Please reply from the same WhatsApp
                                                    chat with one of these formats:
                                                </p>
                                                <div className="mt-3 whitespace-pre-wrap rounded-xl bg-white px-4 py-3 font-mono text-xs text-slate-700 border border-amber-100">
                                                    TASKAI 123456{'\n'}VERIFY 123456{'\n'}123456
                                                </div>
                                                <div className="mt-3 flex flex-col gap-3 rounded-xl border border-amber-100 bg-white/80 px-4 py-3 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex items-center gap-2">
                                                        {isRefreshingWhatsappStatus ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        )}
                                                        <span>
                                                            {isRefreshingWhatsappStatus
                                                                ? 'Checking for your WhatsApp reply...'
                                                                : 'Auto-check is on.'}
                                                            {lastWhatsappStatusCheckedAt
                                                                ? ` Last checked ${formatTaskaiTime(lastWhatsappStatusCheckedAt, '', { includeSeconds: true })}.`
                                                                : ''}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            void fetchWhatsAppSettings({
                                                                showLoading: false,
                                                                showRefreshingState: true,
                                                            })
                                                        }
                                                        disabled={isRefreshingWhatsappStatus}
                                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
                                                    >
                                                        {isRefreshingWhatsappStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                                        Check now
                                                    </button>
                                                </div>
                                                <p className="mt-3 text-xs text-amber-800">
                                                    Requested at {formatTaskaiDateTime(whatsappVerification.requested_at)} ·
                                                    expires at {formatTaskaiDateTime(whatsappVerification.expires_at)}
                                                </p>
                                            </div>
                                        ) : null}

                                        {whatsappStatus === 'active' ? (
                                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                                                This WhatsApp number is verified and ready to receive TaskAI notifications.
                                            </div>
                                        ) : null}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                WhatsApp number
                                            </label>
                                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                                                <select
                                                    value={whatsappCountryCode}
                                                    onChange={(e) => setWhatsappCountryCode(e.target.value)}
                                                    className="rounded-xl border border-gray-300 px-3 py-3 text-sm text-gray-700 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                                                >
                                                    {COUNTRY_CODE_OPTIONS.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <MessageCircle className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={whatsappLocalNumber}
                                                        onChange={(e) => setWhatsappLocalNumber(e.target.value.replace(/[^\d]/g, ''))}
                                                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-all shadow-sm"
                                                        placeholder="e.g. 62841735"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4">
                                            <input
                                                type="checkbox"
                                                checked={notificationsEnabled}
                                                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                                                className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">Enable WhatsApp notifications</p>
                                                <p className="text-sm text-gray-500">Master switch for all outbound WhatsApp reminders.</p>
                                            </div>
                                        </label>

                                        <div className="rounded-2xl border border-gray-200 p-4">
                                            <p className="text-sm font-semibold text-gray-900">Quiet hours</p>
                                            <p className="mb-3 text-sm text-gray-500">Reserve time ranges for later dispatch controls.</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="time"
                                                    value={quietHoursStart}
                                                    onChange={(e) => setQuietHoursStart(e.target.value)}
                                                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                                                />
                                                <input
                                                    type="time"
                                                    value={quietHoursEnd}
                                                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                                                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <BellRing className="w-4 h-4 text-emerald-600" />
                                            <h3 className="text-lg font-semibold text-gray-900">Notification types</h3>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            {notificationToggleOptions.map(({ label, checked, setter, help }) => (
                                                <label key={label} className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(e) => setter(e.target.checked)}
                                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="relative flex items-center gap-2">
                                                            <p className="text-sm font-semibold text-gray-900">{label}</p>
                                                            <button
                                                                type="button"
                                                                aria-label={`Explain ${label}`}
                                                                onClick={(e) => toggleNotificationHelp(e, label, help)}
                                                                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                                                            >
                                                                <CircleHelp className="h-4 w-4" />
                                                            </button>
                                                            {activeNotificationHelp?.label === label ? (
                                                                <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-2xl border border-emerald-100 bg-white p-3 text-xs leading-5 text-gray-600 shadow-xl">
                                                                    <div className="absolute -top-2 left-8 h-3 w-3 rotate-45 border-l border-t border-emerald-100 bg-white" />
                                                                    <p className="font-semibold text-gray-900">{label}</p>
                                                                    <p className="mt-1">{activeNotificationHelp.help}</p>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {whatsappError && (
                                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
                                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                            <span>{whatsappError}</span>
                                        </div>
                                    )}

                                    {whatsappSuccessMessage && (
                                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-600 text-sm">
                                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                            <span>{whatsappSuccessMessage}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSavingWhatsapp}
                                            className="flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-100 hover:shadow-xl active:scale-95 text-base min-w-[180px]"
                                        >
                                            {isSavingWhatsapp ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Save className="w-5 h-5" />
                                            )}
                                            {submitButtonLabel}
                                        </button>
                                    </div>
                                </form>

                                <div className="mt-10 border-t border-gray-100 pt-8">
                                    <button
                                        type="button"
                                        onClick={() => setIsRecentLogExpanded((current) => !current)}
                                        className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-4 text-left transition hover:bg-gray-50"
                                    >
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Recent notification log</h3>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Shows the latest WhatsApp jobs created for your account.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                                                {recentNotificationJobs.length}
                                            </span>
                                            <ChevronDown
                                                className={`h-5 w-5 text-gray-400 transition-transform ${isRecentLogExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </div>
                                    </button>

                                    {isRecentLogExpanded ? (
                                        <div className="mt-5 space-y-3">
                                            {recentNotificationJobs.length ? recentNotificationJobs.map((job) => (
                                                <div key={job.id} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">{job.event_type}</p>
                                                            <p className="text-xs text-gray-500">
                                                                Created {formatTaskaiDateTime(job.created_at)} · status: {job.status}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                Scheduled for {formatTaskaiDateTime(job.scheduled_for)}
                                                            </p>
                                                        </div>
                                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-200">
                                                            {job.status}
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 whitespace-pre-wrap rounded-xl bg-white px-4 py-3 text-sm text-gray-700 border border-gray-100">
                                                        {job.rendered_message || 'No rendered message'}
                                                    </div>
                                                    {job.error_message ? (
                                                        <p className="mt-2 text-sm text-red-600">{job.error_message}</p>
                                                    ) : null}
                                                </div>
                                            )) : (
                                                <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                                                    No WhatsApp notification records yet.
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </>
                        )}
                    </div>

                    {/* 下部分：修改密码 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-amber-50 rounded-xl">
                                <KeyRound className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900">Security settings</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Protect your account security, it is recommended to change your password regularly</p>
                            </div>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-8">
                            <div className="grid grid-cols-1  gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Current password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            value={oldPassword}
                                            onChange={(e) => setOldPassword(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all shadow-sm"
                                            placeholder="Enter the current password"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        New password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all shadow-sm"
                                            placeholder="Set a new password of at least 6 characters"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm new password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all shadow-sm"
                                            placeholder="Enter the new password again to confirm"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {passwordError && (
                                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <span>{passwordError}</span>
                                </div>
                            )}

                            {passwordSuccess && (
                                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-600 text-sm">
                                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                    <span>Password has been successfully modified</span>
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={isChangingPassword}
                                    className="flex items-center justify-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 shadow-lg active:scale-95 text-base min-w-[160px]"
                                >
                                    {isChangingPassword ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <KeyRound className="w-5 h-5" />
                                    )}
                                    Change password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
