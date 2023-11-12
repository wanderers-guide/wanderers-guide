import { Anchor, BackgroundImage, MantineProvider, Text, createTheme } from '@mantine/core';
import Layout from './nav/Layout';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
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
import tinycolor from 'tinycolor2';
import { usePrevious } from '@mantine/hooks';
import { GUIDE_BLUE } from '@constants/data';
import DrawerBase from '@drawers/DrawerBase';
import { removeQueryParam } from '@utils/document-change';
import { getContentDataFromHref } from '@common/rich_text_input/ContentLinkExtension';
import { convertContentLink } from '@drawers/drawer-utils';
import { drawerState } from '@atoms/navAtoms';

const modals = {
  selectContent: SelectContentModal,
  selectImage: SelectImageModal,
  updateCharacterPortrait: UpdateCharacterPortraitModal,
};
declare module '@mantine/modals' {
  export interface MantineModalsOverride {
    modals: typeof modals;
  }
}

function getShadesFromColor(color: string) {
  let lightShades = [];
  let darkShades = [];

  for (let i = 0; i < 3; i++) {
    let shade = tinycolor(color)
      .lighten(i * 3)
      .toString();
    lightShades.push(shade);
  }
  for (let i = 0; i < 7; i++) {
    let shade = tinycolor(color)
      .darken(i * 3)
      .toString();
    darkShades.push(shade);
  }

  return [...lightShades, color, ...darkShades];
}

export default function App() {

  const [_drawer, openDrawer] = useRecoilState(drawerState);

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
  const prevCharacer = usePrevious(activeCharacer);

  // Update background image when background_image_url changes
  const [background, setBackground] = useState<ImageOption>();
  useEffect(() => {
    (async () => {
      if (
        prevCharacer?.details?.background_image_url ===
        activeCharacer?.details?.background_image_url
      )
        return;
      console.log('Updating background image...');
      setBackground(await getBackgroundImageFromURL(activeCharacer?.details?.background_image_url));
    })();
  }, [activeCharacer]);

  // Update primary color when sheet_theme changes
  const [theme, setTheme] = useState<any>();
  useEffect(() => {
    if (prevCharacer?.details?.sheet_theme === activeCharacer?.details?.sheet_theme) return;
    console.log('Updating color theme...');
    setTheme(
      createTheme({
        colors: {
          // @ts-ignore
          guide: getShadesFromColor(activeCharacer?.details?.sheet_theme?.color || GUIDE_BLUE),
        },
        primaryColor: 'guide',
        defaultRadius: 'md',
        fontFamily: 'Montserrat, sans-serif',
        fontFamilyMonospace: 'Ubuntu Mono, monospace',
      })
    );
  }, [activeCharacer]);

  // Handle query params
  const location = useLocation();
  const [searchParams] = useSearchParams();
  useEffect(() => {
    (async () => {

      // If we have the `open=link_feat_3435` query param, open that content link
      const openValue = searchParams.get('open');
      if (openValue) {
        const contentData = getContentDataFromHref(openValue);
        const drawerData = contentData ? convertContentLink(contentData) : null;
        if (drawerData) {
          setTimeout(() => {
            openDrawer(drawerData);
          }, 500);
        }
        removeQueryParam('open');
      }
      
    })();
  }, [location]);

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
        <Notifications position='top-right' zIndex={9400} />
        <DrawerBase />
        <Layout>
          {/* Outlet is where react-router will render child routes */}
          <Outlet />
        </Layout>
      </ModalsProvider>
    </MantineProvider>
  );
}
