import type { ExtractedVariableMap } from "@/lib/gtm-parser";

export type ContainerVariablesState = [
  ExtractedVariableMap | null,
  ExtractedVariableMap | null,
  ExtractedVariableMap | null
];

const getVarBadgeConfig = (type: string | undefined) => {
  const configs = {
    // Core Variables
    v: { text: "DLV", color: "bg-blue-100 text-blue-700 border-blue-200", label: "Data Layer Variable" },
    smm: { text: "CJS", color: "bg-purple-100 text-purple-700 border-purple-200", label: "Custom JavaScript" },
    jsm: { text: "JS", color: "bg-purple-100 text-purple-700 border-purple-200", label: "JavaScript Variable" },
    c: { text: "C", color: "bg-slate-100 text-slate-700 border-slate-200", label: "Constant" },
    u: { text: "URL", color: "bg-green-100 text-green-700 border-green-200", label: "URL Variable" },

    // GA4 Specific Settings
    sme: { text: "EVT", color: "bg-orange-100 text-orange-700 border-orange-200", label: "GA4 Event Settings" },
    smc: { text: "CFG", color: "bg-orange-100 text-orange-700 border-orange-200", label: "GA4 Config Settings" },

    // Tables & Logic
    slt: { text: "LUT", color: "bg-pink-100 text-pink-700 border-pink-200", label: "Lookup Table" },
    remm: { text: "REG", color: "bg-pink-100 text-pink-700 border-pink-200", label: "RegEx Table" },

    // Page & Browser
    e: { text: "CE", color: "bg-teal-100 text-teal-700 border-teal-200", label: "Custom Event" },
    k: { text: "CK", color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "1st Party Cookie" },
    ed: { text: "DOM", color: "bg-indigo-100 text-indigo-700 border-indigo-200", label: "DOM Element" },
    f: { text: "REF", color: "bg-cyan-100 text-cyan-700 border-cyan-200", label: "HTTP Referrer" }
  } as const;
  return configs[type as keyof typeof configs] || {
    text: "VAR",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    label: type || "Unknown Variable"
  };
};

type VariableDisplayProps = {
  variableString: string;
  slotIndex: 0 | 1 | 2;
  containerVariables: ContainerVariablesState;
  className?: string;
};

export function VariableDisplay({ variableString, slotIndex, containerVariables, className }: VariableDisplayProps) {
  const cleanVarName = typeof variableString === "string" ? variableString.replace(/[{}]/g, "").trim() : "";
  const varData = cleanVarName ? containerVariables[slotIndex]?.[cleanVarName] : undefined;
  const badgeConfig = getVarBadgeConfig(varData?.type);

  return (
    <div className={`flex items-center justify-between gap-2 ${className ?? ""}`}>
      <span className="truncate text-slate-800">{variableString}</span>
      <span
        title={badgeConfig.label}
        className={`inline-flex h-6 min-w-8 items-center justify-center rounded-full border px-2 text-[10px] font-bold uppercase tracking-wide ${badgeConfig.color}`}
      >
        {badgeConfig.text}
      </span>
    </div>
  );
}
