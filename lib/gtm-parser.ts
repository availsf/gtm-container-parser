export type GTMValue = string | number | boolean | null | GTMValue[] | { [key: string]: GTMValue };

export type GTMParameter = {
  type?: string;
  key?: string;
  value?: unknown;
  map?: Array<{
    key?: unknown;
    value?: unknown;
    [key: string]: unknown;
  }>;
  mapEntry?: Array<{
    key?: unknown;
    value?: unknown;
    [key: string]: unknown;
  }>;
  list?: unknown[];
  listItem?: unknown[];
  [key: string]: unknown;
};

export type ExtractedGA4Tag = {
  rowIdentity: string;
  displayId: string;
  eventName: string;
  tagName: string;
  originalTagName: string;
  tagType: string;
  parameters: Record<string, GTMValue>;
  inheritsSettingsFrom: string | null;
};

export type DiffStatus = "MATCH" | "MISSING" | "MISMATCH";

export type DiffCell = {
  status: DiffStatus;
  value: GTMValue | null;
  displayValue: string;
};

export type ParameterDiff = {
  parameterKey: string;
  cells: [DiffCell, DiffCell, DiffCell];
  hasDifference: boolean;
};

export type EventDiffRow = {
  eventName: string;
  slotTagNames: [string | null, string | null, string | null];
  parameterDiffs: ParameterDiff[];
  hasDifference: boolean;
};

export type SlotHealthSummary = {
  slotIndex: 1 | 2 | 3;
  matchingEvents: number;
  missingEvents: number;
  parameterMismatches: number;
};

type GTMTagLike = {
  type?: string;
  name?: string;
  parameter?: GTMParameter[];
  [key: string]: unknown;
};

type GTMVariableLike = {
  name?: string;
  type?: string;
  parameter?: GTMParameter[];
  [key: string]: unknown;
};

export type ExtractedVariableMap = Record<string, { type: string } & Record<string, GTMValue>>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toScalarString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toGTMValue(value: unknown): GTMValue {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toGTMValue(item));
  }
  if (isPlainObject(value)) {
    const out: Record<string, GTMValue> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = toGTMValue(val);
    }
    return out;
  }
  return String(value);
}

export function resolveGTMValue(param: unknown): GTMValue {
  if (param === null || param === undefined) {
    return null;
  }

  if (typeof param === "string" || typeof param === "number" || typeof param === "boolean") {
    return param;
  }

  if (Array.isArray(param)) {
    return param.map((item) => resolveGTMValue(item));
  }

  if (!isPlainObject(param)) {
    return String(param);
  }

  const typedParam = param as GTMParameter;
  const paramType = typeof typedParam.type === "string" ? typedParam.type.toUpperCase() : "";

  if (paramType === "TEMPLATE") {
    return typedParam.value === undefined ? null : toGTMValue(typedParam.value);
  }

  if (paramType === "MAP") {
    const out: Record<string, GTMValue> = {};
    const entries = Array.isArray(typedParam.map)
      ? typedParam.map
      : Array.isArray(typedParam.mapEntry)
        ? typedParam.mapEntry
        : [];
    for (const entry of entries) {
      if (!isPlainObject(entry)) {
        continue;
      }
      const keyName = toScalarString(entry.key).trim();
      if (!keyName) {
        continue;
      }
      if ("type" in entry) {
        out[keyName] = resolveGTMValue(entry);
      } else {
        out[keyName] = resolveGTMValue(entry.value);
      }
    }
    return out;
  }

  if (paramType === "LIST") {
    const items = Array.isArray(typedParam.list)
      ? typedParam.list
      : Array.isArray(typedParam.listItem)
        ? typedParam.listItem
        : [];
    return items.map((item) => resolveGTMValue(item));
  }

  if ("value" in typedParam) {
    return resolveGTMValue(typedParam.value);
  }

  const fallback: Record<string, GTMValue> = {};
  for (const [key, value] of Object.entries(typedParam)) {
    if (key === "type") {
      continue;
    }
    fallback[key] = resolveGTMValue(value);
  }
  return fallback;
}

export const resolveValue = resolveGTMValue;

