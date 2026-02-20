"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Download, Search, XCircle } from "lucide-react";
import isEqual from "lodash/isEqual";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import * as prettier from "prettier/standalone";
import * as prettierPluginBabel from "prettier/plugins/babel";
import * as prettierPluginEstree from "prettier/plugins/estree";
import { DiffTable } from "@/components/diff-table";
import { SlotColumn } from "@/components/slot-column";
import { VariableDisplay, type ContainerVariablesState } from "@/components/variable-display";
import {
  buildDiffMatrix,
  extractGA4Tags,
  extractVariables,
  type DiffCell,
  type ExtractedGA4Tag,
  type ExtractedVariableMap,
  type GTMValue
} from "@/lib/gtm-parser";

type SlotState = {
  fileName: string | null;
  error: string | null;
};

type ParsedContainer = ExtractedGA4Tag[] | null;
type ContainerState = [ParsedContainer, ParsedContainer, ParsedContainer];
type SlotMetaState = [SlotState, SlotState, SlotState];

const EMPTY_SLOT_META: SlotState = {
  fileName: null,
  error: null
};

const TOGGLE_STORAGE_KEY = "gtm-viz-show-only-differences";

const formatCodeString = (rawString: unknown): string => {
  if (typeof rawString !== "string") {
    return String(rawString ?? "");
  }
  return rawString.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
};

const configKeyMap: Record<string, string> = {
  name: "Data Layer Variable Name",
  value: "Value",
  dataLayerVersion: "Data Layer Version",
  setDefaultValue: "Set Default Value",
  defaultValue: "Default Value",
  urlParts: "URL Component",
  component: "Component Type"
};

type DiffCompareStatus = "NONE" | "MISSING" | "MATCHED" | "MISMATCHED";

const getDiffStatus = (baselineValue: unknown, comparedValue: unknown): DiffCompareStatus => {
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
};

const getStatusStyles = (status: DiffCompareStatus): string => {
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
};

const formatJavaScript = async (rawCode: unknown): Promise<string> => {
  if (typeof rawCode !== "string") {
    return String(rawCode ?? "");
  }

  let cleanCode = rawCode;
  try {
    if (cleanCode.startsWith('"') && cleanCode.endsWith('"')) {
      cleanCode = JSON.parse(cleanCode);
    }

    cleanCode = cleanCode.replace(/\\n/g, "\n").replace(/\\t/g, "\t");

    // GTM template tokens can make otherwise-valid snippets invalid JavaScript for parsers.
    // In those cases, return cleaned code without attempting prettier.
    if (/{{\s*[^}]+\s*}}/.test(cleanCode)) {
      return cleanCode;
    }

    const formatted = await prettier.format(cleanCode, {
      parser: "babel",
      plugins: [prettierPluginBabel, prettierPluginEstree],
      singleQuote: true,
      trailingComma: "es5"
    });
    return formatted;
  } catch {
    return cleanCode.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  }
};

type VariableDefinition = { type: string } & Record<string, GTMValue>;

function VariableDefinitionAccordion({
  originalString,
  slotIndex,
  containerVariables
}: {
  originalString: string;
  slotIndex: 0 | 1 | 2;
  containerVariables: ContainerVariablesState;
}) {
  const [formattedScript, setFormattedScript] = useState<string | null>(null);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [hasFormatted, setHasFormatted] = useState(false);
  const cleanVarName = typeof originalString === "string" ? originalString.replace(/[{}]/g, "").trim() : "";
  const variableDef = (containerVariables[slotIndex]?.[cleanVarName] as VariableDefinition | undefined) ?? null;

  if (!variableDef) {
    return (
      <details className="rounded border border-slate-200 bg-slate-50 p-2">
        <summary className="cursor-pointer list-none">
          <VariableDisplay variableString={originalString} slotIndex={slotIndex} containerVariables={containerVariables} />
        </summary>
        <p className="mt-2 text-xs text-slate-500">Variable definition not found.</p>
      </details>
    );
  }

  const variableValue = "value" in variableDef ? variableDef.value : variableDef;
  const formattedCode = formatCodeString(variableValue);
  const isCjs =
    variableDef.type === "smm" ||
    (typeof variableDef.javascript === "string" && variableDef.javascript.length > 0) ||
    formattedCode.includes("function(") ||
    formattedCode.includes("function ");
  const entriesToRender = Object.entries(variableDef).filter(
    ([key]) => key !== "type" && key !== "accountId" && key !== "containerId"
  );

  const rawScriptSource =
    typeof variableDef.javascript === "string"
      ? variableDef.javascript
      : typeof variableValue === "string"
        ? variableValue
        : formattedCode;

  const handleToggle = async (isOpen: boolean) => {
    if (!isOpen || !isCjs || hasFormatted) {
      return;
    }
    setIsLoadingScript(true);
    const result = await formatJavaScript(rawScriptSource);
    setFormattedScript(result);
    setHasFormatted(true);
    setIsLoadingScript(false);
  };

  return (
    <details
      className="rounded border border-slate-200 bg-slate-50 p-2"
      onToggle={(event) => handleToggle((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer list-none">
        <VariableDisplay variableString={originalString} slotIndex={slotIndex} containerVariables={containerVariables} />
      </summary>
      <div className="mt-2">
        {isCjs ? (
          isLoadingScript ? (
            <p className="text-xs text-slate-500">Formatting script...</p>
          ) : (
            <SyntaxHighlighter
              language="javascript"
              style={vscDarkPlus}
              customStyle={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: "0.75rem",
                padding: "1rem",
                borderRadius: "0.375rem",
                border: "1px solid rgb(226 232 240)",
                overflowX: "auto",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              }}
              codeTagProps={{ className: "font-mono" }}
            >
              {formattedScript ?? formatCodeString(rawScriptSource)}
            </SyntaxHighlighter>
          )
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {entriesToRender.length === 0 ? (
              <p className="text-xs text-slate-500">No additional configuration.</p>
            ) : (
              entriesToRender.map(([key, value]) => (
                <div key={key} className="rounded border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {configKeyMap[key] ?? key}
                  </p>
                  <p className="mt-1 text-xs text-slate-800 whitespace-pre-wrap break-words">
                    {typeof value === "string" ? formatCodeString(value) : JSON.stringify(value)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </details>
  );
}

export default function HomePage() {
  const [containers, setContainers] = useState<ContainerState>([null, null, null]);
  const [containerVariables, setContainerVariables] = useState<ContainerVariablesState>([null, null, null]);
  const [slotNames, setSlotNames] = useState<[string, string, string]>(["Slot 1", "Slot 2", "Slot 3"]);
  const [slotMeta, setSlotMeta] = useState<SlotMetaState>([EMPTY_SLOT_META, EMPTY_SLOT_META, EMPTY_SLOT_META]);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [modalShowDiffOnly, setModalShowDiffOnly] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(TOGGLE_STORAGE_KEY);
    if (stored === "1") {
      setShowOnlyDifferences(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(TOGGLE_STORAGE_KEY, showOnlyDifferences ? "1" : "0");
  }, [showOnlyDifferences]);

  const handleFileParsed = (parsedData: ExtractedGA4Tag[], slotIndex: 0 | 1 | 2) => {
    setContainers((prev) => {
      const next = [...prev] as ContainerState;
      next[slotIndex] = parsedData;
      return next;
    });
  };
  const handleVariablesParsed = (parsedData: ExtractedVariableMap, slotIndex: 0 | 1 | 2) => {
    setContainerVariables((prev) => {
      const next = [...prev] as ContainerVariablesState;
      next[slotIndex] = parsedData;
      return next;
    });
  };
  const handleNameChange = (index: 0 | 1 | 2, newName: string) => {
    setSlotNames((prev) => {
      const next = [...prev] as [string, string, string];
      next[index] = newName;
      return next;
    });
  };
  const handleRemoveFile = (index: 0 | 1 | 2) => {
    setContainers((prev) => {
      const next = [...prev] as ContainerState;
      next[index] = null;
      return next;
    });
    setContainerVariables((prev) => {
      const next = [...prev] as ContainerVariablesState;
      next[index] = null;
      return next;
    });
    setSlotNames((prev) => {
      const next = [...prev] as [string, string, string];
      next[index] = `Slot ${index + 1}`;
      return next;
    });
    setSlotMeta((prev) => {
      const next = [...prev] as SlotMetaState;
      next[index] = { fileName: null, error: null };
      return next;
    });
  };

  const masterEventList = useMemo(
    () => buildDiffMatrix([containers[0] ?? [], containers[1] ?? [], containers[2] ?? []]),
    [containers]
  );
  const filteredEventList = useMemo(() => {
    if (!searchQuery.trim()) {
      return masterEventList;
    }
    const query = searchQuery.toLowerCase();
    return masterEventList.filter((row) => {
      if (row.eventName.toLowerCase().includes(query)) {
        return true;
      }
      return row.slotTagNames.some((tagName) => (tagName ?? "").toLowerCase().includes(query));
    });
  }, [masterEventList, searchQuery]);
  const finalDisplayList = useMemo(() => {
    return filteredEventList.filter((row) => {
      if (!showOnlyDifferences) {
        return true;
      }

      let hasDifference = false;
      for (const parameter of row.parameterDiffs) {
        const [slot1Cell, slot2Cell, slot3Cell] = parameter.cells;
        const baselineVal = slot1Cell.value === null ? undefined : slot1Cell.value;

        if (containers[1]) {
          const slot2Val = slot2Cell.value === null ? undefined : slot2Cell.value;
          if (getDiffStatus(baselineVal, slot2Val) !== "MATCHED") {
            hasDifference = true;
          }
        }
        if (containers[2]) {
          const slot3Val = slot3Cell.value === null ? undefined : slot3Cell.value;
          if (getDiffStatus(baselineVal, slot3Val) !== "MATCHED") {
            hasDifference = true;
          }
        }
      }

      return hasDifference;
    });
  }, [filteredEventList, showOnlyDifferences, containers]);
  const healthStats = useMemo(() => {
    let matched = 0;
    let mismatched = 0;
    let missing = 0;
    const compareSlot2 = Boolean(containers[1]);
    const compareSlot3 = Boolean(containers[2]);

    for (const row of filteredEventList) {
      for (const parameter of row.parameterDiffs) {
        const [slot1Cell, slot2Cell, slot3Cell] = parameter.cells;
        const baselineVal = slot1Cell.value === null ? undefined : slot1Cell.value;

        if (compareSlot2) {
          const slot2Val = slot2Cell.value === null ? undefined : slot2Cell.value;
          const status2 = getDiffStatus(baselineVal, slot2Val);
          if (status2 === "MATCHED") matched += 1;
          if (status2 === "MISMATCHED") mismatched += 1;
          if (status2 === "MISSING") missing += 1;
        }
        if (compareSlot3) {
          const slot3Val = slot3Cell.value === null ? undefined : slot3Cell.value;
          const status3 = getDiffStatus(baselineVal, slot3Val);
          if (status3 === "MATCHED") matched += 1;
          if (status3 === "MISMATCHED") mismatched += 1;
          if (status3 === "MISSING") missing += 1;
        }
      }
    }

    return { matched, mismatched, missing };
  }, [filteredEventList, containers]);
  const selectedEventRow = useMemo(
    () => masterEventList.find((row) => row.eventName === selectedEventKey) ?? null,
    [masterEventList, selectedEventKey]
  );
  const filteredModalParameters = useMemo(() => {
    if (!selectedEventRow) {
      return [];
    }
    if (!modalShowDiffOnly) {
      return selectedEventRow.parameterDiffs;
    }

    return selectedEventRow.parameterDiffs.filter((parameter) => {
      const [slot1Cell, slot2Cell, slot3Cell] = parameter.cells;
      const baselineVal = slot1Cell.value === null ? undefined : slot1Cell.value;
      let hasDifference = false;

      if (containers[1]) {
        const slot2Val = slot2Cell.value === null ? undefined : slot2Cell.value;
        const status2 = getDiffStatus(baselineVal, slot2Val);
        if (status2 === "MISMATCHED" || status2 === "MISSING") {
          hasDifference = true;
        }
      }
      if (containers[2]) {
        const slot3Val = slot3Cell.value === null ? undefined : slot3Cell.value;
        const status3 = getDiffStatus(baselineVal, slot3Val);
        if (status3 === "MISMATCHED" || status3 === "MISSING") {
          hasDifference = true;
        }
      }

      return hasDifference;
    });
  }, [selectedEventRow, modalShowDiffOnly, containers]);

  const onUpload = (slotIndex: 0 | 1 | 2, fileName: string, fileText: string) => {
    try {
      const parsedJson = JSON.parse(fileText) as unknown;
      const tags = extractGA4Tags(parsedJson);
      const parsedVars = extractVariables(parsedJson);
      const rawFilename = fileName;
      let defaultSlotName = rawFilename.replace(/\.json$/i, "");
      if (rawFilename.startsWith("GTM-") && rawFilename.includes("_")) {
        defaultSlotName = rawFilename.split("_")[0];
      }
      handleFileParsed(tags, slotIndex);
      handleVariablesParsed(parsedVars, slotIndex);
      setSlotNames((prev) => {
        const next = [...prev] as [string, string, string];
        next[slotIndex] = defaultSlotName;
        return next;
      });

      setSlotMeta((prev) => {
        const next = [...prev] as SlotMetaState;
        next[slotIndex] = { fileName, error: null };
        return next;
      });
    } catch {
      setContainers((prev) => {
        const next = [...prev] as ContainerState;
        next[slotIndex] = null;
        return next;
      });
      setContainerVariables((prev) => {
        const next = [...prev] as ContainerVariablesState;
        next[slotIndex] = null;
        return next;
      });
      setSlotMeta((prev) => {
        const next = [...prev] as SlotMetaState;
        next[slotIndex] = {
          fileName,
          error: "Could not parse JSON. Please upload a valid GTM container export."
        };
        return next;
      });
    }
  };

  const exportToCSV = () => {
    const escapeCsv = (value: unknown): string => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const headers = ["Event Name", "Parameter", `${slotNames[1]} Status`, `${slotNames[2]} Status`];
    let csvContent = `${headers.map(escapeCsv).join(",")}\n`;

    for (const row of filteredEventList) {
      for (const parameter of row.parameterDiffs) {
        const [slot1Cell, slot2Cell, slot3Cell] = parameter.cells;
        const baselineVal = slot1Cell.value === null ? undefined : slot1Cell.value;
        const slot2Val = slot2Cell.value === null ? undefined : slot2Cell.value;
        const slot3Val = slot3Cell.value === null ? undefined : slot3Cell.value;
        const status2 = containers[1] ? getDiffStatus(baselineVal, slot2Val) : "NOT LOADED";
        const status3 = containers[2] ? getDiffStatus(baselineVal, slot3Val) : "NOT LOADED";
        csvContent += [escapeCsv(row.eventName), escapeCsv(parameter.parameterKey), escapeCsv(status2), escapeCsv(status3)].join(",");
        csvContent += "\n";
      }
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `GTM_Audit_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderInspectorCellValue = (cell: DiffCell, slotIndex: 0 | 1 | 2) => {
    if (cell.status === "MISSING") {
      return <span className="font-semibold uppercase text-red-700">Missing</span>;
    }

    const displayValue = cell.displayValue || "-";
    const rawTokens = cell.displayValue.match(/{{\s*[^}]+\s*}}/g) ?? [];
    if (rawTokens.length === 0) {
      return <span className="text-slate-800">{displayValue}</span>;
    }

    return (
      <div className="space-y-2">
        {rawTokens.map((originalString) => (
          <VariableDefinitionAccordion
            key={`${slotIndex}-${originalString}`}
            originalString={originalString}
            slotIndex={slotIndex}
            containerVariables={containerVariables}
          />
        ))}
      </div>
    );
  };

  return (
    <main className="flex w-full max-w-[100vw] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">GTM Container Difference Parser</h1>
        <p className="text-sm text-slate-600">
          Compare GA4 configuration and event tags across multiple GTM containers to identify missing or mismatched
          parameters.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by Event or Tag Name..."
              className="w-64 bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={showOnlyDifferences}
              onChange={(event) => setShowOnlyDifferences(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Show Only Differences
          </label>
          <button
            type="button"
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Export Diff to CSV
          </button>
        </div>
      </header>

      <section className="grid w-full gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <h3 className="text-sm font-semibold">Matched Parameters</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-green-600">{healthStats.matched}</p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-sm font-semibold">Mismatched Parameters</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-yellow-600">{healthStats.mismatched}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <h3 className="text-sm font-semibold">Missing Parameters</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">{healthStats.missing}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <SlotColumn
          slotIndex={0}
          slotName={slotNames[0]}
          isLoaded={containers[0] !== null}
          fileName={slotMeta[0].fileName}
          tags={containers[0] ?? []}
          error={slotMeta[0].error}
          onNameChange={handleNameChange}
          onRemove={handleRemoveFile}
          onUpload={onUpload}
        />
        <SlotColumn
          slotIndex={1}
          slotName={slotNames[1]}
          isLoaded={containers[1] !== null}
          fileName={slotMeta[1].fileName}
          tags={containers[1] ?? []}
          error={slotMeta[1].error}
          onNameChange={handleNameChange}
          onRemove={handleRemoveFile}
          onUpload={onUpload}
        />
        <SlotColumn
          slotIndex={2}
          slotName={slotNames[2]}
          isLoaded={containers[2] !== null}
          fileName={slotMeta[2].fileName}
          tags={containers[2] ?? []}
          error={slotMeta[2].error}
          onNameChange={handleNameChange}
          onRemove={handleRemoveFile}
          onUpload={onUpload}
        />
      </section>

      {finalDisplayList.length === 0 && (showOnlyDifferences || searchQuery.trim()) ? (
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <h3 className="text-lg font-medium text-slate-900">No differences found! 🎉</h3>
          <p className="mt-1 text-slate-500">
            All parsed tags and parameters match perfectly across the loaded containers based on your current filters.
          </p>
        </div>
      ) : (
        <DiffTable
          rows={finalDisplayList}
          showOnlyDifferences={showOnlyDifferences}
          slotNames={slotNames}
          loadedSlots={[containers[0] !== null, containers[1] !== null, containers[2] !== null]}
          containerVariables={containerVariables}
          onEventClick={setSelectedEventKey}
        />
      )}

      {selectedEventKey && selectedEventRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="h-[90vh] w-[95vw] max-w-[100vw] overflow-y-auto rounded-xl bg-white shadow-2xl xl:max-w-[1600px]">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Event Inspector</h2>
                  <p className="text-sm text-slate-600">{selectedEventKey}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={modalShowDiffOnly}
                      onChange={(event) => setModalShowDiffOnly(event.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Show only differences
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedEventKey(null)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {selectedEventRow.slotTagNames.map((tagName, idx) => (
                  <div key={`${selectedEventKey}-modal-tag-${idx}`} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      {slotNames[idx]}
                      {containers[idx] === null ? (
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] uppercase text-slate-600">Empty</span>
                      ) : null}
                    </div>
                    <div className="text-sm text-slate-700">Tag: {tagName || "Not found"}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto p-6">
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
                    {filteredModalParameters.map((parameter) => (
                      (() => {
                        const [slot1Cell, slot2Cell, slot3Cell] = parameter.cells;
                        const baselineVal = slot1Cell.value === null ? undefined : slot1Cell.value;
                        const slot2Val = slot2Cell.value === null ? undefined : slot2Cell.value;
                        const slot3Val = slot3Cell.value === null ? undefined : slot3Cell.value;
                        const status2 = getDiffStatus(baselineVal, slot2Val);
                        const status3 = getDiffStatus(baselineVal, slot3Val);

                        return (
                          <tr key={`${selectedEventKey}-${parameter.parameterKey}`}>
                            <td className="px-4 py-2 font-medium text-slate-800">{parameter.parameterKey}</td>
                            <td className="px-4 py-2 align-top">
                              <div className={`rounded-md border px-2 py-1 ${getStatusStyles("NONE")}`}>
                                {renderInspectorCellValue(slot1Cell, 0)}
                              </div>
                            </td>
                            <td className="px-4 py-2 align-top">
                              {containers[1] === null ? (
                                <div className="flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs italic text-slate-400">
                                  Not Loaded
                                </div>
                              ) : (
                                <div className={`rounded-md border px-2 py-1 ${getStatusStyles(status2)}`}>
                                  {renderInspectorCellValue(slot2Cell, 1)}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2 align-top">
                              {containers[2] === null ? (
                                <div className="flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs italic text-slate-400">
                                  Not Loaded
                                </div>
                              ) : (
                                <div className={`rounded-md border px-2 py-1 ${getStatusStyles(status3)}`}>
                                  {renderInspectorCellValue(slot3Cell, 2)}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })()
                    ))}
                  </tbody>
                </table>
                {filteredModalParameters.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center italic text-slate-500">
                    All parameters match perfectly.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
