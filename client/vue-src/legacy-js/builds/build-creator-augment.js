/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

  $('.builder-build-home-page-btn').click(function(){
    window.location.href = '/builds/create/?build_id='+g_build_id+'&page=init';
  });

  $('.builder-build-publish-page-btn').click(function(){
    new ConfirmMessage('Publish Content', `
      <p class="has-txt-listing">By clicking publish, you are agreeing to the following about the content you are publishing:</p>
      <p class="pl-2 has-txt-listing negative-indent">&#x2022; The content does not contain any third party’s intellectual property without their permission.</p>
      <p class="pl-2 has-txt-listing negative-indent">&#x2022; The content preserves a high standard of quality; it is not "low-effort content."</p>
      <p class="pl-2 has-txt-listing negative-indent">&#x2022; The content does not contain material that the general public would classify as "adult content," offensive, or inappropriate for minors.</p>
      <p class="has-txt-listing pt-1">Failure to comply with these agreements may result in your content being removed and potentially further repercussions.</p>
    `, 'Publish', 'modal-publish-build', 'modal-publish-build-btn', 'is-success');
    $('#modal-publish-build-btn').click(function() {
      socket.emit('requestBuildPublish', g_build_id);
    });
  });

  socket.on('returnBuildPublish', function(buildID){
    window.location.href = '/builds/?view_id='+buildID;
  });

});

function selectorUpdatedBuildIcons(){

  $('.accord-creation-container').each(function() {

    if($(this).find('.input').length == $(this).find('.input.is-info').length && $(this).find('.select').length == $(this).find('.select.is-info').length && $(this).find('.feat-selection').length == $(this).find('.feat-selection.is-default').length){

      $(this).find('.accord-indicate-unselected-options').html('<span class="icon is-small has-text-danger pl-3"><i class="fas fa-xs fa-times"></i></span>');

    } else if ($(this).find('.input.is-info').length !== 0 || $(this).find('.select.is-info').length !== 0 || $(this).find('.feat-selection.is-default').length !== 0){

        $(this).find('.accord-indicate-unselected-options').html('<span class="icon is-small has-text-warning pl-3"><i class="fas fa-xs fa-check"></i></span>');

    } else {
      $(this).find('.accord-indicate-unselected-options').html('<span class="icon is-small has-text-info pl-3"><i class="fas fa-xs fa-check"></i></span>');
    }
  });

}


const saveBuildMetaData_isDebug = false;

function saveBuildInfo(){

  if(saveBuildMetaData_isDebug) {console.log('S-BuildInfo - EXECUTED');}

  socket.emit("requestBuildUpdateInfo",
      g_build_id,
      g_character);

}

