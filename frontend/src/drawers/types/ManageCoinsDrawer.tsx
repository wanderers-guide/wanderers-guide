import RichText from '@common/RichText';
import {
  Title,
  Text,
  Image,
  Loader,
  Group,
  Divider,
  Stack,
  Box,
  Flex,
  NumberInput,
  Avatar,
  TextInput,
  Accordion,
} from '@mantine/core';
import CopperCoin from '@assets/images/currency/copper.png';
import GoldCoin from '@assets/images/currency/gold.png';
import PlatinumCoin from '@assets/images/currency/platinum.png';
import SilverCoin from '@assets/images/currency/silver.png';
import { useEffect, useRef, useState } from 'react';
import { evaluate } from 'mathjs';
import { getHotkeyHandler } from '@mantine/hooks';
import { convertToHardcodedLink } from '@content/hardcoded-links';
import { isPlayingStarfinder } from '@content/system-handler';

export function ManageCoinsDrawerTitle(props: {
  data: { coins?: { cp?: number; sp?: number; gp?: number; pp?: number } };
}) {
  return (
    <>
      {
        <Group justify='space-between' wrap='nowrap'>
          <Group wrap='nowrap' gap={10}>
            <Box>
              <Title order={3}>Manage Currency</Title>
            </Box>
            <Box></Box>
          </Group>
        </Group>
      }
    </>
  );
}

