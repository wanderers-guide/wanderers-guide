import { ActionCost } from "@typing/content";
import { e } from "mathjs";


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
  } else if (cast === '1 or 2') {
    return 'ONE-TO-TWO-ACTIONS';
  } else if (cast === '2 or 3') {
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

