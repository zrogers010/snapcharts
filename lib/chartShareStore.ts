import fs from "fs";
import path from "path";

type ChartRange = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y";

export interface SharedChartRecord {
  id: string;
  symbol: string;
  range: ChartRange;
  createdAt: number;
  imageData: string;
}

const SHARE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 500;
const STORE_DIR = path.join(process.cwd(), ".snapcharts-shares");
const FILE_EXT = ".json";

const base64Like = (value: string) => /^[A-Za-z0-9+/=\s]+$/.test(value);

const normalizeDataUri = (value: string): string => {
  const compact = value.trim();
  if (!compact) return "";

  if (compact.startsWith("data:")) {
    const marker = ";base64,";
    const markerIndex = compact.indexOf(marker);
    const startIndex = compact.indexOf("base64,");
    if (markerIndex >= 0) {
      return compact.slice(markerIndex + marker.length).replace(/\s+/g, "");
    }
    if (startIndex >= 0) {
      return compact.slice(startIndex + 7).replace(/\s+/g, "");
    }
    return "";
  }

  if (base64Like(compact)) {
    return compact.replace(/\s+/g, "");
  }

  return "";
};

const ensureStoreDir = () => {
  try {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  } catch {
    // ignore
  }
};

const isValidRecord = (value: unknown): value is SharedChartRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<SharedChartRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.symbol === "string" &&
    typeof record.range === "string" &&
    typeof record.createdAt === "number" &&
    typeof record.imageData === "string"
  );
};

const filePathForId = (id: string) => path.join(STORE_DIR, `${id}${FILE_EXT}`);

const listShareIds = () => {
  ensureStoreDir();
  try {
    return fs
      .readdirSync(STORE_DIR)
      .filter((name) => name.endsWith(FILE_EXT))
      .map((name) => name.slice(0, -FILE_EXT.length));
  } catch {
    return [];
  }
};

const deleteShareFile = (id: string) => {
  try {
    fs.unlinkSync(filePathForId(id));
  } catch {
    // ignore
  }
};

const readShareFile = (id: string): SharedChartRecord | undefined => {
  ensureStoreDir();
  try {
    const raw = fs.readFileSync(filePathForId(id), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidRecord(parsed)) {
      deleteShareFile(id);
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
};

const writeShareFile = (record: SharedChartRecord) => {
  ensureStoreDir();
  const target = filePathForId(record.id);
  const temp = `${target}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(record), "utf8");
  fs.renameSync(temp, target);
};

const cleanupExpired = () => {
  const now = Date.now();
  const valid: SharedChartRecord[] = [];

  for (const id of listShareIds()) {
    const record = readShareFile(id);
    if (!record) continue;

    if (now - record.createdAt > SHARE_TTL_MS) {
      deleteShareFile(id);
      continue;
    }
    valid.push(record);
  }

  if (valid.length <= MAX_ENTRIES) return;

  valid.sort((a, b) => a.createdAt - b.createdAt);
  const removeCount = valid.length - MAX_ENTRIES;
  for (let i = 0; i < removeCount; i += 1) {
    deleteShareFile(valid[i].id);
  }
};

const randomId = () => {
  const seed = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}_${seed}`;
};

export const saveShare = (input: {
  symbol: string;
  range: string;
  imageData: string;
}) => {
  cleanupExpired();

  const id = randomId();
  const imageData = normalizeDataUri(input.imageData);
  if (!imageData) {
    throw new Error("Invalid image payload");
  }

  const record: SharedChartRecord = {
    id,
    symbol: input.symbol.trim().toUpperCase(),
    range: input.range as ChartRange,
    createdAt: Date.now(),
    imageData,
  };

  writeShareFile(record);
  return id;
};

export const getShare = (id: string) => {
  const record = readShareFile(id);
  if (!record) return undefined;
  if (Date.now() - record.createdAt > SHARE_TTL_MS) {
    deleteShareFile(id);
    return undefined;
  }
  return record;
};

export const getShareImageBuffer = (id: string) => {
  const record = getShare(id);
  if (!record) return undefined;
  const compact = record.imageData.trim();
  if (!compact) return undefined;

  const decoded =
    compact.startsWith("data:")
      ? normalizeDataUri(compact)
      : compact;

  if (!decoded || !base64Like(decoded)) return undefined;

  try {
    return Buffer.from(decoded, "base64");
  } catch {
    return undefined;
  }
};
