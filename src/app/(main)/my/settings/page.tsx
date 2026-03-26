'use client'

import { useAuth } from '@/hooks/useAuth'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
    AlertCircle,
    Camera,
    CheckCircle2,
    KeyRound,
    Loader2,
    Lock,
    Mail,
    Save,
    User
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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

    useEffect(() => {
        if (user) {
            setName(user.username || '')
            setEmail(user.email || '')
            fetchUserProfile()
        }
    }, [user])

    const fetchUserProfile = async () => {
        if (!user?.id) return
        const { data, error } = await supabase
            .from('users')
            .select('name, avatar_url')
            .eq('id', user.id)
            .single()

        if (data) {
            setName(data.name || user.username || '')
            setAvatarUrl(data.avatar_url || '')
        }
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
            setProfileError(err instanceof Error ? err.message : '保存失败')
        } finally {
            setIsSavingProfile(false)
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user?.email) return

        if (newPassword !== confirmPassword) {
            setPasswordError('两次输入的新密码不一致')
            return
        }

        if (newPassword.length < 6) {
            setPasswordError('新密码长度至少为 6 位')
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
            setPasswordError(err instanceof Error ? err.message : '修改密码失败')
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
                    <h1 className="text-3xl font-bold text-gray-900">个人设置</h1>
                    <p className="text-gray-500 mt-2">管理您的个人资料和账号安全</p>
                </div>

                <div className="space-y-12">
                    {/* 上部分：基本信息修改 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-indigo-50 rounded-xl">
                                <User className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900">基本信息</h2>
                                <p className="text-sm text-gray-500 mt-0.5">您的显示名称和头像，对其他用户可见</p>
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
                                    <h3 className="text-lg font-medium text-gray-900">更换个人头像</h3>
                                    <p className="text-sm text-gray-500 mt-1 max-w-sm">
                                        点击左侧圆形区域上传新的头像。支持 JPG, PNG 或 GIF。最大 2MB。
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleAvatarClick}
                                        className="mt-4 px-4 py-2 border border-indigo-600 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-colors"
                                    >
                                        上传图片
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        用户名称
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
                                            placeholder="您的显示名称"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        电子邮箱
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
                                            placeholder="您的邮箱"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1.5 ml-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        邮箱账号用于登录，暂不支持修改
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
                                    <span>个人资料已成功更新</span>
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
                                    保存设置
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* 下部分：修改密码 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-amber-50 rounded-xl">
                                <KeyRound className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900">安全设置</h2>
                                <p className="text-sm text-gray-500 mt-0.5">保护您的账号安全，建议定期更换密码</p>
                            </div>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-8">
                            <div className="grid grid-cols-1  gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        当前密码
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
                                            placeholder="输入当前使用的密码"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        新密码
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
                                            placeholder="设置至少 6 位的新密码"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        确认新密码
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
                                            placeholder="再次输入以确认新密码"
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
                                    <span>密码已成功修改</span>
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
                                    修改密码
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
