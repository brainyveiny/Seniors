export function normalizeQuestionVideoEmbeds(html: string): string {
  return html;
}

export function expandVideosForDisplay(html: string): string {
  return html;
}

export function collapseVideosForEditor(html: string): string {
  return html;
}

export function buildVideoPlaceholderFromUrl(url: string): string {
  return `<p><a href="${url}" target="_blank" rel="noopener">${url}</a></p>`;
}
