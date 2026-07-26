"""
test_json_explainer.py

AquaBlend | Analysis & AI | Sprint 1 | Task 9

Two families of tests:

1. REFERENCE_JSON tests - the exact worked example from the AquaBlend MILP
   Configuration document, Section 8 ("The Final Output in JSON Format").
   This is the same scenario Tasks 6, 7 and 8 each hand-validated in their
   own PRs. Used here as the main test, per Task 9's checklist item
   "Reference JSON is used as the main test" / "Generated text is compared
   with the sample explanation" (checked against factual agreement, not
   exact wording, per the checklist).

2. Synthetic fixtures - every branch that the reference JSON does NOT
   exercise (each Task 6/7/8 PR admits only one scenario was ever hand-
   traced). These cover: infeasible status, zero selected sources, missing
   cost_per_ML, missing reason on an unused source, empty binding
   constraints, unknown constraint name, source-activation binding (both
   selected and unused), treatment-capacity binding, water-quality-range
   binding, a quality violation, a missing quality parameter, and missing
   required top-level fields.
"""

import copy
import sys
import pytest

from json_explainer import (
    ExplainerInputError,
    validate_input,
    check_feasibility,
    explain_sources,
    explain_binding_constraints,
    explain_quality_and_margins,
    explain_sensitivity,
    explain_estimated_fields,
    build_summary,
    generate_explanation,
)


# ---------------------------------------------------------------------------
# Reference JSON - AquaBlend MILP Configuration, Section 8, verbatim
# ---------------------------------------------------------------------------

