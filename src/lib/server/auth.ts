import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "eva_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function passwordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sign(payload: string): string {
  // Changing ADMIN_PASSWORD (or SESSION_SECRET) logs everyone out.
  const key = `${process.env.ADMIN_PASSWORD ?? ""}::${process.env.SESSION_SECRET ?? "eva-portfolio"}`;
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function digest(value: string): Buffer {
  return createHmac("sha256", "password-compare").update(value).digest();
}

export function checkPassword(input: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof input !== "string") return false;
  return timingSafeEqual(digest(input), digest(expected));
}

export function createSessionToken(): string {
  const exp = Date.now() + SESSION_MAX_AGE * 1000;
  return `${exp}.${sign(`session:${exp}`)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !passwordConfigured()) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now()) return false;
  const expected = Buffer.from(sign(`session:${exp}`));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function isAuthed(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

export function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
