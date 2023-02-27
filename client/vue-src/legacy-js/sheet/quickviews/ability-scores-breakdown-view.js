/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

/*
  Requires variable-processing.js
*/

function openAbilityScoresBreakdownQuickview(data) {

  $('#quickViewTitle').html('Ability Scores');

  let qContent = $('#quickViewContent');

  const score_str = variables_getValue(VARIABLE.SCORE_STR);
  const score_dex = variables_getValue(VARIABLE.SCORE_DEX);
  const score_con = variables_getValue(VARIABLE.SCORE_CON);
  const score_int = variables_getValue(VARIABLE.SCORE_INT);
  const score_wis = variables_getValue(VARIABLE.SCORE_WIS);
  const score_cha = variables_getValue(VARIABLE.SCORE_CHA);

  qContent.append(`
  <div class="accord-like-button-mimic mx-2">
    <div class="columns is-mobile is-centered is-marginless text-center mx-3">
      <div class="column is-2 is-paddingless"><p class="is-bold-very">Str</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold-very">Dex</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold-very">Con</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold-very">Int</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold-very">Wis</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold-very">Cha</p></div>
    </div>
    <div class="columns is-mobile is-centered is-marginless text-center mx-3">
      <div class="column is-2 is-paddingless"><p >${score_str.Score}</p></div>
      <div class="column is-2 is-paddingless"><p >${score_dex.Score}</p></div>
      <div class="column is-2 is-paddingless"><p >${score_con.Score}</p></div>
      <div class="column is-2 is-paddingless"><p >${score_int.Score}</p></div>
      <div class="column is-2 is-paddingless"><p >${score_wis.Score}</p></div>
      <div class="column is-2 is-paddingless"><p >${score_cha.Score}</p></div>
    </div>
  </div>
  `);

  // Find greatest number of bonuses
  let maxNumOfBonuses = 0;
  if(score_str.Bonuses.size > maxNumOfBonuses) { maxNumOfBonuses = score_str.Bonuses.size; }
  if(score_dex.Bonuses.size > maxNumOfBonuses) { maxNumOfBonuses = score_dex.Bonuses.size; }
  if(score_con.Bonuses.size > maxNumOfBonuses) { maxNumOfBonuses = score_con.Bonuses.size; }
  if(score_int.Bonuses.size > maxNumOfBonuses) { maxNumOfBonuses = score_int.Bonuses.size; }
  if(score_wis.Bonuses.size > maxNumOfBonuses) { maxNumOfBonuses = score_wis.Bonuses.size; }
  if(score_cha.Bonuses.size > maxNumOfBonuses) { maxNumOfBonuses = score_cha.Bonuses.size; }

  let inferSourceFromMetaData = function(metadata, value){
    let adjustmentWord = 'adjustment';
    if(value == 2) {
      adjustmentWord = 'boost';
    } else if(value == -2) {
      adjustmentWord = 'flaw';
    }
    if(metadata.toLowerCase().includes('ancestry')){
      return 'This '+adjustmentWord+' comes from your ancestry.';
    } else if(metadata.toLowerCase().includes('background')){
      return 'This '+adjustmentWord+' comes from your background.';
    } else if(metadata.toLowerCase().includes('classability')){
      return 'This '+adjustmentWord+' comes from your class.';
    } else if(metadata.toLowerCase().includes('keyability')){
      return 'This '+adjustmentWord+' comes from your key ability, determined by your class.';
    } else {
      return 'This '+adjustmentWord+' comes from an unknown source.';
    }
  };

  for (let i = 0; i < maxNumOfBonuses; i++) {
    
    const strBonus = Array.from(score_str.Bonuses)[i];
    const dexBonus = Array.from(score_dex.Bonuses)[i];
    const conBonus = Array.from(score_con.Bonuses)[i];
    const intBonus = Array.from(score_int.Bonuses)[i];
    const wisBonus = Array.from(score_wis.Bonuses)[i];
    const chaBonus = Array.from(score_cha.Bonuses)[i];

    let strEntry = '<p></p>';
    if(strBonus != null){
      strEntry = `<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="${inferSourceFromMetaData(strBonus[0], strBonus[1].Value)}">${signNumber(strBonus[1].Value)}</a>`;
      if(strBonus[1].Value < 0) { strEntry = strEntry.replace('has-text-info', 'has-text-danger'); }
    }
    let dexEntry = '<p></p>';
    if(dexBonus != null){
      dexEntry = `<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="${inferSourceFromMetaData(dexBonus[0], dexBonus[1].Value)}">${signNumber(dexBonus[1].Value)}</a>`;
      if(dexBonus[1].Value < 0) { dexEntry = dexEntry.replace('has-text-info', 'has-text-danger'); }
    }
    let conEntry = '<p></p>';
    if(conBonus != null){
      conEntry = `<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="${inferSourceFromMetaData(conBonus[0], conBonus[1].Value)}">${signNumber(conBonus[1].Value)}</a>`;
      if(conBonus[1].Value < 0) { conEntry = conEntry.replace('has-text-info', 'has-text-danger'); }
    }
    let intEntry = '<p></p>';
    if(intBonus != null){
      intEntry = `<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="${inferSourceFromMetaData(intBonus[0], intBonus[1].Value)}">${signNumber(intBonus[1].Value)}</a>`;
      if(intBonus[1].Value < 0) { intEntry = intEntry.replace('has-text-info', 'has-text-danger'); }
    }
    let wisEntry = '<p></p>';
    if(wisBonus != null){
      wisEntry = `<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="${inferSourceFromMetaData(wisBonus[0], wisBonus[1].Value)}">${signNumber(wisBonus[1].Value)}</a>`;
      if(wisBonus[1].Value < 0) { wisEntry = wisEntry.replace('has-text-info', 'has-text-danger'); }
    }
    let chaEntry = '<p></p>';
    if(chaBonus != null){
      chaEntry = `<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="${inferSourceFromMetaData(chaBonus[0], chaBonus[1].Value)}">${signNumber(chaBonus[1].Value)}</a>`;
      if(chaBonus[1].Value < 0) { chaEntry = chaEntry.replace('has-text-info', 'has-text-danger'); }
    }

    qContent.append(`
      <div class="columns is-mobile is-centered is-marginless text-center mx-4 p-1">
        <div class="column is-2 is-paddingless">${strEntry}</div>
        <div class="column is-2 is-paddingless">${dexEntry}</div>
        <div class="column is-2 is-paddingless">${conEntry}</div>
        <div class="column is-2 is-paddingless">${intEntry}</div>
        <div class="column is-2 is-paddingless">${wisEntry}</div>
        <div class="column is-2 is-paddingless">${chaEntry}</div>
      </div>
    `);

  }

  const strFinal = variables_getTotal(VARIABLE.SCORE_STR);
  const dexFinal = variables_getTotal(VARIABLE.SCORE_DEX);
  const conFinal = variables_getTotal(VARIABLE.SCORE_CON);
  const intFinal = variables_getTotal(VARIABLE.SCORE_INT);
  const wisFinal = variables_getTotal(VARIABLE.SCORE_WIS);
  const chaFinal = variables_getTotal(VARIABLE.SCORE_CHA);

  if(strFinal > 18 || dexFinal > 18 || conFinal > 18 || intFinal > 18 || wisFinal > 18 || chaFinal > 18){
    qContent.append(`<p class="text-center is-italic"><a class="has-text-warning has-tooltip-bottom has-tooltip-multiline" data-tooltip="Whenever you gain an ability boost in an ability score that's already 18 or higher, you gain a +1 instead of +2.">Reduce boosts above 18</a></p>`);
  }

  qContent.append(`
    <div class="columns is-mobile is-centered is-marginless text-center mx-4 p-1">
      <div class="column is-2 is-paddingless"><p>=</p></div>
      <div class="column is-2 is-paddingless"><p>=</p></div>
      <div class="column is-2 is-paddingless"><p>=</p></div>
      <div class="column is-2 is-paddingless"><p>=</p></div>
      <div class="column is-2 is-paddingless"><p>=</p></div>
      <div class="column is-2 is-paddingless"><p>=</p></div>
    </div>
  `);

  qContent.append(`
    <div class="columns is-mobile is-centered is-marginless text-center mx-4 p-1">
      <div class="column is-2 is-paddingless"><p class="is-bold">${strFinal}</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold">${dexFinal}</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold">${conFinal}</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold">${intFinal}</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold">${wisFinal}</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold">${chaFinal}</p></div>
    </div>
  `);

  qContent.append(`
    <div class="columns is-mobile is-centered is-marginless text-center mx-4 p-1">
      <div class="column is-2 is-paddingless"><p class="is-italic has-txt-noted">(${signNumber(getMod(strFinal))})</p></div>
      <div class="column is-2 is-paddingless"><p class="is-italic has-txt-noted">(${signNumber(getMod(dexFinal))})</p></div>
      <div class="column is-2 is-paddingless"><p class="is-italic has-txt-noted">(${signNumber(getMod(conFinal))})</p></div>
      <div class="column is-2 is-paddingless"><p class="is-italic has-txt-noted">(${signNumber(getMod(intFinal))})</p></div>
      <div class="column is-2 is-paddingless"><p class="is-italic has-txt-noted">(${signNumber(getMod(wisFinal))})</p></div>
      <div class="column is-2 is-paddingless"><p class="is-italic has-txt-noted">(${signNumber(getMod(chaFinal))})</p></div>
    </div>
  `);

  //

}