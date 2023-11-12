import { useEffect, useState } from 'react';
import { defineEnabledContentSources, getAllContentSources, getContent } from '@content/content-controller';
import { selectContent } from '@common/select/SelectContent';
import { Button, TextInput, Title } from '@mantine/core';
import { AbilityBlock } from '@typing/content';
import { OperationSection } from '@common/operations/Operations';
import { setPageTitle } from '@utils/document-change';
import { modals, openContextModal } from '@mantine/modals';
import { CreateAbilityBlockModal } from '@modals/CreateAbilityBlockModal';

export default function DashboardPage() {
  setPageTitle(`Dashboard`);

  useEffect(() => {
    (async () => {
      // Enable all sources
      defineEnabledContentSources(await getAllContentSources());
    })();
  }, []);

  return (
    <div>
      <h1>Dashboard Page</h1>
      <Button
        onClick={() => {
          selectContent<AbilityBlock>(
            'ability-block',
            (option) => {
              console.log(option);
            },
            {
              abilityBlockType: 'feat',
              groupBySource: true,
            }
          );
        }}
      >
        Select Feat
      </Button>

      <OperationSection
        title={'Title TODO'}
        onChange={(operations) => {
          console.log(operations);
        }}
      />
    </div>
  );
}
