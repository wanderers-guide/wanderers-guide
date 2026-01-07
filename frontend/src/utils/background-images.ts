import { ImageOption } from '@typing/index';
import { cloneDeep } from 'lodash-es';

const imageStore: Record<string, ImageOption[]> = {
  general: [
    {
      name: 'Windswept Castle',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/backgrounds/default/4.webp',
      source_url: 'https://www.artstation.com/',
    },
    {
      name: 'Coastal Port',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/backgrounds/default/1.png',
      source_url: 'https://www.artstation.com/',
    },
  ],
  geoffroy_thoorens: [
    {
      name: 'Chilling Ape',
      url: 'https://cdna.artstation.com/p/assets/images/images/073/101/376/large/geoffroy-thoorens-speed-trees-n-rocks-copie.jpg',
      source: 'Geoffroy Thoorens',
      source_url: 'https://www.artstation.com/djahal',
    },
    {
      name: 'Alien 5, City',
      url: 'https://cdnb.artstation.com/p/assets/images/images/038/550/887/large/geoffroy-thoorens-alien5-building.jpg',
      source: 'Geoffroy Thoorens',
      source_url: 'https://www.artstation.com/djahal',
    },
    {
      name: 'The New Call',
      url: 'https://cdna.artstation.com/p/assets/images/images/082/887/864/large/geoffroy-thoorens-thecall2-v14.jpg',
      source: 'Geoffroy Thoorens',
      source_url: 'https://www.artstation.com/djahal',
    },
    {
      name: 'Weapon Test',
      url: 'https://cdnb.artstation.com/p/assets/images/images/022/441/631/large/geoffroy-thoorens-monolith-web.jpg',
      source: 'Geoffroy Thoorens',
      source_url: 'https://www.artstation.com/djahal',
    },
    {
      name: 'Broken Alley',
      url: 'https://cdnb.artstation.com/p/users/covers/000/022/685/default/7dd65759069d8be826850a4889889e30.jpg',
      source: 'Geoffroy Thoorens',
      source_url: 'https://www.artstation.com/djahal',
    },
    {
      name: 'Village Road',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/backgrounds/default/2.png',
      source: 'Geoffroy Thoorens',
      source_url: 'https://www.artstation.com/djahal',
    },
    {
      name: 'Path to the Chapel',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/backgrounds/default/3.png',
      source: 'Geoffroy Thoorens',
      source_url: 'https://www.artstation.com/djahal',
    },
  ],
  oliver_ryan: [
    {
      name: 'Forest Shrine',
      url: 'https://i.imgur.com/XunQq5e.png',
      source: 'Oliver Ryan',
      source_url: 'https://www.artstation.com/oliverryan',
    },
    {
      name: 'Forest Shrine II',
      url: 'https://i.imgur.com/ApNTXu8.jpg',
      source: 'Oliver Ryan',
      source_url: 'https://www.artstation.com/oliverryan',
    },
    {
      name: 'Cabin',
      url: 'https://i.imgur.com/PsGa4xa.jpg',
      source: 'Oliver Ryan',
      source_url: 'https://www.artstation.com/oliverryan',
    },
    {
      name: 'Some Huts',
      url: 'https://i.imgur.com/g3gMyAT.png',
      source: 'Oliver Ryan',
      source_url: 'https://www.artstation.com/oliverryan',
    },
    {
      name: 'Old Kings',
      url: 'https://cdnb.artstation.com/p/assets/images/images/013/520/067/large/oliver-ryan-oldkingsresized.jpg',
      source: 'Oliver Ryan',
      source_url: 'https://www.artstation.com/oliverryan',
    },
    {
      name: 'Volcano',
      url: 'https://cdna.artstation.com/p/assets/images/images/017/408/856/large/oliver-ryan-volcanofinalnocharsreszied.jpg',
      source: 'Oliver Ryan',
      source_url: 'https://www.artstation.com/oliverryan',
    },
    {
      name: 'March of the Fools',
      url: 'https://cdna.artstation.com/p/assets/images/images/017/351/220/large/oliver-ryan-marchofthefools-resized.jpg',
      source: 'Oliver Ryan',
      source_url: 'https://www.artstation.com/oliverryan',
    },
  ],
  andreas_rocha: [
    {
      name: 'Magic Kingdom',
      url: 'https://cdna.artstation.com/p/assets/images/images/022/314/706/large/andreas-rocha-magickingdom01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: 'Out of the Woods',
      url: 'https://cdnb.artstation.com/p/assets/images/images/025/823/127/large/andreas-rocha-outofthewoods01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: 'Hidden Waterfall',
      url: 'https://cdna.artstation.com/p/assets/images/images/022/336/244/large/andreas-rocha-hiddenwatefall02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: 'Abandoned',
      url: 'https://cdna.artstation.com/p/assets/images/images/017/984/106/large/andreas-rocha-abandoned01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Wizard's Tower`,
      url: 'https://cdna.artstation.com/p/assets/images/images/023/453/030/large/andreas-rocha-wizardstower01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Wizard's Tower II`,
      url: 'https://cdna.artstation.com/p/assets/images/images/017/216/894/large/andreas-rocha-wizardstoweriii01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: 'At the Gate',
      url: 'https://cdnb.artstation.com/p/assets/images/images/015/607/475/large/andreas-rocha-atthegate02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: 'Deep in the Forest',
      url: 'https://cdnb.artstation.com/p/assets/images/images/000/310/933/large/andreas-rocha-deepintheforest08.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: 'Towering Shadows',
      url: 'https://cdnb.artstation.com/p/assets/images/images/016/145/351/large/andreas-rocha-toweringshadows01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: 'Good Friends',
      url: 'https://cdnb.artstation.com/p/assets/images/images/014/064/941/large/andreas-rocha-goodfriendsii02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: 'Headquarters',
      url: 'https://cdna.artstation.com/p/assets/images/images/055/288/896/large/andreas-rocha-headquarters01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Scholar's Hall`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/040/968/155/large/andreas-rocha-scholarshall02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Reader's Hall`,
      url: 'https://cdna.artstation.com/p/assets/images/images/040/973/592/large/andreas-rocha-readershall01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Accountant's Hall`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/040/981/379/large/andreas-rocha-accountantshall01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Dark Rituals`,
      url: 'https://cdna.artstation.com/p/assets/images/images/046/063/744/large/andreas-rocha-darkrituals02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Unexplored`,
      url: 'https://cdna.artstation.com/p/assets/images/images/055/361/724/large/andreas-rocha-unexplored02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Steel Mammoths`,
      url: 'https://cdna.artstation.com/p/assets/images/images/054/947/962/large/andreas-rocha-steelmammoths02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `The Clearing`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/059/191/521/large/andreas-rocha-theclearing02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Pastel Twilight`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/060/511/123/large/andreas-rocha-pasteltwilight-02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Alien Artifact`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/034/382/643/large/andreas-rocha-alienartefact02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Coastal Settlement`,
      url: 'https://cdna.artstation.com/p/assets/images/images/037/311/762/large/andreas-rocha-coastalsettlement01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Grim Hollow`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/019/809/689/large/andreas-rocha-grimhollow-artstation.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Egg Hunt`,
      url: 'https://cdna.artstation.com/p/assets/images/images/014/171/300/large/andreas-rocha-egghunt02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Back at the Office`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/012/992/867/large/andreas-rocha-backattheoffice02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Deep Market`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/014/640/217/large/andreas-rocha-deepmarket01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `The Tower`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/010/064/003/large/andreas-rocha-tower01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Electric Hues`,
      url: 'https://cdna.artstation.com/p/assets/images/images/010/063/790/large/andreas-rocha-electrichues02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Light Forest`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/007/134/335/large/andreas-rocha-lightforest02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Magic Hour`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/004/997/079/large/andreas-rocha-magichour01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `The Hidden Village`,
      url: 'https://cdna.artstation.com/p/assets/images/images/002/400/452/large/andreas-rocha-hiddenvillage01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Fields of Gold`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/002/368/361/large/andreas-rocha-fieldsofgold01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `The Gathering`,
      url: 'https://cdna.artstation.com/p/assets/images/images/002/912/664/large/andreas-rocha-thegathering.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Home Sweet Home`,
      url: 'https://cdna.artstation.com/p/assets/images/images/001/197/566/large/andreas-rocha-homesweethome03.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Path of Wisdom`,
      url: 'https://cdna.artstation.com/p/assets/images/images/000/226/358/large/andreas-rocha-thepathofwisdom2.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Endless Streets`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/000/085/509/large/EndlessStreets.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Ar-Nat Village`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/000/219/839/large/andreas-rocha-ar-nat-village-02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Dangerous Roads`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/000/320/963/large/andreas-rocha-dangerousroads.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Abandoned`,
      url: 'https://cdna.artstation.com/p/assets/images/images/003/934/626/large/andreas-rocha-abandoned01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Winter Travellers`,
      url: 'https://cdna.artstation.com/p/assets/images/images/007/182/124/large/andreas-rocha-wintertravellersii05.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Crimson Tribe`,
      url: 'https://cdna.artstation.com/p/assets/images/images/008/687/586/large/andreas-rocha-crimsontribe.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Safe Haven`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/009/071/789/large/andreas-rocha-safehaven03.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `First Rays`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/009/164/717/large/andreas-rocha-firstrays03.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `The Web Kingdom`,
      url: 'https://cdna.artstation.com/p/assets/images/images/039/941/532/large/andreas-rocha-webkingdom01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Occult Knowledge`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/033/064/779/large/andreas-rocha-occultknowledge01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `The Book Club`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/026/268/905/large/andreas-rocha-thebookclub01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Cluttered Office`,
      url: 'https://cdna.artstation.com/p/assets/images/images/027/648/396/large/andreas-rocha-clutteredofficenightversion02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `The Ochre Valley`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/012/971/915/large/andreas-rocha-theochrevalley01.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
    {
      name: `Port City`,
      url: 'https://cdna.artstation.com/p/assets/images/images/076/023/460/large/andreas-rocha-portcity02.jpg',
      source: 'Andreas Rocha',
      source_url: 'https://www.artstation.com/andreasrocha',
    },
  ],
  jorge_jacinto: [
    {
      name: `Wisp`,
      url: 'https://cdna.artstation.com/p/assets/images/images/025/102/490/large/jorge-jacinto-wisp-red.jpg',
      source: 'Jorge Jacinto',
      source_url: 'https://www.jorgejacinto.com/',
    },
    {
      name: `The Maze`,
      url: 'https://cdna.artstation.com/p/assets/images/images/031/699/448/large/jorge-jacinto-the-maze.jpg',
      source: 'Jorge Jacinto',
      source_url: 'https://www.jorgejacinto.com/',
    },
    {
      name: `The Ocean is on Fire`,
      url: 'https://cdna.artstation.com/p/assets/images/images/030/992/364/large/jorge-jacinto-the-ocean-is-on-fire-red.jpg',
      source: 'Jorge Jacinto',
      source_url: 'https://www.jorgejacinto.com/',
    },
    {
      name: `Synthwave Forest`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/034/429/941/large/jorge-jacinto-synthwave-forest-1080.jpg',
      source: 'Jorge Jacinto',
      source_url: 'https://www.jorgejacinto.com/',
    },
    {
      name: `Dark Mist`,
      url: 'https://cdna.artstation.com/p/assets/images/images/000/122/570/large/jorge-jacinto-darkmist-jorgejacinto.jpg',
      source: 'Jorge Jacinto',
      source_url: 'https://www.jorgejacinto.com/',
    },
    {
      name: `Pyramids`,
      url: 'https://cdna.artstation.com/p/assets/images/images/000/122/572/large/jorge-jacinto-ice-pyramids-by-jorge-jacinto.jpg',
      source: 'Jorge Jacinto',
      source_url: 'https://www.jorgejacinto.com/',
    },
    {
      name: `Close Encounters`,
      url: 'https://cdna.artstation.com/p/assets/images/images/000/122/574/large/jorge-jacinto-medieval-aliens-by-jorgejacinto.jpg',
      source: 'Jorge Jacinto',
      source_url: 'https://www.jorgejacinto.com/',
    },
    {
      name: `Neo Hong Kong Street`,
      url: 'https://cdna.artstation.com/p/assets/images/images/000/322/360/large/jorge-jacinto-neohongkong-street.jpg',
      source: 'Jorge Jacinto',
      source_url: 'https://www.jorgejacinto.com/',
    },
    {
      name: `Neo Hong Kong View`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/000/424/351/large/jorge-jacinto-neohongkong-sunset.jpg',
      source: 'Jorge Jacinto',
      source_url: 'https://www.jorgejacinto.com/',
    },
    {
      name: `Winter`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/001/247/531/large/jorge-jacinto-winter-is-coming-remaster-byjorgejacinto.jpg',
      source: 'Jorge Jacinto',
      source_url: 'https://www.jorgejacinto.com/',
    },
    {
      name: `Stranger in a Strange Land`,
      url: 'https://cdnb.artstation.com/p/assets/images/images/002/354/437/large/jorge-jacinto-stranger-in-a-strange-land-revisited.jpg',
      source: 'Jorge Jacinto',
      source_url: 'https://www.jorgejacinto.com/',
    },
    {
      name: `Future Noir`,
      url: 'https://images.squarespace-cdn.com/content/v1/52c69a98e4b0fbf19ff9af07/1582822474792-TDNQ57D6N10U5Q4LQUDK/image-asset.jpeg',
      source: 'Jorge Jacinto',
      source_url: 'https://www.jorgejacinto.com/',
    },
    {
      name: `Hellkite Dragon`,
      url: 'https://cdna.artstation.com/p/assets/images/images/026/845/014/large/jorge-jacinto-hellfire-drake.jpg',
      source: 'Jorge Jacinto',
      source_url: 'https://www.jorgejacinto.com/',
    },
    // {
    //   name: ``,
    //   url: '',
    //   source: 'Jorge Jacinto',
    //   source_url: 'https://www.jorgejacinto.com/',
    // },
  ],
  unknown: [
    {
      name: 'Lost Valley',
      url: 'https://api.wanderersguide.app/storage/v1/object/public/backgrounds/default/lost-valley.jpg',
      source: 'Unknown',
    },
  ],
  animated_svgs: [
    {
      name: 'Twilight',
      url: '/backgrounds/svgs/twilight.svg',
    },
    {
      name: 'Clouds',
      url: '/backgrounds/svgs/clouds.svg',
    },
    {
      name: 'Tide',
      url: '/backgrounds/svgs/tide.svg',
    },
    {
      name: 'Ocean',
      url: '/backgrounds/svgs/ocean.svg',
    },
    {
      name: 'Wave',
      url: '/backgrounds/svgs/wave.svg',
    },
    {
      name: 'Ripple',
      url: '/backgrounds/svgs/ripple.svg',
    },
  ],
  patterns: [
    {
      name: 'Dark Fabric',
      url: 'https://i.imgur.com/9RYFhrJ.png',
    },
  ],
};

export function getBackgroundImageStore() {
  return cloneDeep(imageStore);
}

export function getAllBackgroundImages() {
  const images: ImageOption[] = [];
  for (const category of Object.keys(imageStore)) {
    images.push(...imageStore[category]);
  }
  return images;
}

export async function getBackgroundImageFromURL(url?: string) {
  const background = getAllBackgroundImages().find((image) => image.url === url) ?? {
    name: 'Custom',
    url: url ?? '',
  };
  return await getBackgroundImageInternal(background);
}

export async function getBackgroundImageFromName(category: string, name: string) {
  const background = imageStore[category].find((image) => image.name === name);
  return await getBackgroundImageInternal(background);
}

async function getBackgroundImageInternal(background?: ImageOption) {
  if (!background || !background.url) {
    return getDefaultBackgroundImage();
  }

  const isValid = await isImageValid(background.url);
  if (isValid) {
    return cloneDeep(background);
  } else {
    return getOfflineBackgroundImage();
  }
}

export function getOfflineBackgroundImage() {
  return cloneDeep(imageStore.animated_svgs[0]);
}

export function getDefaultBackgroundImage() {
  return cloneDeep(imageStore.general[0]);
}

export function getDefaultCampaignBackgroundImage() {
  return cloneDeep(imageStore.geoffroy_thoorens[0]);
}

export function getHomeBackgroundImage() {
  return cloneDeep(imageStore.jorge_jacinto[0]);
}

async function isImageValid(src: string) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve(true);
    };

    img.onerror = () => {
      resolve(false);
    };

    img.src = src; // Set the source to trigger loading

    // Set a timeout to handle cases where the image takes too long to load.
    setTimeout(() => {
      img.src = ''; // Abort the image loading
      resolve(false);
    }, 2500);
  });
}
