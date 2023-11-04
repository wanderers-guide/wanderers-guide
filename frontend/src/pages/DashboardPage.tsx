import { useEffect } from "react";
import { defineEnabledContentSources, getContent } from "@content/content-controller";
import { selectContent } from "@common/select/SelectContent";
import { Button } from "@mantine/core";
import { AbilityBlock } from "@typing/content";
import { OperationSection } from "@common/operations/Operations";

export default function DashboardPage() {

  useEffect(() => {
    
    // makeRequest("get-sheet-content", {
    //   character_id: 1,
    // }).then((data) => {
    //   console.log(data);
    // });
    // defineEnabledContentSources([PLAYER_CORE_SOURCE_ID]);

    // console.log('got here')

    // for (let i = 3343; i < 3343+100; i++) {
    //   getContent('ability-block', i).then((data) => {
    //     console.log(data);
    //   });
    // }
    defineEnabledContentSources([1, 2, 3, 4, 5]);

  }, []);

  return (
    <div>
      <h1>Dashboard Page</h1>
      <Button onClick={() => {
        
        selectContent<AbilityBlock>('ability-block', (option) => {
          console.log(option);
        }, {
          abilityBlockType: 'feat',
          groupBySource: true,
        });
      }}>Select Feat</Button>

      <OperationSection title={'Title TODO'} />
    </div>
  );
}
