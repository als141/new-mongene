import Header from "@/components/layout/Header";
import BackgroundShapes from "@/components/layout/BackgroundShapes";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 relative">
      <BackgroundShapes />
      <Header />
      <main className="relative z-10">{children}</main>
    </div>
  );
}
