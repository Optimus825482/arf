"use client";

import { authFetch } from "./apiClient";

export async function completeMission(
  missionId: string,
  payload: { score?: number; xpEarned?: number; success?: boolean; mode?: string },
) {
  const res = await authFetch("/api/missions/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ missionId, ...payload }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Mission completion could not be saved");
  }
  return data;
}
