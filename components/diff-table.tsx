import type { EventDiffRow, DiffCell } from "@/lib/gtm-parser";
import isEqual from "lodash/isEqual";
import { VariableBadge } from "@/components/variable-badge";
import { VariableDisplay, type ContainerVariablesState } from "@/components/variable-display";

type DiffTableProps = {
  rows: EventDiffRow[];
  showOnlyDifferences: boolean;
  slotNames: [string, string, string];
  loadedSlots: [boolean, boolean, boolean];
  containerVariables: ContainerVariablesState;
  onEventClick?: (eventKey: string) => void;
};

type DiffCompareStatus = "NONE" | "MISSING" | "MATCHED" | "MISMATCHED";

function getDiffStatus(baselineValue: unknown, comparedValue: unknown): DiffCompareStatus {
  if (baselineValue === undefined && comparedValue === undefined) {
    return "NONE";
  }
  if (baselineValue !== undefined && (comparedValue === undefined || comparedValue === null || comparedValue === "")) {
    return "MISSING";
  }
  if (isEqual(baselineValue, comparedValue)) {
    return "MATCHED";
  }
  return "MISMATCHED";
}

function getStatusStyles(status: DiffCompareStatus): string {
  switch (status) {
    case "MISSING":
      return "bg-red-50 text-red-800 border-red-200";
    case "MISMATCHED":
      return "bg-yellow-50 text-yellow-800 border-yellow-200";
    case "MATCHED":
      return "bg-green-50 text-green-800 border-green-200";
    default:
      return "bg-transparent text-slate-700 border-slate-100";
  }
}

function renderCellValue(cell: DiffCell, slotIndex: 0 | 1 | 2, containerVariables: ContainerVariablesState) {
  if (cell.status === "MISSING") {
    return <span className="font-semibold uppercase tracking-wide">Missing</span>;
  }
  const isVariable = typeof cell.displayValue === "string" && cell.displayValue.includes("{{") && cell.displayValue.includes("}}");
  if (isVariable) {
    return <VariableDisplay variableString={cell.displayValue} slotIndex={slotIndex} containerVariables={containerVariables} />;
  }
  return <VariableBadge value={cell.displayValue} />;
}

export function DiffTable({ rows, showOnlyDifferences, slotNames, loadedSlots, containerVariables, onEventClick }: DiffTableProps) {
  const hasParameterDifference = (parameter: EventDiffRow["parameterDiffs"][number]) => {
    const [slot1Cell, slot2Cell, slot3Cell] = parameter.cells;
    const baselineVal = slot1Cell.value === null ? undefined : slot1Cell.value;
    const slot2Val = slot2Cell.value === null ? undefined : slot2Cell.value;
    const slot3Val = slot3Cell.value === null ? undefined : slot3Cell.value;

    if (loadedSlots[1] && getDiffStatus(baselineVal, slot2Val) !== "MATCHED") {
      return true;
    }
    if (loadedSlots[2] && getDiffStatus(baselineVal, slot3Val) !== "MATCHED") {
      return true;
    }
    return false;
  };

  const visibleRows = rows.filter((row) => !showOnlyDifferences || row.parameterDiffs.some((parameter) => hasParameterDifference(parameter)));

  if (visibleRows.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        No events to display yet. Upload one or more GTM JSON files.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {visibleRows.map((row) => {
        const visibleParameters = row.parameterDiffs.filter((parameter) => !showOnlyDifferences || hasParameterDifference(parameter));

        if (visibleParameters.length === 0) {
          return null;
        }

        return (
          <div key={row.eventName} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-100 px-4 py-2">
              <button
                type="button"
                onClick={() => onEventClick?.(row.eventName)}
                className="text-left text-sm font-semibold text-slate-900 transition hover:text-blue-700 hover:underline focus:outline-none"
              >
                Event: {row.eventName}
              </button>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {row.slotTagNames.map((tagName, idx) => (
                  <div
                    key={`${row.eventName}-tag-${idx}`}
                    className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500"
                  >
                    Tag ({slotNames[idx]}): {tagName || "Not found"}
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Parameter</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">{slotNames[0]}</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">{slotNames[1]}</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">{slotNames[2]}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleParameters.map((parameter) => (
                    (() => {
                      const [slot1Cell, slot2Cell, slot3Cell] = parameter.cells;
                      const baselineVal = slot1Cell.value === null ? undefined : slot1Cell.value;
                      const slot2Val = slot2Cell.value === null ? undefined : slot2Cell.value;
                      const slot3Val = slot3Cell.value === null ? undefined : slot3Cell.value;
                      const status2 = getDiffStatus(baselineVal, slot2Val);
                      const status3 = getDiffStatus(baselineVal, slot3Val);

                      return (
                        <tr key={`${row.eventName}-${parameter.parameterKey}`}>
                          <td className="px-4 py-2 font-medium text-slate-800">{parameter.parameterKey}</td>
                          <td className="px-4 py-2">
                            <div className={`rounded-md border px-2 py-1 ${getStatusStyles("NONE")}`}>
                              {renderCellValue(slot1Cell, 0, containerVariables)}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            {!loadedSlots[1] ? (
                              <div className="flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs italic text-slate-400">
                                Not Loaded
                              </div>
                            ) : (
                              <div className={`rounded-md border px-2 py-1 ${getStatusStyles(status2)}`}>
                                {renderCellValue(slot2Cell, 1, containerVariables)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {!loadedSlots[2] ? (
                              <div className="flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs italic text-slate-400">
                                Not Loaded
                              </div>
                            ) : (
                              <div className={`rounded-md border px-2 py-1 ${getStatusStyles(status3)}`}>
                                {renderCellValue(slot3Cell, 2, containerVariables)}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
}
