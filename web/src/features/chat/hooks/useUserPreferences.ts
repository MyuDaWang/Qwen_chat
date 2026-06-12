"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserPreferenceDTO } from "@/src/shared/types";

const PREFERENCE_CACHE_KEY = "qwen-chat-preferences";

function normalizePreference(preference: UserPreferenceDTO & { theme?: string }): UserPreferenceDTO {
  return {
    ...preference,
    theme: preference.theme === "dark" ? "dark" : "light"
  };
}

function readCachedPreferences() {
  const raw = window.localStorage.getItem(PREFERENCE_CACHE_KEY);
  if (!raw) return null;

  try {
    return normalizePreference(JSON.parse(raw) as UserPreferenceDTO & { theme?: string });
  } catch {
    window.localStorage.removeItem(PREFERENCE_CACHE_KEY);
    return null;
  }
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferenceDTO | null>(null);

  const resolvedTheme = useMemo(() => (preferences?.theme === "dark" ? "dark" : "light"), [preferences?.theme]);

  const applyPreferences = useCallback((nextPreferences: UserPreferenceDTO) => {
    const normalized = normalizePreference(nextPreferences);
    setPreferences(normalized);
    window.localStorage.setItem(PREFERENCE_CACHE_KEY, JSON.stringify(normalized));
  }, []);

  const refreshPreferences = useCallback(async () => {
    const json = await fetch("/api/settings", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);

    if (json?.preferences) {
      applyPreferences(json.preferences);
      return json.preferences as UserPreferenceDTO;
    }
    return null;
  }, [applyPreferences]);

  useEffect(() => {
    const cachedPreferences = readCachedPreferences();
    if (cachedPreferences) setPreferences(cachedPreferences);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.qwenTheme = resolvedTheme;
    return () => {
      delete document.documentElement.dataset.qwenTheme;
    };
  }, [resolvedTheme]);

  return {
    preferences,
    resolvedTheme,
    applyPreferences,
    refreshPreferences
  };
}
