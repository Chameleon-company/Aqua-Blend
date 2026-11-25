from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .solved_data import InputValidationPolicy, LoaderValidation


@dataclass(frozen=True, slots=True)
class SourceInput:
    """Validated source data required by preprocessing.

    Database-specific names are normalised before this object is created.
    Quality values use the same parameter identifiers as
    ``ScenarioData.quality_limits["parameters"]``.
    """

    source_id: str
    name: str
    source_type: str
    enabled: bool
    forced_inactive: bool

    minimum_withdrawal_ml_per_day: float | None
    maximum_withdrawal_ml_per_day: float | None
    withdrawal_bounds_origin: str

    fixed_activation_cost: float
    cost_per_ml: float | None

    quality: dict[str, float]

    has_estimated_values: bool
    database_model_ready: bool
    availability_status: str
    provenance: dict[str, str | None]


@dataclass(frozen=True, slots=True)
class RemovalEffectInput:
    """How one removal process acts on one quality parameter."""

    # H_trp: maximum fraction of the arriving load the process can remove (0 to 1).
    max_removal_fraction: float
    # C_trp: cost per unit of load removed, in $/(unit of the parameter * ML).
    unit_cost: float


@dataclass(frozen=True, slots=True)
class RemovalProcessInput:
    """One enabled removal process installed at a plant.

    ``acts_on`` is keyed by the raw quality parameter id used in
    ``ScenarioData.quality_limits["parameters"]``.
    """

    process_id: str
    # F_tr: fixed daily cost of operating the process, in $/day.
    fixed_cost_per_day: float
    acts_on: dict[str, RemovalEffectInput]


@dataclass(frozen=True, slots=True)
class InletLimitInput:
    """Range of one quality parameter that a plant can accept at its inlet (I_tp).

    Values are in the parameter's raw unit (e.g. pH units); preprocessing
    converts them to model units.
    """

    minimum: float
    maximum: float


@dataclass(frozen=True, slots=True)
class PlantInput:
    """Treatment-plant input data used by the MILP preprocessing stage."""

    plant_id: str
    name: str
    enabled: bool

    minimum_processing_capacity_ml_per_day: float
    maximum_processing_capacity_ml_per_day: float | None

    fixed_activation_cost: float
    treatment_cost_per_ml: float

    # Removal processes in the order water flows through them (R_t).
    # Empty means the plant has no treatment data.
    removal_processes: tuple[RemovalProcessInput, ...] = ()
    # Inlet limits keyed by raw quality parameter id. A missing parameter has no plant-specific limit.
    inlet_limits: dict[str, InletLimitInput] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class DemandZoneInput:
    """Demand-zone input data for one scenario."""

    zone_id: str
    name: str
    demand_ml_per_day: float | None


@dataclass(frozen=True, slots=True)
class SourcePlantLinkInput:
    """Directed network connection from a source to a treatment plant."""

    source_id: str
    plant_id: str
    enabled: bool
    maximum_flow_ml_per_day: float | None
    transfer_cost_aud_per_ml: float | None = None


@dataclass(frozen=True, slots=True)
class PlantZoneLinkInput:
    """Directed network connection from a treatment plant to a demand zone."""

    plant_id: str
    zone_id: str
    enabled: bool
    maximum_flow_ml_per_day: float | None
    transfer_cost_aud_per_ml: float | None = None


@dataclass(frozen=True, slots=True)
class ScenarioData:
    """Canonical validated input contract for one AquaBlend MILP scenario.

    This object is the boundary between data loading and preprocessing. It
    contains scenario inputs only. It must not contain PuLP variables,
    constraints, solver objects, objective expressions, or solved outputs.
    """

    scenario_id: str
    scenario_name: str
    status: str
    description: str

    sources: tuple[SourceInput, ...]
    plants: tuple[PlantInput, ...]
    demand_zones: tuple[DemandZoneInput, ...]

    source_to_plant_links: tuple[SourcePlantLinkInput, ...]
    plant_to_zone_links: tuple[PlantZoneLinkInput, ...]

    quality_limits: dict[str, Any]
    validation_issues: tuple[str, ...]

    input_validation_policy: InputValidationPolicy
    loader_validation: LoaderValidation

    @property
    def is_ready(self) -> bool:
        """Return True when the loader found no blocking validation issues."""
        return not self.validation_issues


__all__ = [
    "DemandZoneInput",
    "InletLimitInput",
    "PlantInput",
    "PlantZoneLinkInput",
    "RemovalEffectInput",
    "RemovalProcessInput",
    "ScenarioData",
    "SourceInput",
    "SourcePlantLinkInput",
]
