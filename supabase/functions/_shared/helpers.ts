import { corsHeaders } from './cors.ts';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { uniqueId } from './upload-utils.ts';
import _ from 'lodash';
import type {
  AbilityBlockType,
  ContentSource,
  ContentType,
  JSendResponse,
  PublicUser,
  Trait,
} from './content';

export async function connect(
  req: Request,
  executeFn: (
    client: SupabaseClient<any, 'public', any>,
    body: Record<string, any>
  ) => Promise<JSendResponse>
) {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Record<string, any>;

    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default.
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const results = await executeFn(supabaseClient, body);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        status: 'fail',
        data: error,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
}

export async function getPublicUser(
  client: SupabaseClient<any, 'public', any>
): Promise<PublicUser | null> {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return null;
  }

  const results = await fetchData<PublicUser>(client, 'public_user', [
    { column: 'user_id', value: user?.id },
  ]);

  return results.length > 0 ? results[0] : null;
}

export type TableName =
  | 'public_user'
  | 'ability_block'
  | 'content_source'
  | 'content_update'
  | 'versatile_heritage'
  | 'campaign'
  | 'character'
  | 'ancestry'
  | 'trait'
  | 'class'
  | 'background'
  | 'archetype'
  | 'item'
  | 'spell'
  | 'creature'
  | 'language'
  | 'encounter';

interface SelectFilter {
  column: string;
  value: undefined | null | string | number | boolean | string[] | number[];
  options?: {
    ignoreCase?: boolean;
    arrayContains?: boolean;
  };
}

export function convertContentTypeToTableName(type: ContentType): TableName | null {
  switch (type) {
    case 'trait':
      return 'trait';
    case 'item':
      return 'item';
    case 'spell':
      return 'spell';
    case 'class':
      return 'class';
    case 'creature':
      return 'creature';
    case 'ability-block':
      return 'ability_block';
    case 'ancestry':
      return 'ancestry';
    case 'background':
      return 'background';
    case 'language':
      return 'language';
    case 'content-source':
      return 'content_source';
    case 'archetype':
      return 'archetype';
    case 'versatile-heritage':
      return 'versatile_heritage';
    default:
      return null;
  }
}

function hasUUID(tableName: TableName): boolean {
  switch (tableName) {
    case 'trait':
      return true;
    case 'item':
      return true;
    case 'spell':
      return true;
    case 'class':
      return true;
    case 'creature':
      return true;
    case 'ability_block':
      return true;
    case 'ancestry':
      return true;
    case 'background':
      return true;
    case 'language':
      return true;
    case 'archetype':
      return true;
    case 'versatile_heritage':
      return true;
    case 'content_source':
      return false;
    case 'content_update':
      return false;
    case 'campaign':
      return false;
    case 'character':
      return false;
    case 'public_user':
      return false;
    default:
      return false;
  }
}

/**
 * Handles the creation and updating of a trait for a given content type.
 * @param client
 * @param contentId
 * @param type
 * @param name
 * @param contentSourceId
 * @returns - The trait ID associated with the content.
 */
export async function handleAssociatedTrait(
  client: SupabaseClient<any, 'public', any>,
  contentId: number | undefined,
  type: ContentType,
  name: string,
  contentSourceId: number
): Promise<number | null> {
  name = name.trim();

  let traitName = '';
  let traitDescription = '';
  if (type === 'ancestry') {
    traitName = `${name}`;
    traitDescription = `This indicates content from the ${name.toLowerCase()} ancestry.`;
  } else if (type === 'class') {
    traitName = `${name}`;
    traitDescription = `This indicates content from the ${name.toLowerCase()} class.`;
  } else if (type === 'versatile-heritage') {
    traitName = `${name}`;
    traitDescription = `This indicates content from the ${name.toLowerCase()} versatile heritage.`;
  } else if (type === 'archetype') {
    traitName = `${name} Archetype`;
    traitDescription = `This indicates content from the ${name.toLowerCase()} archetype.`;
  }

  let trait_id = undefined;
  if (!contentId || contentId === -1) {
    // Is a new, so we need to create a new trait

    // Attempt to find existing trait already
    const foundTraits = await fetchData<Trait>(client, 'trait', [
      { column: 'name', value: name, options: { ignoreCase: true } },
      { column: 'content_source_id', value: contentSourceId },
    ]);

    if (foundTraits.length > 0) {
      trait_id = foundTraits[0].id;
    }

    // Create/update a new trait
    const { procedure: traitProcedure, result: traitResult } = await upsertData<Trait>(
      client,
      'trait',
      {
        id: trait_id,
        name: traitName,
        description: traitDescription,
        content_source_id: contentSourceId,
        meta_data: {
          ancestry_trait: type === 'ancestry' ? true : undefined,
          class_trait: type === 'class' ? true : undefined,
          versatile_heritage_trait: type === 'versatile-heritage' ? true : undefined,
          archetype_trait: type === 'archetype' ? true : undefined,
        },
      }
    );
    console.log(traitProcedure, traitResult);
    if (traitResult && (traitResult as Trait).id && traitProcedure === 'insert') {
      trait_id = (traitResult as Trait).id;
    }
    if (!trait_id) {
      return null;
    }
  }

  if (name && trait_id === undefined && contentId && contentId !== -1) {
    const tableName = convertContentTypeToTableName(type);
    if (!tableName) {
      return null;
    }

    const records = await fetchData(client, tableName, [{ column: 'id', value: contentId }]);
    const record = records[0];

    if (!record || !record.trait_id) {
      console.warn(`No trait ID found for ${type} with ID ${contentId}`);
      return null;
    }

    name = name.trim();
    // Update the trait name & description
    await upsertData<Trait>(client, 'trait', {
      id: record.trait_id,
      name: traitName,
      description: traitDescription,
      content_source_id: contentSourceId,
      meta_data: {
        ancestry_trait: type === 'ancestry' ? true : undefined,
        class_trait: type === 'class' ? true : undefined,
        versatile_heritage_trait: type === 'versatile-heritage' ? true : undefined,
        archetype_trait: type === 'archetype' ? true : undefined,
      },
    });

    trait_id = record.trait_id as number;
  }
  return trait_id ? trait_id : null;
}

export function upsertResponseWrapper(procedure: 'insert' | 'update', result: any): JSendResponse {
  if (procedure === 'insert') {
    return {
      status: 'success',
      data: result,
    };
  } else {
    if (result.status === 'SUCCESS') {
      return {
        status: 'success',
        data: true,
      };
    } else {
      return {
        status: 'error',
        message: result.status,
      };
    }
  }
}

export function deleteResponseWrapper(result: 'SUCCESS' | 'ERROR_UNKNOWN'): JSendResponse {
  if (result === 'SUCCESS') {
    return {
      status: 'success',
      data: true,
    };
  } else {
    return {
      status: 'error',
      message: result,
    };
  }
}

export async function fetchData<T = Record<string, any>>(
  client: SupabaseClient<any, 'public', any>,
  tableName: TableName,
  filters: SelectFilter[]
) {
  let query = client.from(tableName).select();
  for (const filter of filters) {
    if (
      filter.column === 'content_source_id' &&
      ((Array.isArray(filter.value) && filter.value.length === 0) || filter.value === undefined)
    ) {
      // Limit it to only official published books
      const sources = await fetchData<ContentSource>(client, 'content_source', [
        { column: 'user_id', value: null },
        { column: 'is_published', value: true },
      ]);
      query = query.in(
        'content_source_id',
        sources.map((s) => s.id)
      );
      continue;
    }
    if (filter.value === undefined) continue;

    if (Array.isArray(filter.value)) {
      if (filter.options?.arrayContains) {
        query = query.contains(filter.column, filter.value);
      } else {
        query = query.in(filter.column, filter.value);
      }
    } else {
      if (filter.options?.ignoreCase) {
        query = query.ilike(filter.column, `${filter.value}`);
      } else {
        if (filter.value === null) {
          query = query.is(filter.column, filter.value);
        } else {
          query = query.eq(filter.column, filter.value);
        }
      }
    }
  }
  const { data, error } = await query;
  if (error) throw error;

  return data as T[];
}

export async function upsertData<T = Record<string, any>>(
  client: SupabaseClient<any, 'public', any>,
  tableName: TableName,
  data: Record<string, undefined | null | string | number | boolean | Record<string, any>>,
  type?: string
) {
  if (data.id && data.id !== -1) {
    const { status } = await updateData(client, tableName, data.id as number, data);
    return {
      procedure: 'update' as 'update' | 'insert',
      result: { status },
    };
  } else {
    const result = await insertData<T>(client, tableName, data, type);
    return {
      procedure: 'insert' as 'update' | 'insert',
      result,
    };
  }
}

