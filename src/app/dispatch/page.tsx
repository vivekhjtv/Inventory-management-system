import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRolePermissions } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DispatchFormClient } from "./DispatchFormClient";

export const dynamic = "force-dynamic";

export default async function DispatchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const perms = getRolePermissions(user.role, user.status);
  if (!perms.canDispatchToSite) {
    redirect("/dashboard?error=unauthorized_dispatch");
  }

  // Fetch items, workers, and recent dispatches in parallel to minimize cloud DB round trips
  const [items, workers, recentDispatches] = await Promise.all([
    prisma.item.findMany({
      include: {
        balances: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.inventoryTransaction.findMany({
      where: { transactionType: "DISPATCH_TO_SITE" },
      include: {
        item: true,
        worker: { select: { fullName: true } },
        createdByUser: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const formattedItems = items.map((item) => {
    const godown = item.balances.find((b) => b.location === "GODOWN")?.quantity ?? 0;
    const office = item.balances.find((b) => b.location === "OFFICE")?.quantity ?? 0;
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      minThreshold: item.minThreshold,
      godownQty: godown,
      officeQty: office,
    };
  });

  const formattedRecentDispatches = recentDispatches.map((d) => ({
    id: d.id,
    itemId: d.itemId,
    itemName: d.item.name,
    category: d.item.category,
    unit: d.item.unit,
    quantity: d.quantity,
    siteOrCustomer: d.siteOrCustomer || "Unspecified Site",
    workerName: d.worker?.fullName || null,
    dispatchedByName: d.createdByUser.fullName,
    referenceDocNo: d.referenceDocNo,
    remarks: d.remarks,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <AppShell user={user}>
      <DispatchFormClient
        items={formattedItems}
        workers={workers}
        currentUser={user}
        recentDispatches={formattedRecentDispatches}
      />
    </AppShell>
  );
}
