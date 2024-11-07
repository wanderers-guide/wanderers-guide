import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { useMantineTheme, Group, SimpleGrid, Button, Box, Text } from '@mantine/core';
import { LivingEntity } from '@typing/content';
import { StoreID } from '@typing/variables';
import { toLabel } from '@utils/strings';
import { displayAttributeValue } from '@variables/variable-display';
import { useNavigate } from 'react-router-dom';
import { SetterOrUpdater, useRecoilState } from 'recoil';

export default function AttributeSection(props: {
  id: StoreID;
  entity: LivingEntity | null;
  setEntity: SetterOrUpdater<LivingEntity | null>;
}) {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  // Ordered this way so it's in two columns of physical & mental
  const attributes = [
    'ATTRIBUTE_STR',
    'ATTRIBUTE_INT',
    'ATTRIBUTE_DEX',
    'ATTRIBUTE_WIS',
    'ATTRIBUTE_CON',
    'ATTRIBUTE_CHA',
  ];

  const handleAttributeOpen = (attribute: string) => {
    openDrawer({ type: 'stat-attr', data: { id: props.id, attributeName: attribute }, extra: { addToHistory: true } });
  };

  return (
    <BlurBox blur={10}>
      <Box
        px='xs'
        py={10}
        style={{
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          position: 'relative',
        }}
        h='100%'
      >
        <Group justify='center' style={{ flexDirection: 'column' }} h='100%'>
          <SimpleGrid cols={2} spacing='sm' verticalSpacing={8}>
            {attributes.map((attribute, index) => (
              <Button.Group key={index}>
                <BlurButton
                  size='compact-xs'
                  fw={400}
                  onClick={() => {
                    handleAttributeOpen(attribute);
                  }}
                >
                  {toLabel(attribute)}
                </BlurButton>
                <Button
                  radius='xl'
                  variant='light'
                  color='dark.2'
                  size='compact-xs'
                  w={35}
                  onClick={() => {
                    handleAttributeOpen(attribute);
                  }}
                >
                  {displayAttributeValue(props.id, attribute, {
                    c: 'gray.0',
                    ta: 'center',
                    fz: 'xs',
                  })}
                </Button>
              </Button.Group>
            ))}
          </SimpleGrid>
        </Group>
      </Box>
    </BlurBox>
  );
}
