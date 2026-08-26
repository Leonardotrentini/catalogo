export function getYoutubeEmbedUrl(url: string): string | null {
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  return null;
}

export function getYoutubeId(url: string): string | null {
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
  );
  return ytMatch ? ytMatch[1] : null;
}
