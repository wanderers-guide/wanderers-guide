import { Box, HoverCard, Text, TextProps, Tooltip, useMantineTheme } from '@mantine/core';
import _ from 'lodash-es';
import { useRef } from 'react';

interface EllipsisTextProps extends TextProps {
  children?: any;
}

export function EllipsisText(props: EllipsisTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);

  const theme = useMantineTheme();

  function getAdjustmentPercent() {
    // Hardcoded percentages for character counts
    const count = props.children.toString().length;
    if (count > 64) return 75;
    if (count > 48) return 80;
    if (count > 32) return 90;
    if (count > 16) return 95;
    return 100;
  }

  function getAdjustedFontSize() {
    //if (!props.fz) return undefined; // Default to md

    if (props.fz?.toString().includes('rem') || props.fz?.toString().includes('px') || _.isNumber(props.fz)) {
      return `calc(${props.fz} * ${getAdjustmentPercent() / 100})`;
    } else {
      // It's a mantine font size
      // @ts-ignore
      const size = theme.fontSizes[props.fz ?? 'md'];
      return `calc(${size} * ${getAdjustmentPercent() / 100})`;
    }
  }

  function isEllipsisActive(e: HTMLParagraphElement | null) {
    if (!e) {
      return false;
    }
    return e.offsetWidth < e.scrollWidth;
  }

  return (
    <HoverCard
      disabled={!isEllipsisActive(ref.current)}
      shadow='md'
      zIndex={2000}
      openDelay={250}
      withinPortal
      withArrow
    >
      <HoverCard.Target>
        <Text
          ref={ref}
          style={{
            ...props.style,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
            fontSize: getAdjustedFontSize(),
          }}
        >
          {props.children}
        </Text>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Text
          style={{
            ...props.style,
            //fontSize: getAdjustedFontSize(),
          }}
        >
          {props.children}
        </Text>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
