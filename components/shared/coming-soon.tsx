import Link from 'next/link'
import { Construction } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ComingSoonProps {
  title: string
  description?: string
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="bg-brand-600/10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
        <Construction className="text-brand-400 h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && <p className="text-muted-foreground mt-3 max-w-sm">{description}</p>}
      <p className="text-muted-foreground mt-2 text-sm">This page is under construction.</p>
      <Button asChild className="mt-8">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  )
}