export function ManageCoinsDrawerContent(props: {
  data: {
    coins?: { cp?: number; sp?: number; gp?: number; pp?: number };
    onUpdate: (coins: { cp: number; sp: number; gp: number; pp: number }) => void;
  };
}) {
  const [cp, setCp] = useState(`${props.data.coins?.cp || '0'}`);
  const [sp, setSp] = useState(`${props.data.coins?.sp || '0'}`);
  const [gp, setGp] = useState(`${props.data.coins?.gp || '0'}`);
  const [pp, setPp] = useState(`${props.data.coins?.pp || '0'}`);

  const cpRef = useRef<HTMLInputElement>(null);
  const spRef = useRef<HTMLInputElement>(null);
  const gpRef = useRef<HTMLInputElement>(null);
  const ppRef = useRef<HTMLInputElement>(null);

  const handleCoinSubmit = (type: 'CP' | 'SP' | 'GP' | 'PP') => {
    const inputCoin = (type === 'CP' ? cp : type === 'SP' ? sp : type === 'GP' ? gp : pp) || '0';
    let result = -1;
    try {
      result = evaluate(inputCoin);
    } catch (e) {
      result = parseInt(inputCoin);
    }
    if (isNaN(result)) result = 0;
    result = Math.floor(result);
    if (result < 0) result = 0;

    if (type === 'CP') {
      setCp(`${result}`);
      cpRef.current?.blur();
    } else if (type === 'SP') {
      setSp(`${result}`);
      spRef.current?.blur();
    } else if (type === 'GP') {
      setGp(`${result}`);
      gpRef.current?.blur();
    } else if (type === 'PP') {
      setPp(`${result}`);
      ppRef.current?.blur();
    }
  };

  useEffect(() => {
    props.data.onUpdate({
      cp: isNaN(parseInt(cp)) ? 0 : parseInt(cp),
      sp: isNaN(parseInt(sp)) ? 0 : parseInt(sp),
      gp: isNaN(parseInt(gp)) ? 0 : parseInt(gp),
      pp: isNaN(parseInt(pp)) ? 0 : parseInt(pp),
    });
  }, [cp, sp, gp, pp]);

  return (
    <Box>
      <Group wrap='nowrap' gap={10}>
        <TextInput
          ref={ppRef}
          label={
            <Group wrap='nowrap' gap={8} style={{ textWrap: 'nowrap' }}>
              <Avatar src={PlatinumCoin} alt='Platinum Coin' radius='xs' size='xs' /> Platinum
            </Group>
          }
          placeholder='Coins'
          value={pp}
          onChange={(e) => {
            setPp(e.target.value);
          }}
          onFocus={(e) => {
            const length = e.target.value.length;
            // Move cursor to end
            requestAnimationFrame(() => {
              e.target.setSelectionRange(length, length);
            });
          }}
          onBlur={() => handleCoinSubmit('PP')}
          onKeyDown={getHotkeyHandler([
            ['mod+Enter', () => handleCoinSubmit('PP')],
            ['Enter', () => handleCoinSubmit('PP')],
          ])}
        />
        <TextInput
          ref={gpRef}
          label={
            <Group wrap='nowrap' gap={8} style={{ textWrap: 'nowrap' }}>
              <Avatar src={GoldCoin} alt='Gold Coin' radius='xs' size='xs' /> Gold
            </Group>
          }
          placeholder='Coins'
          value={gp}
          onChange={(e) => {
            setGp(e.target.value);
          }}
          onFocus={(e) => {
            const length = e.target.value.length;
            // Move cursor to end
            requestAnimationFrame(() => {
              e.target.setSelectionRange(length, length);
            });
          }}
          onBlur={() => handleCoinSubmit('GP')}
          onKeyDown={getHotkeyHandler([
            ['mod+Enter', () => handleCoinSubmit('GP')],
            ['Enter', () => handleCoinSubmit('GP')],
          ])}
        />
        <TextInput
          ref={spRef}
          label={
            <Group wrap='nowrap' gap={8} style={{ textWrap: 'nowrap' }}>
              <Avatar src={SilverCoin} alt='Silver Coin' radius='xs' size='xs' />{' '}
              {isPlayingStarfinder() ? <b>Credits</b> : 'Silver'}
            </Group>
          }
          placeholder='Coins'
          value={sp}
          onChange={(e) => {
            setSp(e.target.value);
          }}
          onFocus={(e) => {
            const length = e.target.value.length;
            // Move cursor to end
            requestAnimationFrame(() => {
              e.target.setSelectionRange(length, length);
            });
          }}
          onBlur={() => handleCoinSubmit('SP')}
          onKeyDown={getHotkeyHandler([
            ['mod+Enter', () => handleCoinSubmit('SP')],
            ['Enter', () => handleCoinSubmit('SP')],
          ])}
        />
        <TextInput
          ref={cpRef}
          label={
            <Group wrap='nowrap' gap={8} style={{ textWrap: 'nowrap' }}>
              <Avatar src={CopperCoin} alt='Copper Coin' radius='xs' size='xs' /> Copper
            </Group>
          }
          placeholder='Coins'
          value={cp}
          onChange={(e) => {
            setCp(e.target.value);
          }}
          onFocus={(e) => {
            const length = e.target.value.length;
            // Move cursor to end
            requestAnimationFrame(() => {
              e.target.setSelectionRange(length, length);
            });
          }}
          onBlur={() => handleCoinSubmit('CP')}
          onKeyDown={getHotkeyHandler([
            ['mod+Enter', () => handleCoinSubmit('CP')],
            ['Enter', () => handleCoinSubmit('CP')],
          ])}
        />
      </Group>

      <Accordion
        pt={15}
        variant='separated'
        styles={{
          label: {
            paddingTop: 5,
            paddingBottom: 5,
          },
          control: {
            paddingLeft: 13,
            paddingRight: 13,
          },
          item: {
            marginTop: 0,
            marginBottom: 5,
          },
        }}
      >
        <Accordion.Item value={'description'} w='100%'>
          <Accordion.Control>
            <Group wrap='nowrap' justify='space-between' gap={0}>
              <Text c='white' fz='sm'>
                Description
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <RichText ta='justify' store='CHARACTER' mr={10}>
              {`There are four common types of coins, each standardized in weight and value.\n- The copper piece (cp) is worth
          one-tenth of a silver piece.\n- The silver piece (sp) is the standard unit of currency. Each silver piece is a
          standard weight of silver and is typically accepted by any merchant or kingdom no matter where it was minted.
          \n- The gold piece (gp) is often used for purchasing magic items and other expensive items, as 1 gold piece is
          worth 10 silver pieces or 100 copper pieces.\n- The platinum piece (pp) is used for the purchase of very
          expensive items or as a way to easily transport large sums of currency. A platinum piece is worth 10 gold
          pieces, 100 silver pieces, or 1,000 copper pieces.`}
            </RichText>
            {isPlayingStarfinder() && (
              <>
                <Divider my={10} />
                <RichText ta='justify' store='CHARACTER' mr={10}>
                  {`The standard currency in Starfinder is the credit, and all items in this document are priced in credits.
                In Pathfinder Second Edition, the standard currency is typically in gold pieces (gp). The conversion
                rate between credits and gp is that 10 credits = 1 gp.`}
                </RichText>
              </>
            )}
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value={'other-currency'} w='100%'>
          <Accordion.Control>
            <Group wrap='nowrap' justify='space-between' gap={0}>
              <Text c='white' fz='sm'>
                Other Currencies
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <RichText ta='justify' store='CHARACTER'>
              {`Art objects, gems, and raw materials (such
          as those used for the ${convertToHardcodedLink('action', 'Craft')} activity) can be used much like currency: you can sell them for the same Price you
          can buy them.`}
            </RichText>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Box>
  );
}
