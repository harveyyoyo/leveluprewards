"use client";

import { useEffect, useState } from "react";
import type { SmartScreenLocationInfo } from "./useSmartScreenDisplayData";

export function useDisplayWeather(configuredZip = "") {
  const [location, setLocation] = useState<SmartScreenLocationInfo | null>(
    null,
  );
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const params = new URLSearchParams();
      if (/^\d{5}$/.test(configuredZip.trim()))
        params.set("zip", configuredZip.trim());
      try {
        const response = await fetch(`/api/smart-screen/location?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json()) as SmartScreenLocationInfo;
        if (!controller.signal.aborted) setLocation(result);
      } catch {
        if (!controller.signal.aborted) setLocation({ ok: false });
      }
    };
    void load();
    const timer = setInterval(load, 10 * 60 * 1000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [configuredZip]);
  return location;
}
