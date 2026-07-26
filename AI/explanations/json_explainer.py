"""
json_explainer.py

AquaBlend | Analysis & AI | Sprint 1 | Task 9
Build and test the fallback explanation generator.

Reads a Results JSON matching the contract defined in the AquaBlend MILP
Configuration document (Section 8) and produces a complete, operator-
readable, plain-language explanation. Works entirely offline - no external
LLM API call - per Task 9's own requirement.

This file wires together three templates that were each designed and
hand-validated separately, then adds the sections Task 9 needed that
didn't exist yet:

  Task 6  Template_SourceSelection.md      -> explain_sources()
  Task 7  Template_BindingConstraints.md   -> explain_binding_constraints()
  Task 8  Template_QualityMargins.md       -> explain_quality_and_margins()
  Task 9  (new)                            -> explain_sensitivity()
                                               explain_estimated_fields()
                                               build_summary()
                                               generate_explanation() [orchestrator]

explain_sensitivity() was added after Task 13's evaluation rubric
(LLM_Evaluation_Rubric.md, Section 2, evidence table) listed
`sensitivity_to_key_assumptions[]` as an area explanations are checked
against - a JSON field none of Tasks 6/7/8/9 had covered until now.

Design note (field-name isolation)
-----------------------------------
The Sprint 1 Results JSON contract is still a draft (flagged explicitly in
the Task 8 PR: "these field names aren't finalised"). Every JSON key this
script depends on is named ONCE, in the constants near the top of this
file, and read from there everywhere else. If a field gets renamed later,
this is the only block that needs to change - the logic in each explain_*
function does not.

Required vs. optional input
----------------------------
Required (raises ExplainerInputError if missing): status, sources,
water_quality.after_treatment, binding_constraints_summary. Without these
the script cannot produce a coherent explanation at all.

Optional (missing values are handled gracefully, never crash the script):
cost_per_ML on any source, data_flags.estimated_fields, demand_zones,
treatment_facilities, per-constraint slack values.

This required/optional split is a project decision made for Task 9 and
should be confirmed with the wider team, the same way Task 6 flagged its
own selected-source reason-derivation as "a design decision, not a guess."
"""

import json
import sys


# ---------------------------------------------------------------------------
# Field-name constants (see "field-name isolation" note above)
# ---------------------------------------------------------------------------

F_STATUS = "status"
F_OBJECTIVE = "objective"
F_CURRENCY = "currency"
F_SOURCES = "sources"
F_SELECTED = "selected"
F_UNUSED = "unused"
F_DEMAND_ZONES = "demand_zones"
F_TREATMENT_FACILITIES = "treatment_facilities"
F_ACTIVE = "active"
F_WATER_QUALITY = "water_quality"
F_AFTER_TREATMENT = "after_treatment"
F_BINDING_SUMMARY = "binding_constraints_summary"
F_SENSITIVITY = "sensitivity_to_key_assumptions"
F_DATA_FLAGS = "data_flags"
F_ESTIMATED_FIELDS = "estimated_fields"

REQUIRED_TOP_LEVEL_FIELDS = [F_STATUS, F_SOURCES, F_WATER_QUALITY, F_BINDING_SUMMARY]

# Per Template_QualityMargins.md unit rules
QUALITY_UNIT_RULES = {
    "pH": None,                  # no concentration unit
    "alkalinity": "mg/L CaCO3",
    "turbidity": "NTU",
}
EXPECTED_QUALITY_PARAMETERS = list(QUALITY_UNIT_RULES.keys())

ORDINAL_WORDS = {
    1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth",
    6: "sixth", 7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth",
}


class ExplainerInputError(ValueError):
    """Raised when a required field is missing from the input JSON."""


# ---------------------------------------------------------------------------
# Validation & feasibility gate
# ---------------------------------------------------------------------------

