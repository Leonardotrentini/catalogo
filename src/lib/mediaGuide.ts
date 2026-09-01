export async function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number; ratio: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Não foi possível ler a imagem"));
      img.src = url;
    });
    const ratio = img.width / img.height;
    return { width: img.width, height: img.height, ratio };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function getVideoDimensions(
  file: File,
): Promise<{ width: number; height: number; ratio: number }> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Não foi possível ler o vídeo"));
      video.src = url;
    });
    const ratio = video.videoWidth / video.videoHeight;
    return { width: video.videoWidth, height: video.videoHeight, ratio };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function describeRatio(ratio: number): string {
  if (Math.abs(ratio - 1) < 0.08) return "1:1";
  if (Math.abs(ratio - 4 / 5) < 0.08) return "4:5";
  if (Math.abs(ratio - 3 / 4) < 0.08) return "3:4";
  if (Math.abs(ratio - 9 / 16) < 0.08) return "9:16";
  if (Math.abs(ratio - 16 / 9) < 0.08) return "16:9";
  return ratio >= 1 ? `${ratio.toFixed(2)}:1` : `1:${(1 / ratio).toFixed(2)}`;
}

export function productPhotoUploadTip(width: number, height: number): string | null {
  const ratio = width / height;
  const isSquareish = Math.abs(ratio - 1) < 0.12;
  if (isSquareish && width >= 600) return null;
  if (isSquareish) {
    return "Para melhor resultado no mobile, use pelo menos 800×800px (proporção 1:1).";
  }
  return `Proporção ${describeRatio(ratio)} pode cortar no catálogo. Recomendado: 800×800px (1:1) para aparecer inteira.`;
}

export function productVideoUploadTip(width: number, height: number): string | null {
  const ratio = width / height;
  const isVertical = ratio < 0.85;
  const isSquare = Math.abs(ratio - 1) < 0.12;
  if (isVertical || isSquare) return null;
  return `Vídeo horizontal (${describeRatio(ratio)}) pode ter barras no mobile. Recomendado: 9:16 ou 1:1.`;
}

export const PRODUCT_PHOTO_GUIDE =
  "Recomendado para mobile: 800×800px (1:1) — a foto aparece inteira no catálogo.";

export const PRODUCT_VIDEO_GUIDE =
  "Recomendado para mobile: vídeo vertical 9:16 ou quadrado 1:1 — aparece sem cortes.";
