"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ToastState {
  message: string;
  visible: boolean;
  exiting: boolean;
}

export function useToast(duration = 3000) {
  const [toast, setToast] = useState<ToastState>({
    message: "",
    visible: false,
    exiting: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setToast((prev) => ({ ...prev, exiting: true }));
    exitTimerRef.current = setTimeout(() => {
      setToast({ message: "", visible: false, exiting: false });
    }, 200);
  }, []);

  const showToast = useCallback(
    (message: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);

      setToast({ message, visible: true, exiting: false });

      timerRef.current = setTimeout(() => {
        dismiss();
      }, duration);
    },
    [duration, dismiss]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  return { toast, showToast, dismiss };
}

interface ToastProps {
  message: string;
  visible: boolean;
  exiting: boolean;
}

export function Toast({ message, visible, exiting }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !visible) return null;

  const portalTarget = document.getElementById("toast-root");
  if (!portalTarget) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 300,
        pointerEvents: "none",
        animation: exiting ? "toast-out 200ms ease forwards" : "toast-in 250ms ease",
      }}
    >
      <div
        style={{
          backgroundColor: "#1A1A18",
          color: "#FFFFFF",
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "var(--font)",
          padding: "10px 20px",
          borderRadius: "var(--radius)",
          boxShadow:
            "0 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)",
          whiteSpace: "nowrap",
          pointerEvents: "auto",
          lineHeight: 1.4,
        }}
      >
        {message}
      </div>
    </div>,
    portalTarget
  );
}