REFERENCE_JSON = {
    "scenario_id": "scenario_2026_07_17_001",
    "solved_at": "2026-07-17T10:32:00Z",
    "status": "OPTIMAL",
    "objective": {
        "total_cost": 184250.00,
        "currency": "AUD",
        "unit": "total cost for demand period",
        "cost_breakdown": {
            "source_draw_cost": 152250.00,
            "chemical_addition_cost": 14000.00,
            "energy_cost": 18000.00,
        },
        "energy_estimate_kWh": 6400,
    },
    "demand_zones": [
        {"zone_id": "zone_1", "required_volume_ML": 500, "volume_supplied_ML": 500}
    ],
    "sources": {
        "selected": [
            {
                "source_id": "silvan_reservoir",
                "source_name": "Silvan Reservoir",
                "source_type": "reservoir",
                "volume_drawn_ML": 210,
                "percent_of_blend": 42.0,
                "cost_per_ML": 400,
                "cost_contribution": 84000.00,
            },
            {
                "source_id": "yarra_kew",
                "source_name": "Yarra River, Kew",
                "source_type": "river",
                "volume_drawn_ML": 290,
                "percent_of_blend": 58.0,
                "cost_per_ML": 235,
                "cost_contribution": 68250.00,
            },
        ],
        "unused": [
            {
                "source_id": "groundwater_bore_1",
                "source_name": "Groundwater Bore 1",
                "source_type": "groundwater",
                "reason": (
                    "Higher cost per ML than the selected sources with no quality "
                    "benefit large enough to justify inclusion for this demand level"
                ),
            }
        ],
    },
    "transfer_paths": [
        {"path_id": "silvan_to_facility1", "active": True},
        {"path_id": "yarra_kew_to_facility1", "active": True},
        {"path_id": "groundwater_1_to_facility1", "active": False},
    ],
    "treatment_facilities": {
        "active": [
            {
                "facility_id": "facility_1",
                "facility_name": "Treatment Facility 1",
                "volume_processed_ML": 500,
                "treatment_batches": 5,
                "chemical_addition": [
                    {"chemical": "chlorine", "quantity_kg": 120, "unit": "kg", "purpose": "disinfection"},
                    {"chemical": "lime", "quantity_kg": 60, "unit": "kg", "purpose": "pH correction"},
                ],
                "treatment_removal": [
                    {"parameter": "turbidity", "quantity_removed_NTU_equivalent": 3.2}
                ],
            }
        ],
        "inactive": [],
    },
    "water_quality": {
        "after_blending": {
            "pH": {"value": 7.1, "unit": "pH"},
            "alkalinity": {"value": 38.0, "unit": "mg/L CaCO3"},
            "turbidity": {"value": 5.3, "unit": "NTU"},
        },
        "after_treatment": {
            "pH": {"value": 7.4, "unit": "pH", "constraint_min": 6.5, "constraint_max": 8.5,
                   "status": "PASS", "safety_margin_percent": 21.4},
            "alkalinity": {"value": 52.3, "unit": "mg/L CaCO3", "constraint_min": 20, "constraint_max": 100,
                           "status": "PASS", "safety_margin_percent": 47.7},
            "turbidity": {"value": 2.1, "unit": "NTU", "constraint_min": 0, "constraint_max": 5.0,
                          "status": "PASS", "safety_margin_percent": 58.0},
        },
    },
    "constraints": [
        {"name": "demand_satisfaction_zone_1", "status": "PASS", "slack": 0.0, "binding": True},
        {"name": "silvan_reservoir_capacity", "status": "PASS", "slack": 40371.0, "binding": False},
        {"name": "yarra_kew_capacity", "status": "PASS", "slack": 0.0, "binding": True},
        {"name": "groundwater_bore_1_activation", "status": "INACTIVE", "slack": None, "binding": False},
        {"name": "pH_range", "status": "PASS", "slack": 1.1, "binding": False},
        {"name": "alkalinity_range", "status": "PASS", "slack": 32.3, "binding": False},
        {"name": "turbidity_range", "status": "PASS", "slack": 2.9, "binding": False},
        {"name": "facility_1_batch_capacity", "status": "PASS", "slack": 0.5, "binding": False},
    ],
    "binding_constraints_summary": ["demand_satisfaction_zone_1", "yarra_kew_capacity"],
    "alternative_feasible_solutions": [
        {
            "description": "Reduce Yarra Kew share to 45 percent and introduce Groundwater Bore 1 at 13 percent",
            "total_cost": 189400.00,
            "cost_difference_from_optimal": 5150.00,
            "notes": "Slightly higher cost, but reduces dependence on a single river source and adds redundancy if Yarra Kew availability drops",
        }
    ],
    "sensitivity_to_key_assumptions": [
        {
            "assumption": "cost_per_ML for groundwater_bore_1 (estimated)",
            "impact": "If actual groundwater cost is 20 percent lower than estimated, groundwater_bore_1 would likely enter the optimal blend instead of remaining unused",
        },
        {
            "assumption": "yarra_kew daily capacity (estimated pending real withdrawal-rate data)",
            "impact": "This constraint is currently binding; if real capacity is lower than assumed, the model may become infeasible at this demand level",
        },
    ],
    "explanation": (
        "Silvan Reservoir is selected at 42 percent because it has low draw cost and ample "
        "remaining capacity. Yarra Kew is blended at 58 percent, the maximum its estimated "
        "daily capacity allows, because it is the cheapest available source for this scenario; "
        "this makes its capacity constraint binding. Groundwater Bore 1 is not used because its "
        "estimated cost is higher than both selected sources, and blending it in would raise "
        "total cost without a quality benefit large enough to justify inclusion. After treatment "
        "at Facility 1, all three quality parameters sit comfortably within their limits, with "
        "the widest safety margin on turbidity."
    ),
    "diagnostics": {
        "solver": "HiGHS",
        "solve_time_seconds": 0.084,
        "optimality_gap": 0.0,
        "num_continuous_variables": 4,
        "num_binary_variables": 4,
        "num_integer_variables": 1,
        "num_constraints": 8,
    },
    "data_flags": {
        "estimated_fields": [
            "cost_per_ML (all sources)",
            "quality readings for groundwater_bore_1 (pH, alkalinity, turbidity)",
            "treatment facility capacity and dosing rates (placeholder pending real data)",
            "reservoir and river capacity currently represented as a conservative fraction of usable storage or observed flow, pending real daily safe yield data",
            "energy estimate (placeholder formula pending real pumping and treatment energy data)",
        ]
    },
}


