import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeading } from "@/components/layout/PageHeading";
import { Section } from "@/components/layout/Section";

export default function AboutPage() {
  return (
    <PageContainer className="py-8">
      <PageHeading title="About AquaBlend" />

      <Section id="what" title="What AquaBlend does">
        <p className="text-sm text-ink-muted max-w-2xl">
          AquaBlend helps operators plan how water is drawn from multiple sources, blended, treated, and delivered
          to demand zones, while meeting water-quality limits at the lowest cost. An operator describes or selects
          a scenario, runs an optimisation, and reviews the deterministic result alongside a plain-language
          explanation.
        </p>
      </Section>

      <Section id="considers" title="What the optimisation considers">
        <ul className="list-disc pl-5 text-sm text-ink-muted max-w-2xl flex flex-col gap-1">
          <li>Source availability, capacity, and cost</li>
          <li>Treatment plant throughput and cost</li>
          <li>Demand at each zone</li>
          <li>Water-quality limits for the blended supply at each plant</li>
        </ul>
      </Section>

      <Section id="selected" title="Meaning of selected sources / blend">
        <p className="text-sm text-ink-muted max-w-2xl">
          A source is &ldquo;selected&rdquo; when the optimisation withdraws water from it in the solved plan. The
          blend ratio is that source&rsquo;s share of the total water withdrawn. Sources not selected were not part
          of the lowest-cost feasible plan for that scenario. See{" "}
          <Link href="/system-flow" className="text-primary hover:underline">
            System Flow
          </Link>{" "}
          for how that decision is produced.
        </p>
      </Section>

      <Section id="milp-vs-ai" title="MILP result vs. AI explanation">
        <p className="text-sm text-ink-muted max-w-2xl">
          The mixed-integer linear program (MILP) is the source of truth: it produces the deterministic optimisation
          result. The AI explanation is a separate, plain-language summary of that result. It never makes or
          changes the optimisation decision, and is always shown clearly labelled and visually distinct from the
          solver&rsquo;s own output.
        </p>
      </Section>

      <Section id="limitations" title="Limitations / disclaimer">
        <p className="text-sm text-ink-muted max-w-2xl">
          This interface is built against typed mock data for scenarios that are not yet connected to a live
          upstream service. Some scenarios intentionally exercise infeasible, failed, or partial-data conditions for
          testing and should not be read as real operational outcomes.
        </p>
      </Section>
    </PageContainer>
  );
}
