export async function downloadFileFromUrl(fileUrl: string, suggestedFileName: string): Promise<void> {
  if (!fileUrl) return;

  // Data URL: direct anchor download
  if (fileUrl.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = suggestedFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Try fetch → blob → object URL for maximum reliability
  try {
    const response = await fetch(fileUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = suggestedFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    return;
  } catch (_) {
    // Fallback to direct anchor with cache-busting query params
    const link = document.createElement('a');
    const joiner = fileUrl.includes('?') ? '&' : '?';
    link.href = `${fileUrl}${joiner}download=${encodeURIComponent(suggestedFileName)}&ts=${Date.now()}`;
    link.download = suggestedFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function openUrlInNewTab(url: string): void {
  if (!url) return;
  const joiner = url.includes('?') ? '&' : '?';
  const finalUrl = url.startsWith('data:') ? url : `${url}${joiner}ts=${Date.now()}`;
  window.open(finalUrl, '_blank');
}


