"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function DialogBackdrop({
  children,
  onClose,
  closeOnBackdrop = false,
  className = "",
  baseClassName = "modal-backdrop",
  labelledBy,
  ariaLabel = "KIYOYO dialog",
}: {
  children: ReactNode;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  className?: string;
  baseClassName?: string;
  labelledBy?: string;
  ariaLabel?: string;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [previousFocus] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const backdrop = backdropRef.current;
    if (!backdrop) return;

    const initialFocus = backdrop.querySelector<HTMLElement>(focusableSelector);
    if (!backdrop.contains(document.activeElement)) {
      (initialFocus ?? backdrop).focus();
    }

    const isTopmost = () => {
      const openBackdrops = document.querySelectorAll(
        "[data-dialog-backdrop]",
      );
      return openBackdrops[openBackdrops.length - 1] === backdrop;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopmost()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        backdrop.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        backdrop.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [previousFocus]);

  return (
    <div
      ref={backdropRef}
      data-dialog-backdrop
      className={`${baseClassName}${className ? ` ${className}` : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.currentTarget === event.target) onClose();
      }}
    >
      {children}
    </div>
  );
}
