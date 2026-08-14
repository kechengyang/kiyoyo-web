"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NEW_ORDER_SOUND_URL = "/audio/new-order-alert.mp3";

export type NewOrderNotice = {
  sequence: number;
  orderNumber: string;
  orderCount: number;
};

export function useNewOrderSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundReady, setSoundReady] = useState(false);

  const getAudio = useCallback(() => {
    const audio = audioRef.current ?? new Audio(NEW_ORDER_SOUND_URL);
    audio.preload = "auto";
    audioRef.current = audio;
    return audio;
  }, []);

  useEffect(
    () => {
      getAudio().load();
      return () => {
        audioRef.current?.pause();
        audioRef.current = null;
      };
    },
    [getAudio],
  );

  const ensureSoundReady = useCallback(async () => {
    const audio = getAudio();
    const previousVolume = audio.volume;
    audio.volume = 0;
    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = previousVolume;
      setSoundReady(true);
      return audio;
    } catch {
      audio.volume = previousVolume;
      setSoundReady(false);
      return null;
    }
  }, [getAudio]);

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

  const playSound = useCallback(async () => {
    if (!soundEnabled) return;
    const audio = getAudio();
    audio.volume = 1;
    audio.currentTime = 0;
    try {
      await audio.play();
      setSoundReady(true);
    } catch {
      setSoundReady(false);
    }
  }, [getAudio, soundEnabled]);

  return { playSound, soundEnabled, soundReady, toggleSound };
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
