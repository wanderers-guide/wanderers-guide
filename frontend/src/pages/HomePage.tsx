import { defineEnabledContentSources, getAllContentSources } from '@content/content-controller';
import { runOperations } from '@operations/operation-runner';
import { setPageTitle } from '@utils/document-change';
import { useEffect } from 'react';

export default function HomePage() {
  setPageTitle();

  useEffect(() => {
    (async () => {
      // Enable all sources
      defineEnabledContentSources(await getAllContentSources());
    })();
  }, []);

  return (
    <div>
      <h1>Home Page</h1>
    </div>
  );
}
