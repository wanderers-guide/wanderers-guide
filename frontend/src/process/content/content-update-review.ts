import { ContentType } from '@schemas/content';
import { getDeepDiff } from '@utils/objects';
import { toLabel } from '@utils/strings';
import { z } from 'zod';

type ContentRecord = Record<string, unknown>;
const MetadataSchema = z.record(z.string(), z.unknown());

/** Reads metadata without assuming an incoming submission contains a valid object. */
function metadata(content: ContentRecord): ContentRecord {
  const result = MetadataSchema.safeParse(content.meta_data);
  return result.success ? result.data : {};
}

/** Lists changed fields, including removals and nested metadata, while ignoring generated UUIDs. */
export function getContentUpdateChangedFields(original: ContentRecord, submitted: ContentRecord): string[] {
  return [
    ...new Set(
      Object.keys(getDeepDiff(original, submitted))
        .filter((path) => path.split('.')[0].toLowerCase() !== 'uuid')
        .map((path) => {
          const [field, metadataField] = path.split('.');
          return field === 'meta_data' && metadataField ? metadataField : field;
        })
    ),
  ];
}

/** Describes content settings that are not visible in the ordinary rules preview. */
export function getContentUpdateReviewFields(
  type: ContentType,
  submitted: ContentRecord,
  original: ContentRecord | null
): { label: string; original: string; submitted: string }[] {
  const fields: { label: string; read: (content: ContentRecord) => string }[] = [
    {
      label: 'Content type',
      read: (content) => {
        const subtype =
          ['ability-block', 'creature', 'item'].includes(type) && typeof content.type === 'string'
            ? content.type
            : type;
        return toLabel(subtype.replace(/-/g, ' '));
      },
    },
  ];

  const flags: [string, string][] = ['ability-block', 'trait', 'spell', 'item'].includes(type)
    ? [['Hidden', 'unselectable']]
    : [];
  if (type === 'ability-block') flags.push(['Repeatable', 'can_select_multiple_times']);
  if (type === 'trait') {
    flags.push(
      ['Ancestry trait', 'ancestry_trait'],
      ['Class trait', 'class_trait'],
      ['Archetype trait', 'archetype_trait'],
      ['Creature trait', 'creature_trait'],
      ['Versatile heritage trait', 'versatile_heritage_trait'],
      ['Companion type trait', 'companion_type_trait'],
      ['Important trait', 'important']
    );
  }
  for (const [label, key] of flags) {
    fields.push({
      label,
      // Unset switches are off in the authoring forms; the raw view retains that distinction.
      read: (content) => {
        const value = metadata(content)[key];
        if (value === undefined) return 'No (default)';
        return value === true ? 'Yes' : value === false ? 'No' : JSON.stringify(value);
      },
    });
  }
  return fields.map(({ label, read }) => ({
    label,
    original: original ? read(original) : 'Unavailable',
    submitted: read(submitted),
  }));
}
