import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Collapsible } from "@/components/ui/Collapsible";
import { formatUnit } from "@/utils/formatters";
import type { QualityProfile } from "@/types/reference-data";

export interface QualityProfileSelectorProps {
  profiles: QualityProfile[];
  value: string | null;
  onChange: (profileId: string | null) => void;
}

/** Normal UI is a single profile dropdown; advanced mode only ever displays, never free-text-edits, parameter limits. */
export function QualityProfileSelector({ profiles, value, onChange }: QualityProfileSelectorProps) {
  const selected = profiles.find((p) => p.profileId === value);

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <Field id="quality-profile" label="Quality Profile" required>
        <Select id="quality-profile" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
          <option value="" disabled>
            Select a profile
          </option>
          {profiles.map((p) => (
            <option key={p.profileId} value={p.profileId}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      {selected ? (
        <Collapsible summary="Advanced: view profile limits">
          <p className="text-xs text-ink-faint mb-3">{selected.description}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {selected.parameters.map((param) => (
              <div key={param.parameterId}>
                <dt className="text-ink-faint">{param.label}</dt>
                <dd className="text-ink">
                  {param.lowerLimit !== undefined ? formatUnit(param.lowerLimit, param.unit) : "—"} to{" "}
                  {param.upperLimit !== undefined ? formatUnit(param.upperLimit, param.unit) : "—"}
                </dd>
              </div>
            ))}
          </dl>
        </Collapsible>
      ) : null}
    </div>
  );
}
