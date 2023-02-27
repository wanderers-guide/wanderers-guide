/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function preReqGetIconTrue(){
  return '<span class="icon is-small has-text-info"><i class="fas prereq-icon fa-check"></i></span>';
}
function preReqGetIconFalse(){
  return '<span class="icon is-small has-text-danger"><i class="fas prereq-icon fa-times"></i></span>';
}
function preReqGetIconUnknown(){
  return '<span class="icon is-small has-text-warning"><i class="fas prereq-icon fa-question"></i></span>';
}

function preReqFeatLink(featLinkClass, inFeatName){
  inFeatName = inFeatName.replace(/’/g,'\'').toUpperCase();
  for(const [featID, featStruct] of g_featMap.entries()){
    let featName = featStruct.Feat.name.toUpperCase();
    if(inFeatName === featName && featStruct.Feat.isArchived == 0) {
      setTimeout(function() {
        $('.'+featLinkClass).off('click');
        $('.'+featLinkClass).click(function(){
            openQuickView('featView', {
                Feat : featStruct.Feat,
                Tags : featStruct.Tags,
                _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
            }, $('#quickviewDefault').hasClass('is-active'));
        });
      }, 100);
    }
  }
}

function preReqResultArray(feat){
  let resultArray = [];

  let prereqParts = [];
  let prereqSemicolonParts = feat.prerequisites.replace(/’/g,"'").split('; ');
  for(let prereq of prereqSemicolonParts){
    if(prereq.includes(', or ') || prereq.includes(', and ')){
      prereqParts.push(prereq);
    } else {
      let prereqCommaParts = prereq.split(', ');
      prereqParts = prereqParts.concat(prereqCommaParts);
    }
  }

  for(let prereq of prereqParts){
    if(prereq == '') { continue; }
    let uPreReq = prereq.toUpperCase();

    let result;
    result = preReqCheckProfs(uPreReq);
    if(result != null) { resultArray.push({Type: 'SKILL-PROF', Result: result, PreReqPart: prereq}); continue; }

    result = prereqListChecking('ABILITY-SCORE', uPreReq, prereq);
    if(result != null) { resultArray.push({Type: 'ABILITY-SCORE', Result: result, PreReqPart: prereq}); continue; }

    result = preReqCheckHeritages(uPreReq, prereq);
    if(result != null) { resultArray.push({Type: 'HERITAGE', Result: result, PreReqPart: prereq}); continue; }

    result = prereqListChecking('FEAT', uPreReq, prereq);
    if(result != null) { resultArray.push({Type: 'FEAT', Result: result, PreReqPart: prereq}); continue; }

    result = prereqListChecking('CLASS-FEATURE', uPreReq, prereq);
    if(result != null) { resultArray.push({Type: 'CLASS-FEATURE', Result: result, PreReqPart: prereq}); continue; }

    resultArray.push({Type: 'UNKNOWN', Result: 'UNKNOWN', PreReqPart: prereq});
  }
  return resultArray;
}

function meetsPrereqs(feat){
  // Returns TRUE, FALSE, UNKNOWN, and null
  if(feat.prerequisites == null) { return null; }

  let resultArray = preReqResultArray(feat);

  let totalResult = 'TRUE';
  for(let resultData of resultArray){
    if(resultData.Result == 'TRUE') { continue; }
    if(resultData.Result == 'FALSE') { return 'FALSE'; }
    if(resultData.Result == 'UNKNOWN') {  totalResult = 'UNKNOWN'; continue; }
  }
  return totalResult;
}

function prereqToValue(prereq){
  if(prereq == 'TRUE'){ return 0; }
  if(prereq == 'UNKNOWN'){ return 0; }
  if(prereq == 'FALSE'){ return -1; }
  return 0;// No prereq
}

// Prereq Ability Score Checking //
function preReqCheckAbilityScores(prereq){
  let rStr = prereq.match(/STRENGTH (\d+)/);
  if(rStr != null){
    return preReqConfirmAbilityScore('STR', rStr[1]);
  }
  let rDex = prereq.match(/DEXTERITY (\d+)/);
  if(rDex != null){
    return preReqConfirmAbilityScore('DEX', rDex[1]);
  }
  let rCon = prereq.match(/CONSTITUTION (\d+)/);
  if(rCon != null){
    return preReqConfirmAbilityScore('CON', rCon[1]);
  }
  let rInt = prereq.match(/INTELLIGENCE (\d+)/);
  if(rInt != null){
    return preReqConfirmAbilityScore('INT', rInt[1]);
  }
  let rWis = prereq.match(/WISDOM (\d+)/);
  if(rWis != null){
    return preReqConfirmAbilityScore('WIS', rWis[1]);
  }
  let rCha = prereq.match(/CHARISMA (\d+)/);
  if(rCha != null){
    return preReqConfirmAbilityScore('CHA', rCha[1]);
  }
  return null;
}

