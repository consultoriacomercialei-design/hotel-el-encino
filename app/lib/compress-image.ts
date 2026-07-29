/**
 * Compresión de imagen en el CLIENTE (canvas → WebP 1200px). Para las fotos de
 * identificación del check-in: dos fotos de cámara sin comprimir (~3-4 MB c/u)
 * rebasan el límite de payload de las functions de Vercel (4.5 MB). Si la
 * compresión falla (formato exótico), el caller usa el archivo original.
 */
export async function compressImageForUpload(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_W = 1200;
      const ratio = Math.min(1, MAX_W / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * ratio);
      canvas.height = Math.round(img.naturalHeight * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas fail')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('canvas fail'))),
        'image/webp',
        0.82
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img load')); };
    img.src = url;
  });
}

/** File original → File comprimido (o el original si la compresión falla). */
export async function preparePhotoFile(file: File, name: string): Promise<File> {
  try {
    const blob = await compressImageForUpload(file);
    return new File([blob], `${name}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  }
}
