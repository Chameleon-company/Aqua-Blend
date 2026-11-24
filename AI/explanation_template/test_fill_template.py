"""Tests for Task 38, using the real MILP fixtures from Task 45 and the base scenario."""

from __future__ import annotations

import copy
import json
import re
from pathlib import Path

import pytest

import fill_template as ft
from presentation_gate import leaf_paths, load_rules, presentable_values

AI_DIR = Path(__file__).resolve().parents[1]
REPO = AI_DIR.parent
FIXTURES = AI_DIR / "milp_output_agreement" / "fixtures"
SCENARIO_PATH = REPO / "MILP" / "config" / "scenarios" / "base_scenarios_v1.json"

SCENARIO = json.loads(SCENARIO_PATH.read_text(encoding="utf-8"))
FEASIBLE = json.loads((FIXTURES / "feasible.json").read_text(encoding="utf-8"))
INFEASIBLE = json.loads((FIXTURES / "infeasible.json").read_text(encoding="utf-8"))


def text_for(output, scenario=SCENARIO, **kw):
    return ft.to_markdown(ft.build_explanation(scenario, output, **kw))


# ---- VALID ------------------------------------------------------------------

def test_valid_text_uses_scenario_names_and_output_figures():
    text = text_for(FEASIBLE)
    assert "The optimal blend for Aqua Blend Base Scenarios V1 delivers 1,200 ML/day" in text
    assert "total cost of 533,000." in text
    assert "Thomson Reservoir (225103): 700 ML/day, 58.33% of the blend, 100% of its maximum withdrawal" in text
    assert "Barwon River at Geelong (233217): 200 ML/day, 16.67% of the blend, 29.41% of its maximum withdrawal" in text
    assert "Toy Treatment Plant: 1,200 ML/day, 71.43% of its capacity" in text
    assert "Toy Demand Zone: 1,200 of 1,200 ML/day delivered (demand met)" in text


def test_ph_limits_come_from_the_scenario_not_the_model_space_fields():
    text = text_for(FEASIBLE)
    assert "pH: 7.09 (limits 6.5 to 8.5), within limits" in text
    assert "316.23" not in text and "3.16" not in text


def test_valid_text_has_the_agreements_caveats_and_no_forbidden_wording():
    text = text_for(FEASIBLE)
    assert "No currency is set" in text
    assert "before any treatment" in text
    assert "Chemical dosing is turned off in this scenario" in text
    for banned in ("$", "AUD", "because it is cheap", "cheapest", "dosing cost of"):
        assert banned not in text


def test_every_number_in_the_text_comes_from_the_inputs():
    """No figure may appear that is not an allowed MILP output value or a scenario value."""
    allowed = set()

    def add(value):
        if isinstance(value, bool):
            return
        if isinstance(value, (int, float)):
            allowed.add(round(float(value), 2))
        elif isinstance(value, str):
            allowed.update(round(float(n), 2) for n in re.findall(r"\d+(?:\.\d+)?", value))

    for _, value in presentable_values(FEASIBLE):
        for item in value if isinstance(value, list) else [value]:
            add(item)
    for source in FEASIBLE["sources"]:
        add(source["blend_ratio"] * 100)  # the one display transform (percent)
    for _, value, _ in leaf_paths(SCENARIO):
        for item in value if isinstance(value, list) else [value]:
            add(item)
    add(len(FEASIBLE["sources"]))

    text = text_for(FEASIBLE)
    numbers = re.findall(r"(?<![\w.])\d[\d,]*(?:\.\d+)?", text)
    stray = [n for n in numbers if round(float(n.replace(",", "")), 2) not in allowed]
    assert numbers and not stray, f"numbers not traceable to the inputs: {stray}"


def test_not_optimal_short_zone_and_outside_limits_wording():
    output = copy.deepcopy(FEASIBLE)
    output["solver"]["is_optimal"] = False
    output["demand_zones"][0].update(demand_satisfied=False, unmet_demand_ml_per_day=50.0)
    output["quality"]["plant_inflow"][0]["parameters"][2]["within_limits"] = False
    text = text_for(output)
    assert text.count("A feasible blend (not proven optimal)") == 1
    assert "a shortfall of 50 ML/day" in text
    assert "OUTSIDE limits" in text


