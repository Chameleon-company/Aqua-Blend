export interface SystemFlowNode {
  id: string;
  label: string;
  description: string;
  /** Layout column, left to right. */
  col: number;
  /** Row within its column, for columns with more than one node. */
  row: number;
}

export interface SystemFlowEdge {
  from: string;
  to: string;
}

/**
 * A richer architecture graph than a single 6-stage chain: real branching
 * (Backend fans out to the MILP solver and AI service; Results Store and
 * Shared Contracts both feed the Frontend) rather than one straight line.
 */
export const SYSTEM_FLOW_NODES: SystemFlowNode[] = [
  { id: "data-science", label: "Data Science", col: 0, row: 0, description: "Prepares and validates source, plant and demand datasets upstream of this application." },
  { id: "contracts", label: "Shared Contracts", col: 1, row: 0, description: "The typed scenario, source and result contracts every layer below agrees on." },
  { id: "database", label: "Database", col: 1, row: 1, description: "Stores scenario, source and historical result records. Owned upstream; this frontend never queries it directly." },
  { id: "backend", label: "Backend API", col: 2, row: 0, description: "Orchestrates scenario submission, solver execution and result retrieval behind the shared contract." },
  { id: "milp", label: "MILP Solver", col: 3, row: 0, description: "A deterministic mixed-integer linear program. The source of truth for every optimisation result." },
  { id: "ai", label: "AI Explanation", col: 3, row: 1, description: "Generates a human-readable explanation of the solved result. It explains the decision; it never makes it." },
  { id: "results-store", label: "Results Store", col: 4, row: 0, description: "Persisted solved-result records, combining the MILP output and AI explanation, that this frontend can revisit." },
  { id: "frontend", label: "Frontend (this app)", col: 5, row: 0, description: "Presents solver facts and the AI explanation, clearly separated, to the operator." },
  { id: "operator", label: "Operator", col: 6, row: 0, description: "Reviews the result and decides on next steps." },
];

export const SYSTEM_FLOW_EDGES: SystemFlowEdge[] = [
  { from: "data-science", to: "database" },
  { from: "data-science", to: "contracts" },
  { from: "database", to: "backend" },
  { from: "contracts", to: "backend" },
  { from: "backend", to: "milp" },
  { from: "backend", to: "ai" },
  { from: "backend", to: "results-store" },
  { from: "milp", to: "results-store" },
  { from: "ai", to: "results-store" },
  { from: "results-store", to: "frontend" },
  { from: "contracts", to: "frontend" },
  { from: "frontend", to: "operator" },
];
