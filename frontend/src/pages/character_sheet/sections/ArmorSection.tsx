import ArmorIcon from '@assets/images/ArmorIcon';
import ShieldIcon from '@assets/images/ShieldIcon';
import { characterState } from '@atoms/characterAtoms';
import { drawerState } from '@atoms/navAtoms';
import BlurBox from '@common/BlurBox';
import BlurButton from '@common/BlurButton';
import { ICON_BG_COLOR_HOVER, ICON_BG_COLOR } from '@constants/data';
import {
  getBestArmor,
  getBestShield,
  handleUpdateItem,
  handleDeleteItem,
  handleMoveItem,
  getItemHealth,
} from '@items/inv-utils';
import { useMantineTheme, Group, Stack, Center, RingProgress, Button, Badge, Text, Box } from '@mantine/core';
import { useHover } from '@mantine/hooks';
import { Inventory, InventoryItem } from '@typing/content';
import { StoreID, VariableProf } from '@typing/variables';
import { sign } from '@utils/numbers';
import { displayFinalAcValue, displayFinalProfValue } from '@variables/variable-display';
import { addVariableBonus, getAllSaveVariables } from '@variables/variable-manager';
import { compileProficiencyType, variableToLabel } from '@variables/variable-utils';
import _ from 'lodash-es';
import { useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';

export default function ArmorSection(props: {
  id: StoreID;
  inventory: Inventory;
  setInventory: React.Dispatch<React.SetStateAction<Inventory>>;
}) {
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const [_drawer, openDrawer] = useRecoilState(drawerState);

  const { hovered: armorHovered, ref: armorRef } = useHover();
  const { hovered: shieldHovered, ref: shieldRef } = useHover();

  const handleSaveOpen = (save: VariableProf) => {
    openDrawer({
      type: 'stat-prof',
      data: { id: props.id, variableName: save.name },
      extra: { addToHistory: true },
    });
  };

  const bestArmor = getBestArmor(props.id, props.inventory);
  const bestShield = getBestShield(props.id, props.inventory);
  const bestShieldHealth = bestShield ? getItemHealth(bestShield.item) : null;

  return (
    <BlurBox blur={10}>
      <Box
        pt='xs'
        pb={5}
        px='xs'
        style={{
          borderTopLeftRadius: theme.radius.md,
          borderTopRightRadius: theme.radius.md,
          position: 'relative',
        }}
        h='100%'
      >
        <Group wrap='nowrap' gap={5} justify='space-between'>
          <Group wrap='nowrap' gap={0} justify='center' style={{ flex: 1 }}>
            <Box
              style={{ position: 'relative', cursor: 'pointer' }}
              ref={armorRef}
              onClick={() => {
                openDrawer({
                  type: 'stat-ac',
                  data: {
                    id: props.id,
                    inventory: props.inventory,
                    onViewItem: (invItem: InventoryItem) => {
                      openDrawer({
                        type: 'inv-item',
                        data: {
                          storeId: props.id,
                          zIndex: 100,
                          invItem: _.cloneDeep(invItem),
                          onItemUpdate: (newInvItem: InventoryItem) => {
                            handleUpdateItem(props.setInventory, newInvItem);
                          },
                          onItemDelete: (newInvItem: InventoryItem) => {
                            handleDeleteItem(props.setInventory, newInvItem);
                            openDrawer(null);
                          },
                          onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                            handleMoveItem(props.setInventory, invItem, containerItem);
                          },
                        },
                        extra: { addToHistory: true },
                      });
                    },
                  },
                  extra: { addToHistory: true },
                });
              }}
            >
              <ArmorIcon size={85} color={armorHovered ? ICON_BG_COLOR_HOVER : ICON_BG_COLOR} />
              <Stack
                gap={0}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <Text ta='center' fz='lg' c='gray.0' fw={500} lh='1.1em'>
                  {displayFinalAcValue(props.id, bestArmor?.item)}
                </Text>
                <Text ta='center' c='gray.5' fz='xs'>
                  AC
                </Text>
              </Stack>
            </Box>
            <Box ref={shieldRef}>
              {bestShield && (
                <Box
                  style={{ position: 'relative', cursor: 'pointer' }}
                  onClick={() => {
                    openDrawer({
                      type: 'inv-item',
                      data: {
                        storeId: props.id,
                        zIndex: 100,
                        invItem: _.cloneDeep(bestShield),
                        onItemUpdate: (newInvItem: InventoryItem) => {
                          handleUpdateItem(props.setInventory, newInvItem);
                        },
                        onItemDelete: (newInvItem: InventoryItem) => {
                          handleDeleteItem(props.setInventory, newInvItem);
                          openDrawer(null);
                        },
                        onItemMove: (invItem: InventoryItem, containerItem: InventoryItem | null) => {
                          handleMoveItem(props.setInventory, invItem, containerItem);
                        },
                      },
                      extra: { addToHistory: true },
                    });
                  }}
                >
                  <ShieldIcon size={85} color={shieldHovered ? ICON_BG_COLOR_HOVER : ICON_BG_COLOR} />
                  <Stack
                    gap={0}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <Text ta='center' fz='lg' c='gray.0' fw={500} lh='1.1em' pr={5}>
                      {sign(bestShield.item.meta_data?.ac_bonus ?? 0)}
                    </Text>
                    <Text ta='center' fz={8} style={{ whiteSpace: 'nowrap' }}>
                      Hardness {bestShieldHealth?.hardness ?? 0}
                    </Text>
                    <Center>
                      <RingProgress
                        size={30}
                        thickness={3}
                        sections={[
                          {
                            value: Math.ceil(
                              ((bestShieldHealth?.hp_current ?? 0) / (bestShieldHealth?.hp_max ?? 1)) * 100
                            ),
                            color: 'guide',
                          },
                        ]}
                        label={
                          <Text fz={8} ta='center' style={{ pointerEvents: 'none' }}>
                            HP
                          </Text>
                        }
                      />
                    </Center>
                  </Stack>
                </Box>
              )}
            </Box>
          </Group>
          <Stack gap={8}>
            {getAllSaveVariables(props.id).map((save, index) => (
              <Button.Group key={index}>
                <BlurButton size='compact-xs' fw={400} onClick={() => handleSaveOpen(save)}>
                  {variableToLabel(save)}
                </BlurButton>
                <Button
                  radius='xl'
                  variant='light'
                  color='dark.2'
                  size='compact-xs'
                  w={55}
                  style={{ position: 'relative' }}
                  onClick={() => handleSaveOpen(save)}
                >
                  <Text c='gray.0' fz='xs' pr={15}>
                    {displayFinalProfValue(props.id, save.name)}
                  </Text>
                  <Badge
                    size='xs'
                    variant='light'
                    color='gray.0'
                    w={20}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '80%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {compileProficiencyType(save?.value)}
                  </Badge>
                </Button>
              </Button.Group>
            ))}
          </Stack>
        </Group>
      </Box>
    </BlurBox>
  );
}
