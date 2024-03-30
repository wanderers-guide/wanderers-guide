import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { useMantineTheme, Group, SimpleGrid, Button, Box, Text } from '@mantine/core';
import { displayAttributeValue } from '@variables/variable-display';
import { variableNameToLabel } from '@variables/variable-utils';
import { useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';

export default function AttributeSection() {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useRecoilState(drawerState);
  const [character, setCharacter] = useRecoilState(characterState);

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
    openDrawer({ type: 'stat-attr', data: { attributeName: attribute } });
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
                  {variableNameToLabel(attribute)}
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
                  {displayAttributeValue('CHARACTER', attribute, {
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
