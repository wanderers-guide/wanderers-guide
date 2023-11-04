import {
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError,
} from "@supabase/supabase-js";
import { supabase } from "../main";
import { RequestType } from "@typing/requests";

export async function makeRequest<T=Record<string, any>>(type: RequestType, body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke(type, { body });
  if (error instanceof FunctionsHttpError) {
    const errorMessage = await error.context.json();
    console.error("Request Function returned an error", errorMessage);
  } else if (error instanceof FunctionsRelayError) {
    console.error("Request Relay error:", error.message);
  } else if (error instanceof FunctionsFetchError) {
    console.error("Request Fetch error:", error.message);
  } else if (error) {
    console.error("Request Unknown error:", error);
  }
  return data ? data as T : null;
}
