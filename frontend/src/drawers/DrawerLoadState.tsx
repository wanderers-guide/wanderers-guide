import { Loader } from '@mantine/core';
import { useQuietRetry } from '@utils/use-quiet-retry';

/** Keep drawer reads and recovery quiet, using their ordinary loading indicator. */
export default function DrawerLoadState(props: { loading: boolean; onRetry?: () => void }) {
  useQuietRetry(!props.loading && !!props.onRetry, () => props.onRetry?.());
  return (
    <Loader
      type='bars'
      aria-label='Loading content'
      style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)' }}
    />
  );
}
