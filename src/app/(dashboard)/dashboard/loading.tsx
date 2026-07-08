import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <ChartSkeleton />

      <div className="grid gap-5 lg:grid-cols-2">
        <TableSkeleton rows={5} cols={3} />
        <TableSkeleton rows={5} cols={3} />
      </div>
    </div>
  );
}
