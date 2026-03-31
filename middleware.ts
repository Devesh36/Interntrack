import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

async function verifyJwt(token: string): Promise<any | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected routes
  const protectedRoutes = ["/student/dashboard", "/teacher/dashboard"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtectedRoute) {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      const isStudentRoute = pathname.startsWith("/student");
      const redirectUrl = isStudentRoute ? "/student/login" : "/teacher/login";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    const user = await verifyJwt(token);
    if (!user) {
      const isStudentRoute = pathname.startsWith("/student");
      const redirectUrl = isStudentRoute ? "/student/login" : "/teacher/login";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // Check role-based access
    if (pathname.startsWith("/student") && user.role !== "STUDENT") {
      return NextResponse.redirect(new URL("/student/login", request.url));
    }

    if (pathname.startsWith("/teacher") && user.role !== "TEACHER") {
      return NextResponse.redirect(new URL("/teacher/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/dashboard/:path*", "/teacher/dashboard/:path*"],
};
