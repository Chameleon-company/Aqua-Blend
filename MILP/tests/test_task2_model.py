"""
Unit tests for Task 2: Decision Variables and Objective Function
"""

import unittest
import sys
sys.path.insert(0, '.')

from MILP.task_2_decision_variables.model import AquaBlendOptimizationModel

class TestTask2Model(unittest.TestCase):
    """Test cases for AquaBlend optimization model"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.model = AquaBlendOptimizationModel(num_sources=3)
        self.fixed_costs = {1: 1000, 2: 1200, 3: 800}
        self.withdrawal_costs = {1: 5.0, 2: 4.5, 3: 6.0}
        self.treatment_cost = 2.0
    
    def test_model_initialization(self):
        """Test that model initializes correctly"""
        self.assertEqual(self.model.num_sources, 3)
        self.assertIsNotNone(self.model.model)
    
    def test_decision_variables_creation(self):
        """Test that decision variables are created"""
        self.model.create_decision_variables()
        self.assertEqual(len(self.model.source_activation), 3)
        self.assertEqual(len(self.model.source_withdrawal), 3)
    
    def test_objective_function_creation(self):
        """Test that objective function is created correctly"""
        self.model.create_decision_variables()
        self.model.create_objective_function(
            self.fixed_costs,
            self.withdrawal_costs,
            self.treatment_cost
        )
        self.assertIsNotNone(self.model.fixed_costs)
        self.assertIsNotNone(self.model.withdrawal_costs)
        self.assertIsNotNone(self.model.treatment_costs)
        self.assertIsNotNone(self.model.total_cost)

if __name__ == '__main__':
    unittest.main()