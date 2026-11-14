import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeading } from "@/components/layout/PageHeading";
import { ScenarioForm } from "@/components/scenarios/ScenarioForm";

export default function NewScenarioPage() {
  return (
    <PageContainer className="py-8">
      <PageHeading title="New Scenario" description="Define the conditions you want the model to test. Creating a scenario does not run the optimisation." />
      <ScenarioForm mode="create" />
    </PageContainer>
  );
}
