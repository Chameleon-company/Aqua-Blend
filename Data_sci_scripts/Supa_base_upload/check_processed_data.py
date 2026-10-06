import pandas as pd

df = pd.read_csv("Final_Data_Processed.csv")

print(df[[
    "capacity_ml",
    "cost_per_ml",
    "ph",
    "alkalinity",
    "turbidity",
    "temperature"
]].head(20))

print("\nStatistics:")
print(df[[
    "capacity_ml",
    "cost_per_ml",
    "ph",
    "alkalinity",
    "turbidity",
    "temperature"
]].describe())