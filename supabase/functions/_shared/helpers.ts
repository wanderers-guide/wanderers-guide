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
  | 'character'
  | 'ancestry'
  | 'trait'
  | 'class'
  | 'background'
  | 'item'
  | 'spell'
  | 'creature'
  | 'language';

interface SelectFilter {
  column: string;
  value: undefined | string | number | boolean | string[] | number[];
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
    default:
      return null;
  }
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
  for (let filter of filters) {
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
        query = query.eq(filter.column, filter.value);
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
  type?: string,
  hasUUID = true
) {
  if (data.id && data.id !== -1) {
    const status = await updateData(client, tableName, data.id as number, data);
    return {
      procedure: 'update' as 'update' | 'insert',
      result: { status },
    };
  } else {
    const result = await insertData<T>(client, tableName, data, type, hasUUID);
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
  type?: string,
  hasUUID = true
) {
  // Add uuid to data, as way to track "identical" data
  if (hasUUID) {
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

  console.log('Inserting data', data);

  const { data: insertedData, error } = await client.from(tableName).insert(data).select();
  if (error) {
    if (error.code === '23505' && hasUUID) {
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
  data: Record<string, undefined | null | string | number | boolean | Record<string, any>>
): Promise<'SUCCESS' | 'ERROR_DUPLICATE' | 'ERROR_UNKNOWN'> {
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

  const { error } = await client.from(tableName).update(data).eq('id', id);
  if (error) {
    if (error.code === '23505') {
      // Duplicate UUID, delete the old one and try again
      return 'ERROR_DUPLICATE';
    } else {
      throw error;
      return 'ERROR_UNKNOWN';
    }
  }

  return 'SUCCESS';
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
