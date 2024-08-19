import { SocietyAdventureEntry } from '@typing/content';

/*
 * Helper class for handline money values (immutable)
 */
export class Money {
  scale = 100;
  _value: number = 0;

  constructor(value: number, scale?: boolean) {
    if (scale === true || scale === undefined) {
      this._value = value * this.scale;
    } else {
      this._value = value;
    }
  }

  get value(): number {
    return this._value / this.scale;
  }

  add(delta: Money): Money {
    return new Money(this._value + delta._value, false);
  }

  subtract(delta: Money): Money {
    return new Money(this._value - delta._value, false);
  }

  divideBy(delta: number): Money {
    return new Money(Math.round(this._value / delta), false);
  }

  multiplyBy(delta: number): Money {
    return new Money(this._value * delta, false);
  }
}

export function getGpGained(entry: SocietyAdventureEntry) {
  const sold = new Money(entry.items_total_sell ?? 0).divideBy(2);
  const bought = new Money(entry.items_total_buy ?? 0);
  const extra = new Money(entry.items_total_extra ?? 0);
  return sold.subtract(bought).add(extra);
}
