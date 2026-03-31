import { NextRequest } from "next/server";

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const remoteAddr = request.headers.get("remote-addr");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return realIP || remoteAddr || "unknown";
}

export async function getLocationFromIP(ip: string): Promise<string> {
  try {
    // Placeholder for IP geolocation service
    // In production, integrate with services like ipapi.co, ipgeolocation.io, etc.
    if (
      ip === "unknown" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("127.")
    ) {
      return "Local Network";
    }

    // Example with ipapi.co (free tier available)
    // const response = await fetch(`https://ipapi.co/${ip}/json/`)
    // const data = await response.json()
    // return `${data.city}, ${data.region}, ${data.country_name}`

    return `Location for ${ip}`; // Placeholder
  } catch (error) {
    return "Unknown Location";
  }
}
