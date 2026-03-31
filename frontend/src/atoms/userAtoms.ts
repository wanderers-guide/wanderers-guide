import { PublicUser } from '@schemas/content';
import { atom } from 'jotai';

const userState = atom(null as PublicUser | null);

export { userState };
