import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex bg-background min-h-screen">
      <Navbar />
      <Sidebar />
      <div className="flex overflow-hidden pt-16 w-full">
        <main className="relative h-full w-full overflow-y-auto lg:ml-64 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
