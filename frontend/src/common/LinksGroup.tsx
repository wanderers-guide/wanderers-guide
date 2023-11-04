import { useState } from 'react';
import {
  Group,
  Box,
  Collapse,
  ThemeIcon,
  Text,
  UnstyledButton,
  rem,
  Badge,
  useMantineTheme,
  Switch,
  Button,
} from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import classes from '@css/LinksGroup.module.css';
import switchClasses from '@css/CustomSwitch.module.css';

interface LinksGroupProps {
  icon: React.FC<any>;
  label: string;
  initiallyOpened?: boolean;
  links?: { label: string; id: number; url: string, enabled?: boolean }[];
  onLinkChange?: (id: number, enabled: boolean) => void;
  onEnableAll?: () => void;
}

export function LinksGroup({ icon: Icon, label, initiallyOpened, links, onLinkChange, onEnableAll }: LinksGroupProps) {
  const theme = useMantineTheme();
  const hasLinks = Array.isArray(links);
  const [opened, setOpened] = useState(initiallyOpened || false);
  const items = (hasLinks ? links : []).sort((a, b) => a.label.localeCompare(b.label)).map((link) => (
    <Text<'a'> component='a' className={classes.link} key={link.label}>
      <Switch
        label={link.label}
        size='xs'
        checked={link.enabled}
        onChange={(event) => onLinkChange && onLinkChange(link.id, event.target.checked)}
        classNames={switchClasses}
      />
    </Text>
  ));

  return (
    <>
      <UnstyledButton onClick={() => setOpened((o) => !o)} className={classes.control}>
        <Group justify='space-between' gap={0}>
          <Box style={{ display: 'flex', alignItems: 'center' }}>
            <ThemeIcon variant='light' size={30}>
              <Icon style={{ width: rem(18), height: rem(18) }} />
            </ThemeIcon>
            <Box ml='md'>{label}</Box>
            <Badge ml='md' variant='default'>
              <Text fz='sm' c='gray.5' span>
                {links?.filter((link) => link.enabled).length}
              </Text>
              <Text fz='sm' c='gray.5' span>
                /{links?.length}
              </Text>
            </Badge>
          </Box>
          {hasLinks && (
            <IconChevronRight
              className={classes.chevron}
              stroke={1.5}
              style={{
                width: rem(16),
                height: rem(16),
                transform: opened ? 'rotate(-90deg)' : 'none',
              }}
            />
          )}
        </Group>
      </UnstyledButton>
      {hasLinks && (
        <Collapse in={opened}>
          <Box style={{ position: 'relative' }}>
            {items.length > 0 ? (
              <>
                {items}
                <Button
                  style={{ position: 'absolute', top: -30, right: 45 }}
                  variant='outline'
                  color='gray.5'
                  size='compact-xs'
                  onClick={onEnableAll}
                >
                  Enable All
                </Button>
              </>
            ) : (
              <Text pl={60} py={5} fz='sm' fs='italic' c='dimmed'>
                No content sources found for this section!
              </Text>
            )}
          </Box>
        </Collapse>
      )}
    </>
  );
}
