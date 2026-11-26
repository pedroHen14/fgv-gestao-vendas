"use client";

export interface CompressedImageResult {
  file: File;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
}

const COMPRESSIBLE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/**
 * Redimensiona imagens para no máximo `maxWidth` (1600px) e comprime para JPEG (~82%)
 * no navegador antes do upload.
 *
 * Benefícios:
 * 1) Preserva a cota de 1 GB do plano gratuito.
 * 2) Garante compatibilidade imediata de mockups (inclusive vindos em WebP)
 *    com o motor de PDF (@react-pdf/renderer aceita JPEG/PNG).
 */
export async function compressImageIfNeeded(
  file: File,
  options?: { maxWidth?: number; quality?: number }
): Promise<CompressedImageResult> {
  const maxWidth = options?.maxWidth ?? 1600;
  const quality = options?.quality ?? 0.82;

  if (!COMPRESSIBLE_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return {
      file,
      compressed: false,
      originalSize: file.size,
      finalSize: file.size,
    };
  }

  // Se for JPEG/PNG já pequeno (<= 220 KB) e não WebP, só redimensiona se passar de maxWidth
  const isWebp = file.type.toLowerCase() === "image/webp";

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      image.src = objectUrl;
    });

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    if (!naturalWidth || !naturalHeight) {
      return {
        file,
        compressed: false,
        originalSize: file.size,
        finalSize: file.size,
      };
    }

    const needsResize = naturalWidth > maxWidth;
    const shouldSkip = !needsResize && !isWebp && file.size <= 220 * 1024;
    if (shouldSkip) {
      return {
        file,
        compressed: false,
        originalSize: file.size,
        finalSize: file.size,
      };
    }

    const targetWidth = needsResize ? maxWidth : naturalWidth;
    const targetHeight = Math.max(
      1,
      Math.round((naturalHeight * targetWidth) / naturalWidth)
    );

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return {
        file,
        compressed: false,
        originalSize: file.size,
        finalSize: file.size,
      };
    }

    // Fundo branco garante aparência limpa caso a imagem original tenha transparência
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );

    if (!blob) {
      return {
        file,
        compressed: false,
        originalSize: file.size,
        finalSize: file.size,
      };
    }

    // Se a compressão não diminuiu o arquivo e ele já era JPEG/PNG dentro do limite, mantém original
    if (!needsResize && !isWebp && blob.size >= file.size) {
      return {
        file,
        compressed: false,
        originalSize: file.size,
        finalSize: file.size,
      };
    }

    const baseName = file.name.replace(/\.[^/.]+$/, "") || "imagem";
    const compressedFile = new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      compressed: true,
      originalSize: file.size,
      finalSize: compressedFile.size,
    };
  } catch {
    return {
      file,
      compressed: false,
      originalSize: file.size,
      finalSize: file.size,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
