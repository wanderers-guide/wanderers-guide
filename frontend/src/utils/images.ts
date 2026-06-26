import { toLabel } from './strings';

export async function getShapeIcon(content: string) {
  const res = await fetch(`https://api.dicebear.com/7.x/shapes/svg?seed=${content}`);
  return res.ok ? await res.text() : '';
}

export async function getRingIcon(content: string) {
  // await sleep(100); // to avoid rate limiting
  const res = await fetch(`https://api.dicebear.com/7.x/rings/svg?seed=${content}`);
  return res.ok ? await res.text() : '';
}

export async function isValidImage(url?: string): Promise<boolean> {
  if (!url) return false;
  const urlPattern = /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}(\S*)$/;
  if (url.trim().match(urlPattern)) {
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.onload = function () {
        resolve(true);
      };
      img.onerror = function () {
        resolve(false);
      };
      img.src = url;
    });
  } else {
    return false;
  }
}

/**
 * Rewrite a Supabase Storage object URL to the on-the-fly image transform endpoint so the browser
 * downloads a right-sized, re-encoded image instead of the full-res original (e.g. a portrait is
 * ~160KB raw vs ~3KB at 80x80 — and the transform also serves webp). Non-Supabase URLs
 * (artstation/imgur/aonprd/dicebear, data: URIs, etc.) are returned unchanged. Best-effort: any
 * parse failure returns the original URL, so this can never break an image, only shrink it.
 */
export function sizeImageUrl(
  url: string | null | undefined,
  opts: { width: number; height?: number; resize?: 'cover' | 'contain' | 'fill'; quality?: number }
): string | undefined {
  if (!url || !url.trim()) return url ?? undefined;
  // Only Supabase Storage object URLs support the render/image transform.
  if (!url.includes('/storage/v1/object/public/')) return url;
  try {
    const u = new URL(url);
    u.pathname = u.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    u.searchParams.set('width', String(Math.round(opts.width)));
    if (opts.height) {
      u.searchParams.set('height', String(Math.round(opts.height)));
      u.searchParams.set('resize', opts.resize ?? 'cover');
    }
    u.searchParams.set('quality', String(opts.quality ?? 75));
    return u.toString();
  } catch {
    return url;
  }
}

/** Device-appropriate pixel width for a full-bleed background, capped so we never over-fetch. */
export function viewportImageWidth(max = 1920): number {
  if (typeof window === 'undefined') return max;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round((window.innerWidth || 0) * dpr);
  // Guard against a 0/unknown viewport (headless, pre-layout) — never request a 0-width image.
  return w > 0 ? Math.min(w, max) : max;
}

export async function preloadImage(url?: string | null): Promise<void> {
  if (!url || !url.trim()) return;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
}

export async function findCreatureImage(name: string): Promise<string | undefined> {
  if (!name.trim()) return undefined;
  const aonPath = `https://2e.aonprd.com/Images/Monsters/${toLabel(name).replace(/ /g, '_')}.webp`;
  if (await isValidImage(aonPath)) {
    return aonPath;
  } else {
    return undefined;
  }
}
