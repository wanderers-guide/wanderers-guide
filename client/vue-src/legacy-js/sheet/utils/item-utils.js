/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function doesntHaveItemHealth(invItem){
  return (invItem.hitPoints == 0);
}

function getBulkFromNumber(bulkNumber){
  switch(bulkNumber) {
    case 0: return '-';
    case 0.1: return 'L';
    case 0.01: return 'L / 10';
    default: return ''+round(bulkNumber, 2);
  }
}

function getHandsToString(hands){
  switch(hands) {
    case "NONE":
        return "-";
    case "ONE":
        return "1";
    case "ONE_PLUS":
      return "1+";
    case "TWO":
      return "2";
    default:
        return hands;
  }
}


/* Coins */
function getCoinToString(price) {

  if(price == 0){return "-";}

  let priceObj = {Value: price};
  let cStr = ""; let sStr = ""; let gStr = ""; let pStr = "";

  if(price == 10){
    sStr = processSilver(priceObj);
  } else if(price == 100){
    gStr = processGold(priceObj);
  } else if(price == 1000){
    //pStr = processPlatinum(priceObj);
    gStr = processGold(priceObj);
  } else {
    if(price < 100) { // 99 or less
      cStr = processCopper(priceObj);
    } else if(100 <= price && price < 1000) { // 100 thru 999
      sStr = processSilver(priceObj);
      cStr = processCopper(priceObj);
    } else if(1000 <= price && price < 999999) { // 1000 thru 999,999
      gStr = processGold(priceObj);
      sStr = processSilver(priceObj);
      cStr = processCopper(priceObj);
    } else { // 1,000,000 or greater
      pStr = processPlatinum(priceObj);
      gStr = processGold(priceObj);
      sStr = processSilver(priceObj);
      cStr = processCopper(priceObj);
    }
  }

  let cStr_sStr_ouput = reduceCoinStr(cStr, sStr);
  cStr = cStr_sStr_ouput.current; sStr = cStr_sStr_ouput.upper;

  let sStr_gStr_ouput = reduceCoinStr(sStr, gStr);
  sStr = sStr_gStr_ouput.current; gStr = sStr_gStr_ouput.upper;

  /*let gStr_pStr_ouput = reduceCoinStr(gStr, pStr); // Don't convert down to platinum //
  gStr = gStr_pStr_ouput.current; pStr = gStr_pStr_ouput.upper;*/

  // Add on currency type
  if(pStr!='') {pStr += ' pp';}
  if(gStr!='') {gStr += ' gp';}
  if(sStr!='') {sStr += ' sp';}
  if(cStr!='') {cStr += ' cp';}

  let str = numberWithCommas(pStr);
  if(str != "" && gStr != ""){str += ", ";}
  str += numberWithCommas(gStr);
  if(str != "" && sStr != ""){str += ", ";}
  str += sStr;
  if(str != "" && cStr != ""){str += ", ";}
  str += cStr;

  return str;

}

function processCopper(priceObj) {
  if(priceObj.Value == 0){return '';}
  let copperCount = Math.floor(priceObj.Value / 1);
  priceObj.Value -= copperCount;
  return copperCount+'';
}

function processSilver(priceObj) {
  if(priceObj.Value == 0){return '';}
  let silverCount = Math.floor(priceObj.Value / 10);
  priceObj.Value -= silverCount*10;
  return silverCount+'';
}

function processGold(priceObj) {
  if(priceObj.Value == 0){return '';}
  let goldCount = Math.floor(priceObj.Value / 100);
  priceObj.Value -= goldCount*100;
  return goldCount+'';
}

function processPlatinum(priceObj) {
  if(priceObj.Value == 0){return '';}
  let platinumCount = Math.floor(priceObj.Value / 1000);
  priceObj.Value -= platinumCount*1000;
  return platinumCount+'';
}

