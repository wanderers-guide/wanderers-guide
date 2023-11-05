import { Anchor, BackgroundImage, MantineProvider, Text } from '@mantine/core';
import { theme } from './theme';
import Layout from './nav/Layout';
import { Outlet } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useEffect, useState } from 'react';
import { supabase } from './main';
import { sessionState } from '@atoms/supabaseAtoms';
import SearchSpotlight from '@nav/SearchSpotlight';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { SelectContentModal } from '@common/select/SelectContent';
import { UpdateCharacterPortraitModal } from '@modals/UpdateCharacterPortraitModal';
import { getBackgroundImageFromURL } from '@utils/background-images';
import { SelectImageModal } from '@modals/SelectImageModal';
import { ImageOption } from './typing';
import { characterState } from '@atoms/characterAtoms';
import { IconBrush } from '@tabler/icons-react';

const modals = {
  selectContent: SelectContentModal,
  selectImage: SelectImageModal,
  updateCharacterPortrait: UpdateCharacterPortraitModal,
  /* ...other modals */
};
declare module '@mantine/modals' {
  export interface MantineModalsOverride {
    modals: typeof modals;
  }
}

export default function App() {
  const [session, setSession] = useRecoilState(sessionState);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const activeCharacer = useRecoilValue(characterState);
  const [background, setBackground] = useState<ImageOption>();
  useEffect(() => {
    (async () => {
      setBackground(await getBackgroundImageFromURL(activeCharacer?.details?.background_image_url));
    })();
  }, [activeCharacer]);

  return (
    <MantineProvider theme={theme} defaultColorScheme='dark'>
      <ModalsProvider modals={modals}>
        <BackgroundImage
          src={background?.url ?? ''}
          radius={0}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: -1000 }}
          w='100vw'
          h='100vh'
        />
        {background?.source?.trim() && (
          <Anchor href={background.source_url} target='_blank' underline='hover'>
            <Text
              size='xs'
              c='dimmed'
              style={{
                position: 'absolute',
                bottom: 6,
                right: 10,
              }}
            >
              <IconBrush size='0.5rem' /> {background.source}
            </Text>
          </Anchor>
        )}
        <SearchSpotlight />
        <Notifications position='top-right' />
        <Layout>
          {/* Outlet is where react-router will render child routes */}
          <Outlet />
        </Layout>
      </ModalsProvider>
    </MantineProvider>
  );
}
