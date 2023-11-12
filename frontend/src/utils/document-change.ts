import { SITE_NAME } from "@constants/data";

export function setPageTitle(title?: string) {
  if (!title) {
    document.title = SITE_NAME;
    return;
  }
  const newTitle = `${title} | ${SITE_NAME}`;
  if (document.title !== newTitle) {
    document.title = newTitle;
  }
}

export function removeLastPathSegment() {
  let url = window.location.href;
  let urlParts = url.split("/");
  urlParts.pop(); // Remove the last element
  let newUrl = urlParts.join("/");
  window.history.pushState({ path: newUrl }, "", newUrl);
}

export function removeQueryParam(paramToRemove: string) {
  const urlObject = new URL(window.location.href);
  const searchParams = urlObject.searchParams;
  searchParams.delete(paramToRemove);
  window.history.pushState({ path: urlObject.href }, "", urlObject.href);
}
