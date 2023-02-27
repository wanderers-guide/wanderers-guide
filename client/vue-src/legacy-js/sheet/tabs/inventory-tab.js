/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openInventoryTab(data){

    $('#tabContent').append('<div class="columns is-mobile pt-1 is-marginless"><div class="column is-inline-flex is-paddingless pt-2 px-3"><p class="is-size-6 pr-3"><strong class="has-txt-value-number">Total Bulk</strong></p><p id="bulkTotal" class="is-size-6 has-text-left">'+g_bulkAndCoinsStruct.TotalBulk+' / '+g_bulkAndCoinsStruct.WeightEncumbered+'</p><p id="bulkMax" class="is-size-7 pl-2 has-text-left">(Limit '+g_bulkAndCoinsStruct.WeightMax+')</p></div><div class="column is-paddingless pt-2 px-3"><div class="is-inline-flex is-pulled-right"><p id="coinsMessage" class="is-size-6"><strong class="has-txt-value-number">Total Coins</strong></p><div id="coinsPlatinumSection" class="is-inline-flex" data-tooltip="Platinum"><figure class="image is-16x16 is-marginless mt-1 ml-3 mr-1"><img src="/images/platinum_coin.png"></figure><p>'+g_bulkAndCoinsStruct.PlatinumCoins+'</p></div><div id="coinsGoldSection" class="is-inline-flex" data-tooltip="Gold"><figure class="image is-16x16 is-marginless mt-1 ml-3 mr-1"><img src="/images/gold_coin.png"></figure><p>'+g_bulkAndCoinsStruct.GoldCoins+'</p></div><div id="coinsSilverSection" class="is-inline-flex" data-tooltip="Silver"><figure class="image is-16x16 is-marginless mt-1 ml-3 mr-1"><img src="/images/silver_coin.png"></figure><p>'+g_bulkAndCoinsStruct.SilverCoins+'</p></div><div id="coinsCopperSection" class="is-inline-flex" data-tooltip="Copper"><figure class="image is-16x16 is-marginless mt-1 ml-3 mr-1"><img src="/images/copper_coin.png"></figure><p>'+g_bulkAndCoinsStruct.CopperCoins+'</p></div></div></div></div>');

    $('#tabContent').append(`
      <div class="columns is-mobile is-marginless">
        <div class="column">
          <p class="control has-icons-left"><input id="inventorySearch" class="input" type="text" autocomplete="off" placeholder="Search Inventory"><span class="icon is-left"><i class="fas fa-search" aria-hidden="true"></i></span></p>
        </div>
        <div class="column is-narrow">
          <a id="invAddItems" class="button is-info is-rounded has-txt-value-string">Add Items</a>
        </div>
      </div>
      <div class="tile is-ancestor is-vertical is-marginless">
        <div class="tile is-parent mobile-apply-flex is-paddingless pt-1 px-2">
          <div class="tile is-child is-6">
            <p class="has-text-left pl-4"><strong class="has-txt-listing">Name</strong></p>
          </div>
          <div class="tile is-child is-1">
            <p class="pr-3"><strong class="has-txt-listing">Qty</strong></p>
          </div>
          <div class="tile is-child is-1">
            <p class="pr-3"><strong class="has-txt-listing">Bulk</strong></p>
          </div>
          <div class="tile is-child is-1 is-hidden-mobile">
            <p class="pr-3"><strong class="has-txt-listing">Health</strong></p>
          </div>
          <div class="tile is-child is-3 is-hidden-mobile">
            <p class="pr-4"><strong class="has-txt-listing">Tags</strong></p>
          </div>
        </div>
      </div>
      <div class="is-divider hr-light is-marginless"></div>
      <div id="inventoryContent" class="use-custom-scrollbar"></div>
    `);

    if(g_bulkAndCoinsStruct.CantMove) {
        $('#bulkTotal').addClass('has-text-black');
        $('#bulkTotal').addClass('has-text-weight-bold');
        $('#bulkTotal').addClass('has-background-danger');
        $('#bulkMax').addClass('has-text-black');
        $('#bulkMax').addClass('has-text-weight-bold');
        $('#bulkMax').addClass('has-background-danger');
    } else if(g_bulkAndCoinsStruct.IsEncumbered){
        $('#bulkTotal').addClass('has-text-danger');
        $('#bulkTotal').addClass('has-text-weight-bold');
    }

    let foundCoins = false;
    if(g_bulkAndCoinsStruct.CopperCoins > 0){
        foundCoins = true;
        $('#coinsCopperSection').removeClass('is-hidden');
    } else {
        $('#coinsCopperSection').addClass('is-hidden');
    }
    if(g_bulkAndCoinsStruct.SilverCoins > 0){
        foundCoins = true;
        $('#coinsSilverSection').removeClass('is-hidden');
    } else {
        $('#coinsSilverSection').addClass('is-hidden');
    }
    if(g_bulkAndCoinsStruct.GoldCoins > 0){
        foundCoins = true;
        $('#coinsGoldSection').removeClass('is-hidden');
    } else {
        $('#coinsGoldSection').addClass('is-hidden');
    }
    if(g_bulkAndCoinsStruct.PlatinumCoins > 0){
        foundCoins = true;
        $('#coinsPlatinumSection').removeClass('is-hidden');
    } else {
        $('#coinsPlatinumSection').addClass('is-hidden');
    }

    if(!foundCoins){
        $('#coinsMessage').append(' None');
    }

    displayInventorySection(data);

    $("#inventoryContent").scrollTop(g_inventoryTabScroll);

    $('#invAddItems').click(function(){
        openQuickView('addItemView', {
            ItemMap : g_itemMap,
            InvID : g_invStruct.Inventory.id,
            Data : data
        });
    });

}








