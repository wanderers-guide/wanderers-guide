import React, { RefAttributes, useEffect, useState } from 'react';
import {
  IconSphere,
  IconBrandThreejs,
  IconBrandSafari,
  IconBrandTelegram,
  IconAffiliateFilled,
  IconAlarmFilled,
  IconAlbum,
  IconAlienFilled,
  IconArrowBadgeDownFilled,
  IconBat,
  IconBiohazard,
  IconBong,
  IconBook,
  IconBook2,
  IconBookmarkFilled,
  IconBookmarks,
  IconBow,
  IconBoxSeam,
  IconBrand4chan,
  IconBrandCodesandbox,
  IconBrandDiscordFilled,
  IconBrandPinterest,
  IconBrandTinder,
  IconBrandWechat,
  IconBrush,
  IconBuilding,
  IconBuildingCastle,
  IconBuildingFortress,
  IconBuildingLighthouse,
  IconButterfly,
  IconCampfireFilled,
  IconCandle,
  IconCat,
  IconCherryFilled,
  IconConfetti,
  IconCrown,
  IconDeer,
  IconDevices,
  IconDice5Filled,
  IconDiscountCheckFilled,
  IconDna,
  IconDog,
  IconDrone,
  IconDropletFilled,
  IconEar,
  IconEyeglass,
  IconFaceMask,
  IconFeather,
  IconFish,
  IconFolderFilled,
  IconGhost2Filled,
  IconHammer,
  IconHandStop,
  IconHaze,
  IconHeart,
  IconHierarchy,
  IconHistory,
  IconHome,
  IconKey,
  IconLanguage,
  IconLeaf,
  IconMap,
  IconMapPinFilled,
  IconMaximize,
  IconMicroscope,
  IconMoodConfuzedFilled,
  IconMoodHappyFilled,
  IconMoodSadFilled,
  IconMoodSmileFilled,
  IconMoonFilled,
  IconMoonStars,
  IconMushroomFilled,
  IconMusic,
  IconNotebook,
  IconNotes,
  IconPackages,
  IconPalette,
  IconPawFilled,
  IconPentagram,
  IconPig,
  IconPizza,
  IconPlanet,
  IconPlant2,
  IconPoo,
  IconPumpkinScary,
  IconRadioactiveFilled,
  IconReportAnalytics,
  IconRobot,
  IconSailboat,
  IconSeeding,
  IconShadow,
  IconShovel,
  IconSignature,
  IconSoup,
  IconSpadeFilled,
  IconSparkles,
  IconSpider,
  IconSquareRoot2,
  IconStarFilled,
  IconStarsFilled,
  IconStorm,
  IconSword,
  IconSwords,
  IconTelescope,
  IconToolsKitchen,
  IconTower,
  IconTree,
  IconTrekking,
  IconUfo,
  IconVirus,
  IconVocabulary,
  IconWall,
  IconWand,
  IconWebhook,
  IconWorld,
  IconRouteX,
  IconAddressBook,
  IconArtboard,
  IconBooks,
  IconCalendar,
  IconChartTreemap,
  IconCookie,
  IconHeartHandshake,
  IconPassword,
  IconShieldLockFilled,
  IconTimeline,
  IconUserCircle,
  IconProps as TablerIconsProps,
} from '@tabler/icons-react';
import { IconType } from 'react-icons/lib';

// react-icons/gi is a ~6.9MB monolith (all ~4000 game icons inlined in one module). We load it
// lazily via dynamic import so it stays OUT of the eager first-paint bundle, and only fetch it
// when a game icon actually needs to render (a saved icon, or the icon picker). Resolved icons
// are cached on `gameIcons` for synchronous lookups thereafter.
const gameIcons: Record<string, IconType> = {};
let gameIconsLoaded = false;
let gameIconsPromise: Promise<void> | null = null;

export function loadGameIcons(): Promise<void> {
  if (gameIconsLoaded) return Promise.resolve();
  if (!gameIconsPromise) {
    gameIconsPromise = import('react-icons/gi').then((GiIcons) => {
      for (const [name, Component] of Object.entries(GiIcons)) {
        // strip the leading 'Gi' and lowercase, matching the previous lookup keys
        gameIcons[name.slice(2).toLowerCase()] = Component as IconType;
      }
      gameIconsLoaded = true;
    });
  }
  return gameIconsPromise;
}

// Tabler Icons
const tablerIcons: Record<string, React.FC<TablerIconsProps>> = {
  avatar: IconUserCircle,
  sphere: IconSphere,
  three: IconBrandThreejs,
  safari: IconBrandSafari,
  telegram: IconBrandTelegram,
  fire: IconBrandTinder,
  affiliate: IconAffiliateFilled,
  tree: IconTree,
  home: IconHome,
  heart: IconHeart,
  wand: IconWand,
  magic: IconSparkles,
  star: IconStarFilled,
  spade: IconSpadeFilled,
  palette: IconPalette,
  ghost: IconGhost2Filled,
  pumpkin: IconPumpkinScary,
  bookmarks: IconBookmarks,
  ear: IconEar,
  box: IconBoxSeam,
  brush: IconBrush,
  moon: IconMoonStars,
  packages: IconPackages,
  shadow: IconShadow,
  shovel: IconShovel,
  badge: IconArrowBadgeDownFilled,
  mushroom: IconMushroomFilled,
  webhook: IconWebhook,
  discord: IconBrandDiscordFilled,
  maximize: IconMaximize,
  discount: IconDiscountCheckFilled,
  wechat: IconBrandWechat,
  music: IconMusic,
  combat: IconSwords,
  sword: IconSword,
  storm: IconStorm,
  history: IconHistory,
  key: IconKey,
  bow: IconBow,
  boat: IconSailboat,
  robot: IconRobot,
  sandbox: IconBrandCodesandbox,
  clover: IconBrand4chan,
  map: IconMap,
  pin: IconMapPinFilled,
  castle: IconBuildingCastle,
  tower: IconTower,
  building: IconBuilding,
  lighthouse: IconBuildingLighthouse,
  fortress: IconBuildingFortress,
  hammer: IconHammer,
  wall: IconWall,
  hand: IconHandStop,
  trek: IconTrekking,
  water: IconDropletFilled,
  confetti: IconConfetti,
  haze: IconHaze,
  stars: IconStarsFilled,
  pinterest: IconBrandPinterest,
  signature: IconSignature,
  dice: IconDice5Filled,
  folder: IconFolderFilled,
  notes: IconNotes,
  book: IconBook,
  book_2: IconBook2,
  bookmark: IconBookmarkFilled,
  vocabulary: IconVocabulary,
  notebook: IconNotebook,
  kitchen: IconToolsKitchen,
  devices: IconDevices,
  bong: IconBong,
  soup: IconSoup,
  alien: IconAlienFilled,
  ufo: IconUfo,
  hierarchy: IconHierarchy,
  alarm: IconAlarmFilled,
  cherry: IconCherryFilled,
  square_root: IconSquareRoot2,
  report: IconReportAnalytics,
  album: IconAlbum,
  pizza: IconPizza,
  microscope: IconMicroscope,
  cat: IconCat,
  paw: IconPawFilled,
  dog: IconDog,
  deer: IconDeer,
  bat: IconBat,
  butterfly: IconButterfly,
  feather: IconFeather,
  fish: IconFish,
  pig: IconPig,
  spider: IconSpider,
  language: IconLanguage,
  world: IconWorld,
  radioactive: IconRadioactiveFilled,
  planet: IconPlanet,
  candle: IconCandle,
  campfire: IconCampfireFilled,
  virus: IconVirus,
  biohazard: IconBiohazard,
  dna: IconDna,
  eyeglass: IconEyeglass,
  mask: IconFaceMask,
  crown: IconCrown,
  telescope: IconTelescope,
  poo: IconPoo,
  drone: IconDrone,
  seeding: IconSeeding,
  plant: IconPlant2,
  leaf: IconLeaf,
  route: IconRouteX,
  pentagram: IconPentagram,
  mood_confuzed: IconMoodConfuzedFilled,
  mood_happy: IconMoodHappyFilled,
  mood_smile: IconMoodSmileFilled,
  mood_sad: IconMoodSadFilled,
  moon_2: IconMoonFilled,
  cookie: IconCookie,
  books: IconBooks,
  password: IconPassword,
  shield: IconShieldLockFilled,
  address_book: IconAddressBook,
  calendar: IconCalendar,
  timeline: IconTimeline,
  artboard: IconArtboard,
  allies: IconHeartHandshake,
  treemap: IconChartTreemap,
};

interface IconProps extends Partial<IconType>, Partial<TablerIconsProps> {
  name: string;
}
export const Icon = ({ name, ...restProps }: IconProps) => {
  // Cast to include undefined: tablerIcons is a Record (its index type omits undefined), but a
  // missing name really is undefined at runtime, and we branch on that below.
  const tablerIcon = tablerIcons[name] as React.FC<TablerIconsProps> | undefined;

  // For non-tabler names we may need the lazily-loaded game-icon set: trigger the load and
  // re-render once it resolves. `gameIcon` holds the resolved component (if already cached).
  const [gameIcon, setGameIcon] = useState<IconType | null>(() => (tablerIcon ? null : gameIcons[name] ?? null));

  useEffect(() => {
    if (tablerIcon) return;
    if (gameIconsLoaded) {
      setGameIcon(gameIcons[name] ?? null);
      return;
    }
    let active = true;
    loadGameIcons().then(() => {
      if (active) setGameIcon(gameIcons[name] ?? null);
    });
    return () => {
      active = false;
    };
  }, [name, tablerIcon]);

  // Both tabler and react-icons components accept the same loose set of props (size, color,
  // style, stroke…); type as a permissive component so the shared restProps spread is valid.
  const IconComponent: React.ComponentType<any> | null = tablerIcon || gameIcon || null;
  if (!IconComponent) {
    // Either a game icon still loading, or genuinely not found — render nothing for now.
    return null;
  }

  return <IconComponent {...restProps} />;
};

export function getAllIcons() {
  return Object.keys(tablerIcons).concat(Object.keys(gameIcons)).sort();
}
