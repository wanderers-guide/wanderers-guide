/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

/*

  outputStruct: {
    keyAbility: {
      displayID,
      codeID,
    },
    hitPoints: {
      displayID,
      codeID,
    },

    perception: {
      displayID,
      codeID,
    },
    skills: {
      displayID,
      codeID,
    },
    savingThrows: {
      displayID,
      codeID,
    },
    classDC: {
      displayID,
      codeID,
    },
    attacks: {
      displayID,
      codeID,
    },
    defenses: {
      displayID,
      codeID,
    },
  }

*/

const PROCESS_CLASS_STATS_TYPE = {
  DISPLAY: 'DISPLAY',
  RUN_CODE: 'RUN_CODE',
  BOTH: 'BOTH',
};

function processClassStats(classData, outputStruct, processType){
  const isBoth = (processType == PROCESS_CLASS_STATS_TYPE.BOTH);

  let statInitCount = 0;
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Key Ability ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  if(processType == PROCESS_CLASS_STATS_TYPE.RUN_CODE || isBoth){
    $('#'+outputStruct.keyAbility.codeID).html(``);
  }
  
  if(classData.keyAbility == 'OTHER'){

    if(processType == PROCESS_CLASS_STATS_TYPE.DISPLAY || isBoth){
      $('#'+outputStruct.keyAbility.displayID).html(`
        <p class="is-size-6">
          Other
        </p>
      `);
    }

  } else if(classData.keyAbility.includes(' or ')) {

    let keyAbilityOptionArray = classData.keyAbility.split(' or ');

    if(processType == PROCESS_CLASS_STATS_TYPE.RUN_CODE || isBoth){
      processCode(
        `SET-KEY-ABILITY=${shortenAbilityType(keyAbilityOptionArray[0])},${shortenAbilityType(keyAbilityOptionArray[1])}`,
        {
          sourceType: 'class',
          sourceLevel: 1,
          sourceCode: 'keyAbility',
          sourceCodeSNum: 'a'
        },
        outputStruct.keyAbility.codeID,
        {source: 'Class', sourceName: 'Initial Prof (Class)'});

      if(isBoth){
        $('#'+outputStruct.keyAbility.displayID).html(`
          <p class="is-size-6">
            ${classData.keyAbility}
          </p>
        `);
      }

    } else {

      $('#'+outputStruct.keyAbility.displayID).html(`
        <p class="is-size-6">
          ${classData.keyAbility}
        </p>
      `);

    }

  } else {
    
    if(processType == PROCESS_CLASS_STATS_TYPE.DISPLAY || isBoth){
      $('#'+outputStruct.keyAbility.displayID).html(`
        <p class="is-size-6">
          ${classData.keyAbility}
        </p>
      `);
    }

    if(processType == PROCESS_CLASS_STATS_TYPE.RUN_CODE || isBoth){
      processCode(
        `SET-KEY-ABILITY=${shortenAbilityType(classData.keyAbility)}`,
        {
          sourceType: 'class',
          sourceLevel: 1,
          sourceCode: 'keyAbility',
          sourceCodeSNum: 'a'
        },
        outputStruct.keyAbility.codeID,
        {source: 'Class', sourceName: 'Initial Prof (Class)'});
    }

  }


  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Hit Points ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  if(processType == PROCESS_CLASS_STATS_TYPE.DISPLAY || isBoth){
    $('#'+outputStruct.hitPoints.displayID).html(`
      <p class="is-inline is-size-6">
        ${classData.hitPoints}
      </p>
    `);
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Perception ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  if(processType == PROCESS_CLASS_STATS_TYPE.DISPLAY || isBoth){
    $('#'+outputStruct.perception.displayID).html(`
      <ul>
        <li class="is-size-7">
          <span class="has-txt-value-string is-italic">${profToWord(classData.tPerception)}</span>
        </li>
      </ul>
    `);
  }

  if(processType == PROCESS_CLASS_STATS_TYPE.RUN_CODE || isBoth){
    processCode(
      `GIVE-PROF-IN=${VARIABLE.PERCEPTION}:${classData.tPerception}`,
      {
        sourceType: 'class',
        sourceLevel: 1,
        sourceCode: 'inits-'+statInitCount,
        sourceCodeSNum: 'a',
      },
      outputStruct.perception.codeID,
      {source: 'Class', sourceName: 'Initial Prof (Class)'});
    statInitCount++;
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Skills ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
  
  if(processType == PROCESS_CLASS_STATS_TYPE.RUN_CODE || isBoth){
    $('#'+outputStruct.skills.codeID).html(``);
  }
  
  let profSkillsInner = '';

  let tSkillsArray;
  if(classData.tSkills != null){
      tSkillsArray = classData.tSkills.split(', ');
  } else {
      tSkillsArray = [];
  }
  for(const tSkill of tSkillsArray){

      if(tSkill.includes(' or ')){
    
        let tSkillsOptionArray = tSkill.split(' or ');

        if(processType == PROCESS_CLASS_STATS_TYPE.RUN_CODE || isBoth){

          processCode(
            `GIVE-SKILL=T[${tSkillsOptionArray[0]},${tSkillsOptionArray[1]}]`,
            {
              sourceType: 'class',
              sourceLevel: 1,
              sourceCode: 'inits-'+statInitCount,
              sourceCodeSNum: 'a',
            },
            outputStruct.skills.codeID,
            {source: 'Class', sourceName: 'Initial Prof (Class)'});
          statInitCount++;

        } else {

          profSkillsInner += '<li class="is-size-7"><span class="has-txt-value-string is-italic">Trained</span> in '+tSkill+'</li>';

        }

      } else {

        if(processType == PROCESS_CLASS_STATS_TYPE.DISPLAY || isBoth){
          profSkillsInner += '<li class="is-size-7"><span class="has-txt-value-string is-italic">Trained</span> in '+tSkill+'</li>';
        }

        if(processType == PROCESS_CLASS_STATS_TYPE.RUN_CODE || isBoth){
          processCode(
            `GIVE-PROF-IN=${tSkill.replace(/ /g,'_')}:T`,
            {
              sourceType: 'class',
              sourceLevel: 1,
              sourceCode: 'inits-'+statInitCount,
              sourceCodeSNum: 'a',
            },
            outputStruct.skills.codeID,
            {source: 'Class', sourceName: 'Initial Prof (Class)'});
          statInitCount++;
        }

      }

  }

  if(processType == PROCESS_CLASS_STATS_TYPE.DISPLAY || isBoth){
    profSkillsInner += `
      <li class="is-size-7">
        <span class="has-txt-value-string is-italic">Trained</span> in <a class="has-text-info class-feature-initial-stats-skills-more-info">${classData.tSkillsMore}*</a> more skills
      </li>
    `;
    $('#'+outputStruct.skills.displayID).html(`<ul>${profSkillsInner}</ul>`);

    $('.class-feature-initial-stats-skills-more-info').click(function(){
      openQuickView('abilityView', {
        Ability : {
          name: 'Additional Skills - '+classData.name,
          description: `You get to select training in an additional number of skills equal to ${classData.tSkillsMore} plus your final Intelligence modifier.`,
          level: 0,
        }
      });
    });

  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Saving Throws ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  if(processType == PROCESS_CLASS_STATS_TYPE.DISPLAY || isBoth){
    $('#'+outputStruct.savingThrows.displayID).html(`
      <ul>
        <li class="is-size-7"><span class="has-txt-value-string is-italic">${profToWord(classData.tFortitude)}</span> in Fortitude</li>
        <li class="is-size-7"><span class="has-txt-value-string is-italic">${profToWord(classData.tReflex)}</span> in Reflex</li>
        <li class="is-size-7"><span class="has-txt-value-string is-italic">${profToWord(classData.tWill)}</span> in Will</li>
      </ul>
    `);
  }

  if(processType == PROCESS_CLASS_STATS_TYPE.RUN_CODE || isBoth){
    processCode(
        `GIVE-PROF-IN=${VARIABLE.SAVE_FORT}:${classData.tFortitude}`,
        {
          sourceType: 'class',
          sourceLevel: 1,
          sourceCode: 'inits-'+statInitCount,
          sourceCodeSNum: 'a',
        },
        outputStruct.savingThrows.codeID,
        {source: 'Class', sourceName: 'Initial Prof (Class)'});
    statInitCount++;

    processCode(
        `GIVE-PROF-IN=${VARIABLE.SAVE_REFLEX}:${classData.tReflex}`,
        {
          sourceType: 'class',
          sourceLevel: 1,
          sourceCode: 'inits-'+statInitCount,
          sourceCodeSNum: 'a',
        },
        outputStruct.savingThrows.codeID,
        {source: 'Class', sourceName: 'Initial Prof (Class)'});
    statInitCount++;

    processCode(
        `GIVE-PROF-IN=${VARIABLE.SAVE_WILL}:${classData.tWill}`,
        {
          sourceType: 'class',
          sourceLevel: 1,
          sourceCode: 'inits-'+statInitCount,
          sourceCodeSNum: 'a',
        },
        outputStruct.savingThrows.codeID,
        {source: 'Class', sourceName: 'Initial Prof (Class)'});
    statInitCount++;
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Attacks ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  let profAttacksInner = '';

  let tWeaponsArray = [];
  if(classData.tWeapons != null) { tWeaponsArray = classData.tWeapons.split(',,, '); }
  for(const tWeapons of tWeaponsArray){
      
      let sections = tWeapons.split(':::');
      let weapTraining = sections[0];
      let weaponName = sections[1];

      let singleWeapon = false;
      let weapID;
      let profConvertData = g_profConversionMap.get(weaponName.replace(/\s+/g,'').toUpperCase());
      if(profConvertData != null){
        weapID = profConvertData.Name;
      } else {
        singleWeapon = true;
        weapID = weaponName.replace(/\s+/g,'_').toUpperCase();
      }

      if(weaponName.slice(-1) === 's'){
          // is plural
          profAttacksInner += `<li class="is-size-7"><span class="has-txt-value-string is-italic">${profToWord(weapTraining)+"</span> in all "+weaponName}</li>`;
      } else {
          // is singular
          profAttacksInner += `<li class="is-size-7"><span class="has-txt-value-string is-italic">${profToWord(weapTraining)+"</span> in the "+weaponName}</li>`;
      }

      if(processType == PROCESS_CLASS_STATS_TYPE.RUN_CODE || isBoth){
        processCode(
          `GIVE-PROF-IN=${(singleWeapon) ? 'WEAPON~' : ''}${weapID}:${weapTraining}`,
          {
            sourceType: 'class',
            sourceLevel: 1,
            sourceCode: 'inits-'+statInitCount,
            sourceCodeSNum: 'a',
          },
          outputStruct.attacks.codeID,
          {source: 'Class', sourceName: 'Initial Prof (Class)'});
        statInitCount++;
      }

  }
  if(classData.weaponsExtra != null) {
    let weapLines = classData.weaponsExtra.split('\n');
    for(const weapLine of weapLines){
      let newWeapLine = weapLine;
      newWeapLine = newWeapLine.replace('Untrained','<span class="has-txt-value-string is-italic">Untrained</span>');
      newWeapLine = newWeapLine.replace('Trained','<span class="has-txt-value-string is-italic">Trained</span>');
      newWeapLine = newWeapLine.replace('Expert','<span class="has-txt-value-string is-italic">Expert</span>');
      newWeapLine = newWeapLine.replace('Master','<span class="has-txt-value-string is-italic">Master</span>');
      newWeapLine = newWeapLine.replace('Legendary','<span class="has-txt-value-string is-italic">Legendary</span>');
      profAttacksInner += `<li class="is-size-7">${newWeapLine}</li>`;
    }
  }

  if(processType == PROCESS_CLASS_STATS_TYPE.DISPLAY || isBoth){
    $('#'+outputStruct.attacks.displayID).html(`<ul>${profAttacksInner}</ul>`);
  }


  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Defenses ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
  
  let profDefensesInner = '';

  let tArmorArray = [];
  if(classData.tArmor != null) { tArmorArray = classData.tArmor.split(',,, '); }
  for(const tArmor of tArmorArray){

      let sections = tArmor.split(':::');
      let armorTraining = sections[0];
      let armorName = sections[1];

      let singleArmor = false;
      let armorID;
      let profConvertData = g_profConversionMap.get(armorName.replace(/\s+/g,'').toUpperCase());
      if(profConvertData != null){
        armorID = profConvertData.Name;
      } else {
        singleArmor = true;
        armorID = armorName.replace(/\s+/g,'_').toUpperCase();
      }

      profDefensesInner += `<li class="is-size-7"><span class="has-txt-value-string is-italic">${profToWord(armorTraining)+"</span> in all "+armorName}</li>`;

      if(processType == PROCESS_CLASS_STATS_TYPE.RUN_CODE || isBoth){
        processCode(
          `GIVE-PROF-IN=${(singleArmor) ? 'ARMOR~' : ''}${armorID}:${armorTraining}`,
          {
            sourceType: 'class',
            sourceLevel: 1,
            sourceCode: 'inits-'+statInitCount,
            sourceCodeSNum: 'a',
          },
          outputStruct.defenses.codeID,
          {source: 'Class', sourceName: 'Initial Prof (Class)'});
        statInitCount++;
      }

  }

  if(processType == PROCESS_CLASS_STATS_TYPE.DISPLAY || isBoth){
    $('#'+outputStruct.defenses.displayID).html(`<ul>${profDefensesInner}</ul>`);
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Class DC ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  if(processType == PROCESS_CLASS_STATS_TYPE.DISPLAY || isBoth){
    $('#'+outputStruct.classDC.displayID).html(`
      <ul>
        <li class="is-size-7">
          <span class="has-txt-value-string is-italic">${profToWord(classData.tClassDC)}</span>
        </li>
      </ul>
    `);
  }

  if(processType == PROCESS_CLASS_STATS_TYPE.RUN_CODE || isBoth){
    processCode(
      `GIVE-PROF-IN=${VARIABLE.CLASS_DC}:${classData.tClassDC}`,
      {
        sourceType: 'class',
        sourceLevel: 1,
        sourceCode: 'inits-'+statInitCount,
        sourceCodeSNum: 'a',
      },
      outputStruct.classDC.codeID,
      {source: 'Class', sourceName: 'Initial Prof (Class)'});
    statInitCount++;
  }

}

function processMoreClassSkills(charClass, extraSkillsCodeID){
  if(charClass == null) { return; }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Extra Skills ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  let allProfData = getDataAllProficiencies();
  let allLoreData = getDataAll(DATA_SOURCE.LORE);

  deleteDataBySourceCode('inits-bonus-prof');

  let currentChar = 'a';
  let extraSkillCode = '';
  for (let i = 0; i < getMod(variables_getTotal(VARIABLE.SCORE_INT))+charClass.Class.tSkillsMore; i++) {
    extraSkillCode += 'GIVE-SKILL=T\n';

    for(let profData of allProfData){
      if(profData.sourceCode == 'inits-bonus-prof' && profData.sourceCodeSNum.endsWith(currentChar+'a')){
        setDataProficiencies(profData, profData.For, profData.To, profData.Prof, profData.SourceName, false);
      }
    }

    let loreData = allLoreData.find(loreData => {
      return (loreData.sourceCode == 'inits-bonus-prof' && loreData.sourceCodeSNum.endsWith(currentChar+'a'));
    });
    if(loreData != null){
      setData(DATA_SOURCE.LORE, loreData, loreData.value);
    }

    currentChar = processor_charIncrease(currentChar);
  }

  $('#'+extraSkillsCodeID).html('');
  processCode(
    extraSkillCode,
    {
      sourceType: 'class',
      sourceLevel: 1,
      sourceCode: 'inits-bonus-prof',
      sourceCodeSNum: 'a',
    },
    extraSkillsCodeID,
    {source: 'Class', sourceName: 'Extra Skill Trainings'});

}