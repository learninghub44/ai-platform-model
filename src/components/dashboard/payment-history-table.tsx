"use client";

import { useMemo, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { Select } from "@/components/ui/select";

interface Payment {
  id: string;
  kind: string;
  status: string;
  amount_kobo: number;
  currency: string;
  reference: string;
  created_at: string;
}

const STATUS_VARIANT: Record<string, "default" | "amber" | "destructive" | "outline"> = {
  success: "default",
  pending: "amber",
  failed: "destructive",
  refunded: "outline",
};

const PAGE_SIZE = 8;

function formatMoney(kobo: number, currency = "KES") {
  return (kobo / 100).toLocaleString(undefined, { style: "currency", currency });
}

export function PaymentHistoryTable({ payments }: { payments: Payment[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const statuses = useMemo(() => {
    const set = new Set(payments.map((p) => p.status));
    return Array.from(set);
  }, [payments]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return payments;
    return payments.filter((p) => p.status === statusFilter);
  }, [payments, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function handleFilterChange(value: string) {
    setStatusFilter(value);
    setPage(0);
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        label="No payments yet"
        hint="Top up your wallet or subscribe to a plan to see it here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "payment" : "payments"}
        </p>
        <Select
          className="h-8 w-[150px] text-xs"
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </Select>
      </div>

      {pageRows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((p, i) => (
              <TableRow
                key={p.id}
                className="animate-fade-in opacity-0 [animation-fill-mode:forwards]"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <TableCell className="font-mono-data text-xs">{p.reference}</TableCell>
                <TableCell className="capitalize">{p.kind.replace("_", " ")}</TableCell>
                <TableCell className="font-mono-data">{formatMoney(p.amount_kobo, p.currency)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status] ?? "outline"} className="capitalize">
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState icon={Receipt} label="No payments match this filter" hint="Try a different status." />
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Page {currentPage + 1} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
