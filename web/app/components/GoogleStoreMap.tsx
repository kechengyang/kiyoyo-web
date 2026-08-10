"use client";

import { useEffect, useRef, useState } from "react";
import { MAPS_BROWSER_KEY } from "../platform";
import type { Lang, Store } from "../types";

type Props = {
  lang: Lang;
  stores: Store[];
  selectedStoreId: string;
  onSelect: (storeId: string) => void;
};

let googleMapsPromise: Promise<void> | null = null;

const mapsReady = () => Boolean(window.google?.maps?.Map);

const waitForGoogleMaps = () =>
  new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (mapsReady()) {
        resolve();
        return;
      }
      if (Date.now() - startedAt > 15000) {
        reject(new Error("Google Maps timed out"));
        return;
      }
      window.setTimeout(check, 50);
    };
    check();
  });

const loadGoogleMaps = () => {
  if (mapsReady()) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise<void>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(
      "script[data-kiyoyo-maps]",
    );
    if (!script) {
      script = document.createElement("script");
      script.dataset.kiyoyoMaps = "true";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_BROWSER_KEY}&v=weekly&loading=async`;
      script.async = true;
      document.head.appendChild(script);
    }

    script.addEventListener(
      "error",
      () => {
        script.dataset.kiyoyoMapsState = "error";
        reject(new Error("Google Maps failed to load"));
      },
      { once: true },
    );
    waitForGoogleMaps().then(resolve, reject);
  }).catch((error) => {
    googleMapsPromise = null;
    throw error;
  });

  return googleMapsPromise;
};

export default function GoogleStoreMap({
  lang,
  stores,
  selectedStoreId,
  onSelect,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let settleTimer = 0;
    let resizeObserver: ResizeObserver | undefined;

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
          renderingType: google.maps.RenderingType.RASTER,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          backgroundColor: "#eef1f2",
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

        const syncMapToContainer = () => {
          if (cancelled) return;
          google.maps.event.trigger(map, "resize");
          if (selected) {
            map.setCenter({ lat: selected.lat!, lng: selected.lng! });
          }
        };
        resizeObserver = new ResizeObserver(syncMapToContainer);
        resizeObserver.observe(element.current);
        frame = window.requestAnimationFrame(() => {
          syncMapToContainer();
          if (!cancelled) setMapState("ready");
        });
        settleTimer = window.setTimeout(syncMapToContainer, 350);
      })
      .catch(() => {
        if (!cancelled) setMapState("error");
      });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      resizeObserver?.disconnect();
    };
  }, [loadAttempt, onSelect, selectedStoreId, stores]);

  const retry = () => {
    const failedScript = document.querySelector<HTMLScriptElement>(
      'script[data-kiyoyo-maps][data-kiyoyo-maps-state="error"]',
    );
    failedScript?.remove();
    googleMapsPromise = null;
    setMapState("loading");
    setLoadAttempt((attempt) => attempt + 1);
  };

  return (
    <div className={`google-store-map-shell ${mapState}`}>
      <div
        className="google-store-map"
        ref={element}
        aria-label={
          lang === "zh" ? "KIYOYO 内罗毕门店地图" : "Map of KIYOYO Nairobi stores"
        }
        aria-busy={mapState === "loading"}
      />
      {mapState === "loading" && (
        <div className="google-store-map-status" role="status">
          {lang === "zh" ? "正在载入地图…" : "Loading map…"}
        </div>
      )}
      {mapState === "error" && (
        <div className="google-store-map-status map-error" role="alert">
          <strong>{lang === "zh" ? "地图暂时无法显示" : "Map unavailable"}</strong>
          <span>
            {lang === "zh"
              ? "仍可从下方门店列表选择。"
              : "You can still choose a store from the list below."}
          </span>
          <button onClick={retry}>{lang === "zh" ? "重试" : "Retry"}</button>
        </div>
      )}
    </div>
  );
}
