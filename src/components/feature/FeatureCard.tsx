import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { ArrowRight, LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  title: string
  description: string
  icon: LucideIcon
  href: string
  linkText: string
}

export function FeatureCard({ title, description, icon: Icon, href, linkText }: FeatureCardProps) {
  return (
    <Card className="group h-full border-tea-100 bg-white hover:border-tea-300 hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col h-full">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-tea-50 text-tea-600 transition-colors group-hover:bg-tea-100 group-hover:text-tea-700">
          <Icon className="h-8 w-8" />
        </div>
        
        <h3 className="mb-3 text-xl font-bold text-tea-800 group-hover:text-tea-600 transition-colors">
          {title}
        </h3>
        
        <p className="mb-6 text-earth-600 leading-relaxed flex-grow">
          {description}
        </p>
        
        <div className="mt-auto">
          <Link 
            href={href} 
            className="inline-flex items-center text-sm font-medium text-tea-600 hover:text-tea-800 transition-colors group/link"
          >
            {linkText} 
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover/link:translate-x-1" />
          </Link>
        </div>
      </div>
    </Card>
  )
}