function extractTagList(container: unknown): GTMTagLike[] {
  if (!isPlainObject(container)) {
    return [];
  }
  const containerVersion = container.containerVersion;
  if (isPlainObject(containerVersion) && Array.isArray(containerVersion.tag)) {
    return containerVersion.tag as GTMTagLike[];
  }
  return [];
}

function extractVariableList(container: unknown): GTMVariableLike[] {
  if (!isPlainObject(container)) {
    return [];
  }
  const containerVersion = container.containerVersion;
  if (isPlainObject(containerVersion) && Array.isArray(containerVersion.variable)) {
    return containerVersion.variable as GTMVariableLike[];
  }
  return [];
}

function pickFirstString(parameters: Record<string, GTMValue>, keys: string[]): string | null {
  for (const key of keys) {
    const value = parameters[key];
    const candidate = toScalarString(value).trim();
    if (candidate) {
      return candidate;
    }
  }
  return null;
}

export function flattenParams(paramsArray: GTMParameter[]): Record<string, GTMValue> {
  const flattened: Record<string, GTMValue> = {};

  for (const parameter of paramsArray) {
    const key = typeof parameter.key === "string" ? parameter.key : "";
    if (!key) {
      continue;
    }
    const resolvedValue = resolveValue(parameter);

    if (key === "eventSettingsTable" || key === "userProperties" || key === "configSettingsTable") {
      let prefix = "";
      if (key === "eventSettingsTable") {
        prefix = "[Event Param] ";
      }
      if (key === "configSettingsTable") {
        prefix = "[Config Param] ";
      }
      if (key === "userProperties") {
        prefix = "[User Prop] ";
      }
      if (Array.isArray(resolvedValue)) {
        for (const row of resolvedValue) {
          if (!isPlainObject(row)) {
            continue;
          }

          const parameterName = row.parameter !== undefined ? toScalarString(row.parameter).trim() : "";
          const parameterValue = row.parameterValue;
          if (parameterName && parameterValue !== undefined) {
            flattened[`${prefix}${parameterName}`] = parameterValue as GTMValue;
            continue;
          }

          const altName = row.name !== undefined ? toScalarString(row.name).trim() : "";
          const altValue = row.value;
          if (altName && altValue !== undefined) {
            flattened[`${prefix}${altName}`] = altValue as GTMValue;
          }
        }
      }
      // Do not keep raw table blobs once unwrapped.
      continue;
    }

    flattened[key] = resolvedValue;
  }
  return flattened;
}

export function extractGA4Data(container: unknown): ExtractedGA4Tag[] {
  const tags = extractTagList(container);
  const parsedTags: ExtractedGA4Tag[] = [];
  const eventNameCounts: Record<string, number> = {};
  const configIdCounts: Record<string, number> = {};

  for (const [index, tag] of tags.entries()) {
    // Parse parameters first for every tag before applying value-based filters.
    const parameters = Array.isArray(tag.parameter) ? tag.parameter : [];
    const finalParams = flattenParams(parameters);
    const tagType = typeof tag.type === "string" ? tag.type : "";
    const isGA4EventTag = tagType === "gaawe";
    const isGoogleTag = tagType === "googtag" || tagType === "gaawc";
    const configId = pickFirstString(finalParams, ["tagId", "tag_id", "measurementId", "measurement_id"]) ?? "";

    // Keep GA4 event/config tags only, including variable-driven config IDs.
    if (!isGA4EventTag && !isGoogleTag) {
      continue;
    }
    if (isGoogleTag && (!configId || (!configId.startsWith("G-") && !configId.startsWith("{{")))) {
      continue;
    }

    const tagName = typeof tag.name === "string" ? tag.name : `Tag ${index + 1}`;
    const inheritsSettingsRaw = finalParams.eventSettingsVariable ?? finalParams.event_settings_variable;
    const inheritsSettingsFrom = inheritsSettingsRaw ? toScalarString(inheritsSettingsRaw) : null;
    const eventName = pickFirstString(finalParams, ["eventName", "event_name"]) ?? "";
    const baseEventName = eventName || `UNNAMED: ${tagName}`;
    const baseConfigIdentity = `CONFIG: ${configId || "UNKNOWN"}`;

    let rowIdentity = baseEventName;
    if (isGoogleTag) {
      configIdCounts[baseConfigIdentity] = (configIdCounts[baseConfigIdentity] ?? 0) + 1;
      rowIdentity =
        configIdCounts[baseConfigIdentity] === 1
          ? baseConfigIdentity
          : `${baseConfigIdentity} (${configIdCounts[baseConfigIdentity]})`;
    } else {
      eventNameCounts[baseEventName] = (eventNameCounts[baseEventName] ?? 0) + 1;
      rowIdentity =
        eventNameCounts[baseEventName] === 1 ? baseEventName : `${baseEventName} (${eventNameCounts[baseEventName]})`;
    }

    let finalTag: ExtractedGA4Tag = {
      rowIdentity,
      displayId: rowIdentity,
      eventName: rowIdentity,
      tagName,
      originalTagName: tagName,
      tagType,
      parameters: finalParams,
      inheritsSettingsFrom
    };

    parsedTags.push(finalTag);
  }

  const sortedParsedTags = parsedTags.sort((a, b) => a.rowIdentity.localeCompare(b.rowIdentity));
  console.log("Parsed Tags:", sortedParsedTags.length);
  return sortedParsedTags;
}

