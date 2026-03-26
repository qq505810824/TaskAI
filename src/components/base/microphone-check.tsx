'use client';

import { useEffect, useState } from 'react';
import { useToastContext } from './toast';

export type MicrophonePermission = 'granted' | 'denied' | 'prompt' | null;

export interface MicrophoneCheckResult {
    hasMicrophone: boolean;
    permission: MicrophonePermission;
    requestPermission: () => Promise<boolean>;
}

export const useMicrophoneCheck = (): MicrophoneCheckResult => {
    const [hasMicrophone, setHasMicrophone] = useState(false);
    const [permission, setPermission] = useState<MicrophonePermission>(null);
    const { notify } = useToastContext();

    // 检查麦克风权限
    const checkMicrophonePermission = async () => {
        try {
            // 检查是否有麦克风设备
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioDevices = devices.filter((device) => device.kind === 'audioinput');

            if (audioDevices.length === 0) {
                setHasMicrophone(false);
                setPermission('denied');
                notify({
                    type: 'error',
                    message: 'No microphone detected. Please connect a microphone and try again.'
                });
                return false;
            }

            setHasMicrophone(true);

            // 检查权限状态（现代浏览器）
            if (navigator.permissions) {
                try {
                    // 注意：在某些浏览器中查询麦克风权限可能会抛出异常
                    const permissionStatus = await navigator.permissions.query({
                        name: 'microphone' as any
                    });
                    setPermission(permissionStatus.state as MicrophonePermission);

                    permissionStatus.onchange = () => {
                        setPermission(permissionStatus.state as MicrophonePermission);
                    };

                    return true;
                } catch (err) {
                    console.log('Unable to query microphone permission status');
                    // 如果无法查询权限，我们假设权限是 prompt 状态
                    setPermission('prompt');
                    return true;
                }
            } else {
                // 如果浏览器不支持权限查询，设置为 prompt 状态
                setPermission('prompt');
                return true;
            }
        } catch (error) {
            console.error('Error checking microphone:', error);
            setHasMicrophone(false);
            setPermission('denied');
            notify({ type: 'error', message: 'Microphone access error.' });
            return false;
        }
    };

    // 请求麦克风权限
    const requestPermission = async (): Promise<boolean> => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // 获取权限后立即关闭流
            stream.getTracks().forEach((track) => track.stop());
            setPermission('granted');
            return true;
        } catch (error: any) {
            // 权限被拒绝
            setPermission('denied');
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                notify({
                    type: 'error',
                    message: 'Microphone access denied. Please allow microphone access.'
                });
            } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
                notify({ type: 'error', message: 'No microphone found.' });
            } else {
                notify({ type: 'error', message: 'Microphone access failed: ' + error.message });
            }
            return false;
        }
    };

    useEffect(() => {
        // 组件挂载时检查麦克风权限
        checkMicrophonePermission();
    }, []);

    return {
        hasMicrophone,
        permission,
        requestPermission
    };
};

export default useMicrophoneCheck;
