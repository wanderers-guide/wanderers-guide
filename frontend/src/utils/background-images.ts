import _ from "lodash";

type BackgroundImage = {
  name: string;
  url: string;
  source: string;
}

const imageStore: Record<string, BackgroundImage[]> = {
  offline_svgs: [
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
      name: 'Twilight',
      url: '/src/assets/images/backgrounds/svgs/twilight.svg',
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
};


export function getBackgroundImages() {
  return _.cloneDeep(imageStore);
}

