'use client';

import { MeetCard } from '@/components/admin/MeetCard';
import { MeetFilter } from '@/components/admin/MeetFilter';
import { MeetModal } from '@/components/admin/MeetModal';
import { useAdminMeets } from '@/hooks/useAdminMeets';
import type { Meet } from '@/types/meeting';
import { Plus } from 'lucide-react';
import { useState } from 'react';

export default function MeetsPage() {
    const {
        meets,
        filter,
        loading,
        error,
        deletingMeetId,
        handleCreateMeet,
        handleUpdateMeet,
        handleDeleteMeet,
        updateFilter,
        clearFilter,
    } = useAdminMeets();

    const [showModal, setShowModal] = useState(false);
    const [editingMeet, setEditingMeet] = useState<Meet | null>(null);

    // 处理创建会议
    const handleCreate = async (data: {
        title: string;
        description: string;
        startTime: string;
        duration: number;
    }) => {
        try {
            await handleCreateMeet(data);
            setShowModal(false);
        } catch (err) {
            console.error('Failed to create meet:', err);
        }
    };

    // 处理编辑会议
    const handleEdit = async (data: {
        title: string;
        description: string;
        startTime: string;
        duration: number;
    }) => {
        if (!editingMeet) return;

        try {
            await handleUpdateMeet(editingMeet.id, data);
            setShowModal(false);
            setEditingMeet(null);
        } catch (err) {
            console.error('Failed to update meet:', err);
        }
    };

    // 处理删除会议
    const handleDelete = async (meetId: string) => {
        if (!confirm('确定要删除这个会议吗？删除后将无法恢复，所有关联的对话记录、任务和总结也将被删除。')) {
            return;
        }

        try {
            await handleDeleteMeet(meetId);
        } catch (err) {
            console.error('Failed to delete meet:', err);
            alert('删除失败，请重试');
        }
    };

    // 处理复制（保留回调，但实际复制逻辑在 MeetCard 内部处理）
    const handleCopy = async (text: string, type: 'code' | 'url') => {
        // 复制逻辑已在 MeetCard 组件内部处理，这里可以保留用于日志或其他用途
    };

    // 打开创建 Modal
    const openCreateModal = () => {
        setEditingMeet(null);
        setShowModal(true);
    };

    // 打开编辑 Modal
    const openEditModal = (meet: Meet) => {
        setEditingMeet(meet);
        setShowModal(true);
    };

    // 关闭 Modal
    const closeModal = () => {
        setShowModal(false);
        setEditingMeet(null);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* 头部 */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">会议管理</h1>
                    <p className="mt-2 text-gray-600">创建和管理会议</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    创建会议
                </button>
            </div>

            {/* 错误提示 */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* 筛选组件 */}
            <MeetFilter filter={filter} onFilterChange={updateFilter} onClear={clearFilter} />

            {/* 会议列表 - Grid 布局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {meets.map((meet) => (
                    <MeetCard
                        key={meet.id}
                        meet={meet}
                        onEdit={openEditModal}
                        onDelete={handleDelete}
                        onCopy={handleCopy}
                        isDeleting={deletingMeetId === meet.id}
                    />
                ))}
            </div>

            {/* 空状态 */}
            {meets.length === 0 && !loading && (
                <div className="text-center py-12">
                    <p className="text-gray-500">
                        {filter.title || filter.status ? '没有找到匹配的会议' : '还没有会议，创建第一个会议吧！'}
                    </p>
                </div>
            )}

            {/* 创建/编辑 Modal */}
            <MeetModal
                isOpen={showModal}
                meet={editingMeet}
                loading={loading}
                onClose={closeModal}
                onSubmit={editingMeet ? handleEdit : handleCreate}
            />
        </div>
    );
}
