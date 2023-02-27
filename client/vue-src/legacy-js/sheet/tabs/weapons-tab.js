/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

const FIST_ITEM_ID = 56; // <- Fist, Hardcoded Item ID
const IMPROVISED_ITEM_ID = 4753; // <- Improvised Weapon, Hardcoded Item ID

function openWeaponsTab(data) {

    let addWeaponEntry = function(weaponEntryID, item, invItem, extraData) {
        let weaponListEntryID = 'weaponListEntry'+weaponEntryID;

        let calcStruct = getAttackAndDamage(item, invItem);
        //let itemTagArray = getItemTraitsArray(item, invItem);

        let weaponRange, weaponReload;
        if(invItem.itemWeaponRange == null && invItem.itemWeaponReload == null){
          weaponRange = item.WeaponData.rangedRange;
          weaponReload = item.WeaponData.rangedReload;
        } else {
          weaponRange = invItem.itemWeaponRange;
          weaponReload = invItem.itemWeaponReload;
        }

        for(const weapRangeMod of getWeapMod(invItem.id, 'ADJUST-RANGE')){
          weaponRange += parseInt(weapRangeMod.mod);
        }
        for(const weapReloadMod of getWeapMod(invItem.id, 'ADJUST-RELOAD')){
          weaponReload += parseInt(weapReloadMod.mod);
        }

        if(weaponReload == 0){ weaponReload = '-'; }
        if(weaponRange == 0 || (item.WeaponData.isRanged == 0 && weaponRange == 20 && !extraData.IsCustomUnarmedAttack)){ weaponRange = '-'; } else { weaponRange += ' ft'; }

        if(weaponReload == null){ weaponReload = '-'; }
        if(weaponRange == null){ weaponRange = '-'; }

        let unarmedIcon = '';
        if(extraData.IsCustomUnarmedAttack) {
          unarmedIcon = '<sup class="icon is-small has-text-info"><i class="fas fa-sm fa-fist-raised"></i></sup>';
        }

        let attackHasConditionals = (calcStruct.WeapStruct.attack.conditionals != null && calcStruct.WeapStruct.attack.conditionals.size != 0);
        let damageHasConditionals = ((calcStruct.WeapStruct.damage.conditionals != null && calcStruct.WeapStruct.damage.conditionals.size != 0) || calcStruct.WeapStruct.damage.modifications.on_hit_other.length != 0);

        let weapDamageMod = '';
        for(const onHitDmgMod of calcStruct.WeapStruct.damage.modifications.on_hit_damage){
          let modification = onHitDmgMod.mod;
          if(modification.startsWith('-')){
            modification = modification.slice(1);
            weapDamageMod += ` - ${modification}`;
          } else {
            weapDamageMod += ` + ${modification}`;
          }
        }

        $('#weaponsTabContent').append(`
          <div id="${weaponListEntryID}" class="columns is-mobile pt-1 is-marginless weaponEntry" data-item-id="${item.Item.id}">
            <div class="column is-paddingless is-4 border-bottom border-dark-lighter cursor-clickable">
              <p class="has-text-left has-txt-listing">${getItemIcon(item, invItem)+invItem.name+unarmedIcon}</p>
            </div>
            <div class="column is-paddingless is-1 border-bottom border-dark-lighter cursor-clickable">
              <p class="has-txt-listing">
                ${calcStruct.AttackBonus+((attackHasConditionals) ? '<sup class="has-text-info">*</sup>' : '')}
              </p>
            </div>
            <div class="column is-paddingless is-3 border-bottom border-dark-lighter cursor-clickable">
              <p class="has-txt-listing">
                ${calcStruct.Damage+weapDamageMod+((damageHasConditionals) ? '<sup class="has-text-info">*</sup>' : '')}
              </p>
            </div>
            <div class="column is-paddingless is-2 border-bottom border-dark-lighter cursor-clickable">
              <p class="has-txt-listing">${weaponRange}</p>
            </div>
            <div class="column is-paddingless is-1 border-bottom border-dark-lighter cursor-clickable">
              <p class="has-txt-listing">${weaponReload}</p>
            </div>
            <div class="column is-paddingless is-1 border-bottom border-dark-lighter cursor-clickable"></div>
          </div>
        `);

        g_calculatedStats.weapons.push({
            Name: invItem.name,
            Bonus: calcStruct.AttackBonus,
            Damage: calcStruct.Damage});// Calculated Stat

        $('#'+weaponListEntryID).click(function(){
            openQuickView('invItemView', {
                InvItem : invItem,
                Item : item,
                InvData : null,
                ExtraData : extraData
            });
        });

        $('#'+weaponListEntryID).mouseenter(function(){
            $(this).addClass('has-bg-selectable-hover');
        });
        $('#'+weaponListEntryID).mouseleave(function(){
            $(this).removeClass('has-bg-selectable-hover');
        });
    };

    $('#tabContent').append(`
      <div class="columns is-mobile pt-1 is-marginless">
        <div class="column is-paddingless is-4">
          <p class="pl-4 has-text-left"><strong class="has-txt-listing">Name</strong></p>
        </div>
        <div class="column is-paddingless is-1">
          <p class=""><strong class="has-txt-listing">Attack</strong></p>
        </div>
        <div class="column is-paddingless is-3">
          <p class=""><strong class="has-txt-listing">Damage</strong></p>
        </div>
        <div class="column is-paddingless is-2">
          <p class=""><strong class="has-txt-listing">Range</strong></p>
        </div>
        <div class="column is-paddingless is-1">
          <p class=""><strong class="has-txt-listing">Reload</strong></p>
        </div>
        <div class="column is-paddingless is-1"></div>
      </div>
      <div class="is-divider hr-light is-marginless"></div>
    `);

    $('#tabContent').append('<div id="weaponsTabContent" class="use-custom-scrollbar" style="height: 580px; max-height: 580px; overflow-y: auto;"></div>');

    $('#tabContent').append('<div class="pos-absolute pos-t-4 pos-r-1"><span id="addNewUnarmedAttackButton" class="icon has-text-info has-tooltip-left" data-tooltip="Add Unarmed Attack"><i class="fas fa-lg fa-fist-raised"></i></span></div>');

    $("#addNewUnarmedAttackButton").click(function(){
      openQuickView('addUnarmedAttackView', {
        IsCustomize: false,
        AddedItemID: FIST_ITEM_ID
      });
    });

    // Physical Features to Unarmed Attacks
    let phyFeatWeaponMap = new Map();
    phyFeatWeaponMap.set(0, FIST_ITEM_ID);
    phyFeatWeaponMap.set(-1, IMPROVISED_ITEM_ID);

    for(const physicalFeature of g_phyFeatArray){
        if(physicalFeature.value.itemWeaponID != null){
            if(physicalFeature.value.overrides == null){
                if(!phyFeatWeaponMap.has(physicalFeature.value.id)) {
                    phyFeatWeaponMap.set(physicalFeature.value.id, physicalFeature.value.itemWeaponID);
                }
            } else {
                phyFeatWeaponMap.set(physicalFeature.value.overrides, physicalFeature.value.itemWeaponID);
            }
        }
    }

    let willAddUnarmedAttacks = [];
    let willRemoveUnarmedAttacks = [];
    
    for(const [pfWeaponID, itemWeaponID] of phyFeatWeaponMap.entries()){
      const invItem = g_invStruct.InvItems.find(invItem => {
        return invItem.itemID === itemWeaponID;
      });
      if(invItem == null){
        willAddUnarmedAttacks.push(itemWeaponID);
      }
    }

    let checkDuplicateUnarmedAttacks = [];
    for(const invItem of g_invStruct.InvItems){
      const item = g_itemMap.get(invItem.itemID+""); // Is Non-Custom Unarmed Attack
      if(isUnarmedAttack(item) && item.Item.id != FIST_ITEM_ID && item.Item.id != IMPROVISED_ITEM_ID){
        const itemWeaponID = Array.from(phyFeatWeaponMap.values()).find(itemWeaponID => {
          return (itemWeaponID === invItem.itemID);
        });
        if(itemWeaponID == null){
          willRemoveUnarmedAttacks.push(invItem.id);
        } else {
          // If there's a duplicate unarmed attack entry, remove it
          if(checkDuplicateUnarmedAttacks.includes(itemWeaponID)){
            willRemoveUnarmedAttacks.push(invItem.id);
          } else {
            checkDuplicateUnarmedAttacks.push(itemWeaponID);
          }
        }
      }
    }

    for(let itemID of willAddUnarmedAttacks) {

      // Normal Fist has qty of 0 to detect that it is the base Fist, hope that makes sense
      let qty;
      if(itemID == FIST_ITEM_ID || itemID == IMPROVISED_ITEM_ID){ qty = 0; } else { qty = 1; }
      socket.emit("requestAddItemToInv",
          getCharIDFromURL(),
          g_invStruct.Inventory.id,
          itemID,
          qty);

    }
    for(let invItemID of willRemoveUnarmedAttacks) {

      socket.emit("requestRemoveItemFromInv",
          invItemID);

    }

    // Display Weapons & Attacks
    let weaponEntryID = 0;
    for(const invItem of g_invStruct.InvItems){
        let item = g_itemMap.get(invItem.itemID+"");
        if(item == null) { continue; }
        if(item.WeaponData != null){
            weaponEntryID++;
            addWeaponEntry(weaponEntryID, item, invItem, {
              IsUnarmedAttack: isUnarmedAttack(item),
              IsCustomUnarmedAttack: (isUnarmedAttack(item) && item.Item.id === FIST_ITEM_ID && invItem.quantity !== 0)
            });
        }
    }

    // If has shield eqipped,
    if(g_equippedShieldInvItemID != null){
        weaponEntryID++;
        let pwItem = g_itemMap.get(1266+""); // Shield Bash, Hardcoded Item ID
        if(pwItem != null) {
            let pwInvItem = pwItem.Item;
            pwInvItem.currentHitPoints = pwInvItem.hitPoints;
            pwInvItem.viewOnly = true;
            addWeaponEntry(weaponEntryID, pwItem, pwInvItem, {
              IsUnarmedAttack: false,
              IsCustomUnarmedAttack: false
            });
        }
    }




    // Hide Duplicate Fists and Improvised Weapons
    let searchFoundFist = false;
    let searchFoundImproWeap = false;
    $('.weaponEntry').each(function(){
      const itemID = $(this).attr('data-item-id');
      if(itemID == FIST_ITEM_ID){
        if(searchFoundFist){
          //$(this).remove();
          // Custom Unarmed Attacks use the FIST_ITEM_ID
        } else {
          searchFoundFist = true;
        }
      } else if(itemID == IMPROVISED_ITEM_ID){
        if(searchFoundImproWeap){
          $(this).remove();
        } else {
          searchFoundImproWeap = true;
        }
      }
    });


}