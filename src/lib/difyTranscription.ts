const DIFY_SERVER = process.env.NEXT_PUBLIC_DIFY_SERVER || 'https://aienglish-dify.docai.net/v1';
const DIFY_API_KEY = process.env.NEXT_PUBLIC_DIFY_API_KEY || 'app-FsPlEb8aHgrWxVa57HDoa5SB';

/**
 * 上传音频到 Dify，返回 upload_file_id
 */
export const uploadToDify = async (
    audioBlob: Blob,
    userId: string,
    mimeType: string = 'audio/mp3'
): Promise<string> => {
    const extension = mimeType.includes('wav') ? 'wav' : 'mp3';
    const file = new File([audioBlob], `recording.${extension}`, { type: mimeType });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user', userId);

    const response = await fetch(`${DIFY_SERVER}/files/upload`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${DIFY_API_KEY}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload to Dify: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.id as string;
};

/**
 * 调用 Dify workflow 将指定文件转文字
 */
export const transcribeWithDify = async (fileId: string, userId: string): Promise<string> => {
    const response = await fetch(`${DIFY_SERVER}/workflows/run`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${DIFY_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user: userId,
            inputs: {
                audio: {
                    transfer_method: 'local_file',
                    upload_file_id: fileId,
                    type: 'audio',
                },
            },
            response_mode: 'blocking',
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to transcribe with Dify: ${response.statusText}`);
    }

    const data = await response.json();
    return data?.data?.outputs?.text || '';
};

/**
 * 高层封装：直接传入音频 blob，完成上传 + 转文字，返回转写文本
 * 方便后续替换为其他转写服务时只改这一层实现
 */
export const transcribeAudioWithDify = async (
    audioBlob: Blob,
    userId: string,
    mimeType: string = 'audio/mp3'
): Promise<string> => {
    const fileId = await uploadToDify(audioBlob, userId, mimeType);
    return transcribeWithDify(fileId, userId);
};

