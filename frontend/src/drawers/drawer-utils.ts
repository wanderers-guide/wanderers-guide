import { DrawerType } from '@typing/index';
import { ContentType, AbilityBlockType } from '@typing/content';

export function convertContentLink(input: { type: ContentType | AbilityBlockType; id: number }): {
  type: DrawerType;
  data: any;
} {
  // TODO: Added support for other drawer types
  return {
    type: input.type,
    data: { id: input.id },
  };
}
