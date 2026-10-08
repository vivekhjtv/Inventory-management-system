"use server";

import { prisma } from "@/lib/prisma";
import { getVerifiedUser } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

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
          referenceDocNo: docNo || null,
          remarks: fullRemarks || null,
        },
        include: {
          item: true,
        },
      });

      return { balance, transaction };
    });

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
    });

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
  workerId?: string;
  docNo?: string;
  remarks?: string;
}) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, error: "Authentication required." };

  const perms = getRolePermissions(user.role, user.status);
  if (!perms.canDispatchToSite) {
    return {
      success: false,
      error: `Your role (${user.role}) is not authorized to dispatch stock to installation sites.`,
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
      // 1. Check Office balance
      const officeBalance = await tx.stockBalance.findUnique({
        where: {
          itemId_location: {
            itemId,
            location: "OFFICE",
          },
        },
        include: { item: true },
      });

      const currentOfficeQty = officeBalance?.quantity ?? 0;
      if (currentOfficeQty < numQty) {
        throw new Error(
          `Insufficient Office stock for ${officeBalance?.item.name || "Item"}. Available: ${currentOfficeQty}, Requested: ${numQty}`
        );
      }

      // 2. Decrement Office
      const updatedOffice = await tx.stockBalance.update({
        where: {
          itemId_location: {
            itemId,
            location: "OFFICE",
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
          fromLocation: "OFFICE",
          toLocation: "SITE",
          siteOrCustomer: siteOrCustomer.trim(),
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

      return { updatedOffice, transaction };
    });

    revalidatePath("/dashboard");
    revalidatePath("/dispatch");
    revalidatePath("/transactions");
    return {
      success: true,
      message: `Dispatched ${numQty} ${result.transaction.item.unit} of ${result.transaction.item.name} for site "${siteOrCustomer}".`,
      newOfficeBalance: result.updatedOffice.quantity,
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
    });

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
            transactionType: "INWARD_TO_GODOWN",
            itemId: entry.itemId,
            quantity: numQty,
            fromLocation: vendorName || "VENDOR",
            toLocation: "GODOWN",
            createdByUserId: user.id,
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
    });

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
    });

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
  items: Array<{ itemId: string; quantity: number }>;
  siteOrCustomer: string;
  workerId?: string;
  docNo?: string;
  remarks?: string;
}) {
  const user = await getVerifiedUser();
  if (!user) return { success: false, error: "Authentication required." };

  const perms = getRolePermissions(user.role, user.status);
  if (!perms.canDispatchToSite) {
    return {
      success: false,
      error: `Your role (${user.role}) is not authorized to dispatch stock to installation sites.`,
    };
  }

  const { items, siteOrCustomer, workerId, docNo, remarks } = payload;
  if (!siteOrCustomer?.trim()) {
    return { success: false, error: "Site or Customer reference is required." };
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, error: "Please add at least one item to dispatch." };
  }

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!item.itemId || isNaN(qty) || qty <= 0) {
      return { success: false, error: "All items must have a valid quantity greater than 0." };
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const processedItems = [];

      for (const entry of items) {
        const numQty = Number(entry.quantity);

        const officeBalance = await tx.stockBalance.findUnique({
          where: {
            itemId_location: {
              itemId: entry.itemId,
              location: "OFFICE",
            },
          },
          include: { item: true },
        });

        const currentOfficeQty = officeBalance?.quantity ?? 0;
        if (currentOfficeQty < numQty) {
          throw new Error(
            `Insufficient Office stock for ${officeBalance?.item?.name || "Item"}. Available: ${currentOfficeQty}, Requested: ${numQty}`
          );
        }

        const updatedOffice = await tx.stockBalance.update({
          where: {
            itemId_location: {
              itemId: entry.itemId,
              location: "OFFICE",
            },
          },
          data: {
            quantity: { decrement: numQty },
          },
        });

        const transaction = await tx.inventoryTransaction.create({
          data: {
            transactionType: "DISPATCH_TO_SITE",
            itemId: entry.itemId,
            quantity: numQty,
            fromLocation: "OFFICE",
            toLocation: "SITE",
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

        processedItems.push({
          itemId: entry.itemId,
          itemName: transaction.item.name,
          quantity: numQty,
          unit: transaction.item.unit,
          newOfficeBalance: updatedOffice.quantity,
        });
      }

      return processedItems;
    });

    revalidatePath("/dashboard");
    revalidatePath("/dispatch");
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

