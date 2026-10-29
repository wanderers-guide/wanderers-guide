import { Center, Loader } from '@mantine/core';

/** Use the ordinary loading state while a character read recovers in the background. */
export function CharacterLoader() {
  return (
    <Center mih='var(--wg-page-content-height)'>
      <Loader aria-label='Loading character' />
    </Center>
  );
}
