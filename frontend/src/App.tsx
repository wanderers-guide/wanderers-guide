import { AppThemeProvider } from '@common/AppThemeProvider';
import { characterState } from '@atoms/characterAtoms';
import { creatureDrawerState, drawerState } from '@atoms/navAtoms';
import { sessionState } from '@atoms/supabaseAtoms';
import { userState } from '@atoms/userAtoms';
import { getContentDataFromHref } from '@common/rich_text_input/ContentLinkExtension';
import { getCachedCustomization, saveCustomization } from '@content/customization-cache';
import DrawerBase from '@drawers/DrawerBase';
import { convertContentLink } from '@drawers/drawer-utils';
import { Anchor, BackgroundImage, Box, Button, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ModalsProvider } from '@mantine/modals';
import { AppUpdates } from '@common/AppUpdates';
import { Notifications } from '@mantine/notifications';
import { markSessionExpired, resetSessionExpired } from '@requests/request-manager';
import { clearUserData, getCachedPublicUser } from '@auth/user-manager';
import SearchSpotlight from '@nav/SearchSpotlight';
import { IconBrush } from '@tabler/icons-react';
import { getBackgroundImageFromURL } from '@utils/background-images';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useAtom, useAtomValue } from 'jotai';
import { supabase } from './main';
import Layout from './nav/Layout';
import AddNewLoreModal from '@modals/AddNewLoreModal';
import { phoneQuery } from '@utils/mobile-responsive';
import { resetContentStore, setContentCacheActor } from '@content/content-store';
import SelectContentModal from '@common/select/SelectContent';
import ConditionModal from '@modals/ConditionModal';
import CreateDicePresetModal from '@modals/CreateDicePresetModal';
import SelectIconModal from '@modals/SelectIconModal';
import SelectImageModal from '@modals/SelectImageModal';
import UpdateCharacterPortraitModal from '@modals/UpdateCharacterPortraitModal';
import UpdateNotePageModal from '@modals/UpdateNotePageModal';
import AddItemsModal from '@modals/AddItemsModal';
import SelectSpellSlotModal from '@modals/SelectSpellSlotModal';
import SelectStaffCastingModal from '@modals/SelectStaffCastingModal';
import InitiativeRollModal from '@modals/InitiativeRollModal';
import UpdateEncounterModal from '@modals/UpdateEncounterModal';
import GenerateEncounterModal from '@modals/GenerateEncounterModal';
import UpdateApiClientModal from '@modals/UpdateApiClientModal';
import { getAnchorStyles } from '@utils/anchor';
import BuyItemModal from '@modals/BuyItemModal';
import { ImageOption } from '@schemas/index';

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
  selectSpellSlot: SelectSpellSlotModal,
  selectStaffCasting: SelectStaffCastingModal,
  updateCharacterPortrait: UpdateCharacterPortraitModal,
  addNewLore: AddNewLoreModal,
  initiativeRoll: InitiativeRollModal,
  updateNotePage: UpdateNotePageModal,
  generateEncounter: GenerateEncounterModal,
  updateEncounter: UpdateEncounterModal,
  updateApiClient: UpdateApiClientModal,
  condition: ConditionModal,
  createDicePreset: CreateDicePresetModal,
  addItems: AddItemsModal,
  buyItem: BuyItemModal,
};
// declare module '@mantine/modals' {
//   export interface MantineModalsOverride {
//     modals: typeof modals;
//   }
// }

/** Load the optional font once, when the active customization requests it. */
function ensureDyslexicFontLoaded() {
  if (document.getElementById('open-dyslexic-font')) return;
  const link = document.createElement('link');
  link.id = 'open-dyslexic-font';
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic-regular.min.css';
  document.head.appendChild(link);
}

