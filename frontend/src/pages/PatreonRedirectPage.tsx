import { Loader } from '@mantine/core';
import { makeRequest } from '@requests/request-manager';
import { useQueryClient } from '@tanstack/react-query';
import { setPageTitle } from '@utils/document-change';
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/** Finish the one-use callback quietly, including denied or failed connections. */
export function Component() {
  setPageTitle(`Redirecting...`);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const handling = useRef(false);

  useEffect(() => {
    const codeValue = searchParams.get('code');
    let active = true;
    const finish = () => {
      if (!active) return;
      active = false;
      // Refresh the account without restarting Auth; discard the consumed code in history.
      void queryClient.invalidateQueries({ queryKey: ['find-account-self'] });
      navigate('/account', { replace: true });
    };
    // Also bound session initialization, which happens before the request deadline.
    const deadline = setTimeout(finish, 35_000);
    const timer = setTimeout(async () => {
      if (handling.current) return;
      handling.current = true;
      try {
        if (codeValue && !searchParams.has('error')) {
          await makeRequest(
            'handle-patreon-redirect',
            {
              code: codeValue,
              redirectOrigin: window.location.origin,
            },
            false
          );
        }
      } catch {
        // Failure must not strand the callback or show a recovery notification.
      } finally {
        clearTimeout(deadline);
        finish();
      }
    }, 100);
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(deadline);
    };
  }, [searchParams, navigate, queryClient]);

  return (
    <Loader
      size='lg'
      type='bars'
      style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
}
