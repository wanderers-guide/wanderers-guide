import { characterState } from '@atoms/characterAtoms';
import { creatureDrawerState, drawerState } from '@atoms/navAtoms';
import { sessionState } from '@atoms/supabaseAtoms';
import { getContentDataFromHref } from '@common/rich_text_input/ContentLinkExtension';
import { GUIDE_BLUE, IMPRINT_BG_COLOR, IMPRINT_BORDER_COLOR } from '@constants/data';
import { getCachedCustomization } from '@content/customization-cache';
import DrawerBase from '@drawers/DrawerBase';
import { convertContentLink } from '@drawers/drawer-utils';
import {
  Anchor,
  BackgroundImage,
  Box,
  Button,
  MantineProvider,
  Text,
  createTheme,
  v8CssVariablesResolver,
} from '@mantine/core';
import { useMediaQuery, usePrevious } from '@mantine/hooks';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
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
import { resetContentStore } from '@content/content-store';
import SelectContentModal from '@common/select/SelectContent';
import ConditionModal from '@modals/ConditionModal';
import CreateDicePresetModal from '@modals/CreateDicePresetModal';
import SelectIconModal from '@modals/SelectIconModal';
import SelectImageModal from '@modals/SelectImageModal';
import UpdateCharacterPortraitModal from '@modals/UpdateCharacterPortraitModal';
import UpdateNotePageModal from '@modals/UpdateNotePageModal';
import AddItemsModal from '@modals/AddItemsModal';
import { isEqual } from 'lodash-es';
import SelectSpellSlotModal from '@modals/SelectSpellSlotModal';
import SelectStaffCastingModal from '@modals/SelectStaffCastingModal';
import InitiativeRollModal from '@modals/InitiativeRollModal';
import UpdateEncounterModal from '@modals/UpdateEncounterModal';
import GenerateEncounterModal from '@modals/GenerateEncounterModal';
import UpdateApiClientModal from '@modals/UpdateApiClientModal';
import { getAnchorStyles } from '@utils/anchor';
import BuyItemModal from '@modals/BuyItemModal';
import { generateColors } from '@mantine/colors-generator';
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

