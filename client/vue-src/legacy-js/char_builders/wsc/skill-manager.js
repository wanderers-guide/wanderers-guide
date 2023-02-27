/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function getSkillArray() {
  let skillArray = []; // Hardcoded - Skill IDs
  skillArray.push({ id: 1, name: 'Acrobatics', ability: 'DEX' });
  skillArray.push({ id: 3, name: 'Arcana', ability: 'INT' });
  skillArray.push({ id: 4, name: 'Athletics', ability: 'STR' });
  skillArray.push({ id: 5, name: 'Crafting', ability: 'INT' });
  skillArray.push({ id: 6, name: 'Deception', ability: 'CHA' });
  skillArray.push({ id: 7, name: 'Diplomacy', ability: 'CHA' });
  skillArray.push({ id: 8, name: 'Intimidation', ability: 'CHA' });
  skillArray.push({ id: 9, name: 'Lore', ability: 'INT' });
  skillArray.push({ id: 10, name: 'Medicine', ability: 'WIS' });
  skillArray.push({ id: 11, name: 'Nature', ability: 'WIS' });
  skillArray.push({ id: 12, name: 'Occultism', ability: 'INT' });
  skillArray.push({ id: 14, name: 'Performance', ability: 'CHA' });
  skillArray.push({ id: 15, name: 'Religion', ability: 'WIS' });
  skillArray.push({ id: 16, name: 'Society', ability: 'INT' });
  skillArray.push({ id: 17, name: 'Stealth', ability: 'DEX' });
  skillArray.push({ id: 18, name: 'Survival', ability: 'WIS' });
  skillArray.push({ id: 19, name: 'Thievery', ability: 'DEX' });
  return skillArray;
}

function getSkillIDToName(skillID){
  switch(skillID) { // Hardcoded - Skill IDs
    case 1: return 'Acrobatics';
    case 3: return 'Arcana';
    case 4: return 'Athletics';
    case 5: return 'Crafting';
    case 6: return 'Deception';
    case 7: return 'Diplomacy';
    case 8: return 'Intimidation';
    case 9: return 'Lore';
    case 10: return 'Medicine';
    case 11: return 'Nature';
    case 12: return 'Occultism';
    case 14: return 'Performance';
    case 15: return 'Religion';
    case 16: return 'Society';
    case 17: return 'Stealth';
    case 18: return 'Survival';
    case 19: return 'Thievery';
    default: return 'Unknown';
  }
}

function getSkillNameAbbrev(skillName){
  skillName = skillName.toUpperCase();
  switch(skillName) {
    case 'ACROBATICS': return 'Acro.';
    case 'ARCANA': return 'Arcana';
    case 'ATHLETICS': return 'Athletics';
    case 'CRAFTING': return 'Crafting';
    case 'DECEPTION': return 'Deception';
    case 'DIPLOMACY': return 'Diplomacy';
    case 'INTIMIDATION': return 'Intim.';
    case 'LORE': return 'Lore';
    case 'MEDICINE': return 'Medicine';
    case 'NATURE': return 'Nature';
    case 'OCCULTISM': return 'Occultism';
    case 'PERFORMANCE': return 'Perform.';
    case 'RELIGION': return 'Religion';
    case 'SOCIETY': return 'Society';
    case 'STEALTH': return 'Stealth';
    case 'SURVIVAL': return 'Survival';
    case 'THIEVERY': return 'Thievery';
    default: return '';
  }
}