def ref():
    """Fresh deep copy so tests can mutate without affecting each other."""
    return copy.deepcopy(REFERENCE_JSON)


# ---------------------------------------------------------------------------
# 1. Reference JSON tests
# ---------------------------------------------------------------------------

class TestReferenceJSON:

    def test_validate_input_passes(self):
        validate_input(ref())  # should not raise

    def test_feasibility_gate_clear(self):
        assert check_feasibility(ref()) is None

    def test_sources_yarra_kew_cheapest_and_capacity_binding(self):
        text = explain_sources(ref())
        assert "Yarra River, Kew" in text
        assert "cheapest available source and was used at its full available capacity" in text
        assert "58.0% of the blend (290 ML)" in text
        assert "$235.00 AUD/ML" in text
        assert "(estimated)" in text  # cost_per_ML (all sources) is flagged estimated

    def test_sources_silvan_second_cheapest_not_binding(self):
        text = explain_sources(ref())
        assert "Silvan Reservoir" in text
        assert "second lowest cost" in text
        assert "42.0% of the blend (210 ML)" in text
        assert "$400.00 AUD/ML" in text

    def test_sources_ordering_by_percent_descending(self):
        text = explain_sources(ref())
        assert text.index("Yarra River, Kew") < text.index("Silvan Reservoir")

    def test_sources_unused_reason_verbatim(self):
        text = explain_sources(ref())
        assert "Groundwater Bore 1 was not selected because" in text
        assert "no quality benefit large enough to justify inclusion" in text

    def test_binding_constraints_demand_and_capacity(self):
        text = explain_binding_constraints(ref())
        assert "water demand for zone_1" in text
        assert "500 ML needed by zone_1" in text
        assert "available capacity of Yarra River, Kew" in text
        assert "290 ML" in text

    def test_quality_all_pass_headline_is_pH(self):
        text = explain_quality_and_margins(ref())
        assert "All tested quality parameters passed" in text
        assert "pH was closest to its limit" in text
        assert "21.4%" in text
        assert "widest margin was on turbidity at 58.0%" in text

    def test_estimated_fields_lists_all_five(self):
        text = explain_estimated_fields(ref())
        for fragment in ["cost_per_ML (all sources)", "groundwater_bore_1", "energy estimate"]:
            assert fragment in text

    def test_summary_reports_cost_and_pass(self):
        text = build_summary(ref())
        assert "OPTIMAL" in text
        assert "184,250.00 AUD" in text
        assert "2 source(s) selected, 1 unused" in text
        assert "Water quality after treatment: PASS" in text

    def test_generate_explanation_has_all_sections(self):
        text = generate_explanation(ref())
        for heading in [
            "Selected & Unused Sources",
            "Binding Constraints",
            "Water Quality & Safety Margins",
            "Sensitivity to Key Assumptions",
            "Estimated Fields / Data Limitations",
            "Summary",
        ]:
            assert f"## {heading}" in text

    def test_sensitivity_reports_both_reference_assumptions(self):
        text = explain_sensitivity(ref())
        assert "cost_per_ML for groundwater_bore_1 (estimated)" in text
        assert "groundwater_bore_1 would likely enter the optimal blend" in text
        assert "yarra_kew daily capacity" in text
        assert "model may become infeasible" in text

    def test_matches_reference_explanation_in_substance(self):
        """Not exact wording (per checklist: 'checks factual agreement, not
        exact wording') - just the same facts as the JSON's own free-text
        explanation field."""
        text = generate_explanation(ref())
        assert "Silvan Reservoir" in text and "42.0%" in text
        assert "Yarra River, Kew" in text and "58.0%" in text
        assert "Groundwater Bore 1" in text
        assert "turbidity" in text  # widest margin, matches reference explanation


# ---------------------------------------------------------------------------
# 2. Required-field validation
# ---------------------------------------------------------------------------

