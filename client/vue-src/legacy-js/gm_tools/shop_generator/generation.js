/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_inv_size = 25;
let g_price_markup = 0;

const g_formula_prices = new Map([
  ['0', 50],
  ['1', 100],
  ['2', 200],
  ['3', 300],
  ['4', 500],
  ['5', 800],
  ['6', 1300],
  ['7', 1800],
  ['8', 2500],
  ['9', 3500],
  ['10', 5000],
  ['11', 7000],
  ['12', 10000],
  ['13', 15000],
  ['14', 22500],
  ['15', 32500],
  ['16', 50000],
  ['17', 75000],
  ['18', 120000],
  ['19', 200000],
  ['20', 350000],
]);

function generateItems(){

  $('#container-generated-inventory').html('');
  $('#section-generated-inventory').removeClass('is-hidden');

  let mainItemMap = new Map(g_itemMap);

  /// Remove all items that aren't in the the enabled books or homebrew

  for(const [itemID, itemData] of mainItemMap.entries()){

    if(itemData.Item.homebrewID != null){
      if(!g_enabled_homebrew.includes(itemData.Item.homebrewID+'')){
        mainItemMap.delete(itemID);
      } else {
        // Include homebrew. The source is always CRB so it doesn't matter. Homebrew can't be archived or hidden so that doesn't matter either.
      }
    } else if(!g_enabled_books.includes(itemData.Item.contentSrc)){
      mainItemMap.delete(itemID);
    } else {
      if(itemData.Item.isArchived == 1 || itemData.Item.hidden == 1){
        mainItemMap.delete(itemID);
      }
    }
  }

  /// Get item map for each profile, store that in a map

  let profileToItemMap = new Map();

  for(const [profileID, profileData] of g_shop.profiles.entries()){

    let pItemMap = new Map(mainItemMap);

    /// Remove all items outside of level range
    
    for(const [itemID, itemData] of pItemMap.entries()){
      if(itemData.Item.level > profileData.level_max || itemData.Item.level < profileData.level_min){
        pItemMap.delete(itemID);
      }
    }

    /// Remove all items of a certain rarity if is 0%
  
    let zeroPercentRarityArray = [];
    if(profileData.rarities.get('common') == 0){ zeroPercentRarityArray.push('COMMON'); }
    if(profileData.rarities.get('uncommon') == 0){ zeroPercentRarityArray.push('UNCOMMON'); }
    if(profileData.rarities.get('rare') == 0){ zeroPercentRarityArray.push('RARE'); }
    if(profileData.rarities.get('unique') == 0){ zeroPercentRarityArray.push('UNIQUE'); }
  
    for(const [itemID, itemData] of pItemMap.entries()){
      if(zeroPercentRarityArray.includes(itemData.Item.rarity)){
        pItemMap.delete(itemID);
      }
    }

    /// Remove all items of a certain type if 'other' is 0%

    if(profileData.traits.size > 0){
      let otherWeight = profileData.traits.get('other');
      if(otherWeight == 0){
  
        let traitsArray = Array.from(profileData.traits.keys());
        for(const [itemID, itemData] of pItemMap.entries()){
  
          // Check item shares trait with the traits in profileData.traits or not
          const intersection = itemData.TagArray.filter(tag => traitsArray.includes(tag.id+''));
          if(intersection.length <= 0){
            pItemMap.delete(itemID);
          }
  
        }
  
      }
    }
  
    if(profileData.categories.size > 0){
      let otherWeight = profileData.categories.get('other');
      if(otherWeight == 0){
  
        let categoriesArray = Array.from(profileData.categories.keys());
        for(const [itemID, itemData] of pItemMap.entries()){
  
          if(!categoriesArray.includes(itemData.Item.itemType)){
            pItemMap.delete(itemID);
          }
  
        }
  
      }
    }
  
    if(profileData.weapon_groups.size > 0){
      let otherWeight = profileData.weapon_groups.get('other');
      if(otherWeight == 0){
  
        let weaponGroupsArray = Array.from(profileData.weapon_groups.keys());
        for(const [itemID, itemData] of pItemMap.entries()){
  
          if(itemData.WeaponData != null){
  
            if(itemData.WeaponData.isRanged == 1 && !weaponGroupsArray.includes(itemData.WeaponData.rangedWeaponType)){
              pItemMap.delete(itemID);
            }
            if(itemData.WeaponData.isMelee == 1 && !weaponGroupsArray.includes(itemData.WeaponData.meleeWeaponType)){
              pItemMap.delete(itemID);
            }
  
          }
  
        }
  
      }
    }


    profileToItemMap.set(profileID, pItemMap);

  }




  /// Generate Items
  let generatedItems = new Map();

  let attemptedItemGens = 0;
  /* Generate until has items equal to inv size OR attempted to generate over 10*inv size times */
  while (generatedItems.size < g_inv_size && attemptedItemGens <= g_inv_size*10) {
    attemptedItemGens++;

    /// Pick a profile

    let totalProfileWeight = 0;
    for(const [profileID, profileData] of g_shop.profiles.entries()){
      totalProfileWeight += profileData.weight;
    }

    let profileRand = Math.floor(Math.random() * totalProfileWeight) + 1;
    let randProfileID = null;

    let totalProfileDetectWeight = 0;
    for(const [profileID, profileData] of g_shop.profiles.entries()){
      totalProfileDetectWeight += profileData.weight;
      if(totalProfileDetectWeight >= profileRand){
        randProfileID = profileID;
        break;
      }
    }

    const profileData = g_shop.profiles.get(randProfileID);
    let pItemMap = new Map(profileToItemMap.get(randProfileID));

    /// Pick a Trait
    let totalTraitWeight = 0;
    for(const [traitID, traitWeight] of profileData.traits.entries()){
      totalTraitWeight += traitWeight;
    }

    let traitRand = Math.floor(Math.random() * totalTraitWeight) + 1;
    let randTraitID = null;

    let totalTraitDetectWeight = 0;
    for(const [traitID, traitWeight] of profileData.traits.entries()){
      totalTraitDetectWeight += traitWeight;
      if(totalTraitDetectWeight >= traitRand){
        randTraitID = traitID;
        break;
      }
    }

    /// Filter itemMap by trait
    if(randTraitID != null){
      if(randTraitID == 'other'){
        // Delete all items that share a trait with profileData.traits

        let traitsArray = Array.from(profileData.traits.keys());
        for(const [itemID, itemData] of pItemMap.entries()){

          // Check item shares trait with the traits in profileData.traits
          const intersection = itemData.TagArray.filter(tag => traitsArray.includes(tag.id+''));
          if(intersection.length > 0){
            pItemMap.delete(itemID);
          }
    
        }

      } else {
        // Delete all items that don't have randTraitID trait

        for(const [itemID, itemData] of pItemMap.entries()){

          // Attempt to find trait within the item that has randTraitID
          const foundTrait = itemData.TagArray.filter(tag => tag.id == randTraitID);
          if(foundTrait.length <= 0){
            pItemMap.delete(itemID);
          }
    
        }

      }
    }

    if(pItemMap.size <= 0){
      continue;
    }


    /// Pick a Category
    let totalCategoryWeight = 0;
    for(const [categoryID, categoryWeight] of profileData.categories.entries()){
      totalCategoryWeight += categoryWeight;
    }

    let categoryRand = Math.floor(Math.random() * totalCategoryWeight) + 1;
    let randCategoryID = null;

    let totalCategoryDetectWeight = 0;
    for(const [categoryID, categoryWeight] of profileData.categories.entries()){
      totalCategoryDetectWeight += categoryWeight;
      if(totalCategoryDetectWeight >= categoryRand){
        randCategoryID = categoryID;
        break;
      }
    }

    /// Filter itemMap by category
    if(randCategoryID != null){
      if(randCategoryID == 'other'){
        // Delete all items that share a category with profileData.categories

        let categoriesArray = Array.from(profileData.categories.keys());
        for(const [itemID, itemData] of pItemMap.entries()){

          // Check item shares category with the categories in profileData.categories
          if(categoriesArray.includes(itemData.Item.itemType)){
            pItemMap.delete(itemID);
          }
    
        }

      } else {
        // Delete all items that don't have randCategoryID category

        for(const [itemID, itemData] of pItemMap.entries()){

          if(itemData.Item.itemType != randCategoryID){
            pItemMap.delete(itemID);
          }
    
        }

      }
    }

    if(pItemMap.size <= 0){
      continue;
    }


    
    /// Pick a Weapon Group
    let totalWeaponGroupWeight = 0;
    for(const [weaponGroupID, weaponGroupWeight] of profileData.weapon_groups.entries()){
      totalWeaponGroupWeight += weaponGroupWeight;
    }

    let weaponGroupRand = Math.floor(Math.random() * totalWeaponGroupWeight) + 1;
    let randWeaponGroupID = null;

    let totalWeaponGroupDetectWeight = 0;
    for(const [weaponGroupID, weaponGroupWeight] of profileData.weapon_groups.entries()){
      totalWeaponGroupDetectWeight += weaponGroupWeight;
      if(totalWeaponGroupDetectWeight >= weaponGroupRand){
        randWeaponGroupID = weaponGroupID;
        break;
      }
    }

    /// Filter itemMap by weapon group
    if(randWeaponGroupID != null){
      if(randWeaponGroupID == 'other'){
        // Delete all items that share a weapon group with profileData.weapon_groups

        let weaponGroupsArray = Array.from(profileData.weapon_groups.keys());
        for(const [itemID, itemData] of pItemMap.entries()){

          if(itemData.WeaponData != null){
    
            if(itemData.WeaponData.isRanged == 1 && weaponGroupsArray.includes(itemData.WeaponData.rangedWeaponType)){
              pItemMap.delete(itemID);
            }
            if(itemData.WeaponData.isMelee == 1 && weaponGroupsArray.includes(itemData.WeaponData.meleeWeaponType)){
              pItemMap.delete(itemID);
            }
    
          }
    
        }

      } else {
        // Delete all items that don't have randWeaponGroupID weapon group

        for(const [itemID, itemData] of pItemMap.entries()){

          if(itemData.WeaponData != null){
    
            if(itemData.WeaponData.isRanged == 1 && itemData.WeaponData.rangedWeaponType != randWeaponGroupID){
              pItemMap.delete(itemID);
            }
            if(itemData.WeaponData.isMelee == 1 && itemData.WeaponData.meleeWeaponType != randWeaponGroupID){
              pItemMap.delete(itemID);
            }
    
          }
    
        }

      }
    }

    if(pItemMap.size <= 0){
      continue;
    }


    /// Pick a Rarity
    let totalRarityWeight = 0;
    for(const [rarityID, rarityWeight] of profileData.rarities.entries()){
      totalRarityWeight += rarityWeight;
    }

    let rarityRand = Math.floor(Math.random() * totalRarityWeight) + 1;
    let randRarityID = null;

    let totalRarityDetectWeight = 0;
    for(const [rarityID, rarityWeight] of profileData.rarities.entries()){
      totalRarityDetectWeight += rarityWeight;
      if(totalRarityDetectWeight >= rarityRand){
        randRarityID = rarityID;
        break;
      }
    }

    /// Filter itemMap by rarity
    if(randRarityID != null){
      for(const [itemID, itemData] of pItemMap.entries()){

        if(itemData.Item.rarity != randRarityID.toUpperCase()){
          pItemMap.delete(itemID);
        }
    
      }
    }

    if(pItemMap.size <= 0){
      continue;
    }

    /// Remove all already selected items from pItemMap
    for(const [itemID, itemData] of generatedItems.entries()){
      pItemMap.delete(itemID);
    }

    if(pItemMap.size <= 0){
      continue;
    }

    /// Pick random item from remaining list
    let indexRand = Math.floor(Math.random() * pItemMap.size);
    let randItem = cloneObj(Array.from(pItemMap.values())[indexRand]);

    /// Determine quantity

    let randQuantity = null;
    if(randItem.Item.hasQuantity == 1){
      randQuantity = Math.floor(Math.random() * (profileData.quantity.consumable_max - profileData.quantity.consumable_min + 1) ) + profileData.quantity.consumable_min;
    } else {
      randQuantity = Math.floor(Math.random() * (profileData.quantity.permanent_max - profileData.quantity.permanent_min + 1) ) + profileData.quantity.permanent_min;
    }

    let rarityAdjustment = (profileData.quantity.rarity_adjustment / 100);

    if(randItem.Item.rarity == 'UNCOMMON'){
      randQuantity = Math.floor(randQuantity*(1-(0.75*rarityAdjustment)));
    } else if(randItem.Item.rarity == 'RARE'){
      randQuantity = Math.floor(randQuantity*(1-(0.95*rarityAdjustment)));
    }
    if(randQuantity == 0 || randItem.Item.rarity == 'UNIQUE'){
      randQuantity = 1;
    }

    randItem.Item.shop_quantity = randQuantity;

    /// Check if is formula

    let randItemID = null;
    if(randItem.Item.rarity != 'UNIQUE' && Math.floor(Math.random()*101) <= profileData.formula_chance){
      randItemID = randItem.Item.id+'_formula';
    } else {
      randItemID = randItem.Item.id+'';
    }

    /// Apply price markup

    if(randItemID.endsWith('_formula') && randItem.Item.level < 21){
      // Use formula price instead
      randItem.Item.price = g_formula_prices.get(randItem.Item.level+'');
    }

    randItem.Item.price = randItem.Item.price + Math.floor(randItem.Item.price*(g_price_markup/100));

    /// Add item

    generatedItems.set(randItemID, randItem);

  }


  // Sort by formula, level, then name
  generatedItems = new Map([...generatedItems.entries()].sort(
    function(a, b) {
      if (a[1].Item.level === b[1].Item.level) {
        // Name is only important when levels are the same
        return a[1].Item.name > b[1].Item.name ? 1 : -1;
      }
      return a[1].Item.level - b[1].Item.level;
    })
  );

  for(const [itemID, itemData] of generatedItems.entries()){

    const itemEntryID = 'generated-inventory-'+itemID;

    if(itemID.endsWith('_formula')){
      itemData.Item.name = '<span class="has-txt-noted is-italic">Formula: </span>'+itemData.Item.name;
    }

    let itemPrice = getConvertedPriceForSize(itemData.Item.size, itemData.Item.price);
    itemPrice = getCoinToString(itemPrice);
    if(itemData.Item.quantity > 1){
      itemPrice += ' for '+itemData.Item.quantity;
    }
    if(itemID.endsWith('_formula') && itemData.Item.rarity != 'COMMON'){
      itemPrice += '*'; // Formula price varies if not common
    }

    $('#container-generated-inventory').append(`
      <div id="${itemEntryID}" class="columns is-marginless is-mobile cursor-clickable has-bg-selectable">
        <div class="column is-2 border-bottom border-dark-lighter p-2 text-right">
          <span class="is-p has-txt-partial-noted">${itemData.Item.shop_quantity*itemData.Item.quantity} ×</span>
        </div>
        <div class="column is-4 border-bottom border-dark-lighter p-2 text-left">
          <span class="is-p">${itemData.Item.name}</span>
        </div>
        <div class="column is-2 border-bottom border-dark-lighter p-2">
          <span class="is-p">${itemPrice}</span>
        </div>
        <div class="column is-2 border-bottom border-dark-lighter p-2">
          <span class="is-p">${itemData.Item.level}</span>
        </div>
        <div class="column is-2 border-bottom border-dark-lighter p-2">
          <span class="is-p">${convertRarityToHTML(itemData.Item.rarity)}</span>
        </div>
      </div>
    `);

    $('#'+itemEntryID).click(function(){
      openQuickView('itemView', {
        ItemDataStruct : itemData,
      });
    });

    $('#'+itemEntryID).mouseenter(function(){
      $(this).removeClass('has-bg-selectable');
      $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+itemEntryID).mouseleave(function(){
      $(this).removeClass('has-bg-selectable-hover');
      $(this).addClass('has-bg-selectable');
    });

  }

  // If didn't generate any items, display message
  if(generatedItems.size <= 0){
    $('#container-generated-inventory').append(`
      <div class="columns is-marginless is-mobile has-bg-selectable">
        <div class="column border-bottom border-dark-lighter p-2">
          <span class="is-p">No items found. Try enabling some more books.</span>
        </div>
      </div>
    `);
  }

}