export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark-teal/5">
      {children}
    </div>
  );
}
