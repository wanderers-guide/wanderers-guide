import { fixBackgroundContent } from '@ai/open-ai-handler';
import { queryByName } from '@ai/vector-db/vector-manager';
import BlurBox from '@common/BlurBox';
import { upsertBackground } from '@content/content-creation';
import { fetchContentSources, defineDefaultSources, fetchContent } from '@content/content-store';
import { defineDefaultSourcesForUser } from '@content/homebrew';
import { Center, Group, Title, Select } from '@mantine/core';
import { hideNotification, showNotification } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import { Background } from '@typing/content';
import { Operation } from '@typing/operations';
import { labelToVariable } from '@variables/variable-utils';
import { useState } from 'react';

const ENABLED = true;

export default function BackgroundFixer() {
  const { data, isFetching } = useQuery({
    queryKey: [`get-content-sources`],
    queryFn: async () => {
      const sources = await fetchContentSources({ homebrew: false, ids: 'all', includeCommonCore: true });
      defineDefaultSources(sources.map((source) => source.id));
      return sources;
    },
    refetchInterval: 1000,
  });

  return (
    <>
      <BlurBox p='sm'>
        <Center p='sm'>
          <Group>
            <Title order={3}>Background Fixer</Title>
            <Select
              placeholder='Select content source'
              data={(data ?? []).map((source) => ({
                value: source.id + '',
                label: source.name,
              }))}
              value=''
              searchValue=''
              onChange={async (value) => {
                if (!value) return;
                const sourceId = parseInt(value);
                await fixBackgrounds(sourceId);
              }}
            />
          </Group>
        </Center>
      </BlurBox>
    </>
  );
}

async function fixBackgrounds(sourceId: number) {
  if (!ENABLED) {
    showNotification({
      title: 'Background Fixer Disabled',
      message: 'This tool is currently disabled.',
      color: 'red',
      icon: null,
    });
    return;
  }

  const backgrounds =
    (await fetchContent<Background>('background', {
      content_sources: [sourceId],
    })) ?? [];

  if (backgrounds.length === 0) {
    showNotification({
      title: 'Background Fixer',
      message: `No backgrounds found for source.`,
      color: 'red',
      icon: null,
    });
    return;
  }

  // Start fixing...

  showNotification({
    id: 'background-fixer',
    title: 'Background Fixer',
    message: `Fixing ${backgrounds?.length} backgrounds...`,
    color: 'blue',
    icon: null,
    loading: true,
    autoClose: false,
  });

  for (const background of backgrounds) {
    try {
      await processBackground(background);
    } catch (e) {
      console.error(`Failed to fix background ${background.name}:`, e);
    }
  }

  hideNotification('background-fixer');
  showNotification({
    id: 'background-fixer',
    title: 'Background Fixer',
    message: `All backgrounds fixed.`,
    color: 'green',
    icon: null,
  });
}

async function processBackground(background: Background) {
  if (background.operations?.length !== 0) {
    return;
  }

  const fixedBackground = await fixBackgroundContent(background.description);

  const vectorResults = await queryByName(fixedBackground.feat, {
    amount: 5,
    maxDistance: 1.5,
  });

  console.log('Fixed Background:', fixedBackground);

  if (fixedBackground.description.trim() === '') {
    console.error(`Failed to process description for background ${background.name}`);
    return;
  }

  const vectorResult = vectorResults.find(
    (result) => `${result.name}`.trim().toLowerCase() === fixedBackground.feat.trim().toLowerCase()
  );
  if (!vectorResult) {
    console.error(`Failed to find feat ${fixedBackground.feat} for background ${background.name}`);
    return;
  }

  const description = fixedBackground.description.replace(
    fixedBackground.feat,
    `[${vectorResult!.name}](link_feat_${vectorResult!.id})`
  );

  for (const attr of fixedBackground.attributeChoice) {
    if (attr === 'INT' || attr === 'WIS' || attr === 'CHA' || attr === 'STR' || attr === 'DEX' || attr === 'CON') {
      console.log('Attribute:', attr);
    } else {
      console.error(`Failed to find attribute ${attr} for background ${background.name}`);
      return;
    }
  }
  if (fixedBackground.attributeChoice.length !== 2) {
    console.error(`Failed to find exactly 2 attributes for background ${background.name}`);
    return;
  }

  if (fixedBackground.skills.length > 0 && fixedBackground.skills[0] !== 'NOT_SURE') {
    console.log('First skill good:', fixedBackground.skills[0]);
  } else {
    console.error(`Failed to find first skill for background ${background.name}`);
    return;
  }

  const operations = [
    {
      id: crypto.randomUUID(),
      type: 'select',
      data: {
        title: 'Select an Attribute',
        modeType: 'PREDEFINED',
        optionType: 'ADJ_VALUE',
        optionsPredefined: [
          {
            id: crypto.randomUUID(),
            type: 'ADJ_VALUE',
            operation: {
              id: crypto.randomUUID(),
              type: 'adjValue',
              data: {
                variable: 'ATTRIBUTE_' + fixedBackground.attributeChoice[0],
                value: {
                  value: 1,
                },
              },
            },
          },
          {
            id: crypto.randomUUID(),
            type: 'ADJ_VALUE',
            operation: {
              id: crypto.randomUUID(),
              type: 'adjValue',
              data: {
                variable: 'ATTRIBUTE_' + fixedBackground.attributeChoice[1],
                value: {
                  value: 1,
                },
              },
            },
          },
        ],
        optionsFilters: {
          id: crypto.randomUUID(),
          type: 'ADJ_VALUE',
          group: 'SKILL',
          value: {
            value: 'U',
          },
        },
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'select',
      data: {
        title: 'Select an Attribute',
        modeType: 'FILTERED',
        optionType: 'ADJ_VALUE',
        optionsPredefined: [],
        optionsFilters: {
          id: crypto.randomUUID(),
          type: 'ADJ_VALUE',
          group: 'ATTRIBUTE',
          value: {
            value: 1,
          },
        },
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'adjValue',
      data: {
        variable: 'SKILL_' + fixedBackground.skills[0],
        value: {
          value: 'T',
        },
      },
    },
    {
      id: crypto.randomUUID(),
      type: 'giveAbilityBlock',
      data: {
        type: 'feat',
        abilityBlockId: parseInt(`${vectorResult!.id}`),
      },
    },
  ] satisfies Operation[];

  if (fixedBackground.skills.length === 2 && fixedBackground.skills[1] !== 'NOT_SURE') {
    operations.push({
      id: crypto.randomUUID(),
      // @ts-ignore
      type: 'createValue',
      data: {
        variable: 'SKILL_' + labelToVariable(fixedBackground.skills[1]),
        value: {
          value: 'T',
          // @ts-ignore
          attribute: 'ATTRIBUTE_INT',
        },
        // @ts-ignore
        type: 'prof',
      },
    });
  } else {
    console.error(`Failed to find second skill for background ${background.name}`);
  }

  const newBackground = {
    ...background,
    description,
    operations: operations as Operation[],
  } satisfies Background;

  console.log(newBackground);

  await upsertBackground(newBackground);
}
