import Link from "next/link";
export default function NotFound() {
  return (
    <main className="not-found">
      <p className="not-found__code">404</p>
      <Link href="/" className="back-link">
        ← Eva Rovenskaia
      </Link>
    </main>
  );
}
