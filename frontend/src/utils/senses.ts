import { AbilityBlock, SenseWithRange } from '@typing/content';
import { StoreID, VariableListStr } from '@typing/variables';
import { getVariable } from '@variables/variable-manager';
import { labelToVariable } from '@variables/variable-utils';
import _ from 'lodash-es';
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

  return _.values(highestPrecedenceSenses);
}

function convertToSenseID(sense: string) {
  return labelToVariable(sense.split(' (')[0]);
}

export function compactSensesWithRange(senses: SenseWithRange[]): SenseWithRange[] {
  const compact = compactSenses(senses.map((sense) => sense.senseName));
  return senses.filter((sense) => compact.includes(sense.senseName));
}

export function attemptToFindSense(name: string, range: string, allSenses: AbilityBlock[]): SenseWithRange {
  let foundSense = allSenses.find((sense) => labelToVariable(sense.name) === labelToVariable(name));
  if (!foundSense) {
    for (const sense of allSenses) {
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
