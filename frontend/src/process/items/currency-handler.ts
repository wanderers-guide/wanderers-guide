export function purchase(
  price: { cp?: number; sp?: number; gp?: number; pp?: number },
  coins: { cp: number; sp: number; gp: number; pp: number }
) {
  // Subtract the costs
  let resultCp = coins.cp - (price.cp ?? 0);
  let resultSp = coins.sp - (price.sp ?? 0);
  let resultGp = coins.gp - (price.gp ?? 0);
  let resultPp = coins.pp - (price.pp ?? 0);

  // Fix negative values by converting from higher denominations
  if (resultCp < 0) {
    let neededSp = Math.ceil(Math.abs(resultCp) / 10);
    resultSp -= neededSp;
    resultCp += neededSp * 10;
  }
  if (resultSp < 0) {
    let neededGp = Math.ceil(Math.abs(resultSp) / 10);
    resultGp -= neededGp;
    resultSp += neededGp * 10;
  }
  if (resultGp < 0) {
    let neededPp = Math.ceil(Math.abs(resultGp) / 10);
    resultPp -= neededPp;
    resultGp += neededPp * 10;
  }

  // Check for insufficient funds
  if (resultCp < 0 || resultSp < 0 || resultGp < 0 || resultPp < 0) {
    return null;
  }

  // Return the new coin amounts after purchase
  return { cp: resultCp, sp: resultSp, gp: resultGp, pp: resultPp };
}
