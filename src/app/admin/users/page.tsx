import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { UsersClient } from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Strict check: Only SUPER_ADMIN allowed
  if (user.role !== "SUPER_ADMIN") {
    redirect("/dashboard?denied=admin_only");
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          createdTransactions: true,
          workerTransactions: true,
        },
      },
    },
    orderBy: [
      { status: "asc" }, // PENDING first
      { createdAt: "desc" },
    ],
  });

  const formattedUsers = users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phoneNumber: u.phoneNumber,
    role: u.role as any,
    status: u.status as any,
    createdAt: u.createdAt.toISOString(),
    transactionCount:
      u._count.createdTransactions + u._count.workerTransactions,
  }));

  return (
    <AppShell user={user}>
      <UsersClient
        initialUsers={formattedUsers}
        currentAdminId={user.id}
      />
    </AppShell>
  );
}
