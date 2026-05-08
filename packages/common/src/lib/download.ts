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

  // For signed URLs from Supabase, use direct download approach
  if (fileUrl.includes('token=') && fileUrl.includes('Signature=')) {
    console.log('Using direct download for signed URL');
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
  } catch (error) {
    console.error('Fetch download failed:', error);
    // Don't fallback to direct navigation for signed URLs as it causes 404s
    if (fileUrl.includes('supabase.co/storage')) {
      throw new Error('Failed to download file from storage');
    }
    
    // Fallback to direct anchor with cache-busting query params for other URLs
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


