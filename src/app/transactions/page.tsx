import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TransactionsClient, TransactionRow } from "./TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "PENDING") redirect("/pending");

  let formattedTransactions: TransactionRow[] = [];

  try {
    // Fetch transactions (if worker, optionally show their own, otherwise all)
    const transactions = await prisma.inventoryTransaction.findMany({
      where:
        user.role === "WORKER"
          ? {
              OR: [{ workerId: user.id }, { createdByUserId: user.id }],
            }
          : undefined,
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
      take: 500,
    });

    formattedTransactions = transactions.map((t) => ({
      id: t.id,
      batchId: (t as any).batchId || null,
      transactionType: t.transactionType,
      itemName: t.item?.name || "Unknown Item",
      category: t.item?.category || "OTHER",
      unit: t.item?.unit || "NOS",
      quantity: Number(t.quantity) || 0,
      fromLocation: t.fromLocation || null,
      toLocation: t.toLocation || null,
      createdByName: t.createdByUser?.fullName || "System",
      workerName: t.worker?.fullName || null,
      siteOrCustomer: t.siteOrCustomer || null,
      customerPhone: (t as any).customerPhone || null,
      customerAddress: (t as any).customerAddress || null,
      referenceDocNo: t.referenceDocNo || null,
      remarks: t.remarks || null,
      createdAt: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching transactions in TransactionsPage:", error);
    formattedTransactions = [];
  }

  return (
    <AppShell user={user}>
      <TransactionsClient initialTransactions={formattedTransactions} />
    </AppShell>
  );
}