def validate_input(data: dict) -> None:
    """Raise ExplainerInputError with a clear message if a required field
    is missing. Called once, before any explain_* function runs."""
    if not isinstance(data, dict):
        raise ExplainerInputError("Input must be a JSON object (Python dict).")

    missing = [f for f in REQUIRED_TOP_LEVEL_FIELDS if f not in data]
    if missing:
        raise ExplainerInputError(
            f"Missing required field(s): {', '.join(missing)}. "
            "Cannot generate an explanation without these."
        )

    if F_AFTER_TREATMENT not in data.get(F_WATER_QUALITY, {}):
        raise ExplainerInputError(
            f"Missing required field: {F_WATER_QUALITY}.{F_AFTER_TREATMENT}."
        )


def check_feasibility(data: dict):
    """Global feasibility gate (extends Task 6's per-section gate to the
    whole explanation, per Task 9 design discussion). Returns a message
    string if the scenario is not OPTIMAL, else None."""
    status = data.get(F_STATUS)
    if status != "OPTIMAL":
        return f"No blend could be recommended for this scenario ({status})."
    return None


# ---------------------------------------------------------------------------
# Task 6 - Source-selection explanation (Template_SourceSelection.md)
# ---------------------------------------------------------------------------

def _ordinal(n: int) -> str:
    return ORDINAL_WORDS.get(n, f"{n}th")


def _mentions(hint: str, estimated_fields: list) -> bool:
    hint = (hint or "").lower()
    return any(hint in ef.lower() for ef in estimated_fields)


def _cost_ranking(all_sources: list) -> list:
    """Rank every source with a numeric cost_per_ML, ascending. Sources
    with no cost_per_ML are excluded from ranking (Section 7 of the
    template)."""
    costed = [s for s in all_sources if s.get("cost_per_ML") is not None]
    costed_sorted = sorted(costed, key=lambda s: s["cost_per_ML"])
    return [s["source_id"] for s in costed_sorted]


def explain_sources(data: dict) -> str:
    sources = data.get(F_SOURCES, {}) or {}
    selected = sources.get(F_SELECTED, []) or []
    unused = sources.get(F_UNUSED, []) or []
    binding = data.get(F_BINDING_SUMMARY, []) or []
    estimated_fields = data.get(F_DATA_FLAGS, {}).get(F_ESTIMATED_FIELDS, []) or []
    # cost_per_ML has no currency field of its own anywhere in the contract -
    # objective.currency is the only currency the JSON actually states, so it's
    # applied here too rather than assuming AUD. Per rubric C7 ("cost uses AUD"),
    # every dollar figure in the explanation must carry a currency, not just the
    # summary total.
    currency = (data.get(F_OBJECTIVE, {}) or {}).get(F_CURRENCY)

    # Section 7: zero selected sources (e.g. zero demand)
    if not selected and not unused:
        return "No sources were required for this scenario."

    ranking = _cost_ranking(selected + unused)
    lines = []

    if not selected:
        lines.append("No sources were required for this scenario.")
    else:
        ordered = sorted(selected, key=lambda s: s.get("percent_of_blend", 0), reverse=True)
        for s in ordered:
            source_id = s.get("source_id")
            name = s.get("source_name", source_id)
            pct = s.get("percent_of_blend")
            vol = round(s.get("volume_drawn_ML", 0))
            cost = s.get("cost_per_ML")
            capacity_binding = f"{source_id}_capacity" in binding

            if cost is None:
                # Section 7: missing cost_per_ML on a selected source
                reason_clause = ("it was included in the optimal blend to help meet "
                                  "demand at minimum total cost")
                sentence = f"{name} supplied {pct}% of the blend ({vol} ML), because {reason_clause}."
            else:
                rank = ranking.index(source_id) + 1 if source_id in ranking else None
                if rank == 1 and capacity_binding:
                    reason_clause = ("it is the cheapest available source and was used "
                                      "at its full available capacity")
                elif capacity_binding:
                    reason_clause = "it was used at its full available capacity for this scenario"
                elif rank == 1:
                    reason_clause = ("it is the cheapest available source for this scenario, "
                                      "with capacity remaining")
                elif rank is not None:
                    reason_clause = (f"it supplemented the blend, at the {_ordinal(rank)} lowest "
                                      "cost, to meet remaining demand after lower-cost sources "
                                      "reached capacity")
                else:
                    reason_clause = ("it was included in the optimal blend to help meet demand "
                                      "at minimum total cost")

                estimated_tag = " (estimated)" if (
                    _mentions("cost_per_ML", estimated_fields) or _mentions(source_id, estimated_fields)
                ) else ""
                currency_str = f" {currency}" if currency else ""
                sentence = (f"{name} supplied {pct}% of the blend ({vol} ML) at "
                            f"${cost:.2f}{currency_str}/ML{estimated_tag}, because {reason_clause}.")
            lines.append(sentence)

    for s in unused:
        name = s.get("source_name", s.get("source_id"))
        reason = s.get("reason")
        if not reason:
            # Section 7: missing reason on an unused source
            lines.append(f"{name} was not selected (no reason provided in the solver output).")
        else:
            lines.append(f"{name} was not selected because {reason}.")

    return "\n\n".join(lines)


