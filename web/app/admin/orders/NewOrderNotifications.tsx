"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AudioContextConstructor = typeof AudioContext;

const audioContextConstructor = () => {
  const audioWindow = window as typeof window & {
    webkitAudioContext?: AudioContextConstructor;
  };
  return window.AudioContext ?? audioWindow.webkitAudioContext;
};

export type NewOrderNotice = {
  sequence: number;
  orderNumber: string;
  orderCount: number;
};

export function useNewOrderChime() {
  const contextRef = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundReady, setSoundReady] = useState(false);

  useEffect(
    () => () => {
      if (contextRef.current && contextRef.current.state !== "closed") {
        void contextRef.current.close();
      }
    },
    [],
  );

  const ensureSoundReady = useCallback(async () => {
    const AudioContextClass = audioContextConstructor();
    if (!AudioContextClass) return null;
    const context = contextRef.current ?? new AudioContextClass();
    contextRef.current = context;
    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        setSoundReady(false);
        return null;
      }
    }
    const ready = context.state === "running";
    setSoundReady(ready);
    return ready ? context : null;
  }, []);

  useEffect(() => {
    if (!soundEnabled || soundReady) return;
    const unlockSound = () => void ensureSoundReady();
    window.addEventListener("pointerdown", unlockSound, { capture: true });
    window.addEventListener("keydown", unlockSound, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlockSound, { capture: true });
      window.removeEventListener("keydown", unlockSound, { capture: true });
    };
  }, [ensureSoundReady, soundEnabled, soundReady]);

  const toggleSound = useCallback(async () => {
    if (soundEnabled && !soundReady) {
      await ensureSoundReady();
      return;
    }
    if (soundEnabled) {
      setSoundEnabled(false);
      setSoundReady(false);
      return;
    }
    setSoundEnabled(true);
    await ensureSoundReady();
  }, [ensureSoundReady, soundEnabled, soundReady]);

  const playChime = useCallback(async () => {
    if (!soundEnabled) return;
    const context = await ensureSoundReady();
    if (!context) return;
    const start = context.currentTime;
    [659.25, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * 0.16;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.2, noteStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.42);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.45);
    });
  }, [ensureSoundReady, soundEnabled]);

  return { playChime, soundEnabled, soundReady, toggleSound };
}

export function NewOrderAlert({
  notice,
  onDismiss,
  onViewOrder,
}: {
  notice: NewOrderNotice;
  onDismiss: () => void;
  onViewOrder: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 12_000);
    return () => window.clearTimeout(timer);
  }, [notice.sequence, onDismiss]);

  return (
    <aside className="new-order-alert" role="alert" aria-live="assertive" aria-atomic="true">
      <div className="new-order-alert-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
      </div>
      <div>
        <strong>You have a new order!</strong>
        <span>您有一个新订单！</span>
        <small>
          {notice.orderCount > 1 ? `${notice.orderCount} new orders` : notice.orderNumber}
        </small>
      </div>
      <button className="new-order-view" onClick={onViewOrder}>View order</button>
      <button className="new-order-dismiss" onClick={onDismiss} aria-label="Dismiss new order notification">×</button>
    </aside>
  );
}
