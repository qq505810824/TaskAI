/**
 * 音频下载工具
 * 将 Data URL 格式的音频下载为 MP3 文件
 */

/**
 * 下载音频为 MP3 文件
 * @param audioUrl Data URL 格式的音频 URL（如：data:audio/mpeg;base64,...）
 * @param filename 下载的文件名（可选，默认为 tts-{timestamp}.mp3）
 * @throws 如果音频 URL 无效或下载失败
 */
export function downloadAudio(audioUrl: string, filename?: string): void {
    try {
        // 检查是否为 Data URL
        if (!audioUrl.startsWith('data:')) {
            throw new Error('Invalid audio URL: must be a Data URL');
        }

        // 从 Data URL 提取 Base64 数据和 MIME 类型
        const [header, base64Data] = audioUrl.split(',');
        if (!base64Data) {
            throw new Error('Invalid audio URL: missing base64 data');
        }

        // 提取 MIME 类型（默认 audio/mpeg）
        const mimeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'audio/mpeg';

        // 转换为 Blob
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        // 生成文件名
        const defaultFilename = `tts-${Date.now()}.mp3`;
        const finalFilename = filename || defaultFilename;

        // 确保文件名以 .mp3 结尾
        const downloadFilename = finalFilename.endsWith('.mp3')
            ? finalFilename
            : `${finalFilename}.mp3`;

        // 创建下载链接
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = downloadFilename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 清理 URL（延迟清理，确保下载完成）
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
    } catch (error) {
        throw new Error(
            `Failed to download audio: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}