# ---------------------------------------------------------------------------
# Task 7 - Binding constraints explanation (Template_BindingConstraints.md)
# ---------------------------------------------------------------------------

def explain_binding_constraints(data: dict) -> str:
    binding = data.get(F_BINDING_SUMMARY, []) or []
    if not binding:
        return "No constraint was binding; the solution stayed within every limit."

    sources = data.get(F_SOURCES, {}) or {}
    selected = {s["source_id"]: s for s in sources.get(F_SELECTED, []) or []}
    unused = {s["source_id"]: s for s in sources.get(F_UNUSED, []) or []}
    demand_zones = {z["zone_id"]: z for z in data.get(F_DEMAND_ZONES, []) or []}
    facilities = {
        f["facility_id"]: f
        for f in data.get(F_TREATMENT_FACILITIES, {}).get(F_ACTIVE, []) or []
    }
    quality = data.get(F_WATER_QUALITY, {}).get(F_AFTER_TREATMENT, {}) or {}

    lines = []
    for name in binding:
        matched = False

        if name.startswith("demand_satisfaction_"):
            zone_id = name[len("demand_satisfaction_"):]
            zone = demand_zones.get(zone_id)
            if zone:
                lines.append(
                    f"The solution was limited by the water demand for {zone_id}: the full "
                    f"{zone.get('required_volume_ML')} ML needed by {zone_id} had to be "
                    "delivered, leaving no room to supply any less."
                )
                matched = True

        elif name.endswith("_batch_capacity"):
            facility_id = name[: -len("_batch_capacity")]
            f = facilities.get(facility_id)
            if f:
                lines.append(
                    f"The solution was limited by the processing capacity of "
                    f"{f.get('facility_name')}: {f.get('facility_name')} was already treating "
                    f"as much as it can handle ({f.get('volume_processed_ML')} ML across "
                    f"{f.get('treatment_batches')} batches), leaving no spare capacity."
                )
                matched = True

        elif name.endswith("_capacity"):
            source_id = name[: -len("_capacity")]
            s = selected.get(source_id)
            if s:
                lines.append(
                    f"The solution was limited by the available capacity of "
                    f"{s.get('source_name')}: {s.get('source_name')} was drawn up to the most "
                    f"its capacity allows ({s.get('volume_drawn_ML')} ML), so any additional "
                    "water had to come from other sources."
                )
                matched = True

        elif name.endswith("_activation"):
            source_id = name[: -len("_activation")]
            if source_id in selected:
                s = selected[source_id]
                lines.append(
                    f"The solution was limited by whether {s.get('source_name')} is switched "
                    f"on: {s.get('source_name')} had to be switched fully on rather than "
                    "partly used, and that is what allowed it into the blend."
                )
                matched = True
            elif source_id in unused:
                s = unused[source_id]
                lines.append(
                    f"The solution was limited by whether {s.get('source_name')} is switched "
                    f"on: {s.get('source_name')} was left switched off entirely rather than "
                    "partly used, so none of it could enter the blend."
                )
                matched = True

        elif name.endswith("_range"):
            parameter = name[: -len("_range")]
            q = quality.get(parameter)
            if q:
                lines.append(
                    f"The solution was limited by the {parameter} limit: {parameter} sat "
                    f"right at the edge of its safe range ({q.get('constraint_min')}"
                    f"\u2013{q.get('constraint_max')} {q.get('unit')}), so the blend could not "
                    "be pushed any further."
                )
                matched = True

        if not matched:
            lines.append(f"The solution was limited by {name} (no plain-language mapping available).")

    return "\n\n".join(lines)


