import jwt, { type Secret } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

const JWT_SECRET: Secret = process.env.JWT_SECRET as Secret;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "STUDENT" | "TEACHER";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: any, expiresIn: string = "24h"): string {
  return (jwt as any).sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): any {
  try {
    return (jwt as any).verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function authenticateUser(
  email: string,
  password: string,
  role: "STUDENT" | "TEACHER",
): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.role !== role) {
    return null;
  }

  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "STUDENT" | "TEACHER",
  };
}

export function generateAttendanceToken(attendanceId: string): string {
  return generateToken({ attendanceId, type: "attendance" }, "7d");
}
