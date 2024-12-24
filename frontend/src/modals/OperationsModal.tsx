import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  ColorInput,
  Group,
  HoverCard,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { Operation } from '@typing/operations';
import { OperationSection } from '@common/operations/Operations';
import { DISCORD_URL } from '@constants/data';
import _ from 'lodash-es';

export default function OperationsModal(props: {
  title: string;
  opened: boolean;
  onClose: () => void;
  operations: Operation[];
  onChange: (operations: Operation[]) => void;
  zIndex?: number;
}) {
  return (
    <Modal
      opened={props.opened}
      onClose={() => {
        props.onClose();
      }}
      title={<Title order={3}>{props.title}</Title>}
      styles={{
        body: {
          paddingRight: 2,
        },
      }}
      size={'xl'}
      zIndex={props.zIndex}
    >
      <Box m='sm'>
        <OperationSection
          title={
            <HoverCard openDelay={250} width={260} shadow='md' withinPortal>
              <HoverCard.Target>
                <Anchor target='_blank' underline='hover' fz='sm' fs='italic'>
                  How to Use Operations
                </Anchor>
              </HoverCard.Target>
              <HoverCard.Dropdown>
                <Text size='sm'>
                  Operations are used to make changes to a character. They can give feats, spells, and more, as well as
                  change stats, skills, and other values.
                </Text>
                <Text size='sm'>
                  Use conditionals to apply operations only when certain conditions are met and selections whenever a
                  choice needs to be made.
                </Text>
                <Text size='xs' fs='italic'>
                  For more help, see{' '}
                  <Anchor href={DISCORD_URL} target='_blank' underline='hover'>
                    our Discord server
                  </Anchor>
                  .
                </Text>
              </HoverCard.Dropdown>
            </HoverCard>
          }
          operations={props.operations}
          onChange={(operations) => props.onChange(_.cloneDeep(operations))}
        />
      </Box>
    </Modal>
  );
}