function preReqConfirmAbilityScore(scoreType, amt){
  let scoreAmt = g_abilMap.get(scoreType);
  if(scoreAmt != null){
    return scoreAmt >= amt ? 'TRUE' : 'FALSE';
  } else {
    return 'UNKNOWN';
  }
}


// Prereq List Middleware //
function prereqListChecking(type, prereq, oData) {

  // For cases like the feat: 'Come and Get Me'
  if(type == 'FEAT'){
    let preFeatResult = preReqCheckFeats(prereq, oData);
    if(preFeatResult != null) { return preFeatResult; }
  }

  let orCheck = false;
  let listPrereqs;
  if(prereq.includes(' OR ')){
    listPrereqs = prereq.split(/, OR | OR |, /);
    orCheck = true;
  } else if(prereq.includes(' AND ')){
    listPrereqs = prereq.split(/, AND | AND |, /);
  } else {
    listPrereqs = [prereq];
  }

  let totalResult = 'TRUE';
  for(let subPre of listPrereqs){
    let result;
    if(type == 'PROF'){
      result = preReqConfirmSkillProf(subPre, oData);
    } else if(type == 'FEAT'){
      result = preReqCheckFeats(subPre, oData);
    } else if(type == 'CLASS-FEATURE'){
      result = preReqCheckClassAbilities(subPre, oData);
    } else if(type == 'HERITAGE'){
      result = preReqConfirmHeritage(subPre);
    } else if (type == 'ABILITY-SCORE'){
      result = preReqCheckAbilityScores(subPre);
    } else {
      result = 'FALSE';
    }
    if(result == null) { return null; }
    if(orCheck) {
      if(result == 'TRUE'){
        return 'TRUE';
      } else if(result == 'FALSE'){
        totalResult = 'FALSE';
      } else if(result == 'UNKNOWN'){
        if(totalResult != 'FALSE') {
          totalResult = 'UNKNOWN';
        }
      }
    } else {
      if(result == 'FALSE'){
        totalResult = 'FALSE';
      } else if(result == 'UNKNOWN'){
        return 'UNKNOWN';
      }
    }
  }
  return totalResult;
}


// Prereq Heritage Checking //
function preReqCheckHeritages(prereq, normalPreReq){
  if(prereq.toLowerCase() === normalPreReq){
    let rHeritage = prereq.match(/(.+) HERITAGE$/);
    if(rHeritage != null){
      return prereqListChecking('HERITAGE', rHeritage[1], null);
    } else {
      return null;
    }
  } else {
    return null;
  }
}

function preReqConfirmHeritage(heritageName){
  if(wscChoiceStruct.Heritage != null && heritageName === wscChoiceStruct.Heritage.name.toUpperCase()){
    return 'TRUE';
  } else {
    return 'FALSE';
  }
}

// Prereq Profs Checking //
function preReqCheckProfs(prereq){
  let rTrained = prereq.match(/TRAINED IN (.+)/);
  if(rTrained != null){
    return prereqListChecking('PROF', rTrained[1], 1);
  }
  let rExpert = prereq.match(/EXPERT IN (.+)/);
  if(rExpert != null){
    return prereqListChecking('PROF', rExpert[1], 2);
  }
  let rMaster = prereq.match(/MASTER IN (.+)/);
  if(rMaster != null){
    return prereqListChecking('PROF', rMaster[1], 3);
  }
  let rLegendary = prereq.match(/LEGENDARY IN (.+)/);
  if(rLegendary != null){
    return prereqListChecking('PROF', rLegendary[1], 4);
  }
  return null;
}

function preReqConfirmSkillProf(skillName, numUps){
  let customChecksResult = checkCustomSkillProfs(skillName, numUps);
  if(customChecksResult != null) { return customChecksResult; }
  let skillData = g_skillMap.get(capitalizeWords(skillName));
  if(skillData != null){
    return skillData.NumUps >= numUps ? 'TRUE' : 'FALSE';
  } else {
    if(skillName.endsWith(' LORE')){ return 'FALSE'; }
    return 'UNKNOWN';
  }
}

