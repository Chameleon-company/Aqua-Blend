# Decision Variables and Objective Function - Implementation Summary

## What Was Implemented
- AquaBlendOptimizationModel class
- Binary activation variables (y_i) for water sources
- Continuous withdrawal variables (x_i) for water amounts
- Three cost components: fixed activation, variable withdrawal, treatment
- Cost minimization objective function
- Unit tests (3 passing)
- Example usage file

## Technical Approach
- Used PuLP library for MILP formulation
- Object-oriented design with class-based model
- Dictionary-based parameter input for flexibility
- Each cost component stored separately for verification

## Design Decisions
- Separate cost components for easy verification
- Dictionary-based inputs to support flexible sources
- Mathematical notation (y_i, x_i) matching problem formulation

## Testing
- Model initialization test: passing
- Decision variables creation test: passing
- Objective function creation test: passing
- Example file: runs successfully

## Limitations
- Currently supports 3 sources (parameterizable)
- No constraints included (to be added later)
- Solver not implemented

## Files Created
- MILP/decision_variables/model.py
- MILP/decision_variables/__init__.py
- MILP/tests/test_model.py
- MILP/examples.py
