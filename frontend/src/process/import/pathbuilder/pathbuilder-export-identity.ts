import type { PathbuilderDerivedBuild, PathbuilderShareBuild } from '@schemas/pathbuilder';

function normalizeIdentity(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

/**
 * Fail closed when the derived export and share payload are not demonstrably the
 * same character. Export IDs are not treated as globally unique character IDs.
 */
export function assertPathbuilderDerivedMatchesShare(
  characterData: PathbuilderShareBuild['characterData'],
  derived: PathbuilderDerivedBuild
): void {
  const checks: Array<{
    label: string;
    share: string | number | null | undefined;
    derived: string | number | null | undefined;
  }> = [
    { label: 'name', share: characterData.characterName, derived: derived.name },
    { label: 'class', share: characterData.className, derived: derived.class },
    { label: 'level', share: characterData.characterLevel, derived: derived.level },
  ];

  for (const check of checks) {
    if (check.share === undefined || check.share === null || String(check.share).trim() === '') {
      throw new Error(`Cannot verify Pathbuilder export identity: share payload is missing ${check.label}.`);
    }
    if (check.derived === undefined || check.derived === null || String(check.derived).trim() === '') {
      throw new Error(`Cannot verify Pathbuilder export identity: JSON export is missing ${check.label}.`);
    }

    const matches =
      check.label === 'level'
        ? Number(check.share) === Number(check.derived)
        : normalizeIdentity(String(check.share)) === normalizeIdentity(String(check.derived));

    if (!matches) {
      throw new Error(
        `Pathbuilder share/export mismatch for ${check.label}: share="${check.share}", export="${check.derived}". Import blocked.`
      );
    }
  }

  const optionalChecks: Array<{
    label: string;
    share: string | null | undefined;
    derived: string | null | undefined;
    normalize?: (value: string) => string;
  }> = [
    { label: 'ancestry', share: characterData.ancestry, derived: derived.ancestry },
    { label: 'heritage', share: characterData.heritage, derived: derived.heritage },
    {
      label: 'background',
      share: characterData.background,
      derived: derived.background,
      normalize: normalizeBackgroundIdentity,
    },
    { label: 'key ability', share: characterData.keyability, derived: derived.keyability },
  ];

  for (const check of optionalChecks) {
    const fromShare = check.share?.trim();
    const fromDerived = check.derived?.trim();
    // Share payloads omit some optional fields; compare only when both sources
    // explicitly provide a value. The fields that do overlap must agree.
    if (!fromShare || !fromDerived) continue;

    const normalize = check.normalize ?? normalizeIdentity;
    if (normalize(fromShare) !== normalize(fromDerived)) {
      throw new Error(
        `Pathbuilder share/export mismatch for ${check.label}: share="${fromShare}", export="${fromDerived}". Import blocked.`
      );
    }
  }
}

function normalizeBackgroundIdentity(value: string): string {
  return normalizeIdentity(value.trim().replace(/^background[_\s]+/i, ''));
}
