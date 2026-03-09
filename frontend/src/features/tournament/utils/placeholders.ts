// Inline SVG data URIs — no file dependencies
export const placeholderBanner = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#16213e"/></linearGradient></defs><rect fill="url(#g)" width="1200" height="300"/></svg>'
);

export const placeholderLogo = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect fill="#1a1a2e" width="256" height="256" rx="16"/><text x="128" y="140" text-anchor="middle" font-size="80" fill="#ffffff30" font-family="sans-serif">🏆</text></svg>'
);
