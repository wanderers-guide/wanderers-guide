import { drawerState } from '@atoms/navAtoms';
import { useRecoilValue } from 'recoil';
import { ActionDrawerContent } from './types/ActionDrawer';
import { AncestryDrawerContent } from './types/AncestryDrawer';
import { BackgroundDrawerContent } from './types/BackgroundDrawer';
import { ClassDrawerContent } from './types/ClassDrawer';
import { ClassFeatureDrawerContent } from './types/ClassFeatureDrawer';
import { FeatDrawerContent } from './types/FeatDrawer';
import { GenericDrawerContent } from './types/GenericDrawer';
import { InvItemDrawerContent } from './types/InvItemDrawer';
import { ItemDrawerContent } from './types/ItemDrawer';
import { LanguageDrawerContent } from './types/LanguageDrawer';
import { SpellDrawerContent } from './types/SpellDrawer';
import { StatAttrDrawerContent } from './types/StatAttrDrawer';
import { StatHealthDrawerContent } from './types/StatHealthDrawer';
import { StatProfDrawerContent } from './types/StatProfDrawer';
import { TraitDrawerContent } from './types/TraitDrawer';
import { CastSpellDrawerContent } from './types/CastSpellDrawer';
import { StatAcDrawerContent } from './types/StatAcDrawer';
import { StatSpeedDrawerContent } from './types/StatSpeedDrawer';
import { StatPerceptionDrawerContent } from './types/StatPerceptionDrawer';
import { StatResistWeakDrawerContent } from './types/StatResistWeakDrawer';
import { ConditionDrawerContent } from './types/ConditionDrawer';
import { ContentSourceDrawerContent } from './types/ContentSourceDrawer';
import { ManageCoinsDrawerContent } from './types/ManageCoinsDrawer';
import { CreatureDrawerContent } from './types/CreatureDrawer';
import { StatWeaponDrawerContent } from './types/StatWeaponDrawer';
import { getCachedCustomization } from '@content/customization-cache';
import _ from 'lodash-es';
import { ArchetypeDrawerContent } from './types/ArchetypeDrawer';
import { VersatileHeritageDrawerContent } from './types/VersatileHeritageDrawer';

export default function DrawerContent(props: { onMetadataChange?: (openedDict?: Record<string, string>) => void }) {
  const _drawer = useRecoilValue(drawerState);

  let drawerData = _.cloneDeep(_drawer?.data ?? {});
  if (_drawer && getCachedCustomization()?.sheet_theme?.view_operations) {
    drawerData = {
      ...drawerData,
      showOperations: true,
    };
  }

  return (
    <>
      {_drawer?.type === 'content-source' && <ContentSourceDrawerContent data={drawerData} />}
      {_drawer?.type === 'generic' && <GenericDrawerContent data={drawerData} />}
      {_drawer?.type === 'condition' && <ConditionDrawerContent data={drawerData} />}
      {_drawer?.type === 'creature' && (
        <CreatureDrawerContent data={drawerData} onMetadataChange={props.onMetadataChange} />
      )}
      {_drawer?.type === 'feat' && <FeatDrawerContent data={drawerData} />}
      {_drawer?.type === 'action' && <ActionDrawerContent data={drawerData} />}
      {_drawer?.type === 'spell' && <SpellDrawerContent data={drawerData} />}
      {_drawer?.type === 'item' && <ItemDrawerContent data={drawerData} />}
      {_drawer?.type === 'class' && <ClassDrawerContent data={drawerData} onMetadataChange={props.onMetadataChange} />}
      {_drawer?.type === 'class-feature' && <ClassFeatureDrawerContent data={drawerData} />}
      {_drawer?.type === 'ancestry' && (
        <AncestryDrawerContent data={drawerData} onMetadataChange={props.onMetadataChange} />
      )}
      {_drawer?.type === 'background' && (
        <BackgroundDrawerContent data={drawerData} onMetadataChange={props.onMetadataChange} />
      )}
      {_drawer?.type === 'language' && <LanguageDrawerContent data={drawerData} />}
      {_drawer?.type === 'heritage' && <ActionDrawerContent data={drawerData} />}
      {_drawer?.type === 'sense' && <ActionDrawerContent data={drawerData} />}
      {_drawer?.type === 'physical-feature' && <ActionDrawerContent data={drawerData} />}
      {_drawer?.type === 'mode' && <ActionDrawerContent data={drawerData} />}
      {_drawer?.type === 'versatile-heritage' && <VersatileHeritageDrawerContent data={drawerData} />}
      {_drawer?.type === 'archetype' && <ArchetypeDrawerContent data={drawerData} />}

      {_drawer?.type === 'manage-coins' && <ManageCoinsDrawerContent data={drawerData} />}
      {_drawer?.type === 'stat-prof' && <StatProfDrawerContent data={drawerData} />}
      {_drawer?.type === 'stat-attr' && <StatAttrDrawerContent data={drawerData} />}
      {_drawer?.type === 'stat-hp' && <StatHealthDrawerContent data={drawerData} />}
      {_drawer?.type === 'stat-ac' && <StatAcDrawerContent data={drawerData} />}
      {_drawer?.type === 'stat-weapon' && <StatWeaponDrawerContent data={drawerData} />}
      {_drawer?.type === 'stat-speed' && <StatSpeedDrawerContent data={drawerData} />}
      {_drawer?.type === 'stat-perception' && <StatPerceptionDrawerContent data={drawerData} />}
      {_drawer?.type === 'stat-resist-weak' && <StatResistWeakDrawerContent data={drawerData} />}
      {_drawer?.type === 'trait' && <TraitDrawerContent data={drawerData} />}
      {_drawer?.type === 'inv-item' && <InvItemDrawerContent data={drawerData} />}
      {_drawer?.type === 'cast-spell' && <CastSpellDrawerContent data={drawerData} />}
    </>
  );
}
