import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  checkPassword,
  createSessionToken,
  passwordConfigured,
} from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  if (!passwordConfigured()) {
    return Response.json(
      { error: "На сервере не задан ADMIN_PASSWORD — добавьте его в настройки Vercel." },
      { status: 500 },
    );
  }
  let password: unknown;
  try {
    ({ password } = (await req.json()) as { password?: unknown });
  } catch {}

  if (!checkPassword(password)) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "Неверный пароль" }, { status: 401 });
  }

  const res = Response.json({ ok: true });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${createSessionToken()}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; SameSite=Strict${secure}`,
  );
  return res;
}
