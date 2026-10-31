/** Keep intercepted ability catalogs consistent with the real API's bounded keyset pages. */
export function paginateAbilityFixture<T extends { id: number }>(
  rows: T[],
  body: { page_size?: number; after_id?: number }
): T[] {
  if (body.page_size === undefined) return rows;
  return rows
    .filter((row) => body.after_id === undefined || row.id > body.after_id)
    .sort((left, right) => left.id - right.id)
    .slice(0, body.page_size);
}
