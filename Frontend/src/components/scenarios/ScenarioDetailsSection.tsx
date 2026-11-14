import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";

export interface ScenarioDetailsSectionProps {
  scenarioName: string;
  description: string;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
}

/** scenario_id / status / validation_issues are server-owned and never editable here. */
export function ScenarioDetailsSection({ scenarioName, description, onChangeName, onChangeDescription }: ScenarioDetailsSectionProps) {
  return (
    <div className="flex flex-col gap-5 max-w-xl">
      <Field id="scenario-name" label="Scenario Name" required>
        <input
          id="scenario-name"
          type="text"
          value={scenarioName}
          onChange={(e) => onChangeName(e.target.value)}
          className="w-full rounded-sm border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-primary"
          placeholder="e.g. Tomorrow's Supply (Zone 1 Priority)"
        />
      </Field>

      <Field id="scenario-description" label="Description">
        <Textarea
          id="scenario-description"
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          rows={3}
          placeholder="Optional notes describing what this scenario tests."
        />
      </Field>
    </div>
  );
}
