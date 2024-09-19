import { CampaignNPC, CampaignSessionIdea } from '@typing/content';
import { atom } from 'recoil';

const sessionIdeasState = atom({
  key: 'campaign-ideas',
  default: [] as CampaignSessionIdea[],
});

const npcsState = atom({
  key: 'campaign-npcs',
  default: [] as CampaignNPC[],
});

export { sessionIdeasState, npcsState };