// Inventory //

function displayInventorySection(data){

    $('#inventorySearch').off('change');

    let openBagItemArray = [];
    for(const invItem of g_invStruct.InvItems){
        const item = g_itemMap.get(invItem.itemID+"");
        if(item != null){
            if(item.StorageData != null && invItem.bagInvItemID == null){
              openBagItemArray.push({InvItem: invItem, Item: item});
            }
        }
    }

    let inventorySearch = $('#inventorySearch');
    let invSearchInput = null;
    if(inventorySearch.val() != ''){
        invSearchInput = inventorySearch.val().toLowerCase();
        inventorySearch.addClass('is-info');
    } else {
        inventorySearch.removeClass('is-info');
    }

    $('#inventorySearch').change(function(){
        displayInventorySection(data);
    });

    $('#inventoryContent').html('');

    let itemDisplayed = false;
    for(const invItem of g_invStruct.InvItems){
        const item = g_itemMap.get(invItem.itemID+"");
        if(item == null) { continue; }

        let willDisplay = true;
        if(invItem.bagInvItemID != null){
          willDisplay = false;
        }

        if(isUnarmedAttack(item) || item.Item.id == IMPROVISED_ITEM_ID){
          willDisplay = false;
        }

        if(invSearchInput == 'weapons'){
            let item = g_itemMap.get(invItem.itemID+"");
            if(item != null && item.Item.itemType == 'WEAPON'){
                willDisplay = true;
            } else {
                willDisplay = false;
            }

        } else if(invSearchInput == 'armor'){
            let item = g_itemMap.get(invItem.itemID+"");
            if(item != null && item.Item.itemType == 'ARMOR'){
                willDisplay = true;
            } else {
                willDisplay = false;
            }

        } else if(invSearchInput == 'coins' || invSearchInput == 'money' || invSearchInput == 'currency'){
            let item = g_itemMap.get(invItem.itemID+"");
            if(item != null && item.Item.itemType == 'CURRENCY'){
                willDisplay = true;
            } else {
                willDisplay = false;
            }

        } else {

            if(invSearchInput != null){
                let itemName = invItem.name.toLowerCase();
                if(!itemName.includes(invSearchInput)){
                    willDisplay = false;
                } else {
                    willDisplay = true;
                }
            }

        }

        if(willDisplay) {
          itemDisplayed = true;
          displayInventoryItem(invItem, item, openBagItemArray, data);
        }

    }

    handleArmorEquip(g_invStruct.Inventory.id);
    handleShieldEquip(g_invStruct.Inventory.id);

    if(!itemDisplayed){
      // Empty Inventory
    }

}

