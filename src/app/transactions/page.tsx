import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TransactionsClient } from "./TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch transactions (if worker, optionally show their own, but let's query all or filter)
  const transactions = await prisma.inventoryTransaction.findMany({
    where: user.role === "WORKER" ? {
      OR: [
        { workerId: user.id },
        { createdByUserId: user.id },
      ],
    } : undefined,
    include: {
      item: true,
      createdByUser: {
        select: { fullName: true, role: true },
      },
      worker: {
        select: { fullName: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const formattedTransactions = transactions.map((t) => ({
    id: t.id,
    transactionType: t.transactionType,
    itemName: t.item.name,
    category: t.item.category,
    unit: t.item.unit,
    quantity: t.quantity,
    fromLocation: t.fromLocation,
    toLocation: t.toLocation,
    createdByName: t.createdByUser.fullName,
    workerName: t.worker?.fullName || null,
    siteOrCustomer: t.siteOrCustomer,
    referenceDocNo: t.referenceDocNo,
    remarks: t.remarks,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <AppShell user={user}>
      <TransactionsClient initialTransactions={formattedTransactions} />
    </AppShell>
  );
}
