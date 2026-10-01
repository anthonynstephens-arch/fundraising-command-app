"use client";

import { useRef, useState } from "react";
import type { StoreImage } from "@/lib/public/storefront";

// Clear only white pixels connected to the outer edge. White printing inside
// the garment stays intact; the original Shopify asset is never changed.
export function clearExteriorWhite(pixels: Uint8ClampedArray, width: number, height: number) {
  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  let head = 0, tail = 0;
  function visit(index: number) {
    if (visited[index]) return;
    visited[index] = 1;
    const offset = index * 4;
    const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
    if (pixels[offset + 3] > 0 && (Math.min(r, g, b) < 240 || Math.max(r, g, b) - Math.min(r, g, b) > 12)) return;
    queue[tail++] = index;
  }
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++], x = index % width;
    pixels[index * 4 + 3] = 0;
    if (x > 0) visit(index - 1);
    if (x < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index < width * (height - 1)) visit(index + width);
  }
}

export function FloatingProductImage({ image, title, secondary = false }: { image?: StoreImage; title: string; secondary?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [light, setLight] = useState(false);
  if (!image) return <span className="dmd-no-image">{title}</span>;
  const url = new URL(image.url, "https://www.fundraisercommand.com");
  if (url.hostname.endsWith("shopify.com")) url.searchParams.set("width", "1000");
  return (
    <span className={"dmd-floating-image" + (secondary ? " dmd-secondary-image" : "") + (ready ? " is-ready" : "") + (failed ? " is-fallback" : "") + (light ? " is-light" : "")}>
      <img
        src={url.toString()} crossOrigin="anonymous" alt={secondary ? "" : image.altText || title}
        loading="lazy" decoding="async" width={image.width || 1000} height={image.height || 1000}
        onError={() => setFailed(true)}
        onLoad={(event) => {
          try {
            const source = event.currentTarget, target = canvas.current;
            if (!target) return;
            target.width = source.naturalWidth; target.height = source.naturalHeight;
            const context = target.getContext("2d", { willReadFrequently: true });
            if (!context) { setFailed(true); return; }
            context.drawImage(source, 0, 0);
            const frame = context.getImageData(0, 0, target.width, target.height);
            clearExteriorWhite(frame.data, target.width, target.height);
            const center = (Math.floor(target.height / 2) * target.width + Math.floor(target.width / 2)) * 4;
            setLight(frame.data[center] * .2126 + frame.data[center + 1] * .7152 + frame.data[center + 2] * .0722 > 170);
            context.putImageData(frame, 0, 0);
            setReady(true);
          } catch { setFailed(true); }
        }}
      />
      <canvas ref={canvas} aria-hidden="true" />
    </span>
  );
}
