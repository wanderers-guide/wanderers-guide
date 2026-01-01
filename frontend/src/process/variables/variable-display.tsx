import { VariableAttr, StoreID, VariableNum, VariableProf } from '@typing/variables';
import { getVariable } from './variable-manager';
import { Box, HoverCard, List, Text, TextProps } from '@mantine/core';
import { Item, LivingEntity } from '@typing/content';
import { getAcParts } from '@items/armor-handler';
import {
  getProfValueParts,
  getFinalProfValue,
  getFinalVariableValue,
  getVariableBreakdown,
  getFinalHealthValue,
  getFinalAcValue,
  getSpeedValue,
} from './variable-helpers';

export function displayFinalProfValue(
  id: StoreID,
  variableName: string,
  isDC: boolean = false,
  overrideAttribute?: string
) {
  const variable = getVariable<VariableProf>(id, variableName);
  if (!variable) return null;

  const parts = getProfValueParts(id, variableName, overrideAttribute)!;
  const value = getFinalProfValue(id, variableName, isDC, overrideAttribute);

  return (
    <span style={{ position: 'relative' }}>
      {parts.hasConditionals ? (
        <HoverCard shadow='md' openDelay={500} width={230} position='bottom' withArrow>
          <HoverCard.Target>
            <span>
              {<>{value}</>}
              {parts.hasConditionals ? (
                <Text
                  c='guide.5'
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -7,
                  }}
                >
                  *
                </Text>
              ) : null}
            </span>
          </HoverCard.Target>
          <HoverCard.Dropdown py={5} px={10}>
            <Box mr={10} my={5}>
              <Text c='gray.0' size='xs'>
                <List size='xs'>
                  {parts.breakdown.conditionals.map((item, i) => (
                    <List.Item key={i}>
                      {item.text}
                      <br />
                      <Text c='dimmed' span>
                        {'['}from {item.source}
                        {']'}
                      </Text>
                    </List.Item>
                  ))}
                </List>
              </Text>
            </Box>
          </HoverCard.Dropdown>
        </HoverCard>
      ) : (
        <span>{value}</span>
      )}
    </span>
  );
}

export function displayFinalVariableValue(id: StoreID, variableName: string) {
  const variable = getVariable<VariableProf>(id, variableName);
  if (!variable) return null;

  const finalData = getFinalVariableValue(id, variableName);
  const breakdown = getVariableBreakdown(id, variableName);

  return (
    <span style={{ position: 'relative' }}>
      {breakdown.conditionals.length > 0 ? (
        <HoverCard shadow='md' openDelay={500} width={230} position='bottom' withArrow>
          <HoverCard.Target>
            <span>
              {<>{finalData.total}</>}
              {breakdown.conditionals.length > 0 ? (
                <Text
                  c='guide.5'
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -7,
                  }}
                >
                  *
                </Text>
              ) : null}
            </span>
          </HoverCard.Target>
          <HoverCard.Dropdown py={5} px={10}>
            <Box mr={10} my={5}>
              <Text c='gray.0' size='xs'>
                <List size='xs'>
                  {breakdown.conditionals.map((item, i) => (
                    <List.Item key={i}>
                      {item.text}
                      <br />
                      <Text c='dimmed' span>
                        {'['}from {item.source}
                        {']'}
                      </Text>
                    </List.Item>
                  ))}
                </List>
              </Text>
            </Box>
          </HoverCard.Dropdown>
        </HoverCard>
      ) : (
        <span>{finalData.total}</span>
      )}
    </span>
  );
}

export function displayFinalHealthValue(id: StoreID) {
  return <span>{getFinalHealthValue(id)}</span>;
}

export function displayAttributeValue(id: StoreID, attributeName: string, textProps?: TextProps) {
  const attribute = getVariable<VariableAttr>(id, attributeName);
  if (!attribute) return null;
  return (
    <Text {...textProps}>
      <Text {...textProps} span>
        {attribute.value.value < 0 ? '-' : '+'}
      </Text>

      <Text {...textProps} td={attribute.value.partial ? 'underline' : undefined} span>
        {Math.abs(attribute.value.value)}
      </Text>
    </Text>
  );
}

export function displayFinalAcValue(id: StoreID, item?: Item) {
  const parts = getAcParts(id, item);
  const value = getFinalAcValue(id, item);

  return (
    <span style={{ position: 'relative' }}>
      {parts.hasConditionals ? (
        <HoverCard shadow='md' openDelay={500} width={230} position='bottom' withArrow>
          <HoverCard.Target>
            <span>
              {<>{value}</>}
              {parts.hasConditionals ? (
                <Text
                  c='guide.5'
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -7,
                  }}
                >
                  *
                </Text>
              ) : null}
            </span>
          </HoverCard.Target>
          <HoverCard.Dropdown py={5} px={10}>
            <Box mr={10} my={5}>
              <Text c='gray.0' size='xs'>
                <List size='xs'>
                  {parts.breakdown.conditionals.map((item, i) => (
                    <List.Item key={i}>
                      {item.text}
                      <br />
                      <Text c='dimmed' span>
                        {'['}from {item.source}
                        {']'}
                      </Text>
                    </List.Item>
                  ))}
                </List>
              </Text>
            </Box>
          </HoverCard.Dropdown>
        </HoverCard>
      ) : (
        <span>{value}</span>
      )}
    </span>
  );
}

export function displayFinalSpeedValue(id: StoreID, variableName: string, entity: LivingEntity | null) {
  const finalData = getSpeedValue(id, getVariable<VariableNum>(id, variableName)!, entity);
  const breakdown = getVariableBreakdown(id, variableName);

  return (
    <span style={{ position: 'relative' }}>
      {breakdown.conditionals.length > 0 ? (
        <HoverCard shadow='md' openDelay={500} width={230} position='bottom' withArrow>
          <HoverCard.Target>
            <span>
              {<>{finalData.total}</>}
              {breakdown.conditionals.length > 0 ? (
                <Text
                  c='guide.5'
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -7,
                  }}
                >
                  *
                </Text>
              ) : null}
            </span>
          </HoverCard.Target>
          <HoverCard.Dropdown py={5} px={10}>
            <Box mr={10} my={5}>
              <Text c='gray.0' size='xs'>
                <List size='xs'>
                  {breakdown.conditionals.map((item, i) => (
                    <List.Item key={i}>
                      {item.text}
                      <br />
                      <Text c='dimmed' span>
                        {'['}from {item.source}
                        {']'}
                      </Text>
                    </List.Item>
                  ))}
                </List>
              </Text>
            </Box>
          </HoverCard.Dropdown>
        </HoverCard>
      ) : (
        <span>{finalData.total}</span>
      )}
    </span>
  );
}
