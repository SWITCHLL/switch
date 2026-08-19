import { Skeleton } from '@/components/ui/skeleton'

export function EventsGridSkeleton() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
      {/* Featured skeleton */}
      <div className="mb-16">
        <Skeleton className="mb-5 h-3 w-16" />
        <Skeleton className="w-full rounded-2xl" style={{ aspectRatio: '21/9' }} />
      </div>

      {/* Section header skeleton */}
      <div className="mb-8 flex items-baseline gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="w-full rounded-xl" style={{ aspectRatio: '4/5' }} />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  )
}
