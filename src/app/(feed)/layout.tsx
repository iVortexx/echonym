import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
          <SidebarTrigger />
      <main className="flex-1 min-w-0 py-8">
        <div className="mx-auto max-w-3xl px-4">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
