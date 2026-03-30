import { z } from 'zod';

// ─── DiceRoll ─────────────────────────────────────────────────────────────────

export const DiceRollSchema = z.object({
  amount: z.number(),
  size: z.union([
    z.literal(4),
    z.literal(6),
    z.literal(8),
    z.literal(10),
    z.literal(12),
    z.literal(20),
    z.literal(100),
  ]),
});
export type DiceRoll = z.infer<typeof DiceRollSchema>;

// ─── DamageRoll ───────────────────────────────────────────────────────────────

export const DamageRollSchema = z.object({
  dice: z.array(DiceRollSchema),
  bonus: z.number(),
  type: z.string(),
});
export type DamageRoll = z.infer<typeof DamageRollSchema>;

// ─── CriticalDamageRoll ───────────────────────────────────────────────────────

export const CriticalDamageRollSchema = DamageRollSchema.extend({
  extraBonus: z.number(), // applied after multiplying by 2
});
export type CriticalDamageRoll = z.infer<typeof CriticalDamageRollSchema>;
