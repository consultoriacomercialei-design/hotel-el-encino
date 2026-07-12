/**
 * Client-side image compression to WebP.
 * Max width: 1200px, quality: 0.82
 */
export async function compressToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_W = 1200;
      const ratio = Math.min(1, MAX_W / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.naturalWidth  * ratio);
      canvas.height = Math.round(img.naturalHeight * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('canvas fail')),
        'image/webp', 0.82
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img load')); };
    img.src = url;
  });
}