function displayInventoryItem(invItem, item, openBagItemArray, data) {

    let itemTagArray = getItemTraitsArray(item, invItem);

    let itemIsStorage = (g_bulkAndCoinsStruct.BagBulkMap.get(invItem.id) != null);
    let itemIsStorageAndEmpty = false;
    let itemStorageBulkAmt = null;

    let invItemSectionID = 'invItemSection'+invItem.id;
    let invItemNameID = 'invItemName'+invItem.id;
    let invItemQtyID = 'invItemQty'+invItem.id;
    let invItemBulkID = 'invItemBulk'+invItem.id;
    let invItemHealthID = 'invItemHealth'+invItem.id;
    let invItemShoddyTagID = 'invItemShoddyTag'+invItem.id;
    let invItemBrokenTagID = 'invItemBrokenTag'+invItem.id;
    let invItemInvestedTagID = 'invItemInvestedTag'+invItem.id;
    let invItemNotInvestedTagID = 'invItemNotInvestedTag'+invItem.id;

    // Halve maxHP if it's shoddy
    let maxHP = (invItem.isShoddy == 1) ? Math.floor(invItem.hitPoints/2) : invItem.hitPoints;

    // Halve brokenThreshold if it's shoddy
    let brokenThreshold = (invItem.isShoddy == 1) ? Math.floor(invItem.brokenThreshold/2) : invItem.brokenThreshold;

    // Reduce currentHP if it's over maxHP
    invItem.currentHitPoints = (invItem.currentHitPoints > maxHP) ? maxHP : invItem.currentHitPoints;

    if(itemIsStorage) {

        let invItemStorageViewButtonID = 'invItemStorageViewButton'+invItem.id;
        let invItemStorageSectionID = 'invItemStorageSection'+invItem.id;
        let invItemStorageBulkAmountID = 'invItemStorageBulkAmount'+invItem.id;

        $('#inventoryContent').append(`
          <div id="${invItemSectionID}" class="tile is-parent mobile-apply-flex is-paddingless pt-1 px-2 border-bottom border-dark-lighter cursor-clickable">
            <div class="tile is-child is-6">
              <p id="${invItemNameID}" class="has-text-left has-txt-listing">
                <a id="${invItemStorageViewButtonID}" class="button is-very-small is-info is-rounded is-outlined mb-1 ml-3">Open</a>
              </p>
            </div>
            <div id="${invItemQtyID}" class="tile is-child is-1">
              <p></p>
            </div>
            <div id="${invItemBulkID}" class="tile is-child is-1">
              <p></p>
            </div>
            <div id="${invItemHealthID}" class="tile is-child is-1 is-hidden-mobile">
              <p></p>
            </div>
            <div class="tile is-child is-3 is-hidden-mobile">
              <div class="tags is-centered">
                <span id="${invItemShoddyTagID}" class="tag is-warning">Shoddy</span>
                <span id="${invItemBrokenTagID}" class="tag is-danger">Broken</span>
                <span id="${invItemInvestedTagID}" class="tag is-info">Invested</span>
                <span id="${invItemNotInvestedTagID}" class="tag is-background">Not Invested</span>
              </div>
            </div>
          </div>
        `);

        $('#inventoryContent').append('<div id="'+invItemStorageSectionID+'" class="tile is-vertical is-hidden"></div>');

        let bulkIgnored = (item.StorageData != null) ? item.StorageData.bulkIgnored : 0;
        let bagBulk = g_bulkAndCoinsStruct.BagBulkMap.get(invItem.id);
        if(bagBulk == null) {
            bagBulk = 0;
        } else {
            bagBulk += bulkIgnored;
        }
        let maxBagBulk = invItem.itemStorageMaxBulk;
        if(maxBagBulk == null){
          maxBagBulk = (item.StorageData != null) ? item.StorageData.maxBulkStorage : -1;
        }
        let bulkIgnoredMessage = "";
        if(bulkIgnored != 0.0){
            if(bulkIgnored == maxBagBulk){
                bulkIgnoredMessage = "Items don’t count towards your Total Bulk.";
            } else {
                bulkIgnoredMessage = "The first "+bulkIgnored+" Bulk of items don’t count towards your Total Bulk.";
            }
        }
        let roundedBagBulk = round(bagBulk, 2);
        itemStorageBulkAmt = round(bagBulk-bulkIgnored, 2);
        if(maxBagBulk >= 0){
          $('#'+invItemStorageSectionID).append('<div class="tile is-parent mobile-apply-flex is-paddingless pt-1 px-2"><div class="tile is-child is-1"></div><div class="tile is-child is-3 border-bottom border-dark-lighter"><p id="'+invItemStorageBulkAmountID+'" class="has-text-left pl-5 is-size-6 has-txt-noted">Bulk '+roundedBagBulk+' / '+maxBagBulk+'</p></div><div class="tile is-child is-8 border-bottom border-dark-lighter"><p class="has-text-left pl-3 is-size-6 has-txt-noted is-italic">'+bulkIgnoredMessage+'</p></div></div>');
        }

        let isOverBulk = false;
        if(maxBagBulk == 0) {
          isOverBulk = roundedBagBulk > maxBagBulk;
        } else {
          isOverBulk = bagBulk > maxBagBulk;
        }

        if(!gOption_hasIgnoreBulk && isOverBulk){
            $('#'+invItemStorageBulkAmountID).removeClass('has-txt-noted');
            $('#'+invItemStorageBulkAmountID).addClass('has-text-danger');
            $('#'+invItemStorageBulkAmountID).addClass('has-text-weight-bold');
        }
        
        let foundBaggedItem = false;
        for(const baggedInvItem of g_invStruct.InvItems){
            if(baggedInvItem.bagInvItemID == invItem.id){

                let baggedItem = g_itemMap.get(baggedInvItem.itemID+"");
                if(baggedItem == null) {
                    continue;
                } else {
                    foundBaggedItem = true;
                }

                let baggedItemTagArray = getItemTraitsArray(baggedItem, baggedInvItem);

                let baggedItemIsStorage = (g_bulkAndCoinsStruct.BagBulkMap.get(baggedInvItem.id) != null);

                let baggedInvItemSectionID = 'baggedInvItemSection'+baggedInvItem.id;
                let baggedInvItemIndentID = 'baggedInvItemIndent'+baggedInvItem.id;
                let baggedInvItemNameID = 'baggedInvItemName'+baggedInvItem.id;
                let baggedInvItemQtyID = 'baggedInvItemQty'+baggedInvItem.id;
                let baggedInvItemBulkID = 'baggedInvItemBulk'+baggedInvItem.id;
                let baggedInvItemHealthID = 'baggedInvItemHealth'+baggedInvItem.id;
                let baggedInvItemShoddyTagID = 'baggedInvItemShoddyTag'+baggedInvItem.id;
                let baggedInvItemBrokenTagID = 'baggedInvItemBrokenTag'+baggedInvItem.id;
                let baggedInvItemInvestedTagID = 'baggedInvItemInvestedTag'+baggedInvItem.id;
                let baggedInvItemNotInvestedTagID = 'baggedInvItemNotInvestedTag'+baggedInvItem.id;


                // Halve maxHP if it's shoddy
                let baggedInvItemMaxHP = (baggedInvItem.isShoddy == 1) ? Math.floor(baggedInvItem.hitPoints/2) : baggedInvItem.hitPoints;

                // Halve brokenThreshold if it's shoddy
                let baggedInvItemBrokenThreshold = (baggedInvItem.isShoddy == 1) ? Math.floor(baggedInvItem.brokenThreshold/2) : baggedInvItem.brokenThreshold;

                // Reduce currentHP if it's over maxHP
                baggedInvItem.currentHitPoints = (baggedInvItem.currentHitPoints > baggedInvItemMaxHP) ? baggedInvItemMaxHP : baggedInvItem.currentHitPoints;

                $('#'+invItemStorageSectionID).append(`
                  <div id="${baggedInvItemSectionID}" class="tile is-parent mobile-apply-flex is-paddingless pt-1 px-2 cursor-clickable">
                    <div id="${baggedInvItemIndentID}" class="tile is-child is-1"></div>
                    <div class="tile is-child is-5 border-bottom border-dark-lighter">
                      <p id="${baggedInvItemNameID}" class="has-text-left has-txt-listing"></p>
                    </div>
                    <div id="${baggedInvItemQtyID}" class="tile is-child is-1 border-bottom border-dark-lighter">
                      <p></p>
                    </div>
                    <div id="${baggedInvItemBulkID}" class="tile is-child is-1 border-bottom border-dark-lighter">
                      <p></p>
                    </div>
                    <div id="${baggedInvItemHealthID}" class="tile is-child is-1 is-hidden-mobile border-bottom border-dark-lighter">
                      <p></p>
                    </div>
                    <div class="tile is-child is-3 is-hidden-mobile border-bottom border-dark-lighter">
                      <div class="tags is-centered">
                        <span id="${baggedInvItemShoddyTagID}" class="tag is-warning">Shoddy</span>
                        <span id="${baggedInvItemBrokenTagID}" class="tag is-danger">Broken</span>
                        <span id="${baggedInvItemInvestedTagID}" class="tag is-info">Invested</span>
                        <span id="${baggedInvItemNotInvestedTagID}" class="tag is-background">Not Invested</span>
                      </div>
                    </div>
                  </div>
                `);

                $('#'+baggedInvItemNameID).html(getItemIcon(baggedItem, baggedInvItem)+baggedInvItem.name);

                if(baggedItem.WeaponData != null){
                    let calcStruct = getAttackAndDamage(baggedItem, baggedInvItem);

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

                    $('#'+baggedInvItemNameID).append('<sup class="ml-2 has-text-weight-light">'+calcStruct.AttackBonus+((attackHasConditionals) ? '<sup class="has-text-info">*</sup>' : '')+'</sup><sup class="pl-3 has-text-weight-light has-txt-noted">'+calcStruct.Damage+weapDamageMod+((damageHasConditionals) ? '<sup class="has-text-info">*</sup>' : '')+'</sup>');
                }

                if(baggedItem.Item.hasQuantity == 1){
                    $('#'+baggedInvItemQtyID).html(baggedInvItem.quantity);
                } else {
                    $('#'+baggedInvItemQtyID).html('-');
                }

                let bulk = determineItemBulk(g_charSize, baggedInvItem.size, baggedInvItem.bulk);
                bulk = getWornArmorBulkAdjustment(baggedInvItem, bulk);
                bulk = getBulkFromNumber(bulk);
                $('#'+baggedInvItemBulkID).html(bulk);

                if(baggedInvItem.currentHitPoints == baggedInvItemMaxHP) {
                    $('#'+baggedInvItemHealthID).html('-');
                } else {
                    $('#'+baggedInvItemHealthID).html(baggedInvItem.currentHitPoints+'/'+baggedInvItemMaxHP);
                }

                if(baggedInvItem.isShoddy == 0){
                    $('#'+baggedInvItemShoddyTagID).addClass('is-hidden');
                } else {
                    $('#'+baggedInvItemShoddyTagID).removeClass('is-hidden');
                }

                let notBroken = (baggedInvItem.currentHitPoints > baggedInvItemBrokenThreshold);
                if(doesntHaveItemHealth(baggedInvItem)) {notBroken = true;}
                if(notBroken){
                    $('#'+baggedInvItemBrokenTagID).addClass('is-hidden');
                } else {
                    $('#'+baggedInvItemBrokenTagID).removeClass('is-hidden');
                }

                let investTag = baggedItemTagArray.find(tag => {
                  return tag.id === 235; // Hardcoded Invested Tag ID
                });
                if(investTag != null){
                  if(baggedInvItem.isInvested == 1){
                    $('#'+baggedInvItemInvestedTagID).removeClass('is-hidden');
                    $('#'+baggedInvItemNotInvestedTagID).addClass('is-hidden');
                  } else {
                    $('#'+baggedInvItemInvestedTagID).addClass('is-hidden');
                    $('#'+baggedInvItemNotInvestedTagID).removeClass('is-hidden');
                  }
                } else {
                  $('#'+baggedInvItemInvestedTagID).addClass('is-hidden');
                  $('#'+baggedInvItemNotInvestedTagID).addClass('is-hidden');
                }

                $('#'+baggedInvItemSectionID).click(function(){
                    openQuickView('invItemView', {
                        InvItem : baggedInvItem,
                        Item : baggedItem,
                        InvData : {
                            OpenBagItemArray : openBagItemArray,
                            ItemIsStorage : baggedItemIsStorage,
                            ItemIsStorageAndEmpty : true
                        },
                        ExtraData : {}
                    });
                });

                $('#'+baggedInvItemSectionID).mouseenter(function(){
                    $(this).addClass('has-bg-selectable-hover');
                });
                $('#'+baggedInvItemSectionID).mouseleave(function(){
                    $(this).removeClass('has-bg-selectable-hover');
                });

            }
        }

        if(!foundBaggedItem){
            $('#'+invItemStorageSectionID).append('<div class="tile is-parent mobile-apply-flex is-paddingless pt-1 px-2"><div class="tile is-child is-1"></div><div class="tile is-child is-11 border-bottom border-dark-lighter"><p class="has-text-left pl-3 is-size-7 has-txt-noted is-italic">Empty</p></div></div>');
            itemIsStorageAndEmpty = true;
        }

        $('#'+invItemStorageViewButtonID).click(function(event){
            event.stopImmediatePropagation();
            if($('#'+invItemStorageSectionID).is(":visible")){
                $('#'+invItemStorageSectionID).addClass('is-hidden');
                $('#'+invItemStorageViewButtonID).html('Open');
                $('#'+invItemStorageViewButtonID).removeClass('has-text-white');
                $('#'+invItemStorageViewButtonID).addClass('is-outlined');

                g_openBagsSet.delete(invItem.id);
            } else {
                $('#'+invItemStorageSectionID).removeClass('is-hidden');
                $('#'+invItemStorageViewButtonID).html('Close');
                $('#'+invItemStorageViewButtonID).addClass('has-text-white');
                $('#'+invItemStorageViewButtonID).removeClass('is-outlined');
                
                g_openBagsSet.add(invItem.id);
            }
        });

        if(g_openBagsSet.has(invItem.id)){
            $('#'+invItemStorageViewButtonID).click();
        }

    } else {
        $('#inventoryContent').append(`
          <div id="${invItemSectionID}" class="tile is-parent mobile-apply-flex is-paddingless pt-1 px-2 border-bottom border-dark-lighter cursor-clickable">
            <div class="tile is-child is-6">
              <p id="${invItemNameID}" class="has-text-left has-txt-listing"></p>
            </div>
            <div id="${invItemQtyID}" class="tile is-child is-1">
              <p></p>
            </div>
            <div id="${invItemBulkID}" class="tile is-child is-1">
              <p></p>
            </div>
            <div id="${invItemHealthID}" class="tile is-child is-1 is-hidden-mobile">
              <p></p>
            </div>
            <div class="tile is-child is-3 is-hidden-mobile">
              <div class="tags is-centered">
                <span id="${invItemShoddyTagID}" class="tag is-warning">Shoddy</span>
                <span id="${invItemBrokenTagID}" class="tag is-danger">Broken</span>
                <span id="${invItemInvestedTagID}" class="tag is-info">Invested</span>
                <span id="${invItemNotInvestedTagID}" class="tag is-background">Not Invested</span>
              </div>
            </div>
          </div>
        `);
    }

    

    $('#'+invItemNameID).prepend(getItemIcon(item, invItem)+invItem.name);

    if(item.WeaponData != null){
        let calcStruct = getAttackAndDamage(item, invItem);

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

        $('#'+invItemNameID).append('<sup class="ml-2 has-text-weight-light">'+calcStruct.AttackBonus+((attackHasConditionals) ? '<sup class="has-text-info">*</sup>' : '')+'</sup><sup class="pl-3 has-text-weight-light has-txt-noted">'+calcStruct.Damage+weapDamageMod+((damageHasConditionals) ? '<sup class="has-text-info">*</sup>' : '')+'</sup>');
    }

    if(item.ArmorData != null){
        $('#'+invItemNameID).append('<button data-invItemID="'+invItem.id+'" data-category="'+item.ArmorData.category+'" class="equipArmorButton button is-very-small is-info is-rounded is-outlined mb-1 ml-3"><span class="icon is-small"><i class="fas fa-tshirt"></i></span></button>');
    }

    if(item.ShieldData != null){
        let notBroken = (invItem.currentHitPoints > brokenThreshold);
        if(doesntHaveItemHealth(invItem)) {notBroken = true;}
        if(notBroken){
            $('#'+invItemNameID).append('<button name="'+invItem.id+'" class="equipShieldButton button is-very-small is-info is-rounded is-outlined mb-1 ml-3"><span class="icon is-small"><i class="far fa-shield-alt"></i></span></button>');
        } else {
            $('#'+invItemNameID).append('<button class="button is-very-small is-danger is-rounded mb-1 ml-3"><span class="icon is-small"><i class="far fa-shield-alt"></i></span></button>');
        }
    }


    if(item.Item.hasQuantity == 1){
        $('#'+invItemQtyID).html(invItem.quantity);
    } else {
        $('#'+invItemQtyID).html('-');
    }

    let bulk = determineItemBulk(g_charSize, invItem.size, invItem.bulk);
    bulk = getWornArmorBulkAdjustment(invItem, bulk);
    if(item.StorageData != null && item.StorageData.ignoreSelfBulkIfWearing == 1){
      bulk = 0;
    }
    if(itemStorageBulkAmt != null && itemStorageBulkAmt > 0) {
      bulk += itemStorageBulkAmt;
    }
    bulk = getBulkFromNumber(bulk);
    if(invItem.isDropped == 1) { bulk = '<span class="is-size-6-5">Dropped</span>'; }
    $('#'+invItemBulkID).html(bulk);

    if(invItem.currentHitPoints == maxHP) {
        $('#'+invItemHealthID).html('-');
    } else {
        $('#'+invItemHealthID).html(invItem.currentHitPoints+'/'+maxHP);
    }

    if(invItem.isShoddy == 0){
        $('#'+invItemShoddyTagID).addClass('is-hidden');
    } else {
        $('#'+invItemShoddyTagID).removeClass('is-hidden');
    }

    let notBroken = (invItem.currentHitPoints > brokenThreshold);
    if(doesntHaveItemHealth(invItem)) {notBroken = true;}
    if(notBroken){
        $('#'+invItemBrokenTagID).addClass('is-hidden');
    } else {
        $('#'+invItemBrokenTagID).removeClass('is-hidden');
    }

    let investTag = itemTagArray.find(tag => {
      return tag.id === 235; // Hardcoded Invested Tag ID
    });
    if(investTag != null){
      if(invItem.isInvested == 1){
        $('#'+invItemInvestedTagID).removeClass('is-hidden');
        $('#'+invItemNotInvestedTagID).addClass('is-hidden');
      } else {
        $('#'+invItemInvestedTagID).addClass('is-hidden');
        $('#'+invItemNotInvestedTagID).removeClass('is-hidden');
      }
    } else {
      $('#'+invItemInvestedTagID).addClass('is-hidden');
      $('#'+invItemNotInvestedTagID).addClass('is-hidden');
    }

    $('#'+invItemSectionID).click(function(){
        openQuickView('invItemView', {
            InvItem : invItem,
            Item : item,
            InvData : {
                OpenBagItemArray : openBagItemArray,
                ItemIsStorage : itemIsStorage,
                ItemIsStorageAndEmpty : itemIsStorageAndEmpty
            },
            ExtraData : {}
        });
    });

    $('#'+invItemSectionID).mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+invItemSectionID).mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

}

