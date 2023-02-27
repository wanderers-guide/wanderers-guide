/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function addGradualAbilityBoostsVariant(classStruct){

  let newAbilities = [];
  for(let ability of classStruct.Abilities){
    if (ability.code != null && ability.code.startsWith('GIVE-ABILITY-BOOST-MULTIPLE=4') && (ability.level == 5 || ability.level == 10 || ability.level == 15 || ability.level == 20)){

      let extraStatement = null;
      if(ability.code.includes('\n')){
        let statements = ability.code.split(/\n/);
        if(statements.length == 5 && statements[1] == statements[2] && statements[1] == statements[3] && statements[1] == statements[4]){
          extraStatement = statements[1];
        }
      }

      newAbilities.push(getGAB_AbilityBoost(ability.level, extraStatement));
      newAbilities.push(getGAB_AbilityBoost(ability.level-1, extraStatement));
      newAbilities.push(getGAB_AbilityBoost(ability.level-2, extraStatement));
      newAbilities.push(getGAB_AbilityBoost(ability.level-3, extraStatement));

    } else {
      newAbilities.push(ability);
    }
  }

  // Set and re-sort the abilities array...
  classStruct.Abilities = newAbilities.sort(
    function(a, b) {
        if (a.level === b.level) {
            // Name is only important when levels are the same
            return a.name > b.name ? 1 : -1;
        }
        return a.level - b.level;
    }
  );

  return classStruct;
}

function getGAB_AbilityBoost(lvl, extraStatement){
  let setText = '';
  if(lvl > 1 && lvl <= 5) {
    setText = '2nd-5th level boosts';
  } else if(lvl > 6 && lvl <= 10) {
    setText = '7th-10th level boosts';
  } else if(lvl > 11 && lvl <= 15) {
    setText = '12th-15th level boosts';
  } else if(lvl > 16 && lvl <= 20) {
    setText = '17th-20th level boosts';
  }
  return {
    id: -3000+(-1*lvl),
    name: "Ability Boosts",
    level: lvl,
    description: `
      You gain a single boost in an ability score. This boost increases an ability score by 2, or by 1 if it's already 18 or above.
      \n__You can't choose the same ability score more than once per set (${setText}).__
    `,
    code: `GIVE-ABILITY-BOOST-SINGLE=ALL${(extraStatement == null) ? '' : '\n'+extraStatement}`,
    contentSrc: "CRB",
    displayInSheet: 0,
    selectType: "NONE",
    selectOptionFor: null,
    isArchived: 0,
  };
}