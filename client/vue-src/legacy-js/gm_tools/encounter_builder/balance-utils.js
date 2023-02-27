/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function getBalanceResults(encounter) {

  let partySize = encounter.partySize;
  let partyLevel = encounter.partyLevel;

  if (encounter.campaignID != null) {
    let totalLevel = 0;
    let totalSize = 0;
    for (let member of encounter.members) {
      if (member.isCharacter) {
        totalLevel += member.level;
        totalSize++;
      }
    }
    partySize = totalSize;
    partyLevel = parseInt(totalLevel / partySize);
  }

  let xpBudget = 0;
  for (let member of encounter.members) {
    if (member.isCharacter) { continue; }
    switch (member.level - partyLevel) {
      case -4: xpBudget += 10; break;
      case -3: xpBudget += 15; break;
      case -2: xpBudget += 20; break;
      case -1: xpBudget += 30; break;
      case 0: xpBudget += 40; break;
      case 1: xpBudget += 60; break;
      case 2: xpBudget += 80; break;
      case 3: xpBudget += 120; break;
      case 4: xpBudget += 160; break;
      default:
        if (member.level > partyLevel) { // greater than +4
          xpBudget += (member.level - partyLevel) * 40;
        } else if (member.level < partyLevel) { // less than -4
          xpBudget += 0;
        }
        break;
    }
  }

  let partySizeDiff = partySize - 4;

  let difficulty;
  if (xpBudget >= 200 + (partySizeDiff * 40)) { // 200+ is impossible
    difficulty = 'IMPOSSIBLE';
  } else if (xpBudget >= 140 + (partySizeDiff * 40)) { // 140-199 is extreme
    difficulty = 'Extreme';
  } else if (xpBudget >= 100 + (partySizeDiff * 30)) { // 100-139 is severe
    difficulty = 'Severe';
  } else if (xpBudget >= 70 + (partySizeDiff * 20)) { // 70-99 is moderate
    difficulty = 'Moderate';
  } else if (xpBudget >= 50 + (partySizeDiff * 15)) { // 50-69 is low
    difficulty = 'Low';
  } else { // 0-50 is trivial
    difficulty = 'Trivial';
  }

  return {
    difficulty: difficulty,
    xp: xpBudget,
  };

}


function showBalanceResults(encounter) {

  if (encounter.campaignID != null) {

    let hasCharacters = false;
    let hasEnemies = false;
    for (let member of encounter.members) {
      if (member.isCharacter) {
        hasCharacters = true;
      } else {
        hasEnemies = true;
      }
      if (hasCharacters && hasEnemies) {
        break;
      }
    }
    return hasCharacters && hasEnemies;

  } else {

    let hasEnemies = false;
    for (let member of encounter.members) {
      if (!member.isCharacter) {
        hasEnemies = true;
        break;
      }
    }
    return hasEnemies;

  }

}