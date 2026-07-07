"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: "user" | "admin";
  created_at: string;
}

export function UsersTable({ initialUsers, currentUserId }: { initialUsers: AdminUser[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function toggleRole(user: AdminUser) {
    const nextRole = user.role === "admin" ? "user" : "admin";
    setUpdatingId(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: nextRole }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Update failed");
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
      toast.success(`${user.email} is now ${nextRole}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell>
              <p className="font-medium">{u.full_name || "—"}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </TableCell>
            <TableCell>
              <Badge variant={u.role === "admin" ? "amber" : "outline"} className="capitalize">
                {u.role}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(u.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant="outline"
                disabled={u.id === currentUserId || updatingId === u.id}
                onClick={() => toggleRole(u)}
              >
                {u.role === "admin" ? "Demote" : "Promote"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
