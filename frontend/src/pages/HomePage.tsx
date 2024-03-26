import { Button } from '@mantine/core';
import { setPageTitle } from '@utils/document-change';
import { supabase } from '../main';
import { useRecoilValue } from 'recoil';
import { sessionState } from '@atoms/supabaseAtoms';

export function Component() {
  setPageTitle();

  return (
    <div>
      <h1>Home Page</h1>
    </div>
  );
}
