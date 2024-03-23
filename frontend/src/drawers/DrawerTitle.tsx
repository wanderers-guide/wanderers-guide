import { drawerState } from '@atoms/navAtoms';
import { forwardRef, LegacyRef } from 'react';
import { useRecoilValue } from 'recoil';
import { ActionDrawerTitle } from './types/ActionDrawer';
import { AddItemDrawerTitle } from './types/AddItemDrawer';
import { AncestryDrawerTitle } from './types/AncestryDrawer';
import { BackgroundDrawerTitle } from './types/BackgroundDrawer';
import { ClassDrawerTitle } from './types/ClassDrawer';
import { ClassFeatureDrawerTitle } from './types/ClassFeatureDrawer';
import { FeatDrawerTitle } from './types/FeatDrawer';
import { GenericDrawerTitle } from './types/GenericDrawer';
import { InvItemDrawerTitle } from './types/InvItemDrawer';
import { ItemDrawerTitle } from './types/ItemDrawer';
import { LanguageDrawerTitle } from './types/LanguageDrawer';
import { SpellDrawerTitle } from './types/SpellDrawer';
import { StatAttrDrawerTitle } from './types/StatAttrDrawer';
import { StatHealthDrawerTitle } from './types/StatHealthDrawer';
import { StatProfDrawerTitle } from './types/StatProfDrawer';
import { TraitDrawerTitle } from './types/TraitDrawer';
import { CastSpellDrawerTitle } from './types/CastSpellDrawer';
import { StatAcDrawerTitle } from './types/StatAcDrawer';
import { StatSpeedDrawerTitle } from './types/StatSpeedDrawer';
import { StatPerceptionDrawerTitle } from './types/StatPerceptionDrawer';
import { StatResistWeakDrawerTitle } from './types/StatResistWeakDrawer';
import { ConditionDrawerTitle } from './types/ConditionDrawer';

const DrawerTitle = forwardRef((props: {}, ref: LegacyRef<HTMLDivElement>) => {
  const _drawer = useRecoilValue(drawerState);
  return (
    <div ref={ref}>
      {_drawer?.type === 'generic' && <GenericDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'condition' && <ConditionDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'feat' && <FeatDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'action' && <ActionDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'spell' && <SpellDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'item' && <ItemDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'class' && <ClassDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'class-feature' && <ClassFeatureDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'ancestry' && <AncestryDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'background' && <BackgroundDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'language' && <LanguageDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'heritage' && <ActionDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'sense' && <ActionDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'physical-feature' && <ActionDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'stat-prof' && <StatProfDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'stat-attr' && <StatAttrDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'stat-hp' && <StatHealthDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'stat-ac' && <StatAcDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'stat-speed' && <StatSpeedDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'stat-perception' && <StatPerceptionDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'stat-resist-weak' && <StatResistWeakDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'trait' && <TraitDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'add-item' && <AddItemDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'inv-item' && <InvItemDrawerTitle data={_drawer.data} />}
      {_drawer?.type === 'cast-spell' && <CastSpellDrawerTitle data={_drawer.data} />}
    </div>
  );
});

export default DrawerTitle;
