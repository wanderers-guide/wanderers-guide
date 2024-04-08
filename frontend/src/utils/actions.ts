import { ActionCost } from '@typing/content';

export function convertCastToActionCost(cast: string): ActionCost | string {
  if (cast === '1') {
    return 'ONE-ACTION';
  } else if (cast === '2') {
    return 'TWO-ACTIONS';
  } else if (cast === '3') {
    return 'THREE-ACTIONS';
  } else if (cast === 'reaction') {
    return 'REACTION';
  } else if (cast === 'free') {
    return 'FREE-ACTION';
  } else if (cast === '1 or 2' || cast === '1 to 2') {
    return 'ONE-TO-TWO-ACTIONS';
  } else if (cast === '2 or 3' || cast === '2 to 3') {
    return 'TWO-TO-THREE-ACTIONS';
  } else if (cast === '1 to 3') {
    return 'ONE-TO-THREE-ACTIONS';
  } else if (cast === '2 to 2 rounds') {
    return 'TWO-TO-TWO-ROUNDS';
  } else if (cast === '2 to 3 rounds') {
    return 'TWO-TO-THREE-ROUNDS';
  } else if (cast === '3 to 2 rounds') {
    return 'THREE-TO-TWO-ROUNDS';
  } else if (cast === '3 to 3 rounds') {
    return 'THREE-TO-THREE-ROUNDS';
  } else {
    return cast;
  }
}

export function actionCostToLabel(cost: ActionCost | string, alt?: boolean): string {
  let result = '';
  switch (cost) {
    case 'ONE-ACTION':
      result = '◆';
      break;
    case 'TWO-ACTIONS':
      result = '◆◆';
      break;
    case 'THREE-ACTIONS':
      result = '◆◆◆';
      break;
    case 'REACTION':
      result = '⤾';
      break;
    case 'FREE-ACTION':
      result = '◇';
      break;
    case 'ONE-TO-TWO-ACTIONS':
      result = '◆ - ◆◆';
      break;
    case 'TWO-TO-THREE-ACTIONS':
      result = '◆◆ - ◆◆◆';
      break;
    case 'ONE-TO-THREE-ACTIONS':
      result = '◆ - ◆◆◆';
      break;
    case 'TWO-TO-TWO-ROUNDS':
      result = '◆◆ - 2 rounds';
      break;
    case 'TWO-TO-THREE-ROUNDS':
      result = '◆◆ - 3 rounds';
      break;
    case 'THREE-TO-TWO-ROUNDS':
      result = '◆◆◆ - 2 rounds';
      break;
    case 'THREE-TO-THREE-ROUNDS':
      result = '◆◆◆ - 3 rounds';
      break;
    default:
      result = cost ?? '';
      break;
  }
  if (alt) {
    result = result.replaceAll('◆', '>');
    result = result.replaceAll('◇', 'free');
    result = result.replaceAll('⤾', 'reaction');
  }
  return result;
}

export function findActions(text: string): ActionCost[] {
  const regex = /cost="([^"]*)"/g;
  return Array.from(text.matchAll(regex), (m) => m[1]) as ActionCost[];
}
