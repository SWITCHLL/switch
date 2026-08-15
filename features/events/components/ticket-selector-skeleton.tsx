import { Skeleton } from '@/components/ui/skeleton'

export function TicketSelectorSkeleton() {
  return (
    <div className="border-border bg-surface space-y-4 rounded-2xl border p-5">
      <Skeleton className="h-5 w-28" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="border-border space-y-2 rounded-xl border p-3.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  )
}
