// @ts-ignore
import { serve } from 'std/server';
import {
  TableName,
  connect,
  convertContentTypeToTableName,
  deleteData,
  deleteResponseWrapper,
  fetchData,
} from '../_shared/helpers.ts';
import type { ContentType } from '../_shared/content';

interface DeleteContentBody {
  id: number;
  type: TableName | ContentType;
}

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { id, type } = body as DeleteContentBody;

    const convertedType = convertContentTypeToTableName(type as ContentType);
    const tableName = convertedType ? convertedType : type;

    if (
      ![
        'ability_block',
        'content_source',
        'character',
        'campaign',
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

    const existingContents = await fetchData(client, tableName as TableName, [
      { column: 'id', value: id },
    ]);
    const existingContent = existingContents.length > 0 ? existingContents[0] : undefined;
    if (!existingContent) {
      return {
        status: 'error',
        message: 'Content not found',
      };
    }

    // Delete any attached trait
    if (existingContent.trait_id) {
      await deleteData(client, 'trait', existingContent.trait_id);
    }

    // TODO: Confirm that you can only delete content that you have permission to delete
    const result = await deleteData(client, tableName as TableName, id);

    return deleteResponseWrapper(result);
  });
});
