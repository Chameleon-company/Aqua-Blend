import sys
from pathlib import Path
from dataclasses import replace

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

from src.contracts import InletLimitInput, RemovalEffectInput, RemovalProcessInput
from src.data_loader import load_scenario
from src.preprocessing import preprocess_scenario, PreprocessingError

# FIXTURES


@pytest.fixture
def toy_scenario():
    scenario_path = (
        Path(__file__).resolve().parents[1]
        / "config"
        / "scenarios"
        / "toy_scenario.json"
    )
    return load_scenario(scenario_path)


@pytest.fixture
def toy_parameters(toy_scenario):
    return preprocess_scenario(toy_scenario)


#  SUCCESSFUL PREPROCESSING


def test_preprocess_scenario(toy_parameters):
    """A valid scenario should produce usable ModelParameters."""
    assert toy_parameters is not None

    assert len(toy_parameters.source_ids) > 0
    assert len(toy_parameters.plant_ids) > 0
    assert len(toy_parameters.zone_ids) > 0

    assert toy_parameters.source_quality


# INVALID SCENARIO REJECTION


def test_preprocessing_rejects_validation_issues(toy_scenario):
    """Preprocessing should reject scenarios with loader validation issues."""
    invalid_scenario = replace(
        toy_scenario, validation_issues=("Test validation error",)
    )

    with pytest.raises(PreprocessingError, match="validation issues"):
        preprocess_scenario(invalid_scenario)


# IDENTIFIER AND NETWORK PRESERVATION


def test_identifiers_preserved(toy_scenario, toy_parameters):
    """Source, plant and zone IDs should survive preprocessing."""
    assert set(toy_parameters.source_ids) == {
        source.source_id for source in toy_scenario.sources
    }

    assert set(toy_parameters.plant_ids) == {
        plant.plant_id for plant in toy_scenario.plants
    }

    assert set(toy_parameters.zone_ids) == {
        zone.zone_id for zone in toy_scenario.demand_zones
    }


def test_network_arcs_preserved(toy_scenario, toy_parameters):
    """Network connections should be preserved during preprocessing."""
    expected_source_plant = {
        (link.source_id, link.plant_id) for link in toy_scenario.source_to_plant_links
    }

    expected_plant_zone = {
        (link.plant_id, link.zone_id) for link in toy_scenario.plant_to_zone_links
    }

    assert set(toy_parameters.source_plant_arcs) == expected_source_plant
    assert set(toy_parameters.plant_zone_arcs) == expected_plant_zone


#  CORE VALUE PRESERVATION


def test_cost_and_demand_values_preserved(toy_scenario, toy_parameters):
    """Core costs and demands should retain their original values."""

    for source in toy_scenario.sources:
        sid = source.source_id

        assert toy_parameters.source_fixed_cost[sid] == source.fixed_activation_cost

        if source.cost_per_ml is not None:
            assert toy_parameters.source_unit_cost[sid] == source.cost_per_ml

    for plant in toy_scenario.plants:
        pid = plant.plant_id

        assert toy_parameters.plant_fixed_cost[pid] == plant.fixed_activation_cost

        assert (
            toy_parameters.plant_unit_treatment_cost[pid] == plant.treatment_cost_per_ml
        )

    for zone in toy_scenario.demand_zones:
        assert toy_parameters.demand_by_zone[zone.zone_id] == zone.demand_ml_per_day


# QUALITY PARAMETER CONSISTENCY


def test_quality_parameters_are_complete(toy_parameters):
    """Every source should contain every configured quality parameter."""

    for source_id in toy_parameters.source_ids:
        for parameter_id in toy_parameters.quality_parameter_ids:
            assert (source_id, parameter_id) in toy_parameters.source_quality

    for parameter_id in toy_parameters.quality_parameter_ids:
        assert parameter_id in toy_parameters.quality_lower_bound
        assert parameter_id in toy_parameters.quality_upper_bound
        assert parameter_id in toy_parameters.quality_units


def test_quality_bounds_are_valid(toy_parameters):
    """Every quality lower bound should be <= its upper bound."""

    for parameter_id in toy_parameters.quality_parameter_ids:
        lower = toy_parameters.quality_lower_bound[parameter_id]
        upper = toy_parameters.quality_upper_bound[parameter_id]

        assert lower <= upper


# DETERMINISTIC TRANSFORMATION


def test_preprocessing_is_deterministic(toy_scenario):
    """Repeated preprocessing should match except for the unique run ID."""
    first = preprocess_scenario(toy_scenario)
    second = preprocess_scenario(toy_scenario)

    assert first.run_id != second.run_id
    assert replace(first, run_id=second.run_id) == second

    assert first.source_ids == second.source_ids
    assert first.plant_ids == second.plant_ids
    assert first.zone_ids == second.zone_ids

    assert first.source_quality == second.source_quality
    assert first.demand_by_zone == second.demand_by_zone

    assert first.source_fixed_cost == second.source_fixed_cost
    assert first.plant_fixed_cost == second.plant_fixed_cost


#  pH NUMERICAL SCALING


