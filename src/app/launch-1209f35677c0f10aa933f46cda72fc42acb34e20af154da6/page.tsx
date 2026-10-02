import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { LiveTimer } from "@/app/timer/LiveTimer";

export const metadata: Metadata = {
  title: "Opening ceremony",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function CeremonyPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const demo = (await searchParams).demo === "1" && process.env.NODE_ENV === "development";
  return (
    <main id="main-content" className="flex-1">
      <section aria-labelledby="ceremony-page-title" className="site-grid relative isolate flex min-h-svh items-center overflow-hidden py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-5xl text-center">
            <h1 id="ceremony-page-title" className="sr-only">CodeUtsava X opening ceremony</h1>
            <LiveTimer demo={demo} allowStart redirectOnStart={demo ? "/timer?demo=1" : "/timer"} />
          </div>
        </Container>
      </section>
    </main>
  );
}
