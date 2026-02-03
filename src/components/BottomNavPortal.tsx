"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore, ReactNode } from "react";

interface BottomNavPortalProps {
  children: ReactNode;
}

// Using useSyncExternalStore to avoid the setState-in-effect lint error
function subscribe() {
  return () => {};
}

function getSnapshot() {
  return typeof document !== "undefined";
}

function getServerSnapshot() {
  return false;
}

export default function BottomNavPortal({ children }: BottomNavPortalProps) {
  const mounted = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  if (!mounted) return null;

  return createPortal(children, document.body);
}
