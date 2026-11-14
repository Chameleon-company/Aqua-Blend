import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { DottedWater } from "@/components/hero/DottedWater";

const STEPS = [
  {
    title: "Describe the scenario",
    description: "Tell AquaBlend what you need in plain language, or select a prepared scenario.",
  },
  {
    title: "MILP solves it",
    description: "A mixed-integer linear program finds the lowest-cost feasible blend, flow, and treatment plan.",
  },
  {
    title: "Understand the result",
    description: "Review solver facts and a clearly separated AI explanation, side by side.",
  },
];

export default function LandingPage() {
  return (
    <div>
      <section className="relative isolate overflow-hidden bg-ink min-h-[34rem] sm:min-h-[42rem] flex items-center">
        <div className="absolute inset-0">
          <DottedWater />
        </div>

        <PageContainer className="relative z-10 py-16 sm:py-24">
          <div className="max-w-xl">
            <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-white leading-[1.05]">
              Optimise water decisions.{" "}
              <span className="bg-clip-text text-transparent bg-linear-to-r from-accent to-primary-soft">
                Understand every result.
              </span>
            </h1>
            <p className="mt-6 text-base text-white/70 max-w-md">
              AquaBlend combines validated source data, MILP optimisation and AI-assisted explanation into one
              operator-facing workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/scenarios">
                <Button size="md">Start Optimising</Button>
              </Link>
              <Link href="/system-flow">
                <Button size="md" variant="onDark">
                  Explore System Flow
                </Button>
              </Link>
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="border-t border-border">
        <PageContainer className="py-16">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-faint mb-8">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="border-t-2 pt-4"
                style={{ borderImage: "linear-gradient(to right, var(--color-primary), var(--color-accent)) 1" }}
              >
                <p className="text-xs font-mono text-ink-faint">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      <footer className="border-t border-border">
        <PageContainer className="py-8 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-faint">
          <span>AquaBlend</span>
          <span>MILP results and AI explanation, clearly separated.</span>
        </PageContainer>
      </footer>
    </div>
  );
}
