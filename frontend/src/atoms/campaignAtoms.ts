import { CampaignNPC, CampaignSessionIdea } from '@schemas/content';
import { atom } from 'jotai';

const sessionIdeasState = atom([] as CampaignSessionIdea[]);
const npcsState = atom([] as CampaignNPC[]);

export { sessionIdeasState, npcsState };
