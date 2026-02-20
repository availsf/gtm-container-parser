import { extractVariableTokens } from "@/lib/gtm-parser";

type VariableBadgeProps = {
  value: string;
};

export function VariableBadge({ value }: VariableBadgeProps) {
  const tokens = extractVariableTokens(value);
  if (tokens.length === 0) {
    return <span className="text-slate-800">{value || "-"}</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-1">
      {tokens.map((token, index) => (
        <span
          key={`${token}-${index}`}
          className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
        >
          {token}
        </span>
      ))}
    </span>
  );
}
