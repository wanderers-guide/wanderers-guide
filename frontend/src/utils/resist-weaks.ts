import { StoreID } from '@typing/variables';
import { compileExpressions } from '@variables/variable-utils';
import _ from 'lodash-es';

export function displayResistWeak(id: StoreID, text: string) {
  return _.startCase((compileExpressions(id, text.replace(',', ' '), true)?.replace(' 0', ' 1') ?? '').toLowerCase());
}
