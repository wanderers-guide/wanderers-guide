/** Exercise display labels without changing the stored currency or purchase arithmetic. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { priceToString, purchase } from '../src/process/items/currency-handler.ts';

test('Starfinder explicitly displays the SP field as credits', () => {
  assert.equal(priceToString({ sp: 500 }, true), '500 credits');
});

test('Pathfinder remains the default and keeps mixed denominations and fractions', () => {
  assert.equal(priceToString({ sp: 500 }), '500 sp');
  assert.equal(priceToString({ cp: 0.5, sp: 2.5, gp: 3, pp: 4 }), '0.5 cp, 2.5 sp, 3 gp, 4 pp');
  assert.equal(priceToString({ cp: 0.5, sp: 2.5, gp: 3, pp: 4 }, true), '0.5 cp, 2.5 credits, 3 gp, 4 pp');
  for (const price of [undefined, {}, { cp: 0, sp: 0, gp: 0, pp: 0 }]) {
    assert.equal(priceToString(price), '—');
    assert.equal(priceToString(price, true), '—');
  }
});

test('formatting is read-only and credit purchases still use the existing SP amount', () => {
  const price = Object.freeze({ sp: 500 });
  const coins = Object.freeze({ cp: 0, sp: 1000, gp: 0, pp: 0 });
  priceToString(price, true);
  assert.deepEqual(purchase(price, coins), { cp: 0, sp: 500, gp: 0, pp: 0 });
  assert.equal(purchase(price, { cp: 0, sp: 499, gp: 0, pp: 0 }), null);
  assert.deepEqual(price, { sp: 500 });
  assert.deepEqual(coins, { cp: 0, sp: 1000, gp: 0, pp: 0 });
});
