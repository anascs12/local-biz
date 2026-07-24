import Link from "next/link";
import { Button } from "@/components/ui/Button";

/**
 * Interim entry point.
 *
 * NOTE: This is NOT the real landing page (SPEC §9.1) — that is built with the
 * F1 marketing page. For now it provides the route into the dashboard so the
 * app is navigable.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-content flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-display-mobile text-text-900 md:text-display">
          Turn your business data
          <br />
          into better decisions.
        </h1>
        <p className="mx-auto max-w-xl text-body text-text-600">
          Upload the sales file you already keep and get a working dashboard, product-level
          intelligence, and an AI analyst grounded in your real numbers.
        </p>
      </div>
      <Link href="/dashboard">
        <Button size="lg">Open the dashboard</Button>
      </Link>
    </main>
  );
}
