import type { SlotHealthSummary } from "@/lib/gtm-parser";

type HealthSummaryProps = {
  summaries: [SlotHealthSummary, SlotHealthSummary, SlotHealthSummary];
  slotNames: [string, string, string];
};

function HealthCard({ summary, slotLabel }: { summary: SlotHealthSummary; slotLabel: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{slotLabel}</h3>
      <div className="mt-2 space-y-1 text-sm text-slate-700">
        <p>Matching Events: {summary.matchingEvents}</p>
        <p>Missing Events: {summary.missingEvents}</p>
        <p>Parameter Mismatches: {summary.parameterMismatches}</p>
      </div>
    </div>
  );
}

export function HealthSummary({ summaries, slotNames }: HealthSummaryProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-900">Health Summary (Baseline: {slotNames[0]})</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {summaries.map((summary) => (
          <HealthCard key={summary.slotIndex} summary={summary} slotLabel={slotNames[summary.slotIndex - 1]} />
        ))}
      </div>
    </section>
  );
}
