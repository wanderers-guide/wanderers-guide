import { AbilityBlock, SenseWithRange } from '@schemas/content';
import { StoreID, VariableListStr } from '@schemas/variables';
import { getVariable } from '@variables/variable-manager';
import { labelToVariable } from '@variables/variable-utils';
import { values } from 'lodash-es';
import { toLabel } from './strings';

export function displaySense(sense: SenseWithRange) {
  return `${sense.senseName.replace('Low Light', 'Low-Light')} ${sense.range ? `(${sense.range} ft.)` : ''}`;
}

export function displayPrimaryVisionSense(id: StoreID) {
  const senses = compactSenses(getVariable<VariableListStr>(id, 'SENSES_PRECISE')?.value ?? []);
  return senses.length > 0 ? toLabel(senses[0].replace('_', ' ')) : '';
}

// Tracks //
const VISION_TRACK = [
  convertToSenseID('Normal Vision'),
  convertToSenseID('Low-Light Vision'),
  convertToSenseID('Darkvision'),
  convertToSenseID('Greater Darkvision'),
];
const HEARING_TRACK = [convertToSenseID('Hearing'), convertToSenseID('Echolocation')];
const SMELL_TRACK = [convertToSenseID('Smell'), convertToSenseID('Scent')];

export function compactSenses(senses: string[]): string[] {
  const highestPrecedenceSenses: { [key: string]: string } = {};

  senses.forEach((sense) => {
    const varName = convertToSenseID(sense);

    // Determine the track of the current sense
    let currentTrack;
    if (VISION_TRACK.includes(varName)) {
      currentTrack = VISION_TRACK;
    } else if (HEARING_TRACK.includes(varName)) {
      currentTrack = HEARING_TRACK;
    } else if (SMELL_TRACK.includes(varName)) {
      currentTrack = SMELL_TRACK;
    } else {
      // On its own track
      currentTrack = [varName];
    }

    // Proceed if the sense belongs to a known track
    if (currentTrack) {
      const currentPrecedence = currentTrack.indexOf(varName);
      const highestPrecedenceSense = highestPrecedenceSenses[currentTrack[0]];

      // If no sense has been recorded for this track or if the current sense has higher precedence, update
      if (
        !highestPrecedenceSense ||
        currentPrecedence > currentTrack.indexOf(convertToSenseID(highestPrecedenceSense))
      ) {
        highestPrecedenceSenses[currentTrack[0]] = sense;
      }
    }
  });

  return values(highestPrecedenceSenses);
}

function convertToSenseID(sense: string) {
  return labelToVariable(sense.split(' (')[0]);
}

export function compactSensesWithRange(senses: SenseWithRange[]): SenseWithRange[] {
  const compact = compactSenses(senses.map((sense) => sense.senseName));
  return senses.filter((sense) => compact.includes(sense.senseName));
}

function matchesSensePrecision(sense: AbilityBlock, precision: SenseWithRange['type']) {
  if (!precision) return true;
  const declarations = new Set<string>();
  for (const operation of sense.operations ?? []) {
    if (operation.type !== 'adjValue' && operation.type !== 'setValue') continue;
    const declared = /^SENSES_(PRECISE|IMPRECISE|VAGUE)$/.exec(operation.data.variable)?.[1];
    if (declared) declarations.add(declared.toLowerCase());
  }
  const qualifier = /\((precise|imprecise|vague)\b/i.exec(sense.name)?.[1]?.toLowerCase();
  if (qualifier) declarations.add(qualifier);
  return declarations.size === 0 || (declarations.size === 1 && declarations.has(precision));
}

export function attemptToFindSense(
  name: string,
  range: string,
  allSenses: AbilityBlock[],
  precision?: SenseWithRange['type']
): SenseWithRange {
  const compatible = allSenses.filter((sense) => matchesSensePrecision(sense, precision));
  let foundSense = compatible.find((sense) => labelToVariable(sense.name) === labelToVariable(name));
  if (!foundSense) {
    for (const sense of compatible) {
      if (labelToVariable(sense.name).startsWith(labelToVariable(name))) {
        if (range) {
          const senseParts = sense.name.split(' (');
          if (senseParts.length > 1 && senseParts[1].includes(range)) {
            foundSense = sense;
            break;
          }
        } else {
          foundSense = sense;
          break;
        }
      }
    }
  }

  return {
    sense: foundSense,
    senseName: toLabel(name),
    range: range,
  };
}
