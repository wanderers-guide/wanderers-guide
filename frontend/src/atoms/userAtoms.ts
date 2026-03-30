import { PublicUser } from '@schemas/content';
import { atom } from 'recoil';

const userState = atom({
  key: 'public-user',
  default: null as PublicUser | null,
});

export { userState };