function reduceCoinStr(currentCoinStr, upperCoinStr){
  let currentCoin = parseInt(currentCoinStr); if(isNaN(currentCoin)){ currentCoin = 0; }
  let upperCoin = parseInt(upperCoinStr); if(isNaN(upperCoin)){ upperCoin = 0; }
  if(currentCoin !== 0 && currentCoin % 10 === 0){
    upperCoinStr = (upperCoin+(currentCoin/10))+'';
    currentCoinStr = '';
  }
  return { current: currentCoinStr, upper: upperCoinStr };
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/* Worn Armor Bulk Adjustment */
function getWornArmorBulkAdjustment(invItem, currentBulk){
  if(g_equippedArmorInvItemID != null && g_equippedArmorInvItemID == invItem.id){
    return currentBulk;
  } else {
    let item = g_itemMap.get(invItem.itemID+"");
    if(item != null && item.ArmorData != null){
      if(currentBulk == 0.1){
        return 1;
      } else if (currentBulk >= 1){
        return currentBulk + 1;
      }
    }
    return currentBulk;
  }
}

/* Size Conversions */
function bulkIsLight(bulk){
  return bulk === 0.1;
}
function bulkIsNegligible(bulk){
  return bulk === 0 || bulk === 0.001;
}


function getBulkLimitModifierForSize(creatureSize){
  switch(creatureSize) {
    case "TINY": return 0.5;
    case "SMALL": return 1;
    case "MEDIUM": return 1;
    case "LARGE": return 2;
    case "HUGE": return 4;
    case "GARGANTUAN": return 8;
    default: return 1;
  }
}

function determineItemBulk(creatureSize, itemSize, itemBulk){
  if(itemBulk == -1){ return 0; }
  let newItemBulk = convertItemTreatedBulkForCreature(creatureSize, itemBulk);
  return getConvertedBulkForSize(itemSize, newItemBulk);
}

function convertItemTreatedBulkForCreature(creatureSize, itemBulk){
  switch(creatureSize) {
    case "TINY":
      if(itemBulk >= 0 && itemBulk <= 0.1) { return 0.1; }
      return itemBulk;
    case "SMALL":
      return itemBulk;
    case "MEDIUM":
      return itemBulk;
    case "LARGE":
      if(itemBulk <= 0.1) { return 0; }
      return itemBulk*0.1;
    case "HUGE":
      if(itemBulk <= 1) { return 0; }
      return itemBulk*0.05;
    case "GARGANTUAN":
      if(itemBulk <= 2) { return 0; }
      return itemBulk*0.025;
    default: return itemBulk;
  }
}

function getConvertedBulkForSize(itemSize, bulk){
  switch(itemSize) {
    case "TINY":
      if(bulk == 0) {
        bulk = 0;
      } else if(bulk <= 0.1){
        bulk = 0;
      } else {
        bulk = bulk/2;
        if(bulk < 1){
          bulk = 0.1;
        }
      }
      return bulk;
    case "SMALL":
      return bulk;
    case "MEDIUM":
      return bulk;
    case "LARGE":
      if(bulk == 0) {
        bulk = 0.1;
      } else if(bulk <= 0.1){
        bulk = 1;
      } else {
        bulk = bulk*2;
      }
      return bulk;
    case "HUGE":
      if(bulk == 0) {
        bulk = 1;
      } else if(bulk <= 0.1){
        bulk = 2;
      } else {
        bulk = bulk*4;
      }
      return bulk;
    case "GARGANTUAN":
      if(bulk == 0) {
        bulk = 2;
      } else if(bulk <= 0.1){
        bulk = 4;
      } else {
        bulk = bulk*8;
      }
      return bulk;
    default:
      return bulk;
  }
}

function getConvertedPriceForSize(itemSize, price){
  switch(itemSize) {
    case "TINY":
      return price;
    case "SMALL":
      return price;
    case "MEDIUM":
      return price;
    case "LARGE":
      return price*2;
    case "HUGE":
      return price*4;
    case "GARGANTUAN":
      return price*8;
    default:
      return price;
  }
}

////////

function getItemTraitsArray(item, invItem){
  let tagArray;
  try {
    tagArray = [];
    let tagIDArray = JSON.parse(invItem.itemTags);
    for(let tag of g_allTags){
      if(tagIDArray.includes(tag.id+"")){
        tagArray.push(tag);
      }
    }
  } catch (err) {
    tagArray = item.TagArray;
  }

  // Added traits from attached items
  for(const weapTraitMod of getWeapMod(invItem.id, 'ADD-TRAIT')){
    let addedTag = g_allTags.find(tag => {
      return tag.name.toUpperCase() === weapTraitMod.mod.toUpperCase();
    });
    if(addedTag != null){
      tagArray.push(addedTag);
    } else {
      displayError('DEFAULT-ADD-TRAIT statement attempting to add trait to '+invItem.name+' that doesn\'t exist ('+weapTraitMod.mod+')!');
    }
  }

  // If item has a potency rune and is not magical, add magical trait and evocation trait
  if(invItem.fundPotencyRuneID != null){
    let magical = tagArray.find(tag => {
      // Hardcoded - Magical Trait ID 41;
      // Primal Trait ID 304; Occult Trait ID 500; Divine Trait ID 265; Arcane Trait ID 2;
      return tag.id == 41 || tag.id == 304 || tag.id == 500 || tag.id == 265 || tag.id == 2;
    });
    if(magical == null){
      tagArray.push({
        id: 41,
        name: 'Magical',
        description: 'Something with the magical trait is imbued with magical energies not tied to a specific tradition of magic. A magical item radiates a magic aura infused with its dominant school of magic.'
      });
      tagArray.push({
        id: 231,
        name: 'Evocation',
        description: 'Effects and magic items with this trait are associated with the evocation school of magic, typically involving energy and elemental forces.'
      });
    }
  }

  tagArray = tagArray.sort(
    function(a, b) {
      return a.name > b.name ? 1 : -1;
    }
  );

  return tagArray;
}

////////

function getItemIcon(item, invItem){

  let fa_icon = null;

  if(item.Item.itemType != null){
    let itemType = capitalizeWords(item.Item.itemType);

    if(itemType === 'Adjustment'){ fa_icon = 'fas fa-tools'; }
    if(itemType === 'Artifact'){ fa_icon = 'fas fa-star-christmas'; }
    if(itemType === 'Ammunition'){ fa_icon = 'fad fa-bow-arrow'; }
    if(itemType === 'Armor'){ fa_icon = 'fas fa-tshirt'; }
    if(itemType === 'Belt'){ fa_icon = 'fas fa-circle-notch'; }
    if(itemType === 'Bomb'){ fa_icon = 'fas fa-bomb'; }
    if(itemType === 'Book'){ fa_icon = 'fas fa-book'; }
    if(itemType === 'Boots'){ fa_icon = 'fas fa-boot'; }
    // Bracers
    if(itemType === 'Catalyst'){ fa_icon = 'fad fa-certificate'; }
    // Circlet
    if(itemType === 'Cloak'){ fa_icon = 'fas fa-hood-cloak'; }
    if(itemType === 'Companion'){ fa_icon = 'fas fa-paw'; }
    if(itemType === 'Currency'){ fa_icon = 'fas fa-coins'; }
    if(itemType === 'Drug'){ fa_icon = 'fas fa-cannabis'; }
    if(itemType === 'Elixir'){ fa_icon = 'fas fa-flask'; }
    if(itemType === 'Eyepiece'){ fa_icon = 'far fa-glasses-alt'; }
    if(itemType === 'Fulu'){ fa_icon = 'fas fa-tag'; }
    if(itemType === 'Gadget'){ fa_icon = 'fas fa-cog'; }
    if(itemType === 'Gift'){ fa_icon = 'fas fa-gift'; }
    if(itemType === 'Gloves'){ fa_icon = 'fad fa-boxing-glove'; }
    if(itemType === 'Grimoire'){ fa_icon = 'fas fa-book-spells'; }
    if(itemType === 'Hat'){ fa_icon = 'fas fa-hat-witch'; }
    if(itemType === 'Ingredient'){ fa_icon = 'fad fa-cauldron'; }
    if(itemType === 'Instrument'){ fa_icon = 'fas fa-mandolin'; }
    if(itemType === 'Kit'){ fa_icon = 'fas fa-briefcase'; }
    if(itemType === 'Mask'){ fa_icon = 'fas fa-mask'; }
    // Necklace
    if(itemType === 'Oil'){ fa_icon = 'fas fa-jug'; }
    if(itemType === 'Poison'){ fa_icon = 'fas fa-flask-poison'; }
    if(itemType === 'Potion'){ fa_icon = 'fas fa-flask-potion'; }
    if(itemType === 'Ring'){ fa_icon = 'fas fa-ring'; }
    if(itemType === 'Rod'){ fa_icon = 'far fa-window-minimize'; }
    if(itemType === 'Rune'){ fa_icon = 'fas fa-tombstone-alt'; }
    if(itemType === 'Scroll'){ fa_icon = 'fas fa-scroll-old'; }
    if(itemType === 'Shield'){ fa_icon = 'far fa-shield-alt'; }
    // Siege
    if(itemType === 'Spellheart'){ fa_icon = 'fas fa-heart'; }
    if(itemType === 'Staff'){ fa_icon = 'far fa-staff'; }
    if(itemType === 'Storage'){ fa_icon = 'fas fa-backpack'; }
    if(itemType === 'Structure'){ fa_icon = 'fas fa-home-alt'; }
    if(itemType === 'Talisman'){ fa_icon = 'fas fa-ornament'; }
    if(itemType === 'Tattoo'){ fa_icon = 'far fa-signature'; }
    // Tool (probably don't want to set one)
    if(itemType === 'Wand'){ fa_icon = 'fas fa-wand'; }
    // Weapon (don't want to set one)
    // Other (probably don't want to set one)

  }


  if(item.WeaponData != null){
    let weaponType = (item.WeaponData.isRanged == 1) ? item.WeaponData.rangedWeaponType : item.WeaponData.meleeWeaponType;
    weaponType = capitalizeWords(weaponType);

    if(weaponType === 'Bomb'){ fa_icon = 'fas fa-bomb'; }
    if(weaponType === 'Bow'){ fa_icon = 'fas fa-bow-arrow'; }
    if(weaponType === 'Brawling'){ fa_icon = 'fas fa-fist-raised'; }
    if(weaponType === 'Club'){ fa_icon = 'fas fa-mace'; }
    // Dart
    // Firearm
    if(weaponType === 'Flail'){ fa_icon = 'fad fa-mace'; }
    if(weaponType === 'Hammer'){ fa_icon = 'fas fa-hammer-war'; }
    if(weaponType === 'Knife'){ fa_icon = 'fas fa-dagger'; }
    // Pick
    if(weaponType === 'Polearm'){ fa_icon = 'fas fa-scythe'; }
    if(weaponType === 'Shield'){ fa_icon = 'far fa-shield-alt'; }
    // Sling
    if(weaponType === 'Spear'){ fa_icon = 'far fa-slash'; }
    if(weaponType === 'Sword'){ fa_icon = 'fas fa-sword'; }
    if(weaponType === 'Axe'){ fa_icon = 'fas fa-axe'; }

  }


  // For if someone adds a trait to a custom item, it'll override it to be accurate
  if(invItem != null){
    let tagArray = getItemTraitsArray(item, invItem);
    if(tagArray.find(tag => { return tag.name === 'Wand'; }) != null){ fa_icon = 'fas fa-wand'; }
    if(tagArray.find(tag => { return tag.name === 'Staff'; }) != null){ fa_icon = 'far fa-staff'; }
  }


  if(fa_icon != null){
    return `<span class="icon is-small mr-2 has-txt-very-noted"><i class="${fa_icon} fa-sm"></i></span>`;
  } else {
    return '<span class="icon is-small mr-2"></span>';
  }

}