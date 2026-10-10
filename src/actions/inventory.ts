"use server";

import { prisma } from "@/lib/prisma";
import { getVerifiedUser } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

const TRANSACTION_CONFIG = {
  maxWait: 20000, // 20 seconds maximum wait time to acquire connection
  timeout: 60000, // 60 seconds timeout for interactive transaction
};

export async function getLiveBalance(itemId: string, location: "GODOWN" | "OFFICE") {
  const balance = await prisma.stockBalance.findUnique({
    where: {
      itemId_location: {
        itemId,
        location,
      },
    },
  });
  return balance ? balance.quantity : 0;
}

export async function inwardStock(payload: {
  itemId: string;
  quantity: number;
  vendorName?: string;
  docNo?: string;
  remarks?: string;
}) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, error: "Authentication required." };

  const perms = getRolePermissions(user.role, user.status);
  if (!perms.canInwardToGodown) {
    return {
      success: false,
      error: `Your role (${user.role}) is not authorized to perform Vendor Inward into Godown.`,
    };
  }

  const { itemId, quantity, vendorName, docNo, remarks } = payload;
  const numQty = Number(quantity);

  if (!itemId || isNaN(numQty) || numQty <= 0) {
    return { success: false, error: "Please enter a valid positive quantity." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update or create Godown balance
      const balance = await tx.stockBalance.upsert({
        where: {
          itemId_location: {
            itemId,
            location: "GODOWN",
          },
        },
        update: {
          quantity: { increment: numQty },
        },
        create: {
          itemId,
          location: "GODOWN",
          quantity: numQty,
        },
      });

      // 2. Create transaction record
      const fullRemarks = [
        vendorName ? `Vendor: ${vendorName}` : null,
        remarks ? remarks : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const transaction = await tx.inventoryTransaction.create({
        data: {
          transactionType: "INWARD_TO_GODOWN",
          itemId,
          quantity: numQty,
          fromLocation: vendorName || "VENDOR",
          toLocation: "GODOWN",
          createdByUserId: user.id,
          siteOrCustomer: vendorName || null,
          referenceDocNo: docNo || null,
          remarks: fullRemarks || null,
        },
        include: {
          item: true,
        },
      });

      return { balance, transaction };
    }, TRANSACTION_CONFIG);

    revalidatePath("/dashboard");
    revalidatePath("/inward");
    revalidatePath("/transactions");
    return {
      success: true,
      message: `Successfully received ${numQty} ${result.transaction.item.unit} of ${result.transaction.item.name} into Godown.`,
      newBalance: result.balance.quantity,
    };
  } catch (error: any) {
    console.error("Inward error:", error);
    return { success: false, error: error.message || "Failed to process inward." };
  }
}

export async function transferStock(payload: {
  itemId: string;
  quantity: number;
  docNo?: string;
  remarks?: string;
}) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, error: "Authentication required." };

  const perms = getRolePermissions(user.role, user.status);
  if (!perms.canTransferToOffice) {
    return {
      success: false,
      error: `Your role (${user.role}) is not authorized to transfer warehouse stock to office.`,
    };
  }

  const { itemId, quantity, docNo, remarks } = payload;
  const numQty = Number(quantity);

  if (!itemId || isNaN(numQty) || numQty <= 0) {
    return { success: false, error: "Please enter a valid positive quantity." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check Godown balance
      const godownBalance = await tx.stockBalance.findUnique({
        where: {
          itemId_location: {
            itemId,
            location: "GODOWN",
          },
        },
        include: { item: true },
      });

      const currentGodownQty = godownBalance?.quantity ?? 0;
      if (currentGodownQty < numQty) {
        throw new Error(
          `Insufficient Godown stock for ${godownBalance?.item.name || "Item"}. Available: ${currentGodownQty}, Requested: ${numQty}`
        );
      }

      // 2. Decrement Godown
      const updatedGodown = await tx.stockBalance.update({
        where: {
          itemId_location: {
            itemId,
            location: "GODOWN",
          },
        },
        data: {
          quantity: { decrement: numQty },
        },
      });

      // 3. Increment Office
      const updatedOffice = await tx.stockBalance.upsert({
        where: {
          itemId_location: {
            itemId,
            location: "OFFICE",
          },
        },
        update: {
          quantity: { increment: numQty },
        },
        create: {
          itemId,
          location: "OFFICE",
          quantity: numQty,
        },
      });

      // 4. Log atomic transaction
      const transaction = await tx.inventoryTransaction.create({
        data: {
          transactionType: "TRANSFER_TO_OFFICE",
          itemId,
          quantity: numQty,
          fromLocation: "GODOWN",
          toLocation: "OFFICE",
          createdByUserId: user.id,
          referenceDocNo: docNo || null,
          remarks: remarks || null,
        },
        include: {
          item: true,
        },
      });

      return { updatedGodown, updatedOffice, transaction };
    }, TRANSACTION_CONFIG);

    revalidatePath("/dashboard");
    revalidatePath("/transfer");
    revalidatePath("/transactions");
    return {
      success: true,
      message: `Transferred ${numQty} ${result.transaction.item.unit} of ${result.transaction.item.name} to Office hub.`,
      newGodownBalance: result.updatedGodown.quantity,
      newOfficeBalance: result.updatedOffice.quantity,
    };
  } catch (error: any) {
    console.error("Transfer error:", error);
    return { success: false, error: error.message || "Failed to process transfer." };
  }
}

export async function dispatchToSite(payload: {
  itemId: string;
  quantity: number;
  siteOrCustomer: string;
  customerPhone?: string;
  customerAddress?: string;
  workerId?: string;
  docNo?: string;
  remarks?: string;
  fromLocation?: "OFFICE" | "GODOWN";
}) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, error: "Authentication required." };

  const originLocation: "OFFICE" | "GODOWN" = payload.fromLocation === "GODOWN" ? "GODOWN" : "OFFICE";

  const perms = getRolePermissions(user.role, user.status);
  const isAuthorized = originLocation === "GODOWN"
    ? (perms.canDispatchToSite || perms.canTransferToOffice)
    : perms.canDispatchToSite;

  if (!isAuthorized) {
    return {
      success: false,
      error: `Your role (${user.role}) is not authorized to dispatch stock from ${originLocation === "GODOWN" ? "Godown" : "Office"}.`,
    };
  }

  const { itemId, quantity, siteOrCustomer, customerPhone, customerAddress, workerId, docNo, remarks } = payload;
  const numQty = Number(quantity);

  if (!itemId || isNaN(numQty) || numQty <= 0) {
    return { success: false, error: "Please enter a valid positive quantity." };
  }

  if (!siteOrCustomer?.trim()) {
    return { success: false, error: "Site or Customer reference is required." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check origin balance
      const originBalance = await tx.stockBalance.findUnique({
        where: {
          itemId_location: {
            itemId,
            location: originLocation,
          },
        },
        include: { item: true },
      });

      const currentOriginQty = originBalance?.quantity ?? 0;
      if (currentOriginQty < numQty) {
        throw new Error(
          `Insufficient ${originLocation === "GODOWN" ? "Godown" : "Office"} stock for ${originBalance?.item.name || "Item"}. Available: ${currentOriginQty}, Requested: ${numQty}`
        );
      }

      // 2. Decrement origin balance
      const updatedBalance = await tx.stockBalance.update({
        where: {
          itemId_location: {
            itemId,
            location: originLocation,
          },
        },
        data: {
          quantity: { decrement: numQty },
        },
      });

      // 3. Log dispatch transaction
      const transaction = await tx.inventoryTransaction.create({
        data: {
          transactionType: "DISPATCH_TO_SITE",
          itemId,
          quantity: numQty,
          fromLocation: originLocation,
          toLocation: "SITE",
          siteOrCustomer: siteOrCustomer.trim(),
          customerPhone: customerPhone?.trim() || null,
          customerAddress: customerAddress?.trim() || null,
          workerId: workerId || user.id, // if worker logs their own checkout
          createdByUserId: user.id,
          referenceDocNo: docNo || null,
          remarks: remarks || null,
        },
        include: {
          item: true,
          worker: true,
        },
      });

      return { updatedBalance, transaction, originLocation };
    }, TRANSACTION_CONFIG);

    revalidatePath("/dashboard");
    revalidatePath("/dispatch");
    revalidatePath("/transfer");
    revalidatePath("/transactions");
    return {
      success: true,
      message: `Dispatched ${numQty} ${result.transaction.item.unit} of ${result.transaction.item.name} from ${result.originLocation} for site "${siteOrCustomer}".`,
      newBalance: result.updatedBalance.quantity,
    };
  } catch (error: any) {
    console.error("Dispatch error:", error);
    return { success: false, error: error.message || "Failed to process dispatch." };
  }
}

export async function returnFromSite(payload: {
  itemId: string;
  quantity: number;
  siteOrCustomer: string;
  workerId?: string;
  docNo?: string;
  remarks?: string;
}) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, error: "Authentication required." };

  const perms = getRolePermissions(user.role, user.status);
  if (!perms.canReturnFromSite) {
    return {
      success: false,
      error: `Your role (${user.role}) is not authorized to log site returns.`,
    };
  }

  const { itemId, quantity, siteOrCustomer, workerId, docNo, remarks } = payload;
  const numQty = Number(quantity);

  if (!itemId || isNaN(numQty) || numQty <= 0) {
    return { success: false, error: "Please enter a valid positive quantity." };
  }

  if (!siteOrCustomer?.trim()) {
    return { success: false, error: "Site or Customer reference is required." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Increment Office balance
      const updatedOffice = await tx.stockBalance.upsert({
        where: {
          itemId_location: {
            itemId,
            location: "OFFICE",
          },
        },
        update: {
          quantity: { increment: numQty },
        },
        create: {
          itemId,
          location: "OFFICE",
          quantity: numQty,
        },
      });

      // 2. Log return transaction
      const transaction = await tx.inventoryTransaction.create({
        data: {
          transactionType: "RETURN_TO_OFFICE",
          itemId,
          quantity: numQty,
          fromLocation: "SITE",
          toLocation: "OFFICE",
          siteOrCustomer: siteOrCustomer.trim(),
          workerId: workerId || user.id,
          createdByUserId: user.id,
          referenceDocNo: docNo || null,
          remarks: remarks || null,
        },
        include: {
          item: true,
        },
      });

      return { updatedOffice, transaction };
    }, TRANSACTION_CONFIG);

    revalidatePath("/dashboard");
    revalidatePath("/returns");
    revalidatePath("/transactions");
    return {
      success: true,
      message: `Returned ${numQty} ${result.transaction.item.unit} of ${result.transaction.item.name} to Office stock.`,
      newOfficeBalance: result.updatedOffice.quantity,
    };
  } catch (error: any) {
    console.error("Return error:", error);
    return { success: false, error: error.message || "Failed to log return." };
  }
}

export async function addNewItem(payload: {
  name: string;
  category: string;
  unit: string;
  minThreshold?: number;
}) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, error: "Authentication required." };

  const perms = getRolePermissions(user.role, user.status);
  if (!perms.canManageCatalog) {
    return {
      success: false,
      error: `Your role (${user.role}) is not authorized to add new catalog items.`,
    };
  }

  const { name, category, unit, minThreshold } = payload;
  const cleanName = name?.trim();

  if (!cleanName) {
    return { success: false, error: "Item name is required." };
  }

  try {
    const existing = await prisma.item.findUnique({
      where: { name: cleanName },
    });
    if (existing) {
      return { success: false, error: `An item with name "${cleanName}" already exists.` };
    }

    const item = await prisma.item.create({
      data: {
        name: cleanName,
        category: category as any,
        unit: unit || "NOS",
        minThreshold: minThreshold ? Number(minThreshold) : 0,
        balances: {
          create: [
            { location: "GODOWN", quantity: 0 },
            { location: "OFFICE", quantity: 0 },
          ],
        },
      },
      include: {
        balances: true,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/catalog");
    return {
      success: true,
      message: `Item "${item.name}" added to catalog successfully.`,
      item,
    };
  } catch (error: any) {
    console.error("Add item error:", error);
    return { success: false, error: error.message || "Failed to create item." };
  }
}

export async function getWorkersList() {
  return await prisma.user.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
    orderBy: {
      fullName: "asc",
    },
  });
}

export async function batchInwardStock(payload: {
  items: Array<{ itemId: string; quantity: number }>;
  vendorName?: string;
  docNo?: string;
  remarks?: string;
}) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, error: "Authentication required." };

  const perms = getRolePermissions(user.role, user.status);
  if (!perms.canInwardToGodown) {
    return {
      success: false,
      error: `Your role (${user.role}) is not authorized to perform Vendor Inward into Godown.`,
    };
  }

  const { items, vendorName, docNo, remarks } = payload;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, error: "Please add at least one item to inward." };
  }

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!item.itemId || isNaN(qty) || qty <= 0) {
      return { success: false, error: "All items must have a valid quantity greater than 0." };
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const fullRemarks = [
        vendorName ? `Vendor: ${vendorName}` : null,
        remarks ? remarks : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const batchId = `BATCH-INW-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const processedItems = [];

      for (const entry of items) {
        const numQty = Number(entry.quantity);

        const balance = await tx.stockBalance.upsert({
          where: {
            itemId_location: {
              itemId: entry.itemId,
              location: "GODOWN",
            },
          },
          update: {
            quantity: { increment: numQty },
          },
          create: {
            itemId: entry.itemId,
            location: "GODOWN",
            quantity: numQty,
          },
        });

        const transaction = await tx.inventoryTransaction.create({
          data: {
            batchId,
            transactionType: "INWARD_TO_GODOWN",
            itemId: entry.itemId,
            quantity: numQty,
            fromLocation: vendorName || "VENDOR",
            toLocation: "GODOWN",
            createdByUserId: user.id,
            siteOrCustomer: vendorName || null,
            referenceDocNo: docNo || null,
            remarks: fullRemarks || null,
          },
          include: {
            item: true,
          },
        });

        processedItems.push({
          itemId: entry.itemId,
          itemName: transaction.item.name,
          quantity: numQty,
          unit: transaction.item.unit,
          newBalance: balance.quantity,
        });
      }

      return processedItems;
    }, TRANSACTION_CONFIG);

    revalidatePath("/dashboard");
    revalidatePath("/inward");
    revalidatePath("/transactions");

    return {
      success: true,
      message: `Successfully received ${result.length} item${result.length > 1 ? "s" : ""} into Godown.`,
      processedItems: result,
    };
  } catch (error: any) {
    console.error("Batch inward error:", error);
    return { success: false, error: error.message || "Failed to process batch inward." };
  }
}

export async function batchTransferStock(payload: {
  items: Array<{ itemId: string; quantity: number }>;
  docNo?: string;
  remarks?: string;
}) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, error: "Authentication required." };

  const perms = getRolePermissions(user.role, user.status);
  if (!perms.canTransferToOffice) {
    return {
      success: false,
      error: `Your role (${user.role}) is not authorized to transfer warehouse stock to office.`,
    };
  }

  const { items, docNo, remarks } = payload;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, error: "Please add at least one item to transfer." };
  }

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!item.itemId || isNaN(qty) || qty <= 0) {
      return { success: false, error: "All items must have a valid quantity greater than 0." };
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const batchId = `BATCH-TRF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const processedItems = [];

      for (const entry of items) {
        const numQty = Number(entry.quantity);

        const godownBalance = await tx.stockBalance.findUnique({
          where: {
            itemId_location: {
              itemId: entry.itemId,
              location: "GODOWN",
            },
          },
          include: { item: true },
        });

        const currentGodownQty = godownBalance?.quantity ?? 0;
        if (currentGodownQty < numQty) {
          throw new Error(
            `Insufficient Godown stock for ${godownBalance?.item?.name || "Item"}. Available: ${currentGodownQty}, Requested: ${numQty}`
          );
        }

        const updatedGodown = await tx.stockBalance.update({
          where: {
            itemId_location: {
              itemId: entry.itemId,
              location: "GODOWN",
            },
          },
          data: {
            quantity: { decrement: numQty },
          },
        });

        const updatedOffice = await tx.stockBalance.upsert({
          where: {
            itemId_location: {
              itemId: entry.itemId,
              location: "OFFICE",
            },
          },
          update: {
            quantity: { increment: numQty },
          },
          create: {
            itemId: entry.itemId,
            location: "OFFICE",
            quantity: numQty,
          },
        });

        const transaction = await tx.inventoryTransaction.create({
          data: {
            batchId,
            transactionType: "TRANSFER_TO_OFFICE",
            itemId: entry.itemId,
            quantity: numQty,
            fromLocation: "GODOWN",
            toLocation: "OFFICE",
            createdByUserId: user.id,
            referenceDocNo: docNo || null,
            remarks: remarks || null,
          },
          include: {
            item: true,
          },
        });

        processedItems.push({
          itemId: entry.itemId,
          itemName: transaction.item.name,
          quantity: numQty,
          unit: transaction.item.unit,
          newGodownBalance: updatedGodown.quantity,
          newOfficeBalance: updatedOffice.quantity,
        });
      }

      return processedItems;
    }, TRANSACTION_CONFIG);

    revalidatePath("/dashboard");
    revalidatePath("/transfer");
    revalidatePath("/transactions");

    return {
      success: true,
      message: `Successfully transferred ${result.length} item${result.length > 1 ? "s" : ""} to Office hub.`,
      processedItems: result,
    };
  } catch (error: any) {
    console.error("Batch transfer error:", error);
    return { success: false, error: error.message || "Failed to process batch transfer." };
  }
}