# ---------------------------------------------------------------------------
# Task 8 - Water-quality & safety-margin explanation (Template_QualityMargins.md)
# ---------------------------------------------------------------------------

def explain_quality_and_margins(data: dict) -> str:
    after = data.get(F_WATER_QUALITY, {}).get(F_AFTER_TREATMENT, {}) or {}
    estimated_fields = data.get(F_DATA_FLAGS, {}).get(F_ESTIMATED_FIELDS, []) or []

    lines = []

    # Missing parameters - never assume a pass
    for p in EXPECTED_QUALITY_PARAMETERS:
        if p not in after:
            lines.append(f"{p} was not reported in the results and could not be assessed.")

    # Unit validation
    for param, q in after.items():
        if param not in QUALITY_UNIT_RULES:
            continue
        expected_unit = QUALITY_UNIT_RULES[param]
        actual_unit = q.get("unit")
        if expected_unit is None:
            if actual_unit not in (None, "pH", ""):
                lines.append(
                    f"Note: unit mismatch for {param} - expected no concentration unit, "
                    f"got '{actual_unit}'."
                )
        elif actual_unit != expected_unit:
            lines.append(
                f"Note: unit mismatch for {param} - expected '{expected_unit}', "
                f"got '{actual_unit}'."
            )

    passing, violations = [], []
    for param, q in after.items():
        status = q.get("status")
        margin = q.get("safety_margin_percent")
        is_violation = status == "FAIL" or (margin is not None and margin < 0)
        (violations if is_violation else passing).append((param, q))

    if violations:
        for param, q in violations:
            lines.append(
                f"Not all quality parameters passed. {param} breached its allowed range: "
                f"{q.get('value')} {q.get('unit')} against a permitted "
                f"{q.get('constraint_min')}-{q.get('constraint_max')} {q.get('unit')} "
                f"(safety margin {q.get('safety_margin_percent')}%). This is treated as a "
                "violation and must be resolved before the blend is acceptable."
            )
    elif passing:
        tightest = min(passing, key=lambda pq: pq[1].get("safety_margin_percent", float("inf")))
        widest = max(passing, key=lambda pq: pq[1].get("safety_margin_percent", float("-inf")))
        t_name, t_q = tightest
        lines.append(
            f"All tested quality parameters passed. {t_name} was closest to its limit, "
            f"with a safety margin of {t_q.get('safety_margin_percent')}%."
        )
        if widest[0] != tightest[0]:
            w_name, w_q = widest
            lines.append(f"The widest margin was on {w_name} at {w_q.get('safety_margin_percent')}%.")

    for field in estimated_fields:
        if any(param.lower() in field.lower() for param in after):
            lines.append(
                f"Note: this assessment relies on estimated data for {field} and should "
                "be treated as provisional."
            )

    return "\n\n".join(lines)


