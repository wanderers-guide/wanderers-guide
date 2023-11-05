import { ImageOption } from "@typing/index";
import _ from "lodash";

// TODO: Move this to the db?
const imageStore: Record<string, ImageOption[]> = {
  ai_generated: [
    {
      name: 'Coastal Port',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/backgrounds/default/1.png',
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
    // {
    //   name: ``,
    //   url: '',
    //   source: 'Andreas Rocha',
    //   source_url: 'https://www.artstation.com/andreasrocha',
    // },
  ],
  unknown: [
    {
      name: 'Stand Off',
      url: 'https://www.pixelstalk.net/wp-content/uploads/2016/11/Pictures-Fantasy-Art.png',
      source: 'Unknown',
    },
    {
      name: 'Brilliant Dragon',
      url: 'https://www.pixelstalk.net/wp-content/uploads/2016/11/Fantasy-landscapes-art.jpg',
      source: 'Unknown',
    },
  ],
  animated_svgs: [
    {
      name: 'Twilight',
      url: '/src/assets/images/backgrounds/svgs/twilight.svg',
    },
    {
      name: 'Clouds',
      url: '/src/assets/images/backgrounds/svgs/clouds.svg',
    },
    {
      name: 'Tide',
      url: '/src/assets/images/backgrounds/svgs/tide.svg',
    },
    {
      name: 'Ocean',
      url: '/src/assets/images/backgrounds/svgs/ocean.svg',
    },
    {
      name: 'Wave',
      url: '/src/assets/images/backgrounds/svgs/wave.svg',
    },
    {
      name: 'Ripple',
      url: '/src/assets/images/backgrounds/svgs/ripple.svg',
    },
  ],
  patterns: [
    {
      name: 'Dark Fabric',
      url: 'https://i.imgur.com/aNhV7pR.png',
    },
  ],
};



export function getBackgroundImageStore() {
  return _.cloneDeep(imageStore);
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
  if (!background) {
    return getDefaultBackgroundImage();
  }

  const isValid = await isImageValid(background.url);
  if (isValid) {
    return _.cloneDeep(background);
  } else {
    return getOfflineBackgroundImage();
  }
}

function getOfflineBackgroundImage() {
  return _.cloneDeep(imageStore.animated_svgs[0]);
}

function getDefaultBackgroundImage() {
  return _.cloneDeep(imageStore.ai_generated[0]);
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
      img.src = ""; // Abort the image loading
      resolve(false);
    }, 2500);
  });
}

