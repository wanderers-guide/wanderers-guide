export type RequestType =
  | 'upload-public-file'
  | 'handle-patreon-redirect'
  | 'search-data'
  | 'gm-add-to-group'
  | 'gm-remove-from-group'
  | 'gm-regenerate-code'
  | 'gm-users-in-group'
  | 'get-user'
  | 'update-user'
  | 'open-ai-request'
  | 'find-content-source'
  | 'create-content-source'
  | 'delete-content'
  | 'delete-user'
  | 'find-trait'
  | 'create-trait'
  | 'create-ability-block'
  | 'find-ability-block'
  | 'create-ancestry'
  | 'find-ancestry'
  | 'create-background'
  | 'find-background'
  | 'create-class'
  | 'find-class'
  | 'create-archetype'
  | 'find-archetype'
  | 'create-versatile-heritage'
  | 'find-versatile-heritage'
  | 'create-item'
  | 'find-item'
  | 'create-language'
  | 'find-language'
  | 'create-creature'
  | 'find-creature'
  | 'create-spell'
  | 'find-spell'
  | 'create-character'
  | 'find-character'
  | 'update-character'
  | 'create-content-update'
  | 'find-content-update'
  | 'get-content-source-stats'
  | 'find-encounter'
  | 'create-encounter'
  | 'find-campaign'
  | 'create-campaign'
  | 'reset-campaign-key'
  | 'remove-from-campaign'
  | 'vector-db-populate-collection'
  | 'vector-db-query-collection';

// All requests follow JSend specification (https://github.com/omniti-labs/jsend) //
export type JSendResponse = JSendResponseSuccess | JSendResponseFail | JSendResponseError;
interface JSendResponseSuccess {
  status: 'success';
  data: NonNullable<any>;
}
interface JSendResponseFail {
  status: 'fail';
  data: NonNullable<any>;
}
interface JSendResponseError {
  status: 'error';
  message: string;
  data?: NonNullable<any>;
  code?: number;
}