# ---------------------------------------------------------------------------
# Task 9 - New sections (not covered by Tasks 6/7/8)
# ---------------------------------------------------------------------------

def explain_sensitivity(data: dict) -> str:
    """Reports sensitivity_to_key_assumptions[]. Added after Task 13's
    evaluation rubric (evidence table, Section 2) listed this field as
    something explanations are checked against - it wasn't covered by
    Task 6, 7, 8, or the original Task 9 output.

    Optional field: absence or malformed entries are handled gracefully,
    never invented (per rubric criterion C5, no invented reasons)."""
    items = data.get(F_SENSITIVITY, []) or []
    lines = []
    for item in items:
        assumption = item.get("assumption")
        impact = item.get("impact")
        if not assumption or not impact:
            # Don't fabricate a missing half of the pair - skip rather than guess.
            continue
        lines.append(f"This result is sensitive to {assumption}: {impact}.")

    if not lines:
        return "No sensitivity information was reported for this scenario."
    return "\n\n".join(lines)


def explain_estimated_fields(data: dict) -> str:
    """Standalone aggregate list of every estimated field, distinct from
    the inline '(estimated)' tags Task 6/8 attach to individual sentences."""
    estimated_fields = data.get(F_DATA_FLAGS, {}).get(F_ESTIMATED_FIELDS, []) or []
    if not estimated_fields:
        return "No fields in this result were flagged as estimated."
    bullets = "\n".join(f"- {f}" for f in estimated_fields)
    return (
        "The following fields in this result are estimated rather than measured, and "
        f"should be treated as provisional:\n{bullets}"
    )


def build_summary(data: dict) -> str:
    status = data.get(F_STATUS)
    objective = data.get(F_OBJECTIVE, {}) or {}
    total_cost = objective.get("total_cost")
    currency = objective.get(F_CURRENCY, "")
    sources = data.get(F_SOURCES, {}) or {}
    n_selected = len(sources.get(F_SELECTED, []) or [])
    n_unused = len(sources.get(F_UNUSED, []) or [])
    after = data.get(F_WATER_QUALITY, {}).get(F_AFTER_TREATMENT, {}) or {}

    overall_quality = "PASS"
    for q in after.values():
        margin = q.get("safety_margin_percent")
        if q.get("status") == "FAIL" or (margin is not None and margin < 0):
            overall_quality = "FAIL"
            break

    cost_clause = f"${total_cost:,.2f} {currency}".strip() if total_cost is not None else "not reported"
    return (
        f"This scenario is {status}. Total cost: {cost_clause}. "
        f"{n_selected} source(s) selected, {n_unused} unused. "
        f"Water quality after treatment: {overall_quality}."
    )


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def generate_explanation(data: dict) -> str:
    """Build the complete operator-readable explanation. Accepts a Python
    dict already parsed from JSON. See generate_explanation_from_file for
    reading directly from a file."""
    validate_input(data)

    infeasible_message = check_feasibility(data)
    if infeasible_message:
        return infeasible_message

    sections = [
        ("Selected & Unused Sources", explain_sources(data)),
        ("Binding Constraints", explain_binding_constraints(data)),
        ("Water Quality & Safety Margins", explain_quality_and_margins(data)),
        ("Sensitivity to Key Assumptions", explain_sensitivity(data)),
        ("Estimated Fields / Data Limitations", explain_estimated_fields(data)),
        ("Summary", build_summary(data)),
    ]

    return "\n\n".join(f"## {title}\n\n{body}" for title, body in sections if body)


def generate_explanation_from_file(path: str) -> str:
    """Script accepts a JSON file per Task 9's checklist."""
    with open(path, "r") as f:
        data = json.load(f)
    return generate_explanation(data)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python json_explainer.py <path-to-results.json>")
        sys.exit(1)
    try:
        print(generate_explanation_from_file(sys.argv[1]))
    except ExplainerInputError as e:
        print(f"Input error: {e}")
        sys.exit(1)
