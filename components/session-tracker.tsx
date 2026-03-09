"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const SESSION_KEY = "ttt_session_tracked";

export function SessionTracker() {
  const track = useMutation(api.sessions.track);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    track()
      .then(() => sessionStorage.setItem(SESSION_KEY, "1"))
      .catch(() => {});
  }, [track]);

  return null;
}
