import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRolePermissions } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ReturnFormClient } from "./ReturnFormClient";

export const dynamic = "force-dynamic";

interface ReturnPageProps {
  searchParams?: Promise<{ itemId?: string; site?: string }>;
}

export default async function ReturnPage({ searchParams }: ReturnPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = searchParams ? await searchParams : {};

  const perms = getRolePermissions(user.role, user.status);
  if (!perms.canReturnFromSite) {
    redirect("/dashboard?error=unauthorized_return");
  }

  const [items, workers] = await Promise.all([
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

  return (
    <AppShell user={user}>
      <ReturnFormClient
        items={formattedItems}
        workers={workers}
        currentUser={user}
        initialItemId={resolvedParams?.itemId}
        initialSite={resolvedParams?.site}
      />
    </AppShell>
  );
}