function saveBuildFinalStats(){

  if(saveBuildMetaData_isDebug) {console.log('S-BuildFinalStats - EXECUTED');}

  let finalStatistics = {
    scores: {
      str: variables_getTotal(VARIABLE.SCORE_STR),
      dex: variables_getTotal(VARIABLE.SCORE_DEX),
      con: variables_getTotal(VARIABLE.SCORE_CON),
      int: variables_getTotal(VARIABLE.SCORE_INT),
      wis: variables_getTotal(VARIABLE.SCORE_WIS),
      cha: variables_getTotal(VARIABLE.SCORE_CHA),
    },
    classDC: {
      total: variables_getTotal(VARIABLE.CLASS_DC)+10,
      rank: variables_getFinalRank(VARIABLE.CLASS_DC),
    },
    perception: {
      total: signNumber(variables_getTotal(VARIABLE.PERCEPTION)),
      rank: variables_getFinalRank(VARIABLE.PERCEPTION),
    },
    saves: {
      fort: {
        total: signNumber(variables_getTotal(VARIABLE.SAVE_FORT)),
        rank: variables_getFinalRank(VARIABLE.SAVE_FORT),
      },
      reflex: {
        total: signNumber(variables_getTotal(VARIABLE.SAVE_REFLEX)),
        rank: variables_getFinalRank(VARIABLE.SAVE_REFLEX),
      },
      will: {
        total: signNumber(variables_getTotal(VARIABLE.SAVE_WILL)),
        rank: variables_getFinalRank(VARIABLE.SAVE_WILL),
      }
    },
    skills: {
      acrobatics: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_ACROBATICS)),
        rank: variables_getFinalRank(VARIABLE.SKILL_ACROBATICS),
      },
      arcana: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_ARCANA)),
        rank: variables_getFinalRank(VARIABLE.SKILL_ARCANA),
      },
      athletics: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_ATHLETICS)),
        rank: variables_getFinalRank(VARIABLE.SKILL_ATHLETICS),
      },
      crafting: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_CRAFTING)),
        rank: variables_getFinalRank(VARIABLE.SKILL_CRAFTING),
      },
      deception: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_DECEPTION)),
        rank: variables_getFinalRank(VARIABLE.SKILL_DECEPTION),
      },
      diplomacy: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_DIPLOMACY)),
        rank: variables_getFinalRank(VARIABLE.SKILL_DIPLOMACY),
      },
      intimidation: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_INTIMIDATION)),
        rank: variables_getFinalRank(VARIABLE.SKILL_INTIMIDATION),
      },
      medicine: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_MEDICINE)),
        rank: variables_getFinalRank(VARIABLE.SKILL_MEDICINE),
      },
      nature: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_NATURE)),
        rank: variables_getFinalRank(VARIABLE.SKILL_NATURE),
      },
      occultism: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_OCCULTISM)),
        rank: variables_getFinalRank(VARIABLE.SKILL_OCCULTISM),
      },
      performance: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_PERFORMANCE)),
        rank: variables_getFinalRank(VARIABLE.SKILL_PERFORMANCE),
      },
      religion: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_RELIGION)),
        rank: variables_getFinalRank(VARIABLE.SKILL_RELIGION),
      },
      society: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_SOCIETY)),
        rank: variables_getFinalRank(VARIABLE.SKILL_SOCIETY),
      },
      stealth: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_STEALTH)),
        rank: variables_getFinalRank(VARIABLE.SKILL_STEALTH),
      },
      survival: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_SURVIVAL)),
        rank: variables_getFinalRank(VARIABLE.SKILL_SURVIVAL),
      },
      thievery: {
        total: signNumber(variables_getTotal(VARIABLE.SKILL_THIEVERY)),
        rank: variables_getFinalRank(VARIABLE.SKILL_THIEVERY),
      },
    },
    lores: {},
    attacks: {
      simple_weapons: {
        rank: variables_getFinalRank(VARIABLE.SIMPLE_WEAPONS),
      },
      martial_weapons: {
        rank: variables_getFinalRank(VARIABLE.MARTIAL_WEAPONS),
      },
      advanced_weapons: {
        rank: variables_getFinalRank(VARIABLE.ADVANCED_WEAPONS),
      },
      unarmed_weapons: {
        rank: variables_getFinalRank(VARIABLE.UNARMED_ATTACKS),
      },
    },
    defenses: {
      light_armor: {
        rank: variables_getFinalRank(VARIABLE.LIGHT_ARMOR),
      },
      medium_armor: {
        rank: variables_getFinalRank(VARIABLE.MEDIUM_ARMOR),
      },
      heavy_armor: {
        rank: variables_getFinalRank(VARIABLE.HEAVY_ARMOR),
      },
      unarmored_defense: {
        rank: variables_getFinalRank(VARIABLE.UNARMORED_DEFENSE),
      },
    },
    spellcasting: {
      arcane: {
        attack: variables_getFinalRank(VARIABLE.ARCANE_SPELL_ATTACK),
        dc: variables_getFinalRank(VARIABLE.ARCANE_SPELL_DC),
      },
      divine: {
        attack: variables_getFinalRank(VARIABLE.DIVINE_SPELL_ATTACK),
        dc: variables_getFinalRank(VARIABLE.DIVINE_SPELL_DC),
      },
      occult: {
        attack: variables_getFinalRank(VARIABLE.OCCULT_SPELL_ATTACK),
        dc: variables_getFinalRank(VARIABLE.OCCULT_SPELL_DC),
      },
      primal: {
        attack: variables_getFinalRank(VARIABLE.PRIMAL_SPELL_ATTACK),
        dc: variables_getFinalRank(VARIABLE.PRIMAL_SPELL_DC),
      },
    },
  };

  // Health
  let maxHealth = variables_getTotal(VARIABLE.MAX_HEALTH);
  let maxHealthPerLevel = 0;
  if(getCharClass() != null){
    maxHealthPerLevel = (getCharClass().Class.hitPoints+getMod(variables_getTotal(VARIABLE.SCORE_CON))+variables_getTotal(VARIABLE.MAX_HEALTH_BONUS_PER_LEVEL))*g_character.level;
  }
  finalStatistics.maxHealth = maxHealth+maxHealthPerLevel;

  // Lore
  const sortedLoreDataArray = getDataAll(DATA_SOURCE.LORE).sort(
    function(a, b) {
      return a.value > b.value ? 1 : -1;
    }
  );
  let lores = [];
  for(const loreData of sortedLoreDataArray){
    lores.push({
      name: capitalizeWords(loreData.value)+' Lore',
      total: signNumber(variables_getTotal(`SKILL_${profConversion_convertOldName(loreData.value)}_LORE`)),
      rank: variables_getFinalRank(`SKILL_${profConversion_convertOldName(loreData.value)}_LORE`),
    });
  }
  finalStatistics.lores = lores;

  // Langs
  let sortedLangsArray = [];
  for(const [key, data] of variables_getExtrasMap(VARIABLE.LANGUAGES).entries()){
    let lang = g_allLanguages.find(lang => {
      return lang.id == data.Value;
    });
    if(lang != null){
      sortedLangsArray.push(lang);
    }
  }
  sortedLangsArray = sortedLangsArray.sort(
    function(a, b) {
      return a.name > b.name ? 1 : -1;
    }
  );
  let languages = [];
  for(let lang of sortedLangsArray){
    languages.push(lang.name);
  }
  finalStatistics.languages = languages;

  // Resists
  const resistsArray = [];
  for(const [key, data] of variables_getExtrasMap(VARIABLE.RESISTANCES).entries()){
    let dParts = data.Value.split(getSeparator());
    resistsArray.push({ Type: dParts[0], Amount: dParts[1] });
  }
  const resistsMap = processResistsOrWeaksToMap(resistsArray, g_character.level);

  let resists = [];
  for(const [type, amount] of resistsMap.entries()){
    resists.push(type+' '+amount);
  }
  finalStatistics.resists = resists;

  // Weaks
  const weaksArray = [];
  for(const [key, data] of variables_getExtrasMap(VARIABLE.WEAKNESSES).entries()){
    let dParts = data.Value.split(getSeparator());
    weaksArray.push({ Type: dParts[0], Amount: dParts[1] });
  }
  const weaksMap = processResistsOrWeaksToMap(weaksArray, g_character.level);

  let weaks = [];
  for(const [type, amount] of weaksMap.entries()){
    weaks.push(type+' '+amount);
  }
  finalStatistics.weaks = weaks;


  socket.emit("requestBuildUpdateFinalStats",
      g_build_id,
      finalStatistics);

}

// Process Save Build MetaData
let saveBuildMetaData_isInCooldown = false;
let saveBuildMetaData_isInterrupted = false;

function saveBuildMetaData(){

  if(saveBuildMetaData_isDebug) {console.log('S-BMD - Called');}

  if(!saveBuildMetaData_isInCooldown){

    if(saveBuildMetaData_isDebug) {console.log('S-BMD - Entered Cooldown');}

    saveBuildMetaData_isInCooldown = true;
    setTimeout(() => { saveBuildMetaData_finishCooldown(); }, 1500);

  } else {

    if(saveBuildMetaData_isDebug) {console.log('S-BMD - Cooldown Interrupted, marked');}

    saveBuildMetaData_isInterrupted = true;

  }

}

function saveBuildMetaData_finishCooldown(){
  saveBuildMetaData_isInCooldown = false;

  if(saveBuildMetaData_isDebug) {console.log('S-BMD - Finish Cooldown');}

  if(saveBuildMetaData_isInterrupted){

    if(saveBuildMetaData_isDebug) {console.log('S-BMD - Was Interrupted, restarting');}

    saveBuildMetaData_isInterrupted = false;
    saveBuildMetaData();

  } else {

    saveBuildMetaData_execute();

  }

}

function saveBuildMetaData_execute(){

  if(saveBuildMetaData_isDebug) {console.log('S-BMD - EXECUTED');}

  saveBuildFinalStats();

  socket.emit("requestBuildUpdateMetaData",
      g_build_id,
      mapToObj(g_dataMap));

}