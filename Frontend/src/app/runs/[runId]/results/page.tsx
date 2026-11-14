import { redirect } from "next/navigation";

/** `/results` on its own always meant "MILP results" — keep old links working. */
export default async function ResultsIndexPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  redirect(`/runs/${runId}/results/milp`);
}
