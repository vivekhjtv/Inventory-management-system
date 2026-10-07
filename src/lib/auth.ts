import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SessionUser } from "./types";
import { prisma } from "./prisma";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "zaffine-super-secure-jwt-key-solar-inventory-2026"
);
export const COOKIE_NAME = "zaffine_session";

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    status: user.status,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

import { cache } from "react";

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.id) return null;

    return {
      id: payload.id,
      fullName: payload.fullName,
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      role: payload.role as any,
      status: payload.status as any,
    };
  } catch {
    return null;
  }
});

export async function setSessionCookie(user: SessionUser) {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function removeSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