export async function insertData<T = Record<string, any>>(
  client: SupabaseClient<any, 'public', any>,
  tableName: TableName,
  data: Record<string, undefined | null | string | number | boolean | Record<string, any>>,
  type?: string
) {
  // Add uuid to data, as way to track "identical" data
  if (hasUUID(tableName)) {
    data = {
      ...data,
      uuid: uniqueId(
        data.name as string,
        type ? type : tableName,
        (data.level ?? data.rank ?? 0) as number,
        data.content_source_id as number
      ),
    };
  }

  // Trim all string values
  for (let key in data) {
    const value = data[key];
    if (_.isString(value)) {
      data[key] = value.trim();
    }
  }

  // Delete forbidden keys
  delete data.id;
  delete data.created_at;
  delete data.version;

  const { data: insertedData, error } = await client.from(tableName).insert(data).select();
  if (error) {
    if (error.code === '23505' && hasUUID(tableName)) {
      // Duplicate UUID, delete the old one and try again
      /* NOTE: Disable overriding existing uploaded content for now */
      // const { error } = await client.from(tableName).delete().eq('uuid', data.uuid);
      // if (error) {
      //   throw error;
      // }
      // return insertData<T>(client, tableName, data, type, hasUUID);
      console.warn('Duplicate UUID', data.uuid, data.name, data.type, data.content_source_id);
      return null;
    } else {
      throw error;
    }
  }

  // Update content source meta data with new counts
  if (data.content_source_id !== undefined) {
    // Get existing meta data
    const contentSource = await fetchData<ContentSource>(client, 'content_source', [
      { column: 'id', value: data.content_source_id as number },
    ]);
    if (contentSource.length === 0) {
      throw new Error(`Content source with ID ${data.content_source_id} not found`);
    }
    let { meta_data } = contentSource[0];
    const counts = meta_data?.counts ?? ({} as Record<ContentType | AbilityBlockType, number>);

    // Get count of data
    let countQuery = client
      .from(tableName)
      .select(undefined, { count: 'estimated', head: true })
      .eq('content_source_id', data.content_source_id);
    if (type) {
      countQuery = countQuery.eq('type', type);
    }
    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    // Update count & meta data
    const sectionName = (type ? type : tableName) as ContentType | AbilityBlockType;
    counts[sectionName] = count ?? -1;

    meta_data = { ...contentSource[0].meta_data, counts };

    // Update content source with updated meta data
    const { error: updateError } = await client
      .from('content_source')
      .update({ meta_data })
      .eq('id', data.content_source_id);
    if (updateError) throw updateError;
  }

  return insertedData[0] as T;
}

export async function updateData(
  client: SupabaseClient<any, 'public', any>,
  tableName: TableName,
  id: number,
  data: Record<string, undefined | null | string | number | boolean | Record<string, any>>,
  returnData?: boolean
): Promise<{ status: 'SUCCESS' | 'ERROR_DUPLICATE' | 'ERROR_UNKNOWN'; data: any }> {
  // Trim all string values
  for (let key in data) {
    const value = data[key];
    if (_.isString(value)) {
      data[key] = value.trim();
    }
  }

  // Recalculate UUID
  if (data.name && data.content_source_id) {
    data.uuid = uniqueId(
      data.name as string,
      data.type ? (data.type as string) : tableName,
      (data.level ?? data.rank ?? 0) as number,
      data.content_source_id as number
    );
  } else {
    delete data.uuid;
  }

  // Delete forbidden keys
  delete data.id;
  delete data.created_at;
  delete data.content_source_id;
  delete data.user_id;

  let error: any = null;
  let dataResult: any = null;

  if (returnData) {
    const res = await client.from(tableName).update(data).eq('id', id).select();
    error = res.error;
    dataResult = res.data;
  } else {
    const res = await client.from(tableName).update(data).eq('id', id);
    error = res.error;
  }
  if (error) {
    if (error.code === '23505') {
      // Duplicate UUID, delete the old one and try again
      return { status: 'ERROR_DUPLICATE', data: dataResult };
    } else {
      throw error;
      return { status: 'ERROR_UNKNOWN', data: dataResult };
    }
  }

  return { status: 'SUCCESS', data: dataResult };
}

export async function deleteData(
  client: SupabaseClient<any, 'public', any>,
  tableName: TableName,
  id: number
) {
  const { error } = await client.from(tableName).delete().eq('id', id);
  if (error) {
    console.error(error);
    return 'ERROR_UNKNOWN';
  } else {
    return 'SUCCESS';
  }
}
