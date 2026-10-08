"use server";

import { prisma } from "@/lib/prisma";
import { getVerifiedUser } from "@/lib/auth";
import { Role, UserStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function approveUser(userId: string, assignedRole: Role = "WORKER") {
  const current = await getVerifiedUser();
  if (!current || current.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only Super Admin can approve users." };
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        role: assignedRole,
      },
    });

    revalidatePath("/admin/users");
    return {
      success: true,
      message: `${user.fullName} has been approved as ${assignedRole}.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to approve user." };
  }
}

export async function updateUserRole(userId: string, newRole: Role) {
  const current = await getVerifiedUser();
  if (!current || current.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only Super Admin can change user roles." };
  }

  // Prevent super admin from accidentally demoting themselves if they are the only one
  if (current.id === userId && newRole !== "SUPER_ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "SUPER_ADMIN", status: "ACTIVE" },
    });
    if (adminCount <= 1) {
      return { success: false, error: "Cannot demote the only active Super Admin." };
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    revalidatePath("/admin/users");
    return {
      success: true,
      message: `Updated role for ${user.fullName} to ${newRole}.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update role." };
  }
}

export async function updateUserStatus(userId: string, newStatus: UserStatus) {
  const current = await getVerifiedUser();
  if (!current || current.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only Super Admin can change user status." };
  }

  if (current.id === userId && newStatus === "SUSPENDED") {
    return { success: false, error: "You cannot suspend your own account." };
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
    });

    revalidatePath("/admin/users");
    return {
      success: true,
      message: `Status for ${user.fullName} updated to ${newStatus}.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update status." };
  }
}

export async function deleteUser(userId: string) {
  const current = await getVerifiedUser();
  if (!current || current.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only Super Admin can delete users." };
  }

  if (current.id === userId) {
    return { success: false, error: "You cannot delete your own account." };
  }

  try {
    // Delete any dependent records if needed or delete user
    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/users");
    return {
      success: true,
      message: "User successfully removed.",
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete user." };
  }
}
