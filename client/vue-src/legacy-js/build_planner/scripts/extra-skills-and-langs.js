/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

const extraSkillsAndLangs_isDebug = false;

// Process Extra Ancestry Langs and Class Skill Trainings (based on Int mod)
let extraSkillsAndLangs_isInCooldown = false;
let extraSkillsAndLangs_isInterrupted = false;

function processExtraSkillsAndLangs(){

  if(extraSkillsAndLangs_isDebug) {console.log('ExS&L - Called');}

  if(!extraSkillsAndLangs_isInCooldown){

    if(extraSkillsAndLangs_isDebug) {console.log('ExS&L - Entered Cooldown');}

    extraSkillsAndLangs_isInCooldown = true;
    setTimeout(() => { extraSkillsAndLangs_finishCooldown(); }, 1000);

  } else {

    if(extraSkillsAndLangs_isDebug) {console.log('ExS&L - Cooldown Interrupted, marked');}

    extraSkillsAndLangs_isInterrupted = true;

  }

}

function extraSkillsAndLangs_finishCooldown(){
  extraSkillsAndLangs_isInCooldown = false;

  if(extraSkillsAndLangs_isDebug) {console.log('ExS&L - Finish Cooldown');}

  if(extraSkillsAndLangs_isInterrupted){

    if(extraSkillsAndLangs_isDebug) {console.log('ExS&L - Was Interrupted, restarting');}

    extraSkillsAndLangs_isInterrupted = false;
    processExtraSkillsAndLangs();

  } else {

    extraSkillsAndLangs_execute();

  }

}

function extraSkillsAndLangs_execute(){

  if(extraSkillsAndLangs_isDebug) {console.log('ExS&L - EXECUTED');}

  processMoreAncestryLangs(getCharAncestry(), 'ancestry-initial-stats-code-languages-extra');
  processMoreClassSkills(getCharClass(), 'class-feature-initial-stats-code-skills-extra');

}