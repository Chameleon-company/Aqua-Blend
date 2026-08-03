"""
Task 2: Decision Variables and Objective Function

This module implements:
- Binary source activation variables (y_i)
- Continuous source withdrawal variables (x_i)
- Fixed, variable, and treatment cost components
- Complete cost minimization objective function
"""

from .model import AquaBlendOptimizationModel

__all__ = ['AquaBlendOptimizationModel']
