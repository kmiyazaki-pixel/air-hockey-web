export type CpuDifficulty = "easy" | "normal" | "hard";

export type CpuRankingEntry = {
  id: number;
  name: string;
  difficulty: CpuDifficulty;
  timeMs: number;
  createdAt: string;
};

type CpuRankingResponse = {
  difficulty: CpuDifficulty;
  items: CpuRankingEntry[];
};

function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = window.location.hostname;
  return `https://${host}`;
}

export async function fetchCpuRanking(
  difficulty: CpuDifficulty
): Promise<CpuRankingEntry[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/rankings/cpu?difficulty=${difficulty}`
  );

  if (!response.ok) {
    throw new Error("ランキング取得に失敗しました。");
  }

  const data = (await response.json()) as CpuRankingResponse;
  return data.items;
}

export async function submitCpuRanking(
  difficulty: CpuDifficulty,
  name: string,
  timeMs: number
): Promise<CpuRankingEntry[]> {
  const trimmedName = name.trim().slice(0, 20) || "NO NAME";

  const response = await fetch(`${getApiBaseUrl()}/rankings/cpu`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: trimmedName,
      difficulty,
      timeMs,
    }),
  });

  if (!response.ok) {
    throw new Error("ランキング送信に失敗しました。");
  }

  const data = (await response.json()) as CpuRankingResponse;
  return data.items;
}

export function formatTimeMs(timeMs: number) {
  const totalMs = Math.max(0, Math.floor(timeMs));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}
