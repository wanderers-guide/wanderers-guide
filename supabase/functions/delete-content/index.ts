// @ts-ignore
import { serve } from 'std/server';
import {
  TableName,
  connect,
  convertContentTypeToTableName,
  deleteData,
  deleteResponseWrapper,
  fetchData,
  getPublicUser,
} from '../_shared/helpers.ts';
import type { ContentSource, ContentType } from '../_shared/content';

interface DeleteContentBody {
  id: number;
  type: TableName | ContentType;
}

serve(async (req: Request) => {
  return await connect(req, async (client, body, token) => {
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
        'encounter',
        'archetype',
        'versatile_heritage',
        'class_archetype',
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

    // Permission check: caller must be authenticated and either own the row,
    // own the parent content source, or be an admin/mod.
    const caller = await getPublicUser(client, token);
    if (!caller) {
      return { status: 'fail', data: { message: 'Not authenticated' } };
    }
    const isPrivileged = caller.is_admin === true || caller.is_mod === true;
    if (!isPrivileged) {
      let ownerUserId: string | null = null;
      if (existingContent.user_id) {
        ownerUserId = existingContent.user_id as string;
      } else if (existingContent.content_source_id) {
        const sources = await fetchData<ContentSource>(client, 'content_source', [
          { column: 'id', value: existingContent.content_source_id as number },
        ]);
        ownerUserId = sources[0]?.user_id ?? null;
      }
      if (!ownerUserId || ownerUserId !== caller.user_id) {
        return {
          status: 'fail',
          data: { message: 'You do not have permission to delete this content' },
        };
      }
    }

    // Delete any attached trait
    if (existingContent.trait_id) {
      await deleteData(client, 'trait', existingContent.trait_id);
    }

    const result = await deleteData(client, tableName as TableName, id);

    return deleteResponseWrapper(result);
  });
});
