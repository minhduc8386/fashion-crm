import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE = "fashion_crm_token";

export interface StaffSession {
  email: string;
  name?: string;
  role?: string;
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET in environment variables.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(staff: StaffSession) {
  return new SignJWT({
    email: staff.email,
    name: staff.name || staff.email,
    role: staff.role || "staff",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<StaffSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!email) return null;

    return {
      email,
      name: typeof payload.name === "string" ? payload.name : email,
      role: typeof payload.role === "string" ? payload.role : "staff",
    };
  } catch {
    return null;
  }
}
