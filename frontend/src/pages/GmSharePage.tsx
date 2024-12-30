import { getContentDataFromHref } from '@common/rich_text_input/ContentLinkExtension';
import { convertContentLink } from '@drawers/drawer-utils';
import { Loader } from '@mantine/core';
import { makeRequest } from '@requests/request-manager';
import { removeQueryParam, setPageTitle } from '@utils/document-change';
import { useEffect, useRef } from 'react';
import { useLoaderData, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export function Component() {
  setPageTitle(`Redirecting...`);

  const { gmUserId } = useLoaderData() as {
    gmUserId: string;
  };
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const handling = useRef(false);

  useEffect(() => {
    const codeValue = searchParams.get('code');
    if (!codeValue) return;
    setTimeout(async () => {
      if (handling.current) return;
      handling.current = true;
      const responseContent = await makeRequest('gm-add-to-group', {
        gm_user_id: gmUserId,
        access_code: codeValue,
      });
      if (responseContent) {
        window.location.href = '/account';
      }
    }, 100);
  }, [location]);

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
