import { getContentDataFromHref } from '@common/rich_text_input/ContentLinkExtension';
import { convertContentLink } from '@drawers/drawer-utils';
import { Loader } from '@mantine/core';
import { makeRequest } from '@requests/request-manager';
import { removeQueryParam, setPageTitle } from '@utils/document-change';
import { useEffect, useRef } from 'react';
import { useLoaderData, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export function Component() {
  setPageTitle(`Redirecting...`);

  useEffect(() => {
    window.location.href = window.location.href.replace(/^https?:\/\//, 'https://legacy.');
  }, []);

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