def test_missing_scenario_names_fall_back_to_ids():
    scenario = copy.deepcopy(SCENARIO)
    for s in scenario["sources"]:
        s.pop("name")
    scenario["network"]["demand_zones"][0].pop("demand_ml_per_day")
    text = text_for(FEASIBLE, scenario=scenario)
    assert "225103 (225103): 700 ML/day" in text
    assert "Toy Demand Zone: 1,200 ML/day delivered (demand met)" in text


# ---- NO_SOLUTION and INVALID_OUTPUT --------------------------------------------

def test_no_solution_shows_no_zero_filled_figures():
    text = text_for(INFEASIBLE)
    assert "No valid solution was found for Aqua Blend Base Scenarios V1." in text
    assert "infeasible: no blend meets every constraint" in text
    assert "1,200 ML/day across 1 demand zone(s), from 3 source(s)" in text
    for banned in ("cost of", "shortfall", "unmet", "Thomson", "within limits"):
        assert banned not in text
    assert not re.search(r"(?<![\d,.])0 ML/day", text)  # zero-filled flows


def test_no_solution_lists_sources_excluded_before_solving():
    output = copy.deepcopy(INFEASIBLE)
    output["sources"][0].update(selection_status="EXCLUDED", model_included=False)
    text = text_for(output)
    assert "## Sources excluded before solving" in text
    assert "- Thomson Reservoir (225103)" in text


def test_invalid_output_shows_no_figures():
    output = copy.deepcopy(FEASIBLE)
    output["validation"]["output_consistency"]["status"] = "FAILED"
    explanation = ft.build_explanation(SCENARIO, output)
    text = ft.to_markdown(explanation)
    assert explanation["mode"] == "INVALID_OUTPUT"
    assert "failed its internal checks and should not be used" in text
    assert "533,000" not in text and "Thomson" not in text
    assert explanation["key_figures"] == []


# ---- guarantees ------------------------------------------------------------------

def test_template_cannot_use_a_field_the_agreement_forbids():
    rules = load_rules()
    rules["fields"]["summary.costs.total_cost"]["use"] = "internal"
    with pytest.raises(ft.TemplateError, match="summary.costs.total_cost"):
        ft.build_explanation(SCENARIO, FEASIBLE, rules=rules)


def test_unknown_placeholder_is_an_error_not_literal_braces():
    template = json.loads(ft.TEMPLATE_PATH.read_text(encoding="utf-8"))
    template["VALID"]["headline_optimal"] += " {not_a_value}"
    with pytest.raises(ft.TemplateError, match="not_a_value"):
        ft.build_explanation(SCENARIO, FEASIBLE, template=template)


def test_scenario_must_match_the_output():
    scenario = dict(SCENARIO, scenario_id="some_other_scenario")
    with pytest.raises(ft.TemplateError, match="does not match"):
        ft.build_explanation(scenario, FEASIBLE)


# ---- structured version ----------------------------------------------------------

@pytest.mark.parametrize("output", [FEASIBLE, INFEASIBLE], ids=["feasible", "infeasible"])
def test_json_report_has_the_task_46_fields_and_traceable_figures(output):
    report = ft.to_report(ft.build_explanation(SCENARIO, output))
    assert set(report) == {"headline", "summary", "key_figures", "caveats"}
    for figure in report["key_figures"]:
        node = output
        for part in figure["fact_path"].split("."):
            node = node[part]
        assert node == figure["value"]


@pytest.mark.parametrize("value, expected", [
    (533000.0, "533,000"), (58.333333, "58.33"), (25.0, "25"), (0.5, "0.5"), (1200, "1,200"), (None, "n/a"),
])
def test_number_formatting(value, expected):
    assert ft.num(value) == expected


def test_cli(capsys):
    code = ft.main(["--scenario", str(SCENARIO_PATH), "--output", str(FIXTURES / "feasible.json"), "--json"])
    assert code == 0
    assert json.loads(capsys.readouterr().out)["mode"] == "VALID"
