import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
      <Sidebar userRole={session.role} userName={session.name} />

      <main className="flex-1 lg:ml-64 min-w-0 max-w-full overflow-x-hidden">
        <div className="pt-16 lg:pt-0 min-h-screen w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
