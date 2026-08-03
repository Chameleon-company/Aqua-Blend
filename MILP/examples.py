"""
Example usage of Task 2 optimization model
Demonstrates how to use the AquaBlendOptimizationModel class
"""

import sys
sys.path.insert(0, '.')

from MILP.decision_variables.model import AquaBlendOptimizationModel

def main():
    """Run example optimization model"""
    
    print("="*70)
    print("AquaBlend Task 2 - Example Usage")
    print("="*70)
    
    # Initialize the model with 3 water sources
    model = AquaBlendOptimizationModel(num_sources=3)
    
    # Create decision variables
    model.create_decision_variables()
    
    # Define costs (example data)
    fixed_costs = {
        1: 1000,
        2: 1200,
        3: 800
    }
    
    withdrawal_costs = {
        1: 5.0,
        2: 4.5,
        3: 6.0
    }
    
    treatment_cost = 2.0
    
    # Create cost components and objective function
    model.create_objective_function(fixed_costs, withdrawal_costs, treatment_cost)
    
    # Print model summaries
    model.print_model_summary()
    model.verify_cost_components()
    
    print("\n✓ Model created successfully!")
    print("Ready for adding constraints and solving...\n")

if __name__ == "__main__":
    main()