def test_ph_transformation_is_correct(toy_scenario, toy_parameters):
    """pH should be converted to hydrogen ion concentration in nmol/L."""

    ph_parameter = next(
        (
            parameter_id
            for parameter_id in toy_parameters.quality_parameter_ids
            if "hydrogen" in parameter_id.lower()
        ),
        None,
    )

    assert ph_parameter is not None, (
        "Hydrogen ion quality parameter was not created during preprocessing"
    )

    assert toy_parameters.quality_units[ph_parameter] == "nmol/L"

    for source in toy_scenario.sources:
        if "pH" in source.quality:
            expected = (10 ** (-source.quality["pH"])) * 1e9

            actual = toy_parameters.source_quality[(source.source_id, ph_parameter)]

            assert actual == pytest.approx(expected)


# REMOVAL PROCESSES AND INLET LIMITS


PH = "hydrogen_ion_concentration_nmol_l"

@pytest.fixture
def two_plant_parameters(toy_scenario):
    """facility_1: sedimentation -> filtration with inlet limits; Plant2: filtration, Thomson only."""
    toy_plant = toy_scenario.plants[0]
    plant1 = replace(
        toy_plant,
        removal_processes=(
            RemovalProcessInput("sedimentation", 100.0, {"turbidity": RemovalEffectInput(0.5, 0.10)}),
            RemovalProcessInput("filtration", 150.0, {"turbidity": RemovalEffectInput(0.6, 0.20)}),
        ),
        inlet_limits={"turbidity": InletLimitInput(0.0, 12.0), "pH": InletLimitInput(6.0, 9.0)},
    )
    plant2 = replace(
        toy_plant,
        plant_id="Plant2",
        removal_processes=(
            RemovalProcessInput("filtration", 120.0, {"turbidity": RemovalEffectInput(0.7, 0.15)}),
        ),
    )
    thomson_link = next(l for l in toy_scenario.source_to_plant_links if l.source_id == "225103")
    zone_link = toy_scenario.plant_to_zone_links[0]
    scenario = replace(
        toy_scenario,
        plants=(plant1, plant2),
        source_to_plant_links=toy_scenario.source_to_plant_links + (replace(thomson_link, plant_id="Plant2"),),
        plant_to_zone_links=toy_scenario.plant_to_zone_links + (replace(zone_link, plant_id="Plant2"),),
    )
    return preprocess_scenario(scenario)


def test_removal_parameters_follow_process_order(two_plant_parameters):
    """R_t, R_tp, stage indices, n_tp, H_trp, F_tr, and C_trp come from the listed process order."""
    p = two_plant_parameters
    assert p.removal_processes_by_plant == {
        "facility_1": ("sedimentation", "filtration"),
        "Plant2": ("filtration",),
    }
    assert p.removal_process_order["facility_1", "turbidity"] == ("sedimentation", "filtration")
    assert p.removal_process_order["facility_1", "alkalinity"] == ()
    assert p.removal_process_order["Plant2", "turbidity"] == ("filtration",)
    assert p.removal_stage_index == {
        ("facility_1", "sedimentation", "turbidity"): 1,
        ("facility_1", "filtration", "turbidity"): 2,
        ("Plant2", "filtration", "turbidity"): 1,
    }
    assert p.removal_stage_count["facility_1", "turbidity"] == 2
    assert p.removal_stage_count["facility_1", PH] == 0
    assert p.removal_stage_count["Plant2", "turbidity"] == 1
    assert p.removal_max_fraction == {
        ("facility_1", "sedimentation", "turbidity"): 0.5,
        ("facility_1", "filtration", "turbidity"): 0.6,
        ("Plant2", "filtration", "turbidity"): 0.7,
    }
    assert p.removal_fixed_cost == {
        ("facility_1", "sedimentation"): 100.0,
        ("facility_1", "filtration"): 150.0,
        ("Plant2", "filtration"): 120.0,
    }
    assert p.removal_unit_cost == {
        ("facility_1", "sedimentation", "turbidity"): 0.10,
        ("facility_1", "filtration", "turbidity"): 0.20,
        ("Plant2", "filtration", "turbidity"): 0.15,
    }


def test_inlet_limits_are_converted_or_neutral(two_plant_parameters):
    """Given limits use model units (pH -> [H+], swapped); missing ones get neutral bounds."""
    lb, ub = two_plant_parameters.inlet_quality_lb, two_plant_parameters.inlet_quality_ub
    # Given limits.
    assert (lb["facility_1", "turbidity"], ub["facility_1", "turbidity"]) == (0.0, 12.0)
    assert lb["facility_1", PH] == pytest.approx(1.0)  # pH 9 -> 1 nmol/L
    assert ub["facility_1", PH] == pytest.approx(1000.0)  # pH 6 -> 1000 nmol/L
    # Neutral bounds: 0 and the largest value among linked sources (toy alkalinity 50, 70, 40).
    assert (lb["facility_1", "alkalinity"], ub["facility_1", "alkalinity"]) == (0.0, 70.0)
    assert (lb["Plant2", "alkalinity"], ub["Plant2", "alkalinity"]) == (0.0, 50.0)  # Thomson only
    assert ub["Plant2", PH] == pytest.approx(10 ** (9 - 7.2))  # Thomson pH 7.2


def test_scenario_without_treatment_data(toy_parameters):
    """No treatment data gives empty sequences and no removal coefficients."""
    assert set(toy_parameters.removal_stage_count.values()) == {0}
    assert toy_parameters.removal_stage_index == {}
    assert toy_parameters.removal_max_fraction == {}
    assert toy_parameters.removal_fixed_cost == {}
    assert toy_parameters.removal_unit_cost == {}
