import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-[var(--text-primary)] mb-4">404</h1>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Page Not Found
        </h2>
        <p className="text-[var(--text-muted)] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 rounded-[var(--radius-md)] bg-[var(--primary-700)] text-white font-medium hover:bg-[var(--primary-500)] transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/help"
            className="inline-flex items-center px-6 py-3 rounded-[var(--radius-md)] border border-[var(--border-color)] text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Help Center
          </Link>
        </div>
      </div>
    </div>
  );
}
