"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { setSessionCookie, removeSessionCookie, getCurrentUser } from "@/lib/auth";
import { Role, UserStatus } from "@/lib/types";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email },
    });
  } catch (err: any) {
    console.error("Database connection error in loginAction:", err);
    return {
      success: false,
      error:
        "Database error: Unable to connect or query database. Please check DATABASE_URL in Vercel settings and ensure 'npx prisma db push' has been run.",
    };
  }

  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  if (user.status === "SUSPENDED") {
    return {
      success: false,
      error: "Your account is suspended. Please contact the Super Admin.",
    };
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return { success: false, error: "Invalid email or password." };
  }

  await setSessionCookie({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role as Role,
    status: user.status as UserStatus,
  });

  if (user.status === "PENDING") {
    redirect("/pending");
  }

  redirect("/dashboard");
}

export async function registerAction(formData: FormData) {
  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phoneNumber = (formData.get("phoneNumber") as string)?.trim() || null;
  const password = formData.get("password") as string;

  if (!fullName || !email || !password) {
    return { success: false, error: "All required fields must be filled." };
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  let existing;
  try {
    existing = await prisma.user.findUnique({
      where: { email },
    });
  } catch (err: any) {
    console.error("Database error in registerAction:", err);
    return {
      success: false,
      error:
        "Database error: Unable to connect. Please ensure DATABASE_URL is configured and tables are created.",
    };
  }

  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      fullName,
      email,
      phoneNumber,
      passwordHash,
      role: "WORKER",
      status: "PENDING", // By requirement: creates with status PENDING
    },
  });

  await setSessionCookie({
    id: newUser.id,
    fullName: newUser.fullName,
    email: newUser.email,
    phoneNumber: newUser.phoneNumber,
    role: newUser.role as Role,
    status: newUser.status as UserStatus,
  });

  redirect("/pending");
}

export async function quickDemoLoginAction(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return { success: false, error: `Demo user ${email} not found. Please run seed.` };
  }

  await setSessionCookie({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role as Role,
    status: user.status as UserStatus,
  });

  revalidatePath("/");
  if (user.status === "PENDING") {
    redirect("/pending");
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  await removeSessionCookie();
  redirect("/login");
}

export async function changePasswordAction(formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to change your password." };
  }

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, error: "All password fields are required." };
  }

  if (newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters long." };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "New password and confirmation do not match." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    return { success: false, error: "User account not found." };
  }

  const isMatch = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!isMatch) {
    return { success: false, error: "Current password is incorrect." };
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash },
  });

  return { success: true, message: "Password updated successfully!" };
}