function handleArmorEquip(invID){
    $('.equipArmorButton').each(function(i, obj) {
        let invItemID = $(this).attr('data-invItemID');
        let armorCategory = $(this).attr('data-category');
        if(g_equippedArmorInvItemID == invItemID) {
            $(this).removeClass('is-outlined');
            $(this).click(function(event){
                event.stopImmediatePropagation();
                g_equippedArmorInvItemID = null;
                g_equippedArmorCategory = null;
                reloadCharSheet();
                updateInventoryBackend(invID);
            });
        } else {
            $(this).addClass('is-outlined');
            $(this).click(function(event){
                event.stopImmediatePropagation();
                g_equippedArmorInvItemID = invItemID;
                g_equippedArmorCategory = armorCategory;
                reloadCharSheet();
                updateInventoryBackend(invID);
            });
        }
    });
}

function handleShieldEquip(invID){
    $('.equipShieldButton').each(function(i, obj) {
        let invItemID = $(this).attr('name');
        if(g_equippedShieldInvItemID == invItemID) {
            $(this).removeClass('is-outlined');
            $(this).click(function(event){
                event.stopImmediatePropagation();
                g_equippedShieldInvItemID = null;
                reloadCharSheet();
                updateInventoryBackend(invID);
            });
        } else {
            $(this).addClass('is-outlined');
            $(this).click(function(event){
                event.stopImmediatePropagation();
                g_equippedShieldInvItemID = invItemID;
                reloadCharSheet();
                updateInventoryBackend(invID);
            });
        }
    });
}

let isUpdateInventoryAvailable = true;
function updateInventoryBackend(invID){
    if(isUpdateInventoryAvailable){
        isUpdateInventoryAvailable = false;
        setTimeout(function(){
            socket.emit("requestUpdateInventory",
                invID,
                g_equippedArmorInvItemID,
                g_equippedShieldInvItemID,
                g_equippedArmorCategory);
            isUpdateInventoryAvailable = true;
        }, 5000);
    }
}