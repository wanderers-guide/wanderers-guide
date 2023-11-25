// @ts-ignore
import { serve } from 'std/server';
import { TableName, connect, deleteData, deleteResponseWrapper } from '../_shared/helpers.ts';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, tableName } = body as { id: number; tableName: TableName };
    if (
      ![
        'ability_block',
        'content_source',
        'character',
        'ancestry',
        'trait',
        'class',
        'background',
        'item',
        'spell',
        'creature',
        'language',
      ].includes(tableName)
    ) {
      return {
        status: 'error',
        message: 'Invalid table name',
      };
    }

    // TODO: Confirm that you can only delete content that you have permission to delete
    const result = await deleteData(client, tableName, id);

    return deleteResponseWrapper(result);
  });
});
