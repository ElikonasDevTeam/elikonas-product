export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="h-16 border-b border-gray-200 bg-brand-dark-teal px-6 flex items-center">
        <span className="text-white font-semibold text-lg">Elikonas</span>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
