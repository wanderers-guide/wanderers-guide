/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_weapModManagerMap = null;
const g_weapMod_damageRegex = /^([ \-\+]|^)(\d+)+d(\d+)((\s*[+-]\s*\d+)*)( |)([^ .,;\n]+)$/im;

function initWeapModManager(){
  g_weapModManagerMap = new Map();
}

/*
  Weapon Modification types:
    - DAMAGE-ON-HIT
    - DAMAGE-ON-CRIT

    - OTHER-ON-HIT
    - OTHER-ON-CRIT

    - CONDITIONAL-ON-HIT
    - CONDITIONAL-ON-CRIT

    - ADJUST-RANGE
    - ADJUST-RELOAD

    - ADD-TRAIT
*/

/* Layout:
  g_weapModManagerMap: (invItemID) -> ({ Map: (weapModType) -> ({ Array: [weapMod, weapMod, ...] }) })
*/

function addWeapMod(invItemID, weapMod, weapModType, extraInfo=''){
  if(invItemID == null) { return; }
  if(weapModType == 'DAMAGE-ON-HIT'
      || weapModType == 'DAMAGE-ON-CRIT'
      || weapModType == 'OTHER-ON-HIT'
      || weapModType == 'OTHER-ON-CRIT'
      || weapModType == 'CONDITIONAL-ON-HIT'
      || weapModType == 'CONDITIONAL-ON-CRIT'
      || weapModType == 'ADJUST-RANGE'
      || weapModType == 'ADJUST-RELOAD'
      || weapModType == 'ADD-TRAIT') {
    // Good, weapModType is a valid type
    if(weapModType.includes('DAMAGE-')){
      let weapModMatch = weapMod.match(g_weapMod_damageRegex);
      if(weapModMatch == null){
        displayError('(WeapModManager) weapMod is of type DAMAGE- but does not follow damage format: XdX+X dmgType'); return;
      } else {

        weapMod = weapMod.trim().toLowerCase();
        if(weapMod.startsWith('+')){
          weapMod = weapMod.slice(1).trim();
        } else if(weapMod.startsWith('-')){
          weapMod = weapMod.slice(1).trim();
          weapMod = '-'+weapMod;
        }
          
      }
    }
  } else { displayError('(WeapModManager) Invalid weapModType'); return; }

  let weapModDataMap = g_weapModManagerMap.get(invItemID+'');
  if(weapModDataMap != null){
    let existingModArray = weapModDataMap.get(weapModType);
    if(existingModArray != null){
      existingModArray.push({ mod: weapMod, info: extraInfo });
    } else {
      existingModArray = [{ mod: weapMod, info: extraInfo }];
    }
    weapModDataMap.set(weapModType, existingModArray);
    g_weapModManagerMap.set(invItemID+'', weapModDataMap);
  } else {
    weapModDataMap = new Map();
    weapModDataMap.set(weapModType, [{ mod: weapMod, info: extraInfo }]);
    g_weapModManagerMap.set(invItemID+'', weapModDataMap);
  }

}

function getWeapMod(invItemID, weapModType){
  if(invItemID == null){ return []; }
  let weapModDataMap = g_weapModManagerMap.get(invItemID+'');
  if(weapModDataMap != null){
    let modArray = weapModDataMap.get(weapModType);
    if(modArray == null){
      return [];
    } else {
      return cloneObj(modArray);
    }
  } else {
    return [];
  }
}

function getWeapModAll(invItemID){
  return g_weapModManagerMap.get(invItemID+'');
}