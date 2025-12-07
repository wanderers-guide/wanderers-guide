import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import { supabase } from '../main';
import { JSendResponse, RequestType } from '@typing/requests';
import { displayError, throwError } from '@utils/notifications';

const MAX_ATTEMPTS = 3;
export async function makeRequest<T = Record<string, any>>(
  type: RequestType,
  body: Record<string, any>,
  notifyFailure = true,
  attempt = 1
): Promise<T | null> {
  const { data, error } = await invokeWithRetries(type, body, MAX_ATTEMPTS);
  if (error instanceof FunctionsHttpError) {
    const errorMessage = await error.context.json();
    console.error('Request Function returned an error', errorMessage);
  } else if (error instanceof FunctionsRelayError) {
    console.error('Request Relay error:', error.message);
  } else if (error instanceof FunctionsFetchError) {
    console.error('Request Fetch error:', error.message);
    if (attempt <= MAX_ATTEMPTS) {
      return await makeRequest<T>(type, body, notifyFailure, attempt + 1);
    }
  } else if (error) {
    console.error('Request Unknown error:', error);
  }
  if (!data) {
    return null;
  }

  const response = data as JSendResponse;
  if (response.status === 'error') {
    if (notifyFailure) {
      throwError(response.message);
    }
    return null;
  } else if (response.status === 'fail') {
    if (notifyFailure) {
      displayError('Failed to make request');
    }
    return null;
  } else {
    return response.data as T;
  }
}

async function invokeWithTimeout(
  type: RequestType,
  body: Record<string, any>,
  timeout = 5000
): Promise<{ data: any; error: any }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);

    supabase.functions
      .invoke(type, { body })
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function invokeWithRetries(
  type: RequestType,
  body: Record<string, any>,
  retries = 3,
  timeout = 5000
): Promise<{ data: any; error: any }> {
  for (let i = 0; i < retries; i++) {
    try {
      return await invokeWithTimeout(type, body, timeout);
    } catch (e: any) {
      console.warn(`Attempt ${i + 1} failed: ${e.message}`);
    }
  }

  // Final fallback without timeout
  try {
    return await supabase.functions.invoke(type, { body });
  } catch (e) {
    return { data: null, error: e };
  }
}
