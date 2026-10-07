import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardView } from "@/components/inventory/DashboardView";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status === "PENDING") redirect("/pending");

  const resolvedParams = searchParams ? await searchParams : {};
  const requestedTab = resolvedParams?.tab?.toUpperCase();
  const initialTab =
    requestedTab === "DISPATCH" || requestedTab === "GODOWN" || requestedTab === "OFFICE"
      ? requestedTab
      : "ALL";

  // Fetch catalog items and dispatched transactions in parallel to minimize network latency
  const [items, dispatchedTransactions] = await Promise.all([
    prisma.item.findMany({
      include: {
        balances: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryTransaction.findMany({
      where: {
        transactionType: "DISPATCH_TO_SITE",
      },
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
      take: 200,
    }),
  ]);

  // Calculate statistics
  let totalGodownStock = 0;
  let totalOfficeStock = 0;
  let lowStockCount = 0;

  const formattedItems = items.map((item) => {
    const godown = item.balances.find((b) => b.location === "GODOWN")?.quantity ?? 0;
    const office = item.balances.find((b) => b.location === "OFFICE")?.quantity ?? 0;
    const total = godown + office;

    totalGodownStock += godown;
    totalOfficeStock += office;

    if (item.minThreshold !== null && item.minThreshold > 0 && total <= item.minThreshold) {
      lowStockCount++;
    }

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      minThreshold: item.minThreshold,
      godownQty: godown,
      officeQty: office,
      totalQty: total,
    };
  });

  let totalDispatchedQty = 0;
  const formattedDispatches = dispatchedTransactions.map((t) => {
    totalDispatchedQty += t.quantity;
    return {
      id: t.id,
      itemId: t.itemId,
      itemName: t.item.name,
      category: t.item.category,
      unit: t.item.unit,
      quantity: t.quantity,
      siteOrCustomer: t.siteOrCustomer || "Unspecified Site",
      workerName: t.worker?.fullName || null,
      dispatchedByName: t.createdByUser.fullName,
      referenceDocNo: t.referenceDocNo,
      remarks: t.remarks,
      createdAt: t.createdAt.toISOString(),
    };
  });

  // Today's movements count
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayMovementsCount = await prisma.inventoryTransaction.count({
    where: {
      createdAt: {
        gte: startOfDay,
      },
    },
  });

  return (
    <AppShell user={user}>
      <DashboardView
        items={formattedItems}
        dispatches={formattedDispatches}
        user={user}
        initialTab={initialTab}
        stats={{
          totalItems: items.length,
          totalGodownStock,
          totalOfficeStock,
          lowStockCount,
          todayMovementsCount,
          totalDispatchedQty,
          totalDispatchesCount: dispatchedTransactions.length,
        }}
      />
    </AppShell>
  );
}
