import { UserSearchSidebar } from '@/components/user-search-sidebar';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <aside className="lg:col-span-1">
        <UserSearchSidebar />
      </aside>
      <main className="lg:col-span-3">
        {children}
      </main>
    </div>
  );
}