function checkCustomSkillProfs(name, numUps){

  if(name === 'LORE'){
    for(const [skillName, skillData] of g_skillMap.entries()){
      if(skillData.Name.includes(' Lore') && skillData.NumUps >= numUps){
        return 'TRUE';
      }
    }
    return 'FALSE';
  }

  if(name === 'AT LEAST ONE SKILL'){
    for(const [skillName, skillData] of g_skillMap.entries()){
      if(skillData.NumUps >= numUps){
        return 'TRUE';
      }
    }
    return 'FALSE';
  }

  if(name === 'A SKILL WITH THE RECALL KNOWLEDGE ACTION' || name === 'A RECALL KNOWLEDGE SKILL'){
    for(const [skillName, skillData] of g_skillMap.entries()){
      if(skillData.NumUps >= numUps){
        if(skillData.Name.includes(' Lore') ||
            skillData.Name == 'Arcana' ||
            skillData.Name == 'Crafting' ||
            skillData.Name == 'Medicine' ||
            skillData.Name == 'Nature' ||
            skillData.Name == 'Occultism' ||
            skillData.Name == 'Religion' || 
            skillData.Name == 'Society'){
          return 'TRUE';
        }
      }
    }
    return 'FALSE';
  }

  if(name === 'PERCEPTION'){
    let percepData = getFinalProf(g_profMap.get('Perception'));
    if(percepData != null && percepData.NumUps >= numUps){
      return 'TRUE';
    }
    return 'FALSE';
  }

  return null;

}



// Prereq Feats Checking //
function preReqCheckFeats(prereq, normalPreReq){
  // Feats aren't all lowercase, that'd likely be a class feature
  if(normalPreReq == normalPreReq.toLowerCase()) { return null; }
  
  for(let featData of wscChoiceStruct.FeatArray){
    if(featData.value != null){
      if(featData.value.name.toUpperCase() === prereq){
        return 'TRUE';
      }
    }
  }
  for(const [featID, featStruct] of g_featMap.entries()){
    if(featStruct.Feat != null && featStruct.Feat.isArchived == 0){
      if(featStruct.Feat.name.toUpperCase() === prereq){
        return 'FALSE';
      }
    }
  }
  return null;
}


// Prereq Class Feature Checking //
function preReqCheckClassAbilities(prereq, normalPreReq){
  if(g_expr_classAbilityArray != null &&
        wscChoiceStruct.ClassDetails != null &&
        wscChoiceStruct.ClassDetails.Abilities != null){
    if(prereq.toLowerCase() === normalPreReq){

      for(let abilityName of g_expr_classAbilityArray){
        let abilName = abilityName.toLowerCase();
        if(normalPreReq === abilName){ return 'TRUE'; }

        if(normalPreReq.endsWith(' cause')){
          if(abilName.startsWith(normalPreReq.replace(' cause', ''))){
            return 'TRUE';
          }
        }
        if(normalPreReq.startsWith('divine ally (')){
          if(normalPreReq == 'divine ally ('+abilName+')'){
            return 'TRUE';
          }
        }

        if(normalPreReq.includes(abilName) || abilName.includes(normalPreReq)){

          // For cases like ANTIPALADIN and PALADIN
          if(normalPreReq.includes(abilName)){
            let preReqWithoutAbilName = normalPreReq.replace(abilName,':::');
            let lastChar = preReqWithoutAbilName.substring(0,preReqWithoutAbilName.indexOf(':::')).slice(-1);
            if(!(/\s|(^$)/g.test(lastChar))){// Is whitespace or ''
              return 'FALSE';
            }
          }

          let ability = prereqFindClassAbility(abilityName);
          if(ability != null){
            if(ability.selectType != 'SELECTOR'){
              // For long prereqs that go into more detail, the answer is most likely unknown.
              if(abilName.split(' ').length+3 >= normalPreReq.split(' ').length){
                return 'TRUE';
              } else {
                return 'UNKNOWN';
              }
            }
          }
        }
      }

      for(let ability of wscChoiceStruct.ClassDetails.Abilities){
        let abilName = ability.name.toLowerCase().split('(')[0];
        if(normalPreReq === abilName){ return 'FALSE'; }
        if(normalPreReq.includes(abilName) || abilName.includes(normalPreReq)){
          if(ability.selectType != 'SELECTOR'){
            // For long prereqs that go into more detail, the answer is most likely unknown.
            if(abilName.split(' ').length+3 >= normalPreReq.split(' ').length){
              return 'FALSE';
            } else {
              return 'UNKNOWN';
            }
          }
        }
      }

      return 'UNKNOWN';

    } else {
      return null;
    }
  } else {
    return null;
  }
}

function prereqFindClassAbility(abilityName){
  abilityName = abilityName.toLowerCase();
  for(let ability of wscChoiceStruct.ClassDetails.Abilities){
    if(abilityName === ability.name.toLowerCase()) {
      return ability;
    }
  }
  for(let ability of wscChoiceStruct.ExtraClassFeaturesArray){
    if(abilityName === ability.value.name.toLowerCase()) {
      return ability;
    }
  }
  return null;
}