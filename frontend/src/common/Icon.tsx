import React, { RefAttributes, useEffect, useReducer } from 'react';
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

// react-icons/gi is ~6.6 MB (4,040 icons). Previously `import * as GiIcons` pulled the
// whole set into every module that imports this file (29 of them), landing it in the entry
// chunk on every page load. Instead, load it lazily (a separate chunk), build the name map
// once, and cache it. Tabler icons — the app chrome — still resolve synchronously below.
let gameIconsCache: Record<string, IconType> | null = null;
let gameIconsPromise: Promise<Record<string, IconType>> | null = null;
const gameIconSubscribers = new Set<() => void>();

/** Load + cache the game-icon set once. Notifies mounted <GameIcon>s when it resolves. */
export function loadGameIcons(): Promise<Record<string, IconType>> {
  if (gameIconsCache) return Promise.resolve(gameIconsCache);
  gameIconsPromise ??= import('react-icons/gi').then((mod) => {
    const map: Record<string, IconType> = {};
    for (const [rawName, Component] of Object.entries(mod)) {
      // Strip the leading 'Gi' and lowercase, matching the previous naming.
      map[rawName.slice(2).toLowerCase()] = Component as IconType;
    }
    gameIconsCache = map;
    gameIconSubscribers.forEach((cb) => cb());
    return map;
  });
  return gameIconsPromise;
}

// Preload during idle time so game icons in content are usually ready before they render,
// without blocking the initial critical path (the reason for splitting them out).
if (typeof window !== 'undefined') {
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  };
  const preload = () => void loadGameIcons();
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(preload, { timeout: 3000 });
  else setTimeout(preload, 2000);
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
  // Tabler icons (the app chrome) resolve synchronously — the common case.
  const TablerComponent = tablerIcons[name];
  if (TablerComponent) {
    return <TablerComponent {...restProps} />;
  }
  // Otherwise it's a game icon, resolved from the lazily-loaded gi set.
  return <GameIcon name={name} {...restProps} />;
};

/** Renders a game icon once the (lazy) gi set has loaded; nothing until then. */
function GameIcon({ name, ...restProps }: IconProps) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (gameIconsCache) return; // already available — no need to subscribe
    const onLoaded = () => rerender();
    gameIconSubscribers.add(onLoaded);
    void loadGameIcons();
    return () => {
      gameIconSubscribers.delete(onLoaded);
    };
  }, []);

  // Cast to a permissive component type: IconProps mixes Tabler + react-icons prop types
  // (e.g. Tabler's numeric `stroke` vs react-icons' string), which the original single
  // union component tolerated. Runtime behavior is unchanged.
  const IconComponent = gameIconsCache?.[name] as React.FC<Record<string, unknown>> | undefined;
  if (!IconComponent) {
    // Only warn once the set has actually loaded — before that, a miss just means
    // "not ready yet", not "unknown icon".
    if (gameIconsCache) console.warn(`Icon "${name}" not found`);
    return null;
  }
  return <IconComponent {...restProps} />;
}

/**
 * All icon names known RIGHT NOW — Tabler names plus game names if the gi set has already
 * loaded. Used where a sync answer is needed (e.g. picking a random default). Prefer
 * getAllIconsAsync when the complete set matters.
 */
export function getAllIcons() {
  const gameNames = gameIconsCache ? Object.keys(gameIconsCache) : [];
  return Object.keys(tablerIcons).concat(gameNames).sort();
}

/** Ensures the game-icon set is loaded, then returns the complete name list (for the picker). */
export async function getAllIconsAsync() {
  await loadGameIcons();
  return getAllIcons();
}
