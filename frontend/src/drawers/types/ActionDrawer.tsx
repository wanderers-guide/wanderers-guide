import { getContent } from "@content/content-controller";
import { AbilityBlock } from "@typing/content";
import { useEffect, useState } from "react";

export function ActionDrawerTitle({ data }: { data: { id: number } }) {
  const [feat, setFeat] = useState<AbilityBlock>();
  useEffect(() => {
    (async () => {
      const content = await getContent<AbilityBlock>('ability-block', data.id);
      if (content) {
        setFeat(content);
      }
    })();
  }, [data.id]);

  return <>{`Feat Drawer ${data.id}`}</>;
}

export function ActionDrawerContent({data}: {data:{ id: number }}) {
  const [feat, setFeat] = useState<AbilityBlock>();
  useEffect(() => {
    (async () => {
      const content = await getContent<AbilityBlock>('ability-block', data.id);
      if (content) {
        setFeat(content);
      }
    })();
  }, [data.id]);

  return <>{`Feat Drawer ${data.id}`}</>;
}