export async function batchDispatchToSite(payload: {
  items: Array<{ itemId: string; quantity: number; sourceLocation?: "OFFICE" | "GODOWN" }>;
  siteOrCustomer: string;
  customerPhone?: string;
  customerAddress?: string;
  workerId?: string;
  docNo?: string;
  remarks?: string;
  fromLocation?: "OFFICE" | "GODOWN";
}) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, error: "Authentication required." };

  const defaultOrigin: "OFFICE" | "GODOWN" = payload.fromLocation === "GODOWN" ? "GODOWN" : "OFFICE";
  const { items, siteOrCustomer, customerPhone, customerAddress, workerId, docNo, remarks } = payload;
  if (!siteOrCustomer?.trim()) {
    return { success: false, error: "Site or Customer reference is required." };
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, error: "Please add at least one item to dispatch." };
  }

  const perms = getRolePermissions(user.role, user.status);
  const requiresGodown = items.some((i) => (i.sourceLocation || defaultOrigin) === "GODOWN");
  const requiresOffice = items.some((i) => (i.sourceLocation || defaultOrigin) === "OFFICE");

  if (requiresGodown && !(perms.canDispatchToSite || perms.canTransferToOffice)) {
    return {
      success: false,
      error: `Your role (${user.role}) is not authorized to dispatch stock from Godown Warehouse.`,
    };
  }
  if (requiresOffice && !perms.canDispatchToSite) {
    return {
      success: false,
      error: `Your role (${user.role}) is not authorized to dispatch stock from Office Hub.`,
    };
  }

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!item.itemId || isNaN(qty) || qty <= 0) {
      return { success: false, error: "All items must have a valid quantity greater than 0." };
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const batchId = `BATCH-DSP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const processedItems = [];

      for (const entry of items) {
        const numQty = Number(entry.quantity);
        const itemSource: "OFFICE" | "GODOWN" = entry.sourceLocation || defaultOrigin;

        const originBalance = await tx.stockBalance.findUnique({
          where: {
            itemId_location: {
              itemId: entry.itemId,
              location: itemSource,
            },
          },
          include: { item: true },
        });

        const currentOriginQty = originBalance?.quantity ?? 0;
        if (currentOriginQty < numQty) {
          throw new Error(
            `Insufficient ${itemSource === "GODOWN" ? "Godown" : "Office"} stock for ${originBalance?.item?.name || "Item"}. Available in ${itemSource}: ${currentOriginQty}, Requested: ${numQty}`
          );
        }

        const updatedOrigin = await tx.stockBalance.update({
          where: {
            itemId_location: {
              itemId: entry.itemId,
              location: itemSource,
            },
          },
          data: {
            quantity: { decrement: numQty },
          },
        });

        const transaction = await tx.inventoryTransaction.create({
          data: {
            batchId,
            transactionType: "DISPATCH_TO_SITE",
            itemId: entry.itemId,
            quantity: numQty,
            fromLocation: itemSource,
            toLocation: "SITE",
            siteOrCustomer: siteOrCustomer.trim(),
            customerPhone: customerPhone?.trim() || null,
            customerAddress: customerAddress?.trim() || null,
            workerId: workerId || user.id,
            createdByUserId: user.id,
            referenceDocNo: docNo || null,
            remarks: remarks || null,
          },
          include: {
            item: true,
          },
        });

        processedItems.push({
          itemId: entry.itemId,
          itemName: transaction.item.name,
          quantity: numQty,
          unit: transaction.item.unit,
          newBalance: updatedOrigin.quantity,
          originLocation: itemSource,
        });
      }

      return processedItems;
    }, TRANSACTION_CONFIG);

    revalidatePath("/dashboard");
    revalidatePath("/dispatch");
    revalidatePath("/transfer");
    revalidatePath("/transactions");

    return {
      success: true,
      message: `Successfully dispatched ${result.length} item${result.length > 1 ? "s" : ""} for "${siteOrCustomer.trim()}".`,
      processedItems: result,
    };
  } catch (error: any) {
    console.error("Batch dispatch error:", error);
    return { success: false, error: error.message || "Failed to process batch dispatch." };
  }
}

/**
 * Fetch distinct vendors and customer profiles for auto-suggestions
 */
export async function getAutocompleteData(): Promise<{
  vendors: string[];
  customers: Array<{ name: string; phone?: string | null; address?: string | null }>;
}> {
  try {
    const [inwardTx, dispatchTx] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where: { transactionType: "INWARD_TO_GODOWN" },
        select: { fromLocation: true, remarks: true, siteOrCustomer: true },
        take: 300,
        orderBy: { createdAt: "desc" },
      }),
      prisma.inventoryTransaction.findMany({
        where: { siteOrCustomer: { not: null } },
        select: { siteOrCustomer: true, customerPhone: true, customerAddress: true },
        take: 300,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const vendorsSet = new Set<string>();
    for (const t of inwardTx) {
      if (t.siteOrCustomer?.trim()) {
        const v = t.siteOrCustomer.trim();
        if (!["VENDOR", "GODOWN", "OFFICE"].includes(v.toUpperCase())) {
          vendorsSet.add(v);
        }
      }
      if (t.fromLocation && !["VENDOR", "GODOWN", "OFFICE"].includes(t.fromLocation.toUpperCase())) {
        vendorsSet.add(t.fromLocation.trim());
      }
      if (t.remarks && t.remarks.includes("Vendor:")) {
        const match = t.remarks.match(/Vendor:\s*([^|]+)/i);
        if (match && match[1]) {
          const v = match[1].trim();
          if (v && !["VENDOR", "GODOWN", "OFFICE"].includes(v.toUpperCase())) {
            vendorsSet.add(v);
          }
        }
      }
    }

    const customersMap = new Map<string, { name: string; phone?: string | null; address?: string | null }>();
    for (const d of dispatchTx) {
      if (d.siteOrCustomer && d.siteOrCustomer.trim()) {
        const name = d.siteOrCustomer.trim();
        const key = name.toLowerCase();
        const existing = customersMap.get(key);
        if (!existing) {
          customersMap.set(key, {
            name,
            phone: d.customerPhone || null,
            address: d.customerAddress || null,
          });
        } else {
          if (!existing.phone && d.customerPhone) existing.phone = d.customerPhone;
          if (!existing.address && d.customerAddress) existing.address = d.customerAddress;
        }
      }
    }

    return {
      vendors: Array.from(vendorsSet),
      customers: Array.from(customersMap.values()),
    };
  } catch (error) {
    console.error("Error fetching autocomplete data:", error);
    return { vendors: [], customers: [] };
  }
}


