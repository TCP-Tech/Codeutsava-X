import { Container } from "@/components/ui/container";
import { LiveTimer } from "./LiveTimer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Hackathon countdown",
  description: "Follow the shared 28-hour CodeUtsava X hackathon countdown.",
  path: "/timer",
});

export default async function TimerPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const demo = (await searchParams).demo === "1" && process.env.NODE_ENV === "development";
  return (
    <main id="main-content" className="flex-1">
      <section aria-labelledby="timer-page-title" className="site-grid relative isolate flex min-h-svh items-center overflow-hidden py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-5xl text-center">
            <h1 id="timer-page-title" className="sr-only">CodeUtsava X hackathon countdown</h1>
            <LiveTimer demo={demo} />
          </div>
        </Container>
      </section>
    </main>
  );
}
