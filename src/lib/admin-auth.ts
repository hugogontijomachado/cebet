import "server-only";
import { cookies } from "next/headers";
import { createHmac } from "crypto";

const COOKIE = "bolao_admin";

export function adminToken(): string {
  return createHmac("sha256", process.env.ADMIN_COOKIE_SECRET!)
    .update(process.env.ADMIN_PIN!)
    .digest("hex");
}

export async function verifyPinAndSetCookie(pin: string): Promise<boolean> {
  if (pin !== process.env.ADMIN_PIN) return false;
  const store = await cookies();
  store.set(COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE)?.value === adminToken();
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("NAO_AUTORIZADO");
}
