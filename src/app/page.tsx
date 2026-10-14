import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "hostelhub-super-secure-production-jwt-secret-key-32-chars-min"
);

function getHomeForRole(role: string): string {
  switch (role) {
    case "STUDENT":
      return "/student/dashboard";
    case "WARDEN":
      return "/warden/dashboard";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin/dashboard";
    case "SECURITY":
      return "/security/dashboard";
    default:
      return "/login";
  }
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hostelhub_token")?.value;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const role = (payload as any).role;
      redirect(getHomeForRole(role));
    } catch {
      // Fall through to /login
    }
  }

  redirect("/login");
}
