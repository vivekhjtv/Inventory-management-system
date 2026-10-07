import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRolePermissions } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TransferFormClient } from "./TransferFormClient";

export const dynamic = "force-dynamic";

export default async function TransferPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const perms = getRolePermissions(user.role, user.status);
  if (!perms.canTransferToOffice) {
    redirect("/dashboard?error=unauthorized_transfer");
  }

  const items = await prisma.item.findMany({
    include: {
      balances: true,
    },
    orderBy: { name: "asc" },
  });

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

  return (
    <AppShell user={user}>
      <TransferFormClient items={formattedItems} />
    </AppShell>
  );
}