export function extractGA4Tags(container: unknown): ExtractedGA4Tag[] {
  return extractGA4Data(container);
}

export function extractVariables(json: unknown): ExtractedVariableMap {
  const variables = extractVariableList(json);
  const out: ExtractedVariableMap = {};

  for (const [index, variable] of variables.entries()) {
    const variableName =
      typeof variable.name === "string" && variable.name.trim()
        ? variable.name.trim()
        : `Unnamed Variable ${index + 1}`;
    const variableType = typeof variable.type === "string" ? variable.type : "";
    const params = Array.isArray(variable.parameter) ? variable.parameter : [];
    const flattened = flattenParams(params);
    out[variableName] = {
      type: variableType,
      ...flattened
    };
  }

  return out;
}

function stableNormalize(value: GTMValue | null): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    const vars = extractVariableTokens(value);
    if (vars.length > 0) {
      return `var:${vars.join("|")}`;
    }
    return `str:${value}`;
  }
  if (typeof value === "number") {
    return `num:${value}`;
  }
  if (typeof value === "boolean") {
    return `bool:${value}`;
  }
  if (Array.isArray(value)) {
    return `arr:[${value.map((item) => stableNormalize(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `obj:{${keys.map((key) => `${key}:${stableNormalize(value[key])}`).join(",")}}`;
}

function toDisplayValue(value: GTMValue | null): string {
  if (value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function mapByEventName(tags: ExtractedGA4Tag[]): Map<string, ExtractedGA4Tag> {
  return new Map(tags.map((tag) => [tag.eventName, tag]));
}

export function extractVariableTokens(value: string): string[] {
  const matches = value.match(/{{\s*[^}]+\s*}}/g);
  if (!matches) {
    return [];
  }
  return matches.map((token) => token.replace(/{{\s*|\s*}}/g, "").trim()).filter(Boolean);
}

export function buildDiffMatrix(tagsBySlot: [ExtractedGA4Tag[], ExtractedGA4Tag[], ExtractedGA4Tag[]]): EventDiffRow[] {
  const maps = tagsBySlot.map((tags) => mapByEventName(tags));
  const allEventNames = new Set<string>();

  for (const map of maps) {
    for (const eventName of map.keys()) {
      allEventNames.add(eventName);
    }
  }

  const rows: EventDiffRow[] = [];
  for (const eventName of Array.from(allEventNames).sort((a, b) => a.localeCompare(b))) {
    const events = maps.map((map) => map.get(eventName) ?? null);
    const allParamKeys = new Set<string>();

    for (const event of events) {
      if (!event) {
        continue;
      }
      for (const key of Object.keys(event.parameters)) {
        allParamKeys.add(key);
      }
      if (event.inheritsSettingsFrom) {
        allParamKeys.add("event_settings_variable");
      }
    }

    const parameterDiffs: ParameterDiff[] = [];
    for (const parameterKey of Array.from(allParamKeys).sort((a, b) => a.localeCompare(b))) {
      const values = events.map((event) => {
        if (!event) {
          return null;
        }
        if (parameterKey === "event_settings_variable" && event.inheritsSettingsFrom) {
          return event.inheritsSettingsFrom;
        }
        return parameterKey in event.parameters ? event.parameters[parameterKey] : null;
      }) as [GTMValue | null, GTMValue | null, GTMValue | null];

      const normalized = values.map((value) => (value === null ? null : stableNormalize(value)));
      const presentNormalized = normalized.filter((value): value is string => value !== null);
      const hasMismatch = presentNormalized.length > 1 && new Set(presentNormalized).size > 1;

      const cells: [DiffCell, DiffCell, DiffCell] = values.map((value, index) => {
        const isMissing = value === null;
        if (isMissing) {
          return {
            status: values.some((other, otherIndex) => otherIndex !== index && other !== null) ? "MISSING" : "MATCH",
            value: null,
            displayValue: ""
          };
        }
        return {
          status: hasMismatch ? "MISMATCH" : "MATCH",
          value,
          displayValue: toDisplayValue(value)
        };
      }) as [DiffCell, DiffCell, DiffCell];

      parameterDiffs.push({
        parameterKey,
        cells,
        hasDifference: cells.some((cell) => cell.status !== "MATCH")
      });
    }

    rows.push({
      eventName,
      slotTagNames: [events[0]?.originalTagName ?? null, events[1]?.originalTagName ?? null, events[2]?.originalTagName ?? null],
      parameterDiffs,
      hasDifference: parameterDiffs.some((parameter) => parameter.hasDifference)
    });
  }

  return rows;
}

export function buildHealthSummary(
  tagsBySlot: [ExtractedGA4Tag[], ExtractedGA4Tag[], ExtractedGA4Tag[]],
  rows: EventDiffRow[]
): [SlotHealthSummary, SlotHealthSummary, SlotHealthSummary] {
  const baselineEvents = new Set(tagsBySlot[0].map((tag) => tag.eventName));
  const summaries: [SlotHealthSummary, SlotHealthSummary, SlotHealthSummary] = [
    { slotIndex: 1, matchingEvents: baselineEvents.size, missingEvents: 0, parameterMismatches: 0 },
    { slotIndex: 2, matchingEvents: 0, missingEvents: 0, parameterMismatches: 0 },
    { slotIndex: 3, matchingEvents: 0, missingEvents: 0, parameterMismatches: 0 }
  ];

  for (const slotIndex of [1, 2] as const) {
    const eventSet = new Set(tagsBySlot[slotIndex].map((tag) => tag.eventName));
    let matchingEvents = 0;
    for (const eventName of baselineEvents) {
      if (eventSet.has(eventName)) {
        matchingEvents += 1;
      }
    }

    const missingEvents = baselineEvents.size - matchingEvents;
    let parameterMismatches = 0;
    for (const row of rows) {
      if (!baselineEvents.has(row.eventName) || !eventSet.has(row.eventName)) {
        continue;
      }
      for (const parameter of row.parameterDiffs) {
        const targetCell = parameter.cells[slotIndex];
        if (targetCell.status !== "MATCH") {
          parameterMismatches += 1;
        }
      }
    }

    summaries[slotIndex] = {
      slotIndex: (slotIndex + 1) as 2 | 3,
      matchingEvents,
      missingEvents,
      parameterMismatches
    };
  }

  return summaries;
}

function markdownSafe(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function buildDiffMarkdown(rows: EventDiffRow[]): string {
  const lines: string[] = [
    "| Event | Parameter | Slot 1 | Slot 2 | Slot 3 | Status |",
    "| --- | --- | --- | --- | --- | --- |"
  ];

  for (const row of rows) {
    for (const parameter of row.parameterDiffs) {
      if (!parameter.hasDifference) {
        continue;
      }
      const [slot1, slot2, slot3] = parameter.cells;
      lines.push(
        `| ${markdownSafe(row.eventName)} | ${markdownSafe(parameter.parameterKey)} | ${markdownSafe(slot1.displayValue || "MISSING")} | ${markdownSafe(slot2.displayValue || "MISSING")} | ${markdownSafe(slot3.displayValue || "MISSING")} | S1:${slot1.status}, S2:${slot2.status}, S3:${slot3.status} |`
      );
    }
  }

  if (lines.length === 2) {
    lines.push("| No differences | - | - | - | - | - |");
  }

  return lines.join("\n");
}
