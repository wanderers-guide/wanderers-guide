import RichText from "@common/RichText";
import { getContent } from "@content/content-controller";
import { Title, Text, Loader } from '@mantine/core';
import { useQuery } from "@tanstack/react-query";
import { AbilityBlock } from "@typing/content";

export function FeatDrawerTitle(props: { data: { id: number } }) {
  const id = props.data.id;

  const { data: feat } = useQuery({
    queryKey: [`find-feat-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await getContent<AbilityBlock>('ability-block', id);
    },
  });

  return <Title order={3}>{feat?.name ?? ''}</Title>;
}

export function FeatDrawerContent(props: { data: { id: number } }) {
  const id = props.data.id;

  const { data: feat } = useQuery({
    queryKey: [`find-feat-${id}`, { id }],
    queryFn: async ({ queryKey }) => {
      // @ts-ignore
      // eslint-disable-next-line
      const [_key, { id }] = queryKey;
      return await getContent<AbilityBlock>('ability-block', id);
    },
  });

  if (!feat) {
    return (
      <Loader
        type='bars'
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    );
  }

  return (
    <RichText>
      {feat.description}
    </RichText>
  );
}
