import {
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError,
} from "@supabase/supabase-js";
import { supabase } from "../main";
import { JSendResponse, RequestType } from "@typing/requests";
import { displayError, throwError } from "@utils/notifications";

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
  if(!data) { return null; }

  const response = data as JSendResponse;
  if(response.status === "error") {
    throwError(response.message);
    return null;
  } else if (response.status === 'fail') {
    displayError('Failed to make request');
    return null;
  } else {
    return response.data as T;
  }
}
