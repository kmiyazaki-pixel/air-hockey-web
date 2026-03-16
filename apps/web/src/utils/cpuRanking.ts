export type CpuDifficulty = "easy" | "normal" | "hard";

export type CpuRankingEntry = {
  name: string;
  timeMs: number;
  createdAt: number;
};

type CpuRankingStore = Record<CpuDifficulty, CpuRankingEntry[]>;

const STORAGE_KEY = "air-hockey-cpu-ranking";
const MAX_ENTRIES = 10;

const emptyStore = (): CpuRankingStore => ({
  easy: [],
  normal: [],
  hard: [],
});

function isValidEntry(value: unknown): value is CpuRankingEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as CpuRankingEntry;
  return (
    typeof entry.name === "string" &&
    typeof entry.timeMs === "number" &&
    typeof entry.createdAt === "number"
  );
}

export function loadCpuRanking(): CpuRankingStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();

    const parsed = JSON.parse(raw) as Partial<CpuRankingStore>;
    return {
      easy: Array.isArray(parsed.easy) ? parsed.easy.filter(isValidEntry) : [],
      normal: Array.isArray(parsed.normal) ? parsed.normal.filter(isValidEntry) : [],
      hard: Array.isArray(parsed.hard) ? parsed.hard.filter(isValidEntry) : [],
    };
  } catch {
    return emptyStore();
  }
}

export function saveCpuRanking(store: CpuRankingStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function addCpuRankingEntry(
  difficulty: CpuDifficulty,
  name: string,
  timeMs: number
): CpuRankingStore {
  const store = loadCpuRanking();
  const trimmedName = name.trim().slice(0, 20) || "NO NAME";

  const nextEntry: CpuRankingEntry = {
    name: trimmedName,
    timeMs,
    createdAt: Date.now(),
  };

  const nextList = [...store[difficulty], nextEntry]
    .sort((a, b) => a.timeMs - b.timeMs)
    .slice(0, MAX_ENTRIES);

  const nextStore: CpuRankingStore = {
    ...store,
    [difficulty]: nextList,
  };

  saveCpuRanking(nextStore);
  return nextStore;
}

export function formatTimeMs(timeMs: number) {
  const totalMs = Math.max(0, Math.floor(timeMs));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}
