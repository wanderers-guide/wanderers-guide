export type RequestType =
  | 'get-sheet-content'
  | 'upload-public-file'
  | 'find-content-source'
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
  | 'create-item'
  | 'find-item'
  | 'create-language'
  | 'find-language'
  | 'create-creature'
  | 'find-creature'
  | 'create-spell'
  | 'find-spell'
  | 'create-character'
  | 'find-characters'
  | 'update-character'

  
export type UpdateResponse = {
  success: boolean;
  status: string;
};
