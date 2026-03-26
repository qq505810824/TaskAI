import { PageContainer } from '@/components/common/PageContainer'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Mail, MapPin, Phone, Send } from 'lucide-react'

export default function ContactPage() {
    return (
        <PageContainer>
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-tea-800 mb-4">联系我们</h1>
                    <p className="text-earth-600 max-w-2xl mx-auto">
                        如果您有任何关于TalentSyncAI的疑问、合作意向，欢迎随时与我们联系。
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact Info Column */}
                    <div className="space-y-6 lg:col-span-1">
                        <Card className="h-full bg-tea-50 border-tea-100">
                            <h3 className="text-xl font-semibold text-tea-800 mb-6">联系方式</h3>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white rounded-full shadow-sm text-tea-600">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-tea-900">地址</h4>
                                        <p className="text-earth-600 text-sm mt-1">
                                            Hong Kong, China
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white rounded-full shadow-sm text-tea-600">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-tea-900">邮箱</h4>
                                        <p className="text-earth-600 text-sm mt-1">
                                            contact@talentsyncai.com<br />
                                            support@talentsyncai.com
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white rounded-full shadow-sm text-tea-600">
                                        <Phone className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-tea-900">电话</h4>
                                        <p className="text-earth-600 text-sm mt-1">
                                            +852 9123 4567<br />
                                            Mon - Fri 9:00 - 18:00
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Contact Form Column */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white border-tea-100">
                            <h3 className="text-xl font-semibold text-tea-800 mb-6">发送消息</h3>
                            <form className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-medium text-earth-700">姓名</label>
                                        <input
                                            id="name"
                                            type="text"
                                            placeholder="您的姓名"
                                            className="w-full px-4 py-2 rounded-md border border-tea-200 focus:outline-none focus:ring-2 focus:ring-tea-500/20 focus:border-tea-500 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-sm font-medium text-earth-700">邮箱</label>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="your@email.com"
                                            className="w-full px-4 py-2 rounded-md border border-tea-200 focus:outline-none focus:ring-2 focus:ring-tea-500/20 focus:border-tea-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="subject" className="text-sm font-medium text-earth-700">主题</label>
                                    <input
                                        id="subject"
                                        type="text"
                                        placeholder="您想咨询的内容"
                                        className="w-full px-4 py-2 rounded-md border border-tea-200 focus:outline-none focus:ring-2 focus:ring-tea-500/20 focus:border-tea-500 transition-colors"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="message" className="text-sm font-medium text-earth-700">消息内容</label>
                                    <textarea
                                        id="message"
                                        rows={6}
                                        placeholder="请详细描述您的需求..."
                                        className="w-full px-4 py-2 rounded-md border border-tea-200 focus:outline-none focus:ring-2 focus:ring-tea-500/20 focus:border-tea-500 transition-colors resize-none"
                                    ></textarea>
                                </div>

                                <div className="flex justify-end">
                                    <Button className="bg-tea-600 hover:bg-tea-700 text-white gap-2">
                                        <Send className="h-4 w-4" />
                                        发送消息
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            </div>
        </PageContainer>
    )
}
