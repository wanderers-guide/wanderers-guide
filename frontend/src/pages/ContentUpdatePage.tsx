import { findContentUpdate } from '@content/content-update';
import { useQuery } from '@tanstack/react-query';
import { setPageTitle } from '@utils/document-change';
import { useLoaderData } from 'react-router-dom';

export function Component(props: {}) {
  const { updateId } = useLoaderData() as {
    updateId: number;
  };
  setPageTitle(`Content Update #${updateId}`);

  const { data: contentUpdate, isFetching } = useQuery({
    queryKey: [`find-content-update-${updateId}`],
    queryFn: async () => {
      return await findContentUpdate(updateId);
    },
    refetchOnWindowFocus: false,
  });

  console.log(contentUpdate);

  return (
    <div>
      <h1>Home Page</h1>
    </div>
  );
}
