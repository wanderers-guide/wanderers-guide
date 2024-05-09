import RichText from '@common/RichText';
import { Divider, Stack } from '@mantine/core';
import { AbilityBlockType, ContentType } from '@typing/content';
import { StoreID, VariableListStr } from '@typing/variables';
import { getVariable } from '@variables/variable-manager';

type InjectedText = { type: ContentType | AbilityBlockType; id: number; text: string };

export default function ShowInjectedText(props: { varId: StoreID; type: ContentType | AbilityBlockType; id: number }) {
  const injected = getVariable<VariableListStr>(props.varId, 'INJECT_TEXT')
    ?.value.map((t) => {
      try {
        return JSON.parse(t) as InjectedText;
      } catch (e) {
        return null;
      }
    })
    .filter((d) => d && d.id === props.id && d.type === props.type) as InjectedText[];

  if (!injected || injected.length === 0) {
    return null;
  }

  return (
    <Stack pt={5} gap={5}>
      <Divider />
      <Stack>
        {injected.map((t, i) => (
          <RichText key={i} ta='justify' store={props.varId}>
            {t.text}
          </RichText>
        ))}
      </Stack>
    </Stack>
  );
}
