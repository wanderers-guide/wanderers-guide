type CustomizationCache = {
  background_image_url?: string;
  sheet_theme?: {
    color: string;
    dyslexia_font?: boolean;
    view_operations?: boolean;
    zoom?: number;
  };
};

export function getCachedCustomization(): CustomizationCache | null {
  const cache = localStorage.getItem('customization-cache');

  if (cache) {
    return JSON.parse(cache);
  }

  return null;
}

export function saveCustomization(customization: CustomizationCache) {
  localStorage.setItem('customization-cache', JSON.stringify(customization));
}
