import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AdminDashboard from "./AdminDashboard";
import MemberDashboard from "./MemberDashboard";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "admin") {
    return <AdminDashboard session={session} />;
  }

  return <MemberDashboard session={session} />;
}
