export function purchase(
  price: { cp?: number; sp?: number; gp?: number; pp?: number },
  coins: { cp: number; sp: number; gp: number; pp: number }
): { cp: number; sp: number; gp: number; pp: number } | null {
  const { cp: priceCp = 0, sp: priceSp = 0, gp: priceGp = 0, pp: pricePp = 0 } = price;

  const totalPriceInCp = priceCp + priceSp * 10 + priceGp * 100 + pricePp * 1000;

  const updatedCoins = { ...coins };

  let totalCoinsInCp = updatedCoins.cp + updatedCoins.sp * 10 + updatedCoins.gp * 100 + updatedCoins.pp * 1000;

  if (totalCoinsInCp < totalPriceInCp) {
    return null; // Not enough coins to make the purchase
  }

  // Deduct the price from the total coins
  totalCoinsInCp -= totalPriceInCp;

  // Reconstruct the coin amounts to try and match the original amounts
  const remainingPp = Math.min(coins.pp, Math.floor(totalCoinsInCp / 1000));
  totalCoinsInCp -= remainingPp * 1000;

  const remainingGp = Math.min(coins.gp, Math.floor(totalCoinsInCp / 100));
  totalCoinsInCp -= remainingGp * 100;

  const remainingSp = Math.min(coins.sp, Math.floor(totalCoinsInCp / 10));
  totalCoinsInCp -= remainingSp * 10;

  const remainingCp = totalCoinsInCp;

  updatedCoins.pp = remainingPp;
  updatedCoins.gp = remainingGp;
  updatedCoins.sp = remainingSp;

  // In the case of not finding a good match, it results in a big copper dump.
  // Let's try to distribute the remaining copper to the other coins
  const distribution = convertCpToCoins(remainingCp);
  updatedCoins.pp += distribution.pp;
  updatedCoins.gp += distribution.gp;
  updatedCoins.sp += distribution.sp;
  updatedCoins.cp = distribution.cp;

  return updatedCoins;
}

export function priceToString(price?: { cp?: number; sp?: number; gp?: number; pp?: number }) {
  if (!price) {
    return '—';
  }

  let priceString = '';
  if (price.cp) {
    priceString += price.cp.toLocaleString() + ' cp';
  }
  if (price.sp) {
    priceString += (priceString ? ', ' : '') + price.sp.toLocaleString() + ' sp';
  }
  if (price.gp) {
    priceString += (priceString ? ', ' : '') + price.gp.toLocaleString() + ' gp';
  }
  if (price.pp) {
    priceString += (priceString ? ', ' : '') + price.pp.toLocaleString() + ' pp';
  }
  return priceString.trim() || '—';
}

export function convertToCp(price?: { cp?: number; sp?: number; gp?: number; pp?: number }) {
  if (!price) {
    return 0;
  }

  return (price.cp || 0) + (price.sp || 0) * 10 + (price.gp || 0) * 100 + (price.pp || 0) * 1000;
}

export function convertToGp(price?: { cp?: number; sp?: number; gp?: number; pp?: number }) {
  return Math.round((convertToCp(price) / 100) * 100) / 100;
}

export function convertCpToCoins(totalCp: number): { cp: number; sp: number; gp: number; pp: number } {
  const coins = { cp: 0, sp: 0, gp: 0, pp: 0 };

  coins.pp = Math.floor(totalCp / 1000);
  totalCp %= 1000;

  coins.gp = Math.floor(totalCp / 100);
  totalCp %= 100;

  coins.sp = Math.floor(totalCp / 10);
  totalCp %= 10;

  coins.cp = totalCp;

  return coins;
}
