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

export default function ViewOperationsModal(props: {
  opened: boolean;
  onClose: () => void;
  operations: Operation[];
  title: string;
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
      zIndex={1000}
    >
      <Box
        m='sm'
        style={{
          pointerEvents: 'none',
        }}
        aria-readonly
      >
        <OperationSection
          title={
            <Text fz='sm' fs='italic'>
              Read-Only View
            </Text>
          }
          value={props.operations}
          onChange={() => {}}
        />
      </Box>
    </Modal>
  );
}
