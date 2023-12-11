interface CriticalDamageRoll extends DamageRoll {
  extraBonus: number; // apply after multiplying by 2
}

interface DamageRoll {
  dice: DiceRoll[];
  bonus: number;
  type: string;
}

interface DiceRoll {
  amount: number;
  size: 4 | 6 | 8 | 10 | 12 | 20 | 100;
}
