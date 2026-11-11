/** TinyMCE image upload -optional; returns handler config when API is wired. */
export function normalizeTinyMceImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed.replace(/^\.?\//, "")}`;
}

export function createExamImageUploadHandler(
  _apiBaseUrl: string,
  _getAuthHeaders: () => HeadersInit,
  onError?: (message: string) => void,
): Record<string, unknown> {
  return {
    images_upload_handler: (
      blobInfo: { blob: () => Blob; filename: () => string },
      progress: (percent: number) => void,
    ) =>
      new Promise<string>((resolve, reject) => {
        progress(0);
        const reader = new FileReader();
        reader.onload = () => {
          progress(100);
          const result = reader.result;
          if (typeof result === "string") resolve(result);
          else {
            onError?.("Image read failed");
            reject(new Error("Image read failed"));
          }
        };
        reader.onerror = () => {
          onError?.("Image read failed");
          reject(new Error("Image read failed"));
        };
        reader.readAsDataURL(blobInfo.blob());
      }),
  };
}
