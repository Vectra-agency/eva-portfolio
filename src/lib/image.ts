/** Browser-side image downscaling so uploads stay small and under the 4 MB request limit. */

export const IMAGE_PRESETS = {
  photo: { maxSide: 1600, type: "image/webp", quality: 0.86 },
  covers: { maxSide: 1600, type: "image/webp", quality: 0.82 },
  // Certificates stay JPEG so the ZIP archive opens everywhere; larger side for legible small print.
  certificates: { maxSide: 2400, type: "image/jpeg", quality: 0.88 },
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

const LIMIT = 3.8 * 1024 * 1024;

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Safari fallback (e.g. HEIC on iOS) — let the <img> decoder try.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export async function compressImage(file: File, preset: ImagePreset): Promise<{ blob: Blob; name: string }> {
  const { maxSide, type, quality } = IMAGE_PRESETS[preset];
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    throw new Error("Не удалось прочитать изображение. Сохраните его как JPG или PNG и попробуйте снова.");
  }
  const w = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  if (type === "image/jpeg") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();

  let q: number = quality;
  let blob: Blob | null = null;
  for (let i = 0; i < 5; i++) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
    if (!blob) break;
    if (blob.size <= LIMIT) break;
    q -= 0.12;
  }
  if (!blob) throw new Error("Браузер не смог сжать изображение");
  // Browsers without WebP encoding silently return PNG.
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return { blob, name: `${base}.${ext}` };
}
