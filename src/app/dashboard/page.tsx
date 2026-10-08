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

  // Today's movements count boundary
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let items: any[] = [];
  let dispatchedTransactions: any[] = [];
  let todayMovementsCount = 0;
  let fetchError: string | null = null;

  try {
    // Fetch catalog items, dispatched transactions, and movements count in parallel
    const [fetchedItems, fetchedDispatches, count] = await Promise.all([
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
      prisma.inventoryTransaction.count({
        where: {
          createdAt: {
            gte: startOfDay,
          },
        },
      }),
    ]);
    items = fetchedItems;
    dispatchedTransactions = fetchedDispatches;
    todayMovementsCount = count;
  } catch (err: any) {
    console.error("Dashboard database query error:", err);
    fetchError = err?.message || "Failed to query inventory database.";
  }

  if (fetchError) {
    return (
      <AppShell user={user}>
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4 max-w-3xl mx-auto my-6">
          <div className="flex items-center gap-3 text-rose-600">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center font-bold">
              !
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Database Query Failed</h2>
              <p className="text-xs text-slate-500">Could not read inventory tables from PostgreSQL.</p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 break-all">
            {fetchError}
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <p className="font-bold">Next steps to resolve:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-amber-800 text-[12px]">
              <li>
                Run <code className="bg-amber-100 font-mono px-1 py-0.5 rounded font-bold">npx prisma db push</code> with your production connection string so the <code className="font-mono">Item</code> and <code className="font-mono">InventoryTransaction</code> tables are created.
              </li>
              <li>
                Run <code className="bg-amber-100 font-mono px-1 py-0.5 rounded font-bold">npx tsx prisma/seed.ts</code> to populate solar catalog items and initial stock balances.
              </li>
              <li>
                If using Supabase Transaction Pooler (port 6543), verify that <code className="bg-amber-100 font-mono px-1 py-0.5 rounded font-bold">?pgbouncer=true&sslmode=require</code> is added at the end of <code className="font-mono">DATABASE_URL</code>.
              </li>
            </ol>
          </div>
        </div>
      </AppShell>
    );
  }

  // Calculate statistics
  let totalGodownStock = 0;
  let totalOfficeStock = 0;
  let lowStockCount = 0;

  const formattedItems = items.map((item) => {
    const godown = item.balances?.find((b: any) => b.location === "GODOWN")?.quantity ?? 0;
    const office = item.balances?.find((b: any) => b.location === "OFFICE")?.quantity ?? 0;
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
    totalDispatchedQty += t.quantity || 0;
    return {
      id: t.id,
      itemId: t.itemId,
      itemName: t.item?.name || "Unknown Item",
      category: t.item?.category || "OTHER",
      unit: t.item?.unit || "NOS",
      quantity: t.quantity || 0,
      siteOrCustomer: t.siteOrCustomer || "Unspecified Site",
      workerName: t.worker?.fullName || null,
      dispatchedByName: t.createdByUser?.fullName || "System Admin",
      referenceDocNo: t.referenceDocNo,
      remarks: t.remarks,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    };
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
