import { LegalPageLayout } from '@/components/common/LegalPageLayout'

export default function PrivacyPage() {
    return (
        <LegalPageLayout title="隐私政策" lastUpdated="2026年2月28日">
            <p>
                欢迎访问TalentSyncAI。我们非常重视您的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。
            </p>

            <h3>1. 信息收集</h3>
            <p>
                我们在您使用TalentSyncAI时可能会收集以下类型的信息：
            </p>
            <ul>
                <li><strong>个人身份信息：</strong> 当您通过联系表单与我们联系时，我们可能会收集您的姓名、电子邮件地址等信息。</li>
                <li><strong>浏览数据：</strong> 我们可能会收集有关您如何访问和使用TalentSyncAI的非个人身份信息，例如您的 IP 地址、浏览器类型、访问时间等。</li>
            </ul>

            <h3>2. 信息使用</h3>
            <p>
                我们收集的信息主要用于以下目的：
            </p>
            <ul>
                <li>提供和维护我们的服务；</li>
                <li>回复您的咨询；</li>
                <li>分析网站使用情况，以改进我们的内容和用户体验。</li>
            </ul>

            <h3>3. 信息保护</h3>
            <p>
                我们采取合理的安全措施来保护您的个人信息免受未经授权的访问、修改或披露。然而，请注意，互联网上的数据传输没有任何方式是 100% 安全的。
            </p>

            <h3>4. Cookie 使用</h3>
            <p>
                本网站可能会使用 Cookies 来改善您的浏览体验。Cookies 是存储在您设备上的小型文本文件。您可以根据需要调整浏览器的设置以拒绝 Cookies。
            </p>

            <h3>5. 政策更新</h3>
            <p>
                我们保留随时更新本隐私政策的权利。更新后的政策将在本页面上发布，并注明更新日期。建议您定期查看本页面以了解最新的隐私政策。
            </p>

            <h3>6. 联系我们</h3>
            <p>
                如果您对本隐私政策有任何疑问，请通过 <a href="/contact" className="text-tea-600 hover:underline">联系页面</a> 与我们联系。
            </p>
        </LegalPageLayout>
    )
}
