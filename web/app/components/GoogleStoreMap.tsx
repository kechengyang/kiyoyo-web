"use client";

import { useEffect, useRef } from "react";
import { MAPS_BROWSER_KEY } from "../platform";
import type { Store } from "../types";

type Props = {
  stores: Store[];
  selectedStoreId: string;
  onSelect: (storeId: string) => void;
};

const loadGoogleMaps = () => {
  if (window.google?.maps) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(
    "script[data-kiyoyo-maps]",
  );
  if (existing)
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Google Maps failed to load")),
        { once: true },
      );
    });
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.dataset.kiyoyoMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_BROWSER_KEY}&v=weekly&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
};

export default function GoogleStoreMap({
  stores,
  selectedStoreId,
  onSelect,
}: Props) {
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !element.current) return;
        const located = stores.filter(
          (store) => store.lat != null && store.lng != null,
        );
        const selected =
          located.find((store) => store.id === selectedStoreId) ?? located[0];
        const map = new google.maps.Map(element.current, {
          center: selected
            ? { lat: selected.lat!, lng: selected.lng! }
            : { lat: -1.2864, lng: 36.8172 },
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#dce8ee" }],
            },
          ],
        });
        for (const store of located) {
          const marker = new google.maps.Marker({
            map,
            position: { lat: store.lat!, lng: store.lng! },
            title: store.name,
            label: { text: "K", color: "white", fontWeight: "700" },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: store.id === selectedStoreId ? 14 : 11,
              fillColor: "#e51f1f",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
          });
          marker.addListener("click", () => onSelect(store.id));
        }
      })
      .catch(() => {
        /* the store list remains usable if Maps is unavailable */
      });
    return () => {
      cancelled = true;
    };
  }, [onSelect, selectedStoreId, stores]);

  return (
    <div
      className="google-store-map"
      ref={element}
      aria-label="Map of KIYOYO Nairobi stores"
    />
  );
}
