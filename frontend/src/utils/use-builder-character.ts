import { sessionState } from '@atoms/supabaseAtoms';
import { ContentPackage } from '@schemas/content';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import useCharacter from './use-character';
import { useCharacterContent } from './use-character-content';

type BuilderIdentity = { id: number; actor: string | null };

/** Keep one calculation/save owner while Builder and Home exchange their views. */
export function useBuilderCharacter(
  characterId: number,
  builderActive: boolean
): {
  controller: ReturnType<typeof useCharacter>;
  content: ContentPackage | undefined;
  calculationReady: boolean;
} {
  const session = useAtomValue(sessionState);
  const authPending = session === undefined;
  const actor = session?.user.id ?? null;
  const [requested, setRequested] = useState<BuilderIdentity>();
  const [sourceRequest, setSourceRequest] = useState<BuilderIdentity & { sources: number[] }>();
  const [completed, setCompleted] = useState<BuilderIdentity & { content: ContentPackage }>();
  const owns = (identity: BuilderIdentity | undefined): boolean =>
    identity?.id === characterId && identity.actor === actor;
  const needsContent = owns(requested);
  const content = useCharacterContent({
    characterId,
    actorId: actor,
    authPending,
    enabled: needsContent,
    sources: owns(sourceRequest) ? sourceRequest?.sources : undefined,
    context: 'builder',
  });
  const onSourcesChange = useCallback(
    (sources: number[]): void => setSourceRequest({ id: characterId, actor, sources }),
    [characterId, actor]
  );
  const onFinishLoading = useCallback((): void => {
    if (content) setCompleted({ id: characterId, actor, content });
  }, [characterId, actor, content]);
  const controller = useCharacter(
    characterId,
    needsContent && content
      ? {
          type: 'EXECUTE_OPS',
          data: { content, context: 'CHARACTER-BUILDER', onSourcesChange, onFinishLoading },
        }
      : { type: 'SIMPLE' }
  );

  useEffect(() => {
    if (authPending || (!builderActive && !controller.requiresCalculation)) return;
    setRequested((previous) =>
      previous?.id === characterId && previous.actor === actor ? previous : { id: characterId, actor }
    );
  }, [characterId, actor, authPending, builderActive, controller.requiresCalculation]);

  return {
    controller,
    content: needsContent ? content : undefined,
    calculationReady: owns(completed) && completed?.content === content,
  };
}
