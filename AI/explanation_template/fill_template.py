"""
Task 38: hard-coded explanation template fallback.

Fills the placeholders in explanation_template.json with figures from one
scenario input (MILP/config/scenarios format) and its MILP output
(raw_output_json). This is the only hard-coded explanation template; it is the
fallback when an LLM explanation is not available or fails validation.

Rules:
- The gate mode from the Task 45 agreement decides which template is used
  (VALID, NO_SOLUTION or INVALID_OUTPUT).
- Every figure taken from the MILP output is read through is_presentable(), so
  a field the agreement does not allow can never reach the text. If the
  template asks for one, filling fails with an error instead.
- Names, per-zone demand, quality limits in their reporting units and whether
  chemical dosing is on come from the scenario input, because the MILP output
  does not carry them (agreement gaps G6 and G12).

Usage (from AI/explanation_template):
    python fill_template.py --scenario ../../MILP/config/scenarios/base_scenarios_v1.json \
        --output ../milp_output_agreement/fixtures/feasible.json
    add --json for the structured version (headline, summary, key_figures, caveats)

Standard library only.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "milp_output_agreement"))

from presentation_gate import (  # noqa: E402
    INVALID_OUTPUT,
    NO_SOLUTION,
    VALID,
    gate_mode,
    is_presentable,
    load_rules,
)

TEMPLATE_PATH = HERE / "explanation_template.json"


class TemplateError(ValueError):
    pass


# --------------------------------------------------------------------------
# Reading the MILP output: only presentable fields
# --------------------------------------------------------------------------


class OutputReader:
    """Reads MILP output fields and refuses any the agreement does not allow."""

    def __init__(self, output: dict[str, Any], rules: dict[str, Any] | None = None):
        self.output = output
        self.rules = rules or load_rules()
        self.mode = gate_mode(output)

    def get(self, rule_path: str, record: dict[str, Any] | None = None) -> Any:
        """rule_path is the agreement's path, e.g. 'summary.costs.total_cost' or
        'sources[].withdrawal_ml_per_day'. For a list item pass the item as record."""
        key = rule_path.rsplit(".", 1)[-1]
        if key.endswith("[]"):  # a list of plain values, e.g. binding_constraints_summary[]
            key = key[:-2]
        container = record if record is not None else self._walk(rule_path)
        value = container.get(key) if isinstance(container, dict) else None
        if not is_presentable(rule_path, value, self.mode, record, self.rules):
            raise TemplateError(
                f"The template asked for '{rule_path}', which the Task 45 agreement "
                f"does not allow in {self.mode} mode."
            )
        return value

    def _walk(self, rule_path: str) -> Any:
        node: Any = self.output
        for part in rule_path.split(".")[:-1]:
            node = node.get(part, {}) if isinstance(node, dict) else {}
        return node

    def items(self, list_path: str) -> list[dict[str, Any]]:
        """The records of a list such as 'sources' or 'quality.plant_inflow'."""
        node: Any = self.output
        for part in list_path.split("."):
            node = node.get(part, []) if isinstance(node, dict) else []
        return [item for item in node if isinstance(item, dict)]


# --------------------------------------------------------------------------
# Reading the scenario input
# --------------------------------------------------------------------------


class ScenarioReader:
    def __init__(self, scenario: dict[str, Any]):
        self.scenario = scenario
        network = scenario.get("network", {})
        self.source_names = {s["source_id"]: s.get("name") for s in scenario.get("sources", [])}
        self.plant_names = {p["plant_id"]: p.get("name") for p in network.get("plants", [])}
        self.zones = {z["zone_id"]: z for z in network.get("demand_zones", [])}
        self.quality = (scenario.get("quality_limits") or {}).get("parameters", {})

    @property
    def scenario_id(self) -> str | None:
        return self.scenario.get("scenario_id")

    def name(self) -> str:
        return self.scenario.get("scenario_name") or self.scenario_id or "this scenario"

    def source_name(self, source_id: str) -> str:
        return self.source_names.get(source_id) or source_id

    def plant_name(self, plant_id: str) -> str:
        return self.plant_names.get(plant_id) or plant_id

    def zone_name(self, zone_id: str) -> str:
        return (self.zones.get(zone_id) or {}).get("name") or zone_id

    def zone_demand(self, zone_id: str) -> float | None:
        return (self.zones.get(zone_id) or {}).get("demand_ml_per_day")

    def quality_limit(self, parameter_id: str) -> dict[str, Any]:
        # Keys differ in case between scenario files and the contract ("ph" / "pH"), gap G8.
        for key, value in self.quality.items():
            if key.lower() == str(parameter_id).lower():
                return value
        return {}

    def dosing_enabled(self) -> bool | None:
        return (self.scenario.get("treatment") or {}).get("chemical_dosing_enabled")


# --------------------------------------------------------------------------
# Formatting
# --------------------------------------------------------------------------


def num(value: Any) -> str:
    """Up to 2 decimals, no trailing zeros, thousands separators from 1,000."""
    if value is None:
        return "n/a"
    value = round(float(value), 2)
    if value.is_integer():
        return f"{int(value):,}"
    text = f"{value:,.2f}".rstrip("0").rstrip(".")
    return text


def fill(template: str, **values: Any) -> str:
    try:
        return template.format_map(values)
    except KeyError as exc:
        raise TemplateError(f"Template placeholder {exc} has no value in: {template!r}") from exc


def status_label(status: Any, labels: dict[str, str]) -> str:
    # Code emits lowercase Pyomo values, the contract says uppercase (gap G2).
    text = str(status or "unknown")
    return labels.get(text.lower(), text)


# --------------------------------------------------------------------------
# Building the explanation
# --------------------------------------------------------------------------


def build_explanation(
    scenario: dict[str, Any],
    output: dict[str, Any],
    template: dict[str, Any] | None = None,
    rules: dict[str, Any] | None = None,
) -> dict[str, Any]:
    template = template or json.loads(TEMPLATE_PATH.read_text(encoding="utf-8"))
    out = OutputReader(output, rules)
    scn = ScenarioReader(scenario)

    output_scenario_id = (output.get("scenario") or {}).get("scenario_id")
    if scn.scenario_id and output_scenario_id and scn.scenario_id != output_scenario_id:
        raise TemplateError(
            f"Scenario '{scn.scenario_id}' does not match the MILP output's scenario '{output_scenario_id}'."
        )

    common = {
        "scenario_name": scn.name(),
        "solver_status_label": status_label(out.get("solver.status"), template["solver_status_labels"]),
        "total_demand": num(out.get("summary.total_demand_ml_per_day")),
        "source_count": len(out.items("sources")),
        "zone_count": len(scn.zones) or len(out.items("demand_zones")),
    }

    if out.mode == VALID:
        result = _valid(template["VALID"], out, scn, common)
    elif out.mode == NO_SOLUTION:
        result = _no_solution(template["NO_SOLUTION"], out, scn, common)
    else:
        result = _invalid(template["INVALID_OUTPUT"], common)

    result.update(mode=out.mode, template_version=template.get("template_version"))
    return result


def _valid(t: dict, out: OutputReader, scn: ScenarioReader, common: dict) -> dict:
    totals = {
        "total_delivered": num(out.get("summary.total_delivered_ml_per_day")),
        "total_cost": num(out.get("summary.costs.total_cost")),
        "selected_count": out.get("summary.selected_source_count"),
        "active_plant_count": out.get("summary.active_plant_count"),
    }
    values = {**common, **totals}
    is_optimal = (out.output.get("solver") or {}).get("is_optimal") is True  # evidence field: wording only
    headline = fill(t["headline_optimal"] if is_optimal else t["headline_not_optimal"], **values)

    sections: list[tuple[str, list[str]]] = []

    lines = []
    for s in out.items("sources"):
        sid = out.get("sources[].source_id", s)
        status = out.get("sources[].selection_status", s)
        item = {"name": scn.source_name(sid), "source_id": sid}
        if status == "SELECTED":
            item.update(
                withdrawal=num(out.get("sources[].withdrawal_ml_per_day", s)),
                blend_percent=num(out.get("sources[].blend_ratio", s) * 100),
                utilisation=num(out.get("sources[].utilisation_percent", s)),
            )
        lines.append(fill(t["sources"].get(status, t["sources"]["NOT_SELECTED"]), **item))
    sections.append((fill(t["sources"]["heading"], **values), lines))

    lines = []
    for p in out.items("plants"):
        pid = out.get("plants[].plant_id", p)
        if out.get("plants[].activated", p):
            lines.append(fill(t["plants"]["active"], name=scn.plant_name(pid),
                              throughput=num(out.get("plants[].throughput_ml_per_day", p)),
                              utilisation=num(out.get("plants[].utilisation_percent", p))))
        else:
            lines.append(fill(t["plants"]["inactive"], name=scn.plant_name(pid)))
    sections.append((fill(t["plants"]["heading"], **values), lines))

    lines = []
    for z in out.items("demand_zones"):
        zid = out.get("demand_zones[].zone_id", z)
        demand = scn.zone_demand(zid)  # per-zone demand is only in the scenario (gap G6)
        met = out.get("demand_zones[].demand_satisfied", z)
        key = ("met" if met else "short") + ("" if demand is not None else "_no_demand")
        lines.append(fill(t["zones"][key], name=scn.zone_name(zid),
                          delivered=num(out.get("demand_zones[].delivered_ml_per_day", z)),
                          demand=num(demand),
                          unmet=num(out.get("demand_zones[].unmet_demand_ml_per_day", z))))
    sections.append((t["zones"]["heading"], lines))

    costs = fill(t["costs"]["text"], total_cost=totals["total_cost"],
                 source_fixed=num(out.get("summary.costs.total_source_fixed_cost")),
                 source_variable=num(out.get("summary.costs.total_source_variable_cost")),
                 plant_fixed=num(out.get("summary.costs.total_plant_fixed_cost")),
                 plant_variable=num(out.get("summary.costs.total_plant_variable_cost")))
    sections.append((t["costs"]["heading"], [costs]))

    q = t["quality"]
    for plant in out.items("quality.plant_inflow"):
        pid = out.get("quality.plant_inflow[].plant_id", plant)
        lines = []
        for param in plant.get("parameters", []):
            path = "quality.plant_inflow[].parameters[]."
            pid_param = out.get(path + "parameter_id", param)
            limit = scn.quality_limit(pid_param)  # reporting-unit limits, e.g. pH 6.5 to 8.5 (gap G12)
            name = limit.get("name") or pid_param
            unit = out.get(path + "reported_unit", param) or ""
            item = {
                "parameter": name,
                "value": num(out.get(path + "reported_value", param)),
                # " mg/L CaCO3", but nothing for pH, whose unit is its own name
                "unit": "" if unit.lower() in ("", str(name).lower()) else f" {unit}",
                "status": q["within"] if out.get(path + "within_limits", param) else q["outside"],
            }
            if limit.get("min") is not None and limit.get("max") is not None:
                lines.append(fill(q["with_limits"], min=num(limit["min"]), max=num(limit["max"]), **item))
            else:
                lines.append(fill(q["no_limits"], **item))
        if lines:
            sections.append((fill(q["heading"], plant_name=scn.plant_name(pid)), lines))

    binding = list(out.get("binding_constraints_summary[]") or [])
    if binding:
        sections.append((t["binding"]["heading"], binding))

    caveats = list(t["caveats"])
    if scn.dosing_enabled() is False:
        caveats.append(t["caveat_dosing_off"])

    key_figures = [
        {"label": "Total cost", "value": out.get("summary.costs.total_cost"), "unit": "cost units",
         "fact_path": "summary.costs.total_cost"},
        {"label": "Total delivered", "value": out.get("summary.total_delivered_ml_per_day"), "unit": "ML/day",
         "fact_path": "summary.total_delivered_ml_per_day"},
        {"label": "Total demand", "value": out.get("summary.total_demand_ml_per_day"), "unit": "ML/day",
         "fact_path": "summary.total_demand_ml_per_day"},
    ]
    return {"title": fill(t["title"], **values), "headline": headline,
            "sections": sections, "key_figures": key_figures, "caveats": caveats}


def _no_solution(t: dict, out: OutputReader, scn: ScenarioReader, common: dict) -> dict:
    body = [fill(t["text"], **common), t["no_figures"]]
    excluded = [
        fill(t["excluded_item"], name=scn.source_name(s["source_id"]), source_id=s["source_id"])
        for s in out.items("sources")
        if s.get("selection_status") == "EXCLUDED"
        and out.get("sources[].selection_status", s) == "EXCLUDED"
    ]
    sections = [("", body)]
    if excluded:
        sections.append((t["excluded_heading"], excluded))
    key_figures = [{"label": "Total demand", "value": out.get("summary.total_demand_ml_per_day"),
                    "unit": "ML/day", "fact_path": "summary.total_demand_ml_per_day"}]
    return {"title": fill(t["title"], **common), "headline": fill(t["headline"], **common),
            "sections": sections, "key_figures": key_figures, "caveats": list(t["caveats"])}


def _invalid(t: dict, common: dict) -> dict:
    return {"title": fill(t["title"], **common), "headline": fill(t["headline"], **common),
            "sections": [("", [fill(t["text"], **common)])], "key_figures": [],
            "caveats": list(t["caveats"])}


# --------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------


def to_markdown(explanation: dict[str, Any]) -> str:
    parts = [f"# {explanation['title']}", "", explanation["headline"], ""]
    for heading, lines in explanation["sections"]:
        if heading:
            parts += [f"## {heading}", ""]
            parts += [f"- {line}" for line in lines]
        else:
            for line in lines:
                parts += [line, ""]
            continue
        parts.append("")
    if explanation["caveats"]:
        parts += ["## Notes", ""] + [f"- {c}" for c in explanation["caveats"]] + [""]
    return "\n".join(parts)


def to_report(explanation: dict[str, Any]) -> dict[str, Any]:
    """Same top-level fields as the Task 46 LLM report, so the app can show either."""
    body = to_markdown({**explanation, "title": "", "headline": "", "caveats": []})
    return {
        "headline": explanation["headline"],
        "summary": body.strip().lstrip("#").strip(),
        "key_figures": explanation["key_figures"],
        "caveats": explanation["caveats"],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fill the AquaBlend explanation template (Task 38).")
    parser.add_argument("--scenario", required=True, help="scenario input JSON (MILP/config/scenarios format)")
    parser.add_argument("--output", required=True, help="MILP output JSON (raw_output_json)")
    parser.add_argument("--json", action="store_true", help="print headline/summary/key_figures/caveats JSON")
    args = parser.parse_args(argv)

    scenario = json.loads(Path(args.scenario).read_text(encoding="utf-8"))
    output = json.loads(Path(args.output).read_text(encoding="utf-8"))
    try:
        explanation = build_explanation(scenario, output)
    except TemplateError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    if args.json:
        print(json.dumps({"mode": explanation["mode"], **to_report(explanation)}, indent=2))
    else:
        print(to_markdown(explanation))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
