import _ from "lodash";

export type BckImage = {
  name: string;
  url: string;
  source: string;
}

const imageStore: Record<string, BckImage[]> = {
  animated_svgs: [
    {
      name: 'Twilight',
      url: '/src/assets/images/backgrounds/svgs/twilight.svg',
      source: '',
    },
    {
      name: 'Clouds',
      url: '/src/assets/images/backgrounds/svgs/clouds.svg',
      source: '',
    },
    {
      name: 'Tide',
      url: '/src/assets/images/backgrounds/svgs/tide.svg',
      source: '',
    },
    {
      name: 'Ocean',
      url: '/src/assets/images/backgrounds/svgs/ocean.svg',
      source: '',
    },
    {
      name: 'Ripple',
      url: '/src/assets/images/backgrounds/svgs/ripple.svg',
      source: '',
    },
    {
      name: 'Wave',
      url: '/src/assets/images/backgrounds/svgs/wave.svg',
      source: '',
    },
  ],
  ai_generated: [
    {
      name: 'Coastal Port',
      url: 'https://fdrjqcyjklatdrmjdnys.supabase.co/storage/v1/object/public/backgrounds/default/1.png',
      source: 'Midjourney',
    },
  ],
};


export function getBackgroundImages() {
  return _.cloneDeep(imageStore);
}


export async function getBackgroundImage(category: string, name: string) {
  const background = imageStore[category].find((image) => image.name === name);

  if (!background) {
    return getOfflineBackgroundImage();
  }

  const isValid = await isImageValid(background.url);
  if(isValid) {
    return _.cloneDeep(background);
  } else {
    return getOfflineBackgroundImage();
  }
}


function getOfflineBackgroundImage() {
  return _.cloneDeep(imageStore.animated_svgs[0]);
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

