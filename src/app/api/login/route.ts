import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getExpectedPassword } from "@/lib/auth";

type LoginBody = {
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  if (!body.password) {
    return NextResponse.json({ ok: false, message: "Password is required." }, { status: 400 });
  }

  if (body.password !== getExpectedPassword()) {
    return NextResponse.json({ ok: false, message: "Wrong password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
