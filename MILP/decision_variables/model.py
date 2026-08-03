"""
AquaBlend - Task 2: Decision Variables and Objective Function

Purpose: Define optimization variables and cost minimization objective

This module implements:
- Binary source activation variables (y_i)
- Continuous source withdrawal variables (x_i)
- Fixed, variable, and treatment cost components
- Complete cost minimization objective function
"""

from pulp import LpProblem, LpMinimize, LpVariable, LpBinary, LpContinuous, lpSum

class AquaBlendOptimizationModel:
    """
    Water Resource Optimization Model for AquaBlend
    
    This class contains:
    - Decision variables (source activation and withdrawal)
    - Cost components (fixed, variable, treatment)
    - Complete objective function for cost minimization
    """
    
    def __init__(self, num_sources=3, num_demand_points=1):
        """
        Initialize the optimization model
        
        Args:
            num_sources: Number of water sources (reservoirs)
            num_demand_points: Number of demand locations (treatment plants)
        """
        self.num_sources = num_sources
        self.num_demand_points = num_demand_points
        self.model = LpProblem("AquaBlend_Water_Optimization", LpMinimize)
        
        # Store variable references for later access
        self.source_activation = {}  # y_i variables
        self.source_withdrawal = {}  # x_i variables
        
        # Store cost components separately
        self.fixed_costs = None
        self.withdrawal_costs = None
        self.treatment_costs = None
        self.total_cost = None
        
        print("AquaBlend Optimization Model initialized")
        print(f"  Sources: {num_sources}")
        print(f"  Demand points: {num_demand_points}")
    

    # DECISION VARIABLES
    
    def create_decision_variables(self):
        """
        Create all decision variables for the optimization model
        
        Variables created:
        - y_i: Binary activation variable for source i (0 or 1)
        - x_i: Continuous withdrawal variable for source i (≥ 0)
        """
        
        print("\n" + "="*70)
        print("SECTION 1: CREATING DECISION VARIABLES")
        print("="*70)
        
        # ---- Binary Source Activation Variables (y_i) ----
        print("\n1. Binary Source Activation Variables (y_i):")
        print("   Purpose: Decide whether to activate each water source")
        print("   Domain: {0, 1} (0 = off, 1 = on)")
        print("   Mathematical notation: y_i ∈ {0, 1} for i ∈ Sources\n")
        
        for i in range(1, self.num_sources + 1):
            var_name = f"y_{i}"
            self.source_activation[i] = LpVariable(var_name, cat=LpBinary)
            print(f"   ✓ Created {var_name}: Activation of Source {i}")
        
        # ---- Continuous Source Withdrawal Variables (x_i) ----
        print("\n2. Continuous Source Withdrawal Variables (x_i):")
        print("   Purpose: Decide how much water to withdraw from each source")
        print("   Domain: [0, ∞) (non-negative continuous)")
        print("   Mathematical notation: x_i ≥ 0 for i ∈ Sources\n")
        
        for i in range(1, self.num_sources + 1):
            var_name = f"x_{i}"
            self.source_withdrawal[i] = LpVariable(var_name, lowBound=0, cat=LpContinuous)
            print(f"   ✓ Created {var_name}: Withdrawal from Source {i} (units)")
        
        print("\n" + "-"*70)
        print(f"Total variables created: {self.num_sources * 2}")
        print(f"  - Binary variables: {self.num_sources}")
        print(f"  - Continuous variables: {self.num_sources}")
        print("-"*70)

    
    # COST COMPONENTS
    
    def create_cost_components(self, 
                              fixed_activation_cost,
                              variable_withdrawal_cost,
                              treatment_cost_per_unit):
        """
        Create separate cost components for the objective function
        
        Args:
            fixed_activation_cost: Dict {source_id -> cost} for activating each source
            variable_withdrawal_cost: Dict {source_id -> cost_per_unit} for withdrawing water
            treatment_cost_per_unit: Single value for treating water
        
        Returns:
            Tuple: (fixed_costs, withdrawal_costs, treatment_costs)
        """
        
        print("\n" + "="*70)
        print("SECTION 2: CREATING COST COMPONENTS")
        print("="*70)
        
        # ---- Component 1: Fixed Activation Costs ----
        print("\n1. Fixed Activation Costs (One-time cost to activate source):")
        print("   Formula: Σ(fixed_cost_i × y_i) for all sources i")
        print("   Meaning: Pay this amount once if you activate source i\n")
        
        self.fixed_costs = lpSum([
            fixed_activation_cost[i] * self.source_activation[i]
            for i in range(1, self.num_sources + 1)
        ])
        
        for i in range(1, self.num_sources + 1):
            print(f"   Source {i}: ${fixed_activation_cost[i]:,.2f} × y_{i}")
        print(f"\n   Expression: {self.fixed_costs}")
        
        # ---- Component 2: Variable Withdrawal Costs ----
        print("\n2. Variable Withdrawal Costs (Cost per unit withdrawn):")
        print("   Formula: Σ(withdrawal_cost_i × x_i) for all sources i")
        print("   Meaning: Pay this amount for every unit withdrawn\n")
        
        self.withdrawal_costs = lpSum([
            variable_withdrawal_cost[i] * self.source_withdrawal[i]
            for i in range(1, self.num_sources + 1)
        ])
        
        for i in range(1, self.num_sources + 1):
            print(f"   Source {i}: ${variable_withdrawal_cost[i]:,.2f}/unit × x_{i}")
        print(f"\n   Expression: {self.withdrawal_costs}")
        
        # ---- Component 3: Treatment Costs ----
        print("\n3. Treatment Costs (Cost to treat all water):")
        print("   Formula: treatment_cost × Σ(x_i) for all sources i")
        print("   Meaning: Applied to total water from all sources combined\n")
        
        total_withdrawal = lpSum([self.source_withdrawal[i] for i in range(1, self.num_sources + 1)])
        self.treatment_costs = treatment_cost_per_unit * total_withdrawal
        
        print(f"   Treatment cost: ${treatment_cost_per_unit:,.2f}/unit")
        print(f"   Applied to: Total water withdrawn (x_1 + x_2 + ... + x_n)")
        print(f"\n   Expression: {self.treatment_costs}")
        
        print("\n" + "-"*70)
        print("Cost components created and stored separately for verification")
        print("-"*70)
        
        return self.fixed_costs, self.withdrawal_costs, self.treatment_costs
    
    
    # OBJECTIVE FUNCTION
    
    def create_objective_function(self, 
                                 fixed_activation_cost,
                                 variable_withdrawal_cost,
                                 treatment_cost_per_unit):
        """
        Create the complete objective function: Minimize Total Cost
        
        Objective: Minimize TC = FC + VC + TrC
        
        Where:
        - FC (Fixed Costs) = Σ(fixed_cost_i × y_i)
        - VC (Withdrawal Costs) = Σ(withdrawal_cost_i × x_i)
        - TrC (Treatment Costs) = treatment_cost × Σ(x_i)
        """
        
        print("\n" + "="*70)
        print("SECTION 3: CREATING OBJECTIVE FUNCTION")
        print("="*70)
        
        # Create cost components
        fixed, withdrawal, treatment = self.create_cost_components(
            fixed_activation_cost,
            variable_withdrawal_cost,
            treatment_cost_per_unit
        )
        
        # Combine all costs into total cost
        print("\n" + "="*70)
        print("COMPLETE OBJECTIVE FUNCTION")
        print("="*70)
        
        self.total_cost = fixed + withdrawal + treatment
        
        print("\nObjective Statement:")
        print("  Minimize: Total Cost = Fixed Costs + Withdrawal Costs + Treatment Costs")
        
        print("\nMathematical Notation:")
        print("  Minimize: TC = Σ(FC_i × y_i) + Σ(VC_i × x_i) + TC_unit × Σ(x_i)")
        
        print("\nDetailed Expansion:")
        print("  Minimize: ", end="")
        
        # Print fixed costs
        fc_expr = " + ".join([f"{fixed_activation_cost[i]}×y_{i}" for i in range(1, self.num_sources + 1)])
        print(fc_expr, end=" ")
        
        # Print withdrawal costs
        print("+ ", end="")
        vc_expr = " + ".join([f"{variable_withdrawal_cost[i]}×x_{i}" for i in range(1, self.num_sources + 1)])
        print(vc_expr, end=" ")
        
        # Print treatment costs
        print(f"+ {treatment_cost_per_unit}×(", end="")
        xsum_expr = " + ".join([f"x_{i}" for i in range(1, self.num_sources + 1)])
        print(xsum_expr + ")")
        
        # Set the objective in the model
        self.model += self.total_cost, "Total_Cost_Objective"
        
        print("\n" + "-"*70)
        print("✓ Objective function set: MINIMIZE total cost")
        print("-"*70)
        
        print("\nObjective Type: COST MINIMIZATION")
        print("Goal: Find the combination of source activation and withdrawal")
        print("      that meets water demand at minimum total cost")
    
    
    # MODEL SUMMARY
    
    def print_model_summary(self):
        """Print a complete summary of the model structure"""
        
        print("\n" + "="*70)
        print("MODEL SUMMARY")
        print("="*70)
        
        print("\n1. MODEL TYPE:")
        print("   - Mixed Integer Linear Programming (MILP)")
        print("   - Optimization Type: Minimization")
        print("   - Problem: Water resource allocation with cost minimization")
        
        print("\n2. DECISION VARIABLES:")
        print(f"   - Binary variables (y_i): {self.num_sources}")
        print(f"   - Continuous variables (x_i): {self.num_sources}")
        print(f"   - Total: {self.num_sources * 2} variables")
        
        print("\n3. COST COMPONENTS (Separately Identifiable):")
        print("   ✓ Fixed Activation Costs (FC)")
        print("   ✓ Variable Withdrawal Costs (VC)")
        print("   ✓ Treatment Costs (TC)")
        
        print("\n4. OBJECTIVE FUNCTION STRUCTURE:")
        print("   Minimize: TC_Total = FC + VC + TC")
        
        print("\n5. CONSTRAINTS TO BE ADDED (Next Phase):")
        print("   - Source capacity limits: x_i ≤ capacity_i × y_i")
        print("   - Demand satisfaction: Σ(x_i) ≥ demand")
        print("   - Water quality requirements: TBD (from quality module)")
        
        print("\n" + "="*70)
    
 
    # VERIFICATION METHODS
    
    def verify_cost_components(self):
        """Verify that cost components are created and separate"""
        
        print("\n" + "="*70)
        print("COST COMPONENT VERIFICATION")
        print("="*70)
        
        checks = [
            ("Fixed Costs Created", self.fixed_costs is not None),
            ("Withdrawal Costs Created", self.withdrawal_costs is not None),
            ("Treatment Costs Created", self.treatment_costs is not None),
            ("Total Cost Created", self.total_cost is not None),
            ("All components separate", all([
                self.fixed_costs is not None,
                self.withdrawal_costs is not None,
                self.treatment_costs is not None
            ]))
        ]
        
        for check_name, result in checks:
            status = "✓ PASS" if result else "✗ FAIL"
            print(f"{check_name}: {status}")
        
        print("\n" + "="*70)
    
    def get_model(self):
        """Return the PuLP model for solving"""
        return self.model
    
    def get_variables_dict(self):
        """Return dictionary of all variables"""
        return {
            'activation': self.source_activation,
            'withdrawal': self.source_withdrawal
        }
    
    def get_costs_dict(self):
        """Return dictionary of all cost components"""
        return {
            'fixed': self.fixed_costs,
            'withdrawal': self.withdrawal_costs,
            'treatment': self.treatment_costs,
            'total': self.total_cost
        }