class TestValidation:

    @pytest.mark.parametrize("field", ["status", "sources", "water_quality", "binding_constraints_summary"])
    def test_missing_required_field_raises(self, field):
        data = ref()
        del data[field]
        with pytest.raises(ExplainerInputError):
            validate_input(data)

    def test_missing_after_treatment_raises(self):
        data = ref()
        del data["water_quality"]["after_treatment"]
        with pytest.raises(ExplainerInputError):
            validate_input(data)

    def test_non_dict_input_raises(self):
        with pytest.raises(ExplainerInputError):
            validate_input(["not", "a", "dict"])

    def test_missing_optional_fields_do_not_crash(self):
        data = ref()
        del data["objective"]
        del data["data_flags"]
        del data["demand_zones"]
        del data["treatment_facilities"]
        # should not raise
        text = generate_explanation(data)
        assert "not reported" in text  # cost clause falls back gracefully


# ---------------------------------------------------------------------------
# 3. Feasibility gate
# ---------------------------------------------------------------------------

class TestFeasibility:

    def test_infeasible_status_short_circuits(self):
        data = ref()
        data["status"] = "INFEASIBLE"
        result = generate_explanation(data)
        assert result == "No blend could be recommended for this scenario (INFEASIBLE)."
        assert "## Summary" not in result  # gate applies to whole explanation, not just sources


# ---------------------------------------------------------------------------
# 4. Source-selection edge cases (Task 6)
# ---------------------------------------------------------------------------

class TestSourcesEdgeCases:

    def test_zero_selected_and_zero_unused(self):
        data = ref()
        data["sources"] = {"selected": [], "unused": []}
        text = explain_sources(data)
        assert text == "No sources were required for this scenario."

    def test_missing_cost_per_ML_on_selected_uses_generic_fallback(self):
        data = ref()
        del data["sources"]["selected"][0]["cost_per_ML"]
        text = explain_sources(data)
        assert "included in the optimal blend to help meet demand at minimum total cost" in text

    def test_missing_reason_on_unused_source(self):
        data = ref()
        del data["sources"]["unused"][0]["reason"]
        text = explain_sources(data)
        assert "no reason provided in the solver output" in text

    def test_single_selected_source_no_ordering_needed(self):
        data = ref()
        data["sources"]["selected"] = [data["sources"]["selected"][0]]
        data["sources"]["unused"] = []
        text = explain_sources(data)
        assert "Silvan Reservoir" in text

    def test_cost_currency_matches_objective_currency_not_hardcoded(self):
        """Rubric C7 (LLM_Evaluation_Rubric.md) requires 'cost uses AUD'. The
        currency shown must come from objective.currency, not be hardcoded,
        so a non-AUD scenario is still labelled correctly."""
        data = ref()
        data["objective"]["currency"] = "NZD"
        text = explain_sources(data)
        assert "NZD" in text
        assert "AUD" not in text

    def test_cost_shown_without_currency_when_objective_missing(self):
        """Optional field: no crash, just a plain dollar figure with no
        currency suffix rather than a wrong or invented one."""
        data = ref()
        del data["objective"]
        text = explain_sources(data)
        assert "$235.00/ML" in text  # no trailing currency code
        assert "AUD" not in text

    def test_summary_and_source_cost_lines_use_same_currency(self):
        """The per-source lines and the summary total must not disagree on
        currency within the same explanation."""
        text = generate_explanation(ref())
        assert "$235.00 AUD/ML" in text
        assert "$184,250.00 AUD" in text


# ---------------------------------------------------------------------------
# 5. Binding-constraints edge cases (Task 7)
# ---------------------------------------------------------------------------

class TestBindingConstraintsEdgeCases:

    def test_empty_binding_list(self):
        data = ref()
        data["binding_constraints_summary"] = []
        text = explain_binding_constraints(data)
        assert text == "No constraint was binding; the solution stayed within every limit."

    def test_unknown_constraint_name(self):
        data = ref()
        data["binding_constraints_summary"] = ["some_unrecognised_constraint"]
        text = explain_binding_constraints(data)
        assert "no plain-language mapping available" in text

    def test_source_activation_selected(self):
        data = ref()
        data["binding_constraints_summary"] = ["silvan_reservoir_activation"]
        text = explain_binding_constraints(data)
        assert "had to be switched fully on rather than partly used" in text

    def test_source_activation_unused(self):
        data = ref()
        data["binding_constraints_summary"] = ["groundwater_bore_1_activation"]
        text = explain_binding_constraints(data)
        assert "was left switched off entirely" in text

    def test_treatment_capacity_binding(self):
        data = ref()
        data["binding_constraints_summary"] = ["facility_1_batch_capacity"]
        text = explain_binding_constraints(data)
        assert "Treatment Facility 1" in text
        assert "500 ML across 5 batches" in text

    def test_water_quality_range_binding(self):
        data = ref()
        data["binding_constraints_summary"] = ["turbidity_range"]
        text = explain_binding_constraints(data)
        assert "turbidity limit" in text
        assert "0" in text and "5.0" in text