export default function App() {
  const [_drawer, openDrawer] = useAtom(drawerState);
  const [_creatureDrawer, openCreatureDrawer] = useAtom(creatureDrawerState);
  const isPhone = useMediaQuery(phoneQuery());

  const [session, setSession] = useAtom(sessionState);
  useEffect(() => {
    resetContentStore();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setContentCacheActor(session?.user.id ?? null);
      setSession(session);
      // Clear stale account chrome quietly; character drafts remain account-scoped.
      if (!session && getCachedPublicUser()) {
        clearUserData();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setContentCacheActor(session?.user.id ?? null);
      setSession(session);
      if (session) resetSessionExpired();

      if (event === 'SIGNED_OUT') {
        // Unexpected expiry pauses saves quietly. Intentional logout already cleared the user cache.
        const hadUser = !!getCachedPublicUser();
        clearUserData();
        if (hadUser && !window.location.pathname.startsWith('/login')) {
          markSessionExpired();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const activeCharacer = useAtomValue(characterState);
  const account = useAtomValue(userState) ?? getCachedPublicUser();
  const location = useLocation();
  const characterPage = /^\/(builder|sheet)\//.test(location.pathname);
  const sheetTheme = {
    ...(account ? account.site_theme : getCachedCustomization()?.sheet_theme),
    ...(characterPage ? activeCharacer?.details?.sheet_theme : undefined),
  };
  const backgroundUrl =
    (characterPage ? activeCharacer?.details?.background_image_url : undefined) || account?.background_image_url;

  // Publish the same resolved preferences that the app renders, including account fields
  // omitted by a character's partial theme. Drawers read this cache when they open.
  useEffect(() => {
    saveCustomization({ background_image_url: backgroundUrl ?? undefined, sheet_theme: sheetTheme });
  }, [backgroundUrl, sheetTheme.color, sheetTheme.dyslexia_font, sheetTheme.view_operations, sheetTheme.zoom]);

  // Update background image when background_image_url changes
  const [background, setBackground] = useState<ImageOption>();
  useEffect(() => {
    let active = true;
    (async () => {
      const image = await getBackgroundImageFromURL(backgroundUrl ?? undefined);
      if (active) setBackground(image);
    })();
    return () => {
      active = false;
    };
  }, [backgroundUrl]);

  const dyslexiaFontEnabled = !!sheetTheme.dyslexia_font;
  useEffect(() => {
    if (dyslexiaFontEnabled) ensureDyslexicFontLoaded();
  }, [dyslexiaFontEnabled]);

  // Handle query params
  const [searchParams] = useSearchParams();
  useEffect(() => {
    (async () => {
      // If we have the `open=link_feat_3435` query param, open that content link
      const openValue = searchParams.get('open');
      if (openValue) {
        const contentData = getContentDataFromHref(openValue);
        if (contentData?.type === 'creature') {
          setTimeout(() => {
            openCreatureDrawer({
              data: {
                id: parseInt(contentData.id),
                readOnly: true,
              },
            });
          }, 500);
        } else {
          const drawerData = contentData ? convertContentLink(contentData) : null;
          if (drawerData) {
            setTimeout(() => {
              openDrawer(drawerData);
            }, 500);
          }
        }
        //removeQueryParam('open');
      }
    })();
  }, [location]);

  return (
    <AppThemeProvider accent={sheetTheme.color} dyslexiaFontEnabled={dyslexiaFontEnabled}>
      <ModalsProvider modals={modals}>
        <BackgroundImage
          src={background?.url ?? ''}
          radius={0}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: -1000, backgroundPosition: 'top' }}
          w='100dvw'
          h='100dvh'
        />
        {background?.source?.trim() && !isPhone && (
          <Anchor href={background.source_url} target='_blank' underline='hover'>
            <Text
              size='xs'
              c='dimmed'
              style={[
                getAnchorStyles({ r: 10, b: 6 }),
                {
                  zIndex: 1,
                },
              ]}
            >
              <IconBrush size='0.55rem' /> {background.source}
            </Text>
          </Anchor>
        )}
        <SearchSpotlight />
        <Notifications position='top-right' zIndex={9400} containerWidth={350} />
        <AppUpdates />
        <DrawerBase />
        <Box style={{ zoom: sheetTheme.zoom ?? 1 }}>
          <Layout>
            {/* Outlet is where react-router will render child routes */}
            <Outlet />
          </Layout>
        </Box>
      </ModalsProvider>
    </AppThemeProvider>
  );
}