export default function App() {
  const [_drawer, openDrawer] = useAtom(drawerState);
  const [_creatureDrawer, openCreatureDrawer] = useAtom(creatureDrawerState);
  const isPhone = useMediaQuery(phoneQuery());

  const [session, setSession] = useAtom(sessionState);
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

  const activeCharacer = useAtomValue(characterState);
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

  const generateTheme = (theme?: { color?: string }) => {
    return createTheme({
      colors: {
        guide: generateColors(theme?.color || getCachedCustomization()?.sheet_theme?.color || GUIDE_BLUE),
        // Dark scale: near-opaque at [0] → nearly transparent at [9]
        dark: [
          'rgba(193, 194, 197, 0.89)', // [0] lightest text / icons
          'rgba(166, 167, 171, 0.85)', // [1]
          'rgba(144, 146, 150, 0.80)', // [2]
          'rgba(92,  95,  102, 0.75)', // [3]
          'rgba(55,  58,  64,  0.82)', // [4] ← glass surfaces
          'rgba(44,  46,  51,  0.77)', // [5]
          'rgba(37,  38,  43,  0.72)', // [6] ← card bg
          'rgba(26,  27,  30,  0.67)', // [7] ← page bg
          'rgba(20,  21,  23,  0.62)', // [8]
          'rgba(16,  17,  19,  0.57)', // [9] darkest / most transparent
        ],

        // Gray scale for light mode: near-opaque at [0] → nearly transparent at [9]
        // Mirrors the dark scale's opacity curve on a neutral-light palette.
        gray: [
          'rgba(248, 249, 250, 0.89)', // [0] near-white surfaces
          'rgba(241, 243, 245, 0.85)', // [1]
          'rgba(233, 236, 239, 0.80)', // [2]
          'rgba(222, 226, 230, 0.75)', // [3]
          'rgba(206, 212, 218, 0.82)', // [4] ← glass surfaces
          'rgba(173, 181, 189, 0.77)', // [5]
          'rgba(134, 142, 150, 0.72)', // [6] ← borders / muted text
          'rgba(73,  80,  87,  0.67)', // [7] ← body text
          'rgba(52,  58,  64,  0.62)', // [8]
          'rgba(33,  37,  41,  0.57)', // [9] darkest text
        ],
      },
      cursorType: 'pointer',
      primaryColor: 'guide',
      defaultRadius: 'md',
      fontFamily: getCachedCustomization()?.sheet_theme?.dyslexia_font
        ? 'OpenDyslexicRegular'
        : 'Montserrat, sans-serif',
      fontFamilyMonospace: 'Ubuntu Mono, monospace',
      components: {
        Popover: {
          vars: () => ({
            dropdown: {
              '--mantine-color-dark-6': 'rgba(37,  38,  43,  1)',
            },
          }),
        },
        Menu: {
          vars: () => ({
            dropdown: {
              '--mantine-color-dark-6': 'rgba(37,  38,  43,  1)',
            },
          }),
        },
        HoverCard: {
          vars: () => ({
            dropdown: {
              '--mantine-color-dark-6': 'rgba(37,  38,  43,  1)',
            },
          }),
        },
        Accordion: {
          vars: () => ({
            item: {
              '--item-filled-color': IMPRINT_BG_COLOR,
            },
          }),
          styles: {
            item: {
              borderColor: IMPRINT_BORDER_COLOR,
            },
          },
        },
        Badge: {
          styles: {
            label: { overflow: 'visible' },
          },
        },
        Tabs: {
          vars: () => ({
            tab: {
              '--tab-hover-color': IMPRINT_BG_COLOR,
            },
            list: {
              '--tab-border-color': IMPRINT_BG_COLOR,
            },
          }),
        },
        Stepper: {
          vars: () => ({
            root: {
              '--stepper-outline-color': IMPRINT_BG_COLOR,
            },
          }),
        },
        Divider: {
          vars: () => ({
            root: {
              '--divider-color': IMPRINT_BORDER_COLOR,
            },
          }),
        },
        RichTextEditor: {
          vars: () => ({
            root: {
              borderColor: IMPRINT_BORDER_COLOR,
            },
            toolbar: {
              borderColor: IMPRINT_BORDER_COLOR,
            },
          }),
        },
        Notification: {
          vars: () => ({
            root: {
              backgroundColor: 'rgba(37,  38,  43,  1)',
            },
          }),
        },
      },
    });
  };

  const [theme, setTheme] = useState<any>(generateTheme());
  useEffect(() => {
    if (isEqual(prevCharacer?.details?.sheet_theme, activeCharacer?.details?.sheet_theme)) return;
    console.log('Updating site theme...');
    setTheme(generateTheme({ color: activeCharacer?.details?.sheet_theme?.color }));
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
    <MantineProvider
      theme={theme}
      defaultColorScheme='dark'
      cssVariablesResolver={(theme) => {
        const v8 = v8CssVariablesResolver(theme);
        return {
          variables: { ...v8.variables },
          light: {
            ...v8.light,
            '--mantine-color-text': 'rgb(33, 37, 41)',
            '--mantine-color-dimmed': 'rgb(35, 36, 37)',
            '--mantine-color-body': 'rgba(255, 255, 255, 1)',
          },
          dark: {
            ...v8.dark,
            '--mantine-color-text': 'rgb(202, 202, 202)',
            '--mantine-color-dimmed': 'rgb(180, 180, 180)',
            '--mantine-color-body': 'rgba(26,  27,  30,  1)',
          },
        };
      }}
    >
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
        <DrawerBase />
        <Box style={{ zoom: getCachedCustomization()?.sheet_theme?.zoom ?? 1 }}>
          <Layout>
            {/* Outlet is where react-router will render child routes */}
            <Outlet />
          </Layout>
        </Box>
      </ModalsProvider>
    </MantineProvider>
  );
}
