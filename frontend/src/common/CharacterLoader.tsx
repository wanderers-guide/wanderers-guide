import { Center, Loader } from '@mantine/core';

/** Use the ordinary loading state while a character read recovers in the background. */
export function CharacterLoader() {
  return (
    <Center h={300}>
      <Loader aria-label='Loading character' />
    </Center>
  );
}
