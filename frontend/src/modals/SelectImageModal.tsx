import {
  Text,
  Group,
  Anchor,
  Card,
  SimpleGrid,
  UnstyledButton,
  Avatar,
  MantineRadius,
  FileButton,
  LoadingOverlay,
  HoverCard,
  ScrollArea,
} from '@mantine/core';
import { ContextModalProps } from '@mantine/modals';
import _, { set } from 'lodash';
import { ImageOption } from '@typing/index';
import classes from '@css/ActionsGrid.module.css';
import { IconBrush, IconUpload } from '@tabler/icons-react';
import { uploadImage } from '@upload/image-upload';
import { useState } from 'react';

export function SelectImageModal({
  context,
  id,
  innerProps,
}: ContextModalProps<{
  options: ImageOption[];
  onSelect: (option: ImageOption) => void;
  category: string;
}>) {
  const [loading, setLoading] = useState(false);

  const items = innerProps.options.map((option, index) => (
    <HoverCard
      key={index}
      shadow='md'
      openDelay={1000}
      position='top'
      disabled={!option.name}
      withinPortal
    >
      <HoverCard.Target>
        <UnstyledButton
          className={classes.item}
          onClick={() => {
            innerProps.onSelect(option);
            context.closeModal(id);
          }}
        >
          <Avatar src={option.url} size={115} radius={'md'} />
        </UnstyledButton>
      </HoverCard.Target>
      <HoverCard.Dropdown py={5} px={10}>
        <Text size='sm'>{option.name}</Text>
        {option.source?.trim() && (
          <Text size='xs' c='dimmed'>
            <IconBrush size='0.5rem' /> {option.source}
          </Text>
        )}
      </HoverCard.Dropdown>
    </HoverCard>
  ));

  return (
    <Card withBorder radius='md' className={classes.card} pl={15} py={15} pr={5}>
      <LoadingOverlay visible={loading} />
      <ScrollArea h={315}>
        <SimpleGrid cols={3} pl={5} py={5} pr={15}>
          <FileButton
            onChange={async (file) => {
              // Upload file to server
              let path = '';
              if (file) {
                setLoading(true);
                path = await uploadImage(file, innerProps.category);
              }

              // Construct image option
              const option: ImageOption = {
                name: 'Uploaded Image',
                url: path,
                source: 'upload',
              };

              innerProps.onSelect(option);
              context.closeModal(id);
              setLoading(false);
            }}
            accept='image/png,image/jpeg,image/jpg,image/webp'
          >
            {(subProps) => (
              <HoverCard shadow='md' openDelay={500} position='top' withinPortal>
                <HoverCard.Target>
                  <UnstyledButton {...subProps} className={classes.item}>
                    <Avatar size={50} radius={'xl'}>
                      <IconUpload size='1.5rem' />
                    </Avatar>
                  </UnstyledButton>
                </HoverCard.Target>
                <HoverCard.Dropdown py={5} px={10}>
                  <Text size='sm'>Upload Image</Text>
                  <Text size='xs' c='dimmed'>
                    Max file size: 1MB
                  </Text>
                </HoverCard.Dropdown>
              </HoverCard>
            )}
          </FileButton>
          {items}
        </SimpleGrid>
      </ScrollArea>
    </Card>
  );
}
