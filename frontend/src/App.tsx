import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import { sessionState } from '@atoms/supabaseAtoms';
import { getContentDataFromHref } from '@common/rich_text_input/ContentLinkExtension';
import { GUIDE_BLUE } from '@constants/data';
import { getCachedCustomization } from '@content/customization-cache';
import DrawerBase from '@drawers/DrawerBase';
import { convertContentLink } from '@drawers/drawer-utils';
import { Anchor, BackgroundImage, Button, MantineProvider, Text, createTheme } from '@mantine/core';
import { useMediaQuery, usePrevious } from '@mantine/hooks';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import SearchSpotlight from '@nav/SearchSpotlight';
import { IconBrush } from '@tabler/icons-react';
import { getBackgroundImageFromURL, getHomeBackgroundImage } from '@utils/background-images';
import { removeQueryParam } from '@utils/document-change';
import { lazy, useEffect, useState } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import tinycolor from 'tinycolor2';
import { supabase } from './main';
import Layout from './nav/Layout';
import { ImageOption } from './typing';
import AddNewLoreModal from '@modals/AddNewLoreModal';
import { phoneQuery } from '@utils/mobile-responsive';
import { resetContentStore } from '@content/content-store';
import SelectContentModal from '@common/select/SelectContent';
import ConditionModal from '@modals/ConditionModal';
import CreateDicePresetModal from '@modals/CreateDicePresetModal';
import SelectIconModal from '@modals/SelectIconModal';
import SelectImageModal from '@modals/SelectImageModal';
import UpdateCharacterPortraitModal from '@modals/UpdateCharacterPortraitModal';
import UpdateNotePageModal from '@modals/UpdateNotePageModal';
import AddItemsModal from '@modals/AddItemsModal';

// TODO, it would be great to dynamically import these modals, but it with Mantine v7.6.2 it doesn't work
// const SelectContentModal = lazy(() => import('@common/select/SelectContent'));
// const SelectImageModal = lazy(() => import('@modals/SelectImageModal'));
// const SelectIconModal = lazy(() => import('@modals/SelectIconModal'));
// const UpdateCharacterPortraitModal = lazy(() => import('@modals/UpdateCharacterPortraitModal'));
// const AddNewLoreModal = lazy(() => import('@modals/AddNewLoreModal'));
// const UpdateNotePageModal = lazy(() => import('@modals/UpdateNotePageModal'));
// const ConditionModal = lazy(() => import('@modals/ConditionModal'));
// const CreateDicePresetModal = lazy(() => import('@modals/CreateDicePresetModal'));

const modals = {
  selectContent: SelectContentModal,
  selectImage: SelectImageModal,
  selectIcon: SelectIconModal,
  updateCharacterPortrait: UpdateCharacterPortraitModal,
  addNewLore: AddNewLoreModal,
  updateNotePage: UpdateNotePageModal,
  condition: ConditionModal,
  createDicePreset: CreateDicePresetModal,
  addItems: AddItemsModal,
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
  const isPhone = useMediaQuery(phoneQuery());

  const [session, setSession] = useRecoilState(sessionState);
  useEffect(() => {
    resetContentStore();

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
      if (prevCharacer?.details?.background_image_url === activeCharacer?.details?.background_image_url) {
        if (!background?.url) {
          // Use cached customization if available
          const cache = getCachedCustomization();

          setBackground(await getBackgroundImageFromURL(cache?.background_image_url ?? undefined));
        }
        return;
      }
      console.log('Updating background image...');
      setBackground(await getBackgroundImageFromURL(activeCharacer?.details?.background_image_url));
    })();
  }, [activeCharacer]);

  // Update primary color when sheet_theme changes
  const [theme, setTheme] = useState<any>(
    createTheme({
      colors: {
        // @ts-ignore
        guide: getShadesFromColor(getCachedCustomization()?.sheet_theme?.color || GUIDE_BLUE),
        dark: [
          '#C1C2C5',
          '#A6A7AB',
          '#909296',
          '#5c5f66',
          '#373A40',
          '#2C2E33',
          '#25262b',
          '#1A1B1E',
          '#141517',
          '#101113',
        ],
      },
      // components: {
      //   Button: Button.extend({
      //     defaultProps: {
      //       style: {
      //       },
      //     },
      //   }),
      // },
      cursorType: 'pointer',
      primaryColor: 'guide',
      defaultRadius: 'md',
      fontFamily: 'Montserrat, sans-serif',
      fontFamilyMonospace: 'Ubuntu Mono, monospace',
    })
  );
  useEffect(() => {
    if (prevCharacer?.details?.sheet_theme === activeCharacer?.details?.sheet_theme) return;
    console.log('Updating color theme...');
    setTheme(
      createTheme({
        colors: {
          // @ts-ignore
          guide: getShadesFromColor(activeCharacer?.details?.sheet_theme?.color || GUIDE_BLUE),
          dark: [
            '#C1C2C5',
            '#A6A7AB',
            '#909296',
            '#5c5f66',
            '#373A40',
            '#2C2E33',
            '#25262b',
            '#1A1B1E',
            '#141517',
            '#101113',
          ],
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
        {background?.source?.trim() && !isPhone && (
          <Anchor href={background.source_url} target='_blank' underline='hover'>
            <Text
              size='xs'
              c='dimmed'
              style={{
                position: 'fixed',
                bottom: 6,
                right: 10,
                zIndex: 1,
              }}
            >
              <IconBrush size='0.5rem' /> {background.source}
            </Text>
          </Anchor>
        )}
        <SearchSpotlight />
        <Notifications position='top-right' zIndex={9400} containerWidth={350} />
        <DrawerBase />
        <Layout>
          {/* Outlet is where react-router will render child routes */}
          <Outlet />
        </Layout>
      </ModalsProvider>
    </MantineProvider>
  );
}