function updateAbilityMap(){

  let abilMap = new Map();
  abilMap.set("STR", parseInt($('#quickviewLeftDefault').attr('data-str-base')));
  abilMap.set("DEX", parseInt($('#quickviewLeftDefault').attr('data-dex-base')));
  abilMap.set("CON", parseInt($('#quickviewLeftDefault').attr('data-con-base')));
  abilMap.set("INT", parseInt($('#quickviewLeftDefault').attr('data-int-base')));
  abilMap.set("WIS", parseInt($('#quickviewLeftDefault').attr('data-wis-base')));
  abilMap.set("CHA", parseInt($('#quickviewLeftDefault').attr('data-cha-base')));

  let boostMap = new Map();
  for(const bonusData of wscChoiceStruct.BonusArray){
    if(bonusData.Bonus == "Boost") {
      let boostNums = boostMap.get(bonusData.Ability);
      if(boostNums == null){
        boostMap.set(bonusData.Ability, 1);
      } else {
        boostMap.set(bonusData.Ability, boostNums+1);
      }
    } else if(bonusData.Bonus == "Flaw") {
      let boostNums = boostMap.get(bonusData.Ability);
      if(boostNums == null){
        boostMap.set(bonusData.Ability, -1);
      } else {
        boostMap.set(bonusData.Ability, boostNums-1);
      }
    } else {
      let abilBonus = abilMap.get(bonusData.Ability);
      abilMap.set(bonusData.Ability, abilBonus+parseInt(bonusData.Bonus));
    }
  }

  for(const [ability, boostNums] of boostMap.entries()){
    let abilityScore = abilMap.get(ability);
    for (let i = 0; i < boostNums; i++) {
      if(abilityScore < 18){
        abilityScore += 2;
      } else {
        abilityScore += 1;
      }
    }
    if(boostNums < 0) {
      abilityScore = abilityScore+boostNums*2;
    }
    abilMap.set(ability, abilityScore);
  }

  g_abilMap = abilMap;

  if($('#quickviewLeftDefault').hasClass('is-active')){
    openLeftQuickView('skillsView', null);
  }

}


function updateSkillMap(refreshLists){

  let skillArray = [];
  for(const skill of getSkillArray()){
      if(skill.name != "Lore"){
          skillArray.push({ SkillName : skill.name, Skill : skill });
      }
  }

  let loreSkill = getSkillArray().find(skill => {
      return skill.name === "Lore";
  });
  for(const loreData of wscChoiceStruct.LoreArray) {
    if(loreData.value != null){
      // Remove [[CHA]] if present in lore name
      skillArray.push({ SkillName : capitalizeWords(loreData.value.replace(/\[\[(.+?)\]\]/g, ''))+" Lore", Skill : loreSkill });
    }
  }

  let skillMap = new Map();

  for(const skillData of skillArray){
      let bestProf = 'U';
      let numUps = 0;
      for(const profData of wscChoiceStruct.ProfArray){
          if(profData.For == "Skill" && profData.To != null){
              let tempSkillName = skillData.SkillName.toUpperCase();
              tempSkillName = tempSkillName.replace(/_|\s+/g,"");
              let tempProfTo = profData.To.toUpperCase();
              tempProfTo = tempProfTo.replace(/_|\s+/g,"");
              if(tempProfTo === tempSkillName) {
                  numUps += getUpAmt(profData.Prof);
                  bestProf = getBetterProf(bestProf, profData.Prof);
              }
          }
      }

      skillMap.set(skillData.SkillName, {
          Name : skillData.SkillName,
          NumUps : profToNumUp(bestProf, true)+numUps,
          Skill : skillData.Skill
      });
  }

  g_skillMap = skillMap;

  if(refreshLists){
    // Update Skill Lists
    $('.selectIncrease').each(function(){
        let selectIncreaseID = $(this).attr('id');
        let srcStruct = {
            sourceType: $(this).attr('data-sourceType'),
            sourceLevel: $(this).attr('data-sourceLevel'),
            sourceCode: $(this).attr('data-sourceCode'),
            sourceCodeSNum: $(this).attr('data-sourceCodeSNum'),
        };
        let profType = $(this).attr('data-profType');
        let optionals = JSON.parse($(this).attr('data-optionals').replace(/`/g, '"'));
        populateSkillLists(selectIncreaseID, srcStruct, profType, optionals);
    });
  }

  if($('#quickviewLeftDefault').hasClass('is-active')){
    openLeftQuickView('skillsView', null);
  }

}
