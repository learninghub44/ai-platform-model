import { Skeleton, StatCardSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      <StatCardSkeleton />

      <div>
        <Skeleton className="h-5 w-20" />
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>

      <div>
        <Skeleton className="h-5 w-36" />
        <div className="mt-4">
          <TableSkeleton rows={6} cols={5} />
        </div>
      </div>
    </div>
  );
}
