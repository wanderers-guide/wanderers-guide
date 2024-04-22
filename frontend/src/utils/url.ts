export function setQueryParam(key: string, value: string) {
  // Create URL based on current location
  let url = new URL(window.location.href);

  // Set or replace the query parameter
  url.searchParams.set(key, value);

  // Update the URL in the browser without reloading the page
  window.history.pushState({}, '', url);
}
