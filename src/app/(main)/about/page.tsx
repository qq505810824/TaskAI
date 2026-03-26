import { Card } from '@/components/ui/Card'
import { Leaf, Users, Heart, Coffee } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* 头部区域 */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-tea-800 mb-6 tracking-tight">关于茶韵</h1>
        <p className="text-xl text-earth-600 leading-relaxed">
          以茶会友，以韵传情。我们致力于构建一个纯粹的茶文化交流空间，让古老的东方树叶在现代生活中焕发新生。
        </p>
      </div>

      {/* 愿景与使命 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
        <div className="relative h-[400px] rounded-2xl overflow-hidden bg-tea-50 shadow-lg">
           {/* 实际项目中这里应该使用 Next.js Image 组件加载真实图片 */}
           <div className="absolute inset-0 bg-gradient-to-br from-tea-100 to-tea-50 flex items-center justify-center">
             <Leaf className="h-32 w-32 text-tea-200" />
           </div>
        </div>
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-tea-700">我们的初心</h2>
          <p className="text-earth-700 leading-relaxed text-lg">
            "茶韵" 诞生于对中国传统茶文化的热爱与敬畏。在这个快节奏的时代，我们渴望寻找一份内心的宁静。茶，不仅仅是一种饮品，更是一种生活态度，一种连接人与自然、人与人之间情感的媒介。
          </p>
          <p className="text-earth-700 leading-relaxed text-lg">
            我们的使命是将繁复的茶知识通俗化，将深厚的茶文化生活化。无论您是初涉茶道的懵懂新人，还是寻味多年的资深茶客，这里都有属于您的一方天地。
          </p>
        </div>
      </div>

      {/* 核心价值 */}
      <div className="mb-20">
        <h2 className="text-3xl font-bold text-tea-800 text-center mb-12">平台特色</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center p-8 border-tea-100 hover:shadow-lg transition-shadow bg-white">
            <div className="inline-flex p-4 rounded-full bg-tea-50 text-tea-600 mb-6">
              <Coffee className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-tea-700 mb-4">严谨的知识体系</h3>
            <p className="text-earth-600">
              从六大茶类的科学分类，到产地风土的深度解析，我们力求每一条信息都准确详实，为您还原茶叶最真实的面貌。
            </p>
          </Card>

          <Card className="text-center p-8 border-tea-100 hover:shadow-lg transition-shadow bg-white">
            <div className="inline-flex p-4 rounded-full bg-tea-50 text-tea-600 mb-6">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-tea-700 mb-4">包容的交流社区</h3>
            <p className="text-earth-600">
              这里没有门槛，只有对茶的热爱。我们鼓励分享真实的品饮感受，让每一次交流都成为茶艺精进的阶梯。
            </p>
          </Card>

          <Card className="text-center p-8 border-tea-100 hover:shadow-lg transition-shadow bg-white">
            <div className="inline-flex p-4 rounded-full bg-tea-50 text-tea-600 mb-6">
              <Heart className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-tea-700 mb-4">生活美学的倡导</h3>
            <p className="text-earth-600">
              茶事即心事。我们推广的不仅是饮茶之法，更是一种雅致、从容的生活美学，让茶香浸润日常的每一个角落。
            </p>
          </Card>
        </div>
      </div>

      {/* 结语 */}
      <div className="bg-tea-50/50 rounded-3xl p-12 text-center border border-tea-100">
        <h2 className="text-2xl font-bold text-tea-800 mb-6">与我们一同前行</h2>
        <p className="text-earth-600 max-w-2xl mx-auto mb-8 text-lg">
          茶路漫漫，愿做您忠实的陪伴者。让我们一起煮水烹茶，在袅袅茶香中，品味岁月的静好，感悟人生的真谛。
        </p>
      </div>
    </div>
  )
}
