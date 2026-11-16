export type ProficiencyType = 'U' | 'T' | 'E' | 'M' | 'L';

export type AttributeValue = {
  value: number;
  partial?: boolean | null;
};

export type ProficiencyValue = {
  value: ProficiencyType;
  increases?: number;
  attribute?: string;
};

export type VariableValue =
  | number
  | string
  | boolean
  | ProficiencyValue
  | AttributeValue
  | string[];

export type Variable =
  | {
      name: string;
      type: 'num';
      value: number;
    }
  | {
      name: string;
      type: 'str';
      value: string;
    }
  | {
      name: string;
      type: 'bool';
      value: boolean;
    }
  | {
      name: string;
      type: 'prof';
      value: ProficiencyValue;
    }
  | {
      name: string;
      type: 'attr';
      value: AttributeValue;
    }
  | {
      name: string;
      type: 'list-str';
      value: string[];
    };
