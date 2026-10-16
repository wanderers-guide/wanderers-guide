import { StarshipSchema, type Starship } from '@schemas/content';

/** Only reference prose is editable; saved identity, source and classification stay intact. */
export function prepareStarshipContentUpdate(original: Starship, edited: Starship) {
  return StarshipSchema.safeParse({
    ...original,
    name: edited.name,
    details: { ...original.details, description: edited.details.description, stat_block: edited.details.stat_block },
  });
}
