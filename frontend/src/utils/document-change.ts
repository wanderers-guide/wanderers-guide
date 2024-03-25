import { getCachedPublicUser } from '@auth/user-manager';
import { SITE_NAME } from '@constants/data';
import { saveCustomization } from '@content/customization-cache';

export function setPageTitle(title?: string) {
  // This is a hack to make it so the builder and sheets user character customization
  if (!title?.includes('Builder') && !title?.includes('Sheet')) {
    saveCustomization({
      background_image_url: getCachedPublicUser()?.background_image_url,
      sheet_theme: getCachedPublicUser()?.site_theme,
    });
  }

  if (!title) {
    document.title = SITE_NAME;
    return;
  }
  title = title.trim();
  const newTitle = `${title} | ${SITE_NAME}`;
  if (document.title !== newTitle) {
    document.title = newTitle;
  }
}

export function removeLastPathSegment() {
  let url = window.location.href;
  let urlParts = url.split('/');
  urlParts.pop(); // Remove the last element
  let newUrl = urlParts.join('/');
  window.history.pushState({ path: newUrl }, '', newUrl);
}

export function removeQueryParam(paramToRemove: string) {
  const urlObject = new URL(window.location.href);
  const searchParams = urlObject.searchParams;
  searchParams.delete(paramToRemove);
  window.history.pushState({ path: urlObject.href }, '', urlObject.href);
}
