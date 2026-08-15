export default function ManageEventLoading() {
  return (
    <div className="mx-auto max-w-[800px] animate-pulse space-y-6">
      {/* Back link skeleton */}
      <div className="bg-muted h-4 w-24 rounded-md" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="bg-muted h-6 w-64 rounded-md" />
          <div className="bg-muted h-4 w-48 rounded-md" />
        </div>
        <div className="bg-muted h-8 w-24 rounded-lg" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-border bg-surface space-y-2 rounded-xl border p-4">
            <div className="bg-muted h-3 w-20 rounded" />
            <div className="bg-muted h-6 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Sections */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="border-border bg-surface space-y-3 rounded-2xl border p-5">
          <div className="bg-muted h-4 w-32 rounded" />
          <div className="bg-muted h-10 w-full rounded-xl" />
          <div className="bg-muted h-10 w-3/4 rounded-xl" />
        </div>
      ))}
    </div>
  )
}
