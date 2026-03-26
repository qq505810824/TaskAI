import { ReactNode } from 'react'
import { PageContainer } from '@/components/common/PageContainer'
import { Card } from '@/components/ui/Card'

interface LegalPageLayoutProps {
  title: string
  lastUpdated?: string
  children: ReactNode
}

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <PageContainer className="max-w-4xl">
      <Card className="bg-white/80 backdrop-blur-sm border-tea-100 p-8 md:p-12">
        <header className="mb-8 border-b border-tea-100 pb-6">
          <h1 className="text-3xl font-bold text-tea-800 mb-2">{title}</h1>
          {lastUpdated && (
            <p className="text-sm text-earth-500">最后更新：{lastUpdated}</p>
          )}
        </header>
        <div className="prose prose-tea prose-lg max-w-none text-earth-700">
          {children}
        </div>
      </Card>
    </PageContainer>
  )
}
