import { ChangeEvent } from "react";
import { CheckCircle, Pencil, Trash2 } from "lucide-react";
import type { ExtractedGA4Tag } from "@/lib/gtm-parser";

type SlotColumnProps = {
  slotIndex: 0 | 1 | 2;
  slotName: string;
  isLoaded: boolean;
  fileName: string | null;
  tags: ExtractedGA4Tag[];
  error: string | null;
  onNameChange: (slotIndex: 0 | 1 | 2, nextName: string) => void;
  onRemove: (slotIndex: 0 | 1 | 2) => void;
  onUpload: (slotIndex: 0 | 1 | 2, fileName: string, fileText: string) => void;
};

export function SlotColumn({
  slotIndex,
  slotName,
  isLoaded,
  fileName,
  tags,
  error,
  onNameChange,
  onRemove,
  onUpload
}: SlotColumnProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const fileText = typeof reader.result === "string" ? reader.result : "";
      onUpload(slotIndex, file.name, fileText);
      // Allow re-uploading the same file to trigger onChange again.
      event.target.value = "";
    };
    reader.onerror = () => {
      event.target.value = "";
    };
    reader.readAsText(file);
  };
  const inputId = `gtm-upload-${slotIndex}`;

  if (isLoaded) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="group flex w-3/4 items-center gap-2">
            <input
              type="text"
              value={slotName}
              onChange={(event) => onNameChange(slotIndex, event.target.value)}
              className="w-full border-b border-transparent bg-transparent text-lg font-bold text-slate-900 transition-colors hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-0"
            />
            <Pencil className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" />
          </div>
          <button
            type="button"
            onClick={() => onRemove(slotIndex)}
            className="rounded p-1 text-slate-400 transition-colors hover:text-red-500"
            title="Remove container"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <span className="inline-flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Container Loaded
          </span>
          <span className="rounded-md bg-white/70 px-2 py-0.5 text-xs font-medium text-slate-700">{tags.length} GA4 tags</span>
        </div>

        {fileName ? <p className="text-xs text-slate-500">Source: {fileName}</p> : null}
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="group flex flex-1 items-center gap-2">
          <input
            type="text"
            value={slotName}
            onChange={(event) => onNameChange(slotIndex, event.target.value)}
            className="w-full border-b border-transparent bg-transparent text-lg font-bold text-slate-900 transition-colors hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-0"
          />
          <Pencil className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" />
        </div>
      </div>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col gap-2 rounded-md border border-dashed border-slate-300 p-3 text-sm hover:border-slate-400"
      >
        <span className="font-medium text-slate-700">Upload GTM JSON</span>
      </label>
      <input id={inputId} type="file" accept=".json,application/json" onChange={handleChange} className="mt-2 text-xs" />
      {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
    </section>
  );
}
