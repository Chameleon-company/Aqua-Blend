import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeading } from "@/components/layout/PageHeading";
import { Section } from "@/components/layout/Section";
import { SystemFlowGraph } from "@/components/system-flow/SystemFlowGraph";
import { SystemFlowTableFallback } from "@/components/system-flow/SystemFlowTableFallback";

export default function SystemFlowPage() {
  return (
    <PageContainer className="py-8">
      <PageHeading
        title="System Flow"
        description="How data moves through AquaBlend, from source data to the result you see on screen. Hover or select a component to trace what it connects to."
      />

      <Section id="graph" title="Architecture">
        <SystemFlowGraph />
      </Section>

      <Section id="table" title="Component Reference (accessible view)">
        <SystemFlowTableFallback />
      </Section>
    </PageContainer>
  );
}