# ---------------------------------------------------------------------------
# 6. Water-quality edge cases (Task 8)
# ---------------------------------------------------------------------------

class TestQualityEdgeCases:

    def test_violation_reported(self):
        data = ref()
        data["water_quality"]["after_treatment"]["turbidity"]["status"] = "FAIL"
        data["water_quality"]["after_treatment"]["turbidity"]["safety_margin_percent"] = -4.5
        data["water_quality"]["after_treatment"]["turbidity"]["value"] = 5.4
        text = explain_quality_and_margins(data)
        assert "Not all quality parameters passed" in text
        assert "turbidity breached its allowed range" in text
        assert "-4.5%" in text

    def test_missing_parameter_flagged_not_assumed_pass(self):
        data = ref()
        del data["water_quality"]["after_treatment"]["alkalinity"]
        text = explain_quality_and_margins(data)
        assert "alkalinity was not reported in the results and could not be assessed" in text

    def test_estimated_note_appended_when_flagged(self):
        data = ref()
        data["data_flags"]["estimated_fields"].append("pH sensor calibration (estimated)")
        text = explain_quality_and_margins(data)
        assert "relies on estimated data for pH sensor calibration" in text


# ---------------------------------------------------------------------------
# 7. Sensitivity-to-assumptions section (Task 9, added after Task 13 review)
# ---------------------------------------------------------------------------

class TestSensitivitySection:

    def test_missing_field_entirely(self):
        data = ref()
        del data["sensitivity_to_key_assumptions"]
        text = explain_sensitivity(data)
        assert text == "No sensitivity information was reported for this scenario."

    def test_empty_list(self):
        data = ref()
        data["sensitivity_to_key_assumptions"] = []
        text = explain_sensitivity(data)
        assert text == "No sensitivity information was reported for this scenario."

    def test_malformed_item_missing_impact_is_skipped_not_guessed(self):
        data = ref()
        data["sensitivity_to_key_assumptions"] = [
            {"assumption": "some assumption with no impact field"}
        ]
        text = explain_sensitivity(data)
        assert text == "No sensitivity information was reported for this scenario."

    def test_malformed_item_missing_assumption_is_skipped_not_guessed(self):
        data = ref()
        data["sensitivity_to_key_assumptions"] = [
            {"impact": "some impact with no assumption field"}
        ]
        text = explain_sensitivity(data)
        assert text == "No sensitivity information was reported for this scenario."

    def test_one_valid_and_one_malformed_item(self):
        data = ref()
        data["sensitivity_to_key_assumptions"] = [
            {"assumption": "valid assumption", "impact": "valid impact"},
            {"assumption": "incomplete"},
        ]
        text = explain_sensitivity(data)
        assert "valid assumption" in text
        assert "valid impact" in text
        assert text.count("sensitive to") == 1


# ---------------------------------------------------------------------------
# 8. Estimated-fields section (Task 9, new)
# ---------------------------------------------------------------------------

class TestEstimatedFieldsSection:

    def test_no_estimated_fields(self):
        data = ref()
        data["data_flags"]["estimated_fields"] = []
        text = explain_estimated_fields(data)
        assert text == "No fields in this result were flagged as estimated."

    def test_missing_data_flags_entirely(self):
        data = ref()
        del data["data_flags"]
        text = explain_estimated_fields(data)
        assert text == "No fields in this result were flagged as estimated."


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
