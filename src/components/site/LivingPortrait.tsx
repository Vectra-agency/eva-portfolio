"use client";

import { useEffect, useRef, useState } from "react";
import { avatarUrl, mountPortrait } from "./portrait-engine";

/** A soft disc with initials, used in photo mode until a photo is uploaded. */
async function monogram(initials: string): Promise<HTMLCanvasElement> {
  try {
    await document.fonts.load('900 300px "Kanit"');
  } catch {}
  const s = 1024;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const g = cv.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, s);
  grad.addColorStop(0, "#bbccd7");
  grad.addColorStop(1, "#646973");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.46, 0, Math.PI * 2);
  g.fill();
  const shine = g.createRadialGradient(s * 0.36, s * 0.3, 0, s * 0.36, s * 0.3, s * 0.5);
  shine.addColorStop(0, "rgba(255,255,255,.45)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = shine;
  g.fill();
  g.fillStyle = "#0c0c0c";
  g.font = `900 ${s * 0.34}px Kanit, Montserrat, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(initials, s / 2, s * 0.53);
  return cv;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/**
 * The "living portrait" of the studio design.
 * - avatar: the template's animated avatar (58 pictures of the same face, in /public/studio/avatar)
 * - photo: her own photo (or a monogram) on the same stretchy sheet, without faked expressions
 */
export function LivingPortrait({
  mode,
  photo,
  initials,
  alt,
}: {
  mode: "avatar" | "photo";
  photo: string | null;
  initials: string;
  alt: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLImageElement>(null);
  const flyRef = useRef<SVGSVGElement>(null);
  const handRef = useRef<SVGSVGElement>(null);
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    return mountPortrait(
      {
        wrap: wrapRef.current!,
        canvas: canvasRef.current!,
        fallback: fallbackRef.current,
        fly: flyRef.current as unknown as HTMLElement,
        hand: handRef.current as unknown as HTMLElement,
      },
      mode === "avatar"
        ? { kind: "avatar" }
        : {
            kind: "single",
            source: async () => {
              const img = photo ? await loadImage(photo) : await monogram(initials);
              if (img) {
                const w = "naturalWidth" in img ? img.naturalWidth : img.width;
                const h = "naturalHeight" in img ? img.naturalHeight : img.height;
                setAspect(w / h);
              }
              return img;
            },
          },
    );
  }, [mode, photo, initials]);

  const fallbackSrc = mode === "avatar" ? avatarUrl("rest") : photo;

  return (
    <div
      className="portrait-wrap"
      ref={wrapRef}
      style={{ "--ar": mode === "avatar" ? 1 : aspect } as React.CSSProperties}
    >
      <div className="portrait-inner studio-in">
        {fallbackSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img ref={fallbackRef} src={fallbackSrc} alt={alt} className="portrait-fallback" draggable={false} />
        ) : (
          <div className="portrait-blank" aria-hidden="true" />
        )}
        <canvas ref={canvasRef} className="portrait-gl" aria-hidden="true" />
        <div className="portrait-props" aria-hidden="true">
          <svg ref={flyRef} className="portrait-fly" viewBox="0 0 32 32">
            <path className="wing" d="M15 15C12 9.500 4.500 8.500 2 13c2.500 4.500 10 4.500 13 2z" />
            <path className="wing r" d="M17 15c3-5.500 10.500-6.500 13-2-2.500 4.500-10 4.500-13 2z" />
            <ellipse cx="16" cy="19.500" rx="4" ry="6.500" />
            <circle cx="16" cy="11.500" r="3.300" />
          </svg>
          <svg ref={handRef} className="portrait-hand" viewBox="0 0 32 32">
            <path
              className="open"
              d="M10.500 16.500V8.200a1.800 1.800 0 0 1 3.600 0V14v-8a1.800 1.800 0 0 1 3.600 0V14 7a1.800 1.800 0 0 1 3.600 0v8-5a1.800 1.800 0 0 1 3.600 0v10.500c0 5-3.400 8.500-8.400 8.500-3.600 0-5.700-1.600-7.600-4.600l-3.500-5.600c-.6-1 .1-2.200 1.200-2.400 1-.2 1.900.2 2.600 1z"
            />
            <path
              className="grab"
              d="M10.500 17v-3.300a1.800 1.800 0 0 1 3.600 0V14v-1.800a1.800 1.800 0 0 1 3.600 0V14v-1.300a1.800 1.800 0 0 1 3.600 0V14v-.3a1.800 1.800 0 0 1 3.600 0v6.800c0 5-3.400 8.500-8.400 8.500-3.600 0-5.700-1.600-7.600-4.600l-2.300-3.700c-.6-1 .1-2.200 1.200-2.400 1-.2 1.900.2 2.700 1z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
