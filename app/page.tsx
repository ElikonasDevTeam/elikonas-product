export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-24">
      <h1 className="text-4xl font-bold text-brand-dark-teal">Elikonas</h1>
      <p className="text-lg text-brand-charcoal">
        AI-powered education marketplace for non-traditional learners.
      </p>
      <div className="flex gap-4">
        <a
          href="/login"
          className="px-6 py-2 rounded-md border border-brand-dark-teal text-brand-dark-teal hover:bg-brand-dark-teal hover:text-white transition-colors"
        >
          Log In
        </a>
        <a
          href="/signup"
          className="px-6 py-2 rounded-md bg-brand-dark-teal text-white hover:opacity-90 transition-opacity"
        >
          Sign Up
        </a>
      </div>
    </main>
  );
}
