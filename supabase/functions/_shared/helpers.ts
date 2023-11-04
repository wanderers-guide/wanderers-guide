import { corsHeaders } from "./cors.ts";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { uniqueId } from "./upload-utils.ts";
import _ from "lodash";

export async function connect(
  req: Request,
  executeFn: (
    client: SupabaseClient<any, "public", any>,
    body: Record<string, any>
  ) => Promise<Record<string, any> | any[] | null>
) {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Record<string, any>;

    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      // @ts-ignore
      Deno.env.get("SUPABASE_URL") ?? "",
      // Supabase API ANON KEY - env var exported by default.
      // @ts-ignore
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const results = await executeFn(supabaseClient, body);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}



type TableName =
  | "ability_block"
  | "content_source"
  | "character"
  | "ancestry"
  | "trait"
  | "class"
  | "background"
  | "item"
  | "spell"
  | "creature"
  | "language";


interface SelectFilter {
  column: string;
  value: undefined | string | number | boolean | string[] | number[];
  options?: {
    ignoreCase?: boolean;
  };
}

export async function fetchData<T=Record<string, any>[]>(
  client: SupabaseClient<any, "public", any>,
  tableName: TableName,
  filters: SelectFilter[]
) {
  let query = client.from(tableName).select();
  for (let filter of filters) {
    if(filter.value === undefined) continue;
    if(Array.isArray(filter.value)) {
      query = query.in(filter.column, filter.value);
    } else {
      if(filter.options?.ignoreCase) {
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


export async function insertData<T=Record<string, any>>(
  client: SupabaseClient<any, "public", any>,
  tableName: TableName,
  data: Record<
    string,
    undefined | string | number | boolean | Record<string, any>
  >,
  type?: string,
  hasUUID = true
) {

  // Add upload_uuid to data, to prevent duplicate uploads
  if (hasUUID) {
    data = {
      ...data,
      upload_uuid: uniqueId(
        data.name as string,
        type ? type : tableName,
        data.content_source_id as number
      ),
    };
  }

  // Trim all string values
  for(let key in data) {
    const value = data[key];
    if (_.isString(value)) {
      data[key] = value.trim();
    }
  }

  const { data: insertedData, error } = await client
    .from(tableName)
    .insert(data)
    .select();
  if (error) {
    if (error.code === "23505" && hasUUID) {
      // Duplicate UUID, delete the old one and try again
      const { error } = await client
        .from(tableName)
        .delete()
        .eq("upload_uuid", data.upload_uuid);
      if (error) { throw error; }
      return insertData<T>(client, tableName, data, type, hasUUID);
    } else {
      throw error;
    }
  }

  return insertedData[0] as T;
}


export async function updateData(
  client: SupabaseClient<any, 'public', any>,
  tableName: TableName,
  id: number,
  data: Record<string, undefined | string | number | boolean | Record<string, any>>,
): Promise<'SUCCESS' | 'ERROR_DUPLICATE' | 'ERROR_UNKNOWN'> {

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
  delete data.content_source_id;
  delete data.upload_uuid;
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

