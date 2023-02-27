/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openAddItemQuickview(data) {

    $('#quickViewTitle').html('Add Items');
    $('#quickViewTitleRight').html('<button id="createCustomItemBtn" class="button is-very-small is-success is-outlined is-rounded is-pulled-right mr-1">Create Item</button>');
    $('#createCustomItemBtn').click(function(){
        $(this).addClass('is-loading');
        socket.emit("requestAddItemToInv",
            getCharIDFromURL(),
            data.InvID,
            62, // Hardcoded New Item ID
            1);
        $(this).blur();
    });

    let qContent = $('#quickViewContent');

    qContent.append('<div class="tabs is-small is-centered is-marginless mb-1"><ul class="category-tabs"><li><a id="itemTabAll">All</a></li><li><a id="itemTabGeneral">General</a></li><li><a id="itemTabMagical">Magical</a></li><li><a id="itemTabAlchemical">Alchemical</a></li><li><a id="itemTabCurrency">Currency</a></li></ul></div>');

    qContent.append('<div class="columns is-mobile is-marginless mb-3"><div class="column py-1 pr-1"><p class="control has-icons-left"><input id="allItemSearch" class="input" type="text" autocomplete="off"><span class="icon is-left"><i class="fas fa-search" aria-hidden="true"></i></span></p></div><div class="column is-3 py-1 mt-1"><div class="select is-small is-info"><select id="allItemsFilterBySubcategory"></select></div></div></div>');

    qContent.append('<div id="addItemListSection" class="tile is-ancestor is-vertical"></div>');

    $('#itemTabAll').click(function(){
        $('#allItemsFilterBySubcategory').parent().parent().addClass('is-hidden');
        $('#allItemsFilterBySubcategory').html('');
        $('#allItemSearch').attr('placeholder', 'Search All Items');
        changeItemCategoryTab('itemTabAll', data);
    });

    $('#itemTabGeneral').click(function(){
        $('#allItemsFilterBySubcategory').parent().parent().removeClass('is-hidden');
        $('#allItemsFilterBySubcategory').html(`
          <option value="ALL">Category</option>
          <option value="AMMUNITION">Ammunition</option>
          <option value="ARMOR">Armor</option>
          <option value="BOOK">Book</option>
          <option value="GADGET">Gadget</option>
          <option value="INGREDIENT">Ingredient</option>
          <option value="INSTRUMENT">Instrument</option>
          <option value="KIT">Kit</option>
          <option value="SHIELD">Shield</option>
          <option value="STORAGE">Storage</option>
          <option value="TOOL">Tool</option>
          <option value="WEAPON">Weapon</option>
          <option value="OTHER">Other</option>
        `);
        $('#allItemSearch').attr('placeholder', 'Search General Items');
        changeItemCategoryTab('itemTabGeneral', data);
    });

    $('#itemTabMagical').click(function(){
        $('#allItemsFilterBySubcategory').parent().parent().removeClass('is-hidden');
        $('#allItemsFilterBySubcategory').html(`
          <option value="ALL">Category</option>
          <option value="ADJUSTMENT">Adjustment</option>
          <option value="ARTIFACT">Artifact</option>
          <option value="AMMUNITION">Ammunition</option>
          <option value="ARMOR">Armor</option>
          <option value="BELT">Belt</option>
          <option value="BOOK">Book</option>
          <option value="BOOTS">Boots</option>
          <option value="BRACERS">Bracers</option>
          <option value="CATALYST">Catalyst</option>
          <option value="CIRCLET">Circlet</option>
          <option value="CLOAK">Cloak</option>
          <option value="COMPANION">Companion</option>
          <option value="EYEPIECE">Eyepiece</option>
          <option value="FULU">Fulu</option>
          <option value="GIFT">Gift</option>
          <option value="GLOVES">Gloves</option>
          <option value="GRIMOIRE">Grimoire</option>
          <option value="HAT">Hat</option>
          <option value="INSTRUMENT">Instrument</option>
          <option value="MASK">Mask</option>
          <option value="NECKLACE">Necklace</option>
          <option value="OIL">Oil</option>
          <option value="POTION">Potion</option>
          <option value="RING">Ring</option>
          <option value="ROD">Rod</option>
          <option value="RUNE">Runestone</option>
          <option value="SCROLL">Scroll</option>
          <option value="SHIELD">Shield</option>
          <option value="SPELLHEART">Spellheart</option>
          <option value="STAFF">Staff</option>
          <option value="STORAGE">Storage</option>
          <option value="STRUCTURE">Structure</option>
          <option value="TALISMAN">Talisman</option>
          <option value="TATTOO">Tattoo</option>
          <option value="WAND">Wand</option>
          <option value="WEAPON">Weapon</option>
          <option value="OTHER">Other</option>`);
        $('#allItemSearch').attr('placeholder', 'Search Magical Items');
        changeItemCategoryTab('itemTabMagical', data);
    });

    $('#itemTabAlchemical').click(function(){
        $('#allItemsFilterBySubcategory').parent().parent().removeClass('is-hidden');
        $('#allItemsFilterBySubcategory').html('<option value="ALL">Category</option><option value="BOMB">Bomb</option><option value="DRUG">Drug</option><option value="ELIXIR">Elixir</option><option value="INGREDIENT">Ingredient</option><option value="POISON">Poison</option><option value="TOOL">Tool</option><option value="OTHER">Other</option>');
        $('#allItemSearch').attr('placeholder', 'Search Alchemical Items');
        changeItemCategoryTab('itemTabAlchemical', data);
    });

    $('#itemTabCurrency').click(function(){
        $('#allItemsFilterBySubcategory').parent().parent().addClass('is-hidden');
        $('#allItemsFilterBySubcategory').html('<option value="ALL">All</option>');
        $('#allItemSearch').attr('placeholder', 'Search Currency');
        changeItemCategoryTab('itemTabCurrency', data);
    });

    $('#itemTabAll').click();

}





function changeItemCategoryTab(type, data){

    $('#addItemListSection').html('');

    $('#itemTabAll').parent().removeClass("is-active");
    $('#itemTabGeneral').parent().removeClass("is-active");
    $('#itemTabMagical').parent().removeClass("is-active");
    $('#itemTabAlchemical').parent().removeClass("is-active");
    $('#itemTabCurrency').parent().removeClass("is-active");
    $('#'+type).parent().addClass("is-active");

    let allItemSearch = $('#allItemSearch');
    let allItemSearchInput = null;
    if(allItemSearch.val() != ''){
        allItemSearchInput = allItemSearch.val().toUpperCase();
        allItemSearch.addClass('is-info');
    } else {
        allItemSearch.removeClass('is-info');
        if(type != 'itemTabAll') {
            allItemSearch.blur();
        }
    }

    let allItemsFilterBySubcategoryValue = $('#allItemsFilterBySubcategory').val();

    $('#allItemSearch').off('change');
    $('#allItemSearch').change(function(){
        changeItemCategoryTab(type, data);
    });

    $('#allItemsFilterBySubcategory').off('change');
    $('#allItemsFilterBySubcategory').change(function(){
        changeItemCategoryTab(type, data);
    });

    for(const [itemID, itemDataStruct] of data.ItemMap.entries()){

        let willDisplay = false;

        if(type == 'itemTabAll') {
            willDisplay = (allItemSearchInput != null);
        } else if(type == 'itemTabGeneral') {
            let magical = itemDataStruct.TagArray.find(tag => {
                // Hardcoded - Magical Trait ID 41;
                // Primal Trait ID 304; Occult Trait ID 500; Divine Trait ID 265; Arcane Trait ID 2;
                return tag.id === 41 || tag.id === 304 || tag.id === 500 || tag.id === 265 || tag.id === 2;
            });
            let alchemical = itemDataStruct.TagArray.find(tag => {
                return tag.id === 399; // Hardcoded - Alchemical Trait ID 399
            });
            willDisplay = (magical == null && alchemical == null && itemDataStruct.Item.itemType != 'CURRENCY');
        } else if(type == 'itemTabMagical') {
            let magical = itemDataStruct.TagArray.find(tag => {
                // Hardcoded - Magical Trait ID 41;
                // Primal Trait ID 304; Occult Trait ID 500; Divine Trait ID 265; Arcane Trait ID 2;
                return tag.id === 41 || tag.id === 304 || tag.id === 500 || tag.id === 265 || tag.id === 2;
            });
            willDisplay = (magical != null);
        } else if(type == 'itemTabAlchemical') {
            let alchemical = itemDataStruct.TagArray.find(tag => {
                return tag.id === 399; // Hardcoded - Alchemical Trait ID 399
            });
            willDisplay = (alchemical != null);
        } else if(type == 'itemTabCurrency') {
            if(itemDataStruct.Item.itemType == 'CURRENCY') {
                willDisplay = true;
            }
        }
        
        if(allItemSearchInput != null){
            $('#allItemsFilterBySubcategory').parent().removeClass('is-info');
            
            let itemName = itemDataStruct.Item.name.toUpperCase();
            if(!itemName.includes(allItemSearchInput)){
                willDisplay = false;
            }

        } else {
            $('#allItemsFilterBySubcategory').parent().addClass('is-info');

            if(allItemsFilterBySubcategoryValue == 'ALL'){
                $('#allItemsFilterBySubcategory').parent().removeClass('is-info');
                if(type != 'itemTabCurrency'){
                    willDisplay = false;
                }
            } else if(allItemsFilterBySubcategoryValue == 'OTHER'){
                let foundItemType = false;
                if(itemDataStruct.Item.itemType != 'OTHER') {
                    $("#allItemsFilterBySubcategory option").each(function() {
                        if(itemDataStruct.Item.itemType === $(this).val()){
                            foundItemType = true;
                        }
                    });
                }
                if(foundItemType){
                    willDisplay = false;
                }
            } else {
                if(itemDataStruct.Item.itemType !== allItemsFilterBySubcategoryValue){
                    willDisplay = false;
                }
            }

        }

        if(willDisplay){
            displayAddItem(itemID, itemDataStruct, data);
        }

    }

    $('.itemEntryPart').click(function(){

        let itemID = $(this).parent().attr('data-item-id');
        let itemDataStruct = data.ItemMap.get(itemID+"");

        let addItemChevronItemID = 'addItemChevronItemID'+itemID;
        let addItemNameID = 'addItemName'+itemID;
        let addItemDetailsItemID = 'addItemDetailsItem'+itemID;
        if($('#'+addItemDetailsItemID).html() != ''){
            $('#'+addItemChevronItemID).removeClass('fa-chevron-up');
            $('#'+addItemChevronItemID).addClass('fa-chevron-down');
            $('#'+addItemNameID).removeClass('has-text-white-ter');
            //$(this).parent().removeClass('has-bg-options-header-bold');
            displayItemDetails(null, addItemDetailsItemID);
        } else {
            $('#'+addItemChevronItemID).removeClass('fa-chevron-down');
            $('#'+addItemChevronItemID).addClass('fa-chevron-up');
            $('#'+addItemNameID).addClass('has-text-white-ter');
            //$(this).parent().addClass('has-bg-options-header-bold');
            displayItemDetails(itemDataStruct, addItemDetailsItemID);
        }

    });

}

function displayAddItem(itemID, itemDataStruct, data){

    if(itemDataStruct.Item.hidden == 1 || itemDataStruct.Item.isArchived == 1){
        return;
    }

    let addItemAddItemID = 'addItemAddItem'+itemID;
    let addItemChevronItemID = 'addItemChevronItemID'+itemID;
    let addItemNameID = 'addItemName'+itemID;
    let addItemDetailsItemID = 'addItemDetailsItem'+itemID;
    
    let itemLevel = (itemDataStruct.Item.level == 0 || itemDataStruct.Item.level == 999) ? "" : "Lvl "+itemDataStruct.Item.level;

    let itemName = itemDataStruct.Item.name;
    if(itemDataStruct.Item.quantity > 1){
        itemName += ' ('+itemDataStruct.Item.quantity+')';
    }

    
    let addItemHTML = null;
    if (itemDataStruct.Item.itemType == 'CURRENCY'){
      addItemHTML = '<button id="'+addItemAddItemID+'" class="button my-1 is-small is-success is-outlined is-rounded">Give</button>';
    } else if (itemDataStruct.Item.price == 0) {
      addItemHTML = '<div class="select my-1 is-small is-success"><select id="'+addItemAddItemID+'"><option value="chooseDefault">Add</option><optgroup label="─────"></optgroup><option value="GIVE">Give</option><option value="FORMULA">Formula</option></select></div>';
    } else {
      addItemHTML = '<div class="select my-1 is-small is-success"><select id="'+addItemAddItemID+'"><option value="chooseDefault">Add</option><optgroup label="─────"></optgroup><option value="BUY">Buy</option><option value="GIVE">Give</option><option value="FORMULA">Formula</option></select></div>';
    }

    $('#addItemListSection').append(`
      <div class="tile is-parent is-flex is-paddingless border-bottom border-additems has-bg-options-header-bold cursor-clickable" data-item-id="${itemID}">
        <div class="tile is-child is-7 itemEntryPart">
          <p id="${addItemNameID}" class="has-text-left mt-1 has-txt-value-number"><span class="ml-2">${getItemIcon(itemDataStruct, null)}</span>${itemName}</p>
        </div>
        <div class="tile is-child is-2 itemEntryPart">
          <p class="has-text-centered is-size-7 mt-2">${itemLevel}</p>
        </div>
        <div class="tile is-child">${addItemHTML}</div>
        <div class="tile is-child is-1 itemEntryPart">
          <span class="icon has-txt-noted mt-2"><i id="${addItemChevronItemID}" class="fas fa-chevron-down"></i></span>
        </div>
      </div>
      <div id="${addItemDetailsItemID}" class="pos-relative"></div>
    `);

    if(itemDataStruct.Item.itemType != 'CURRENCY'){

      $('#'+addItemAddItemID).change(function(){
        let addItemType = $("#"+addItemAddItemID+" option:selected").val();
        if(addItemType != 'chooseDefault') {
  
          if(addItemType == 'FORMULA') {
            socket.emit("requestAddItemCustomizeToInv",
                getCharIDFromURL(),
                data.InvID,
                95, // Hardcoded - Parchment ID
                {
                  name: 'Formula - '+itemDataStruct.Item.name,
                  price: 0,
                  bulk: 0,
                  description: 'This thin sheet of parchment is a schematic, containing the instructions for making the (item: '+itemDataStruct.Item.name.replaceAll(/[\(\)]/g, '')+') item.',
                  size: 'MEDIUM',
                  isShoddy: 0,
                  materialType: null,
                  hitPoints: 1,
                  brokenThreshold: 0,
                  hardness: 0,
                  code: null,
                  itemTagsData: null,

                  weaponDieType: null,
                  weaponDamageType: null,

                  storageMaxBulk: null,

                  quantity: 1
                }
            );
          }

          if(addItemType == 'GIVE') {
            $(this).parent().addClass('is-loading');
            socket.emit("requestAddItemToInv",
                getCharIDFromURL(),
                data.InvID,
                itemID,
                itemDataStruct.Item.quantity);
          }
  
          if(addItemType == 'BUY') {
  
            const itemPrice = getConvertedPriceForSize(itemDataStruct.Item.size, itemDataStruct.Item.price);
            let itemPriceInCP = itemPrice;

            const itemPriceSingleInCP = Math.ceil(itemPrice / itemDataStruct.Item.quantity);
            const maxQtyForItem = Math.floor(getTotalCoinsInCP() / itemPriceSingleInCP);

            if(hasCoins(itemPriceInCP)){

              let buyQtyHTML = '';
              if(itemDataStruct.Item.hasQuantity == 1){
                buyQtyHTML = `
                  <span class="is-pulled-right is-size-6">
                    <span class="field is-horizontal">
                      <label class="label pt-1 pr-1">Qty</label>
                      <span class="control">
                        <input id="modal-buy-item-qty-input" class="input is-inline is-small ml-1 mr-3" type="number" autocomplete="off" min="1" max="${maxQtyForItem}" value="${itemDataStruct.Item.quantity}">
                      </span>
                    </span>
                  </span>`;
              }

              new ConfirmMessage('Buy “'+itemDataStruct.Item.name+'”'+buyQtyHTML, 'This purchase will cost <span id="modal-buy-item-price" class="has-text-info">'+getCoinToString(itemPriceInCP)+'</span>, buying it will automatically simplify your coins. Are you sure you want to buy this?', 'Buy Item', 'modal-buy-item', 'modal-buy-item-btn', 'is-success');

              if(itemDataStruct.Item.hasQuantity == 1){
                $('#modal-buy-item-qty-input').blur(function() {
                  let itemQty = parseInt($(this).val());
                  if(isNaN(itemQty) || itemQty < 1) { itemQty = 1; }
                  if(itemQty > maxQtyForItem) { itemQty = maxQtyForItem; }
                  $(this).val(itemQty);
  
                  itemPriceInCP = Math.ceil(itemPrice * (itemQty / itemDataStruct.Item.quantity));
                  $('#modal-buy-item-price').text(getCoinToString(itemPriceInCP));
  
                });
              }

              $('#modal-buy-item-btn').click(function(event) {
                reduceAndSimplifyCoins(itemPriceInCP);

                let itemQty = itemDataStruct.Item.quantity;
                if(itemDataStruct.Item.hasQuantity == 1){
                  itemQty = parseInt($('#modal-buy-item-qty-input').val());
                  if(isNaN(itemQty) || itemQty < 1) { itemQty = 1; }
                  if(itemQty > maxQtyForItem) { itemQty = maxQtyForItem; }
                }

                socket.emit("requestAddItemToInv",
                    getCharIDFromURL(),
                    data.InvID,
                    itemID,
                    itemQty);
              });

            } else {
              
              new ConfirmMessage('Insufficient Funds', 'This item costs <span class="has-text-danger">'+itemPriceStr+'</span>, more than you have in your inventory.', 'Okay', 'modal-fail-to-buy-item', 'modal-fail-to-buy-item-btn');
              addQuickViewProtection();
              
            }
  
          }
          $("#"+addItemAddItemID).val('chooseDefault');
        }
      });

    } else {

      $('#'+addItemAddItemID).click(function(){
        $(this).addClass('is-loading');
        socket.emit("requestAddItemToInv",
            getCharIDFromURL(),
            data.InvID,
            itemID,
            itemDataStruct.Item.quantity);
        $(this).blur();
      });

    }

}

function displayItemDetails(itemDataStruct, addItemDetailsItemID){

    if(itemDataStruct == null){
        $('#'+addItemDetailsItemID).html('');
        return;
    }

    $('#'+addItemDetailsItemID).html('<div class="tile is-parent is-vertical is-paddingless border-bottom border-additems p-2 text-center"></div>');
    let itemDetails = $('#'+addItemDetailsItemID+' > div');

    let rarity = itemDataStruct.Item.rarity;
    let tagsInnerHTML = '';
    switch(rarity) {
      case 'UNCOMMON': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-uncommon">Uncommon</button>';
        break;
      case 'RARE': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-rare">Rare</button>';
        break;
      case 'UNIQUE': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-unique">Unique</button>';
        break;
      default: break;
    }

    let itemSize = itemDataStruct.Item.size;
    switch(itemSize) {
        case 'TINY': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom has-tooltip-multiline" data-tooltip="An item of Tiny size has the same Price but half the Bulk of a Medium-sized version of the same item (half of a 1 Bulk item is treated as light Bulk for this conversion).">Tiny</button>';
            break;
        case 'SMALL': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom has-tooltip-multiline" data-tooltip="An item of Small size has the same Price and Bulk as the Medium-sized version, the item is simply a bit smaller for tinier folk.">Small</button>';
            break;
        case 'LARGE': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom has-tooltip-multiline" data-tooltip="An item of Large size has 2 times the Price and Bulk of a Medium-sized version of the same item.">Large</button>';
            break;
        case 'HUGE': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom has-tooltip-multiline" data-tooltip="An item of Huge size has 4 times the Price and Bulk of a Medium-sized version of the same item.">Huge</button>';
            break;
        case 'GARGANTUAN': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom has-tooltip-multiline" data-tooltip="An item of Gargantuan size has 8 times the Price and Bulk of a Medium-sized version of the same item.">Gargantuan</button>';
            break;
        default: break;
    }

    for(const tag of itemDataStruct.TagArray){
        let tagDescription = tag.description;
        if(tagDescription.length > g_tagStringLengthMax){
            tagDescription = tagDescription.substring(0, g_tagStringLengthMax);
            tagDescription += '...';
        }
        tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-info has-tooltip-bottom has-tooltip-multiline tagButton" data-tooltip="'+processTextRemoveIndexing(tagDescription)+'">'+tag.name+getImportantTraitIcon(tag)+'</button>';
    }

    if(tagsInnerHTML != ''){
        itemDetails.append('<div class="buttons is-marginless is-centered">'+tagsInnerHTML+'</div>');
        itemDetails.append('<hr class="mb-2 mt-1">');
    }

    $('.tagButton').click(function(){
        let tagName = $(this).text();
        openQuickView('tagView', {
            TagName : tagName,
            _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
        }, $('#quickviewDefault').hasClass('is-active'));
    });

    if(itemDataStruct.WeaponData != null){

        let weapGroup = null;
        if(itemDataStruct.WeaponData.isRanged == 1){
            weapGroup = capitalizeWord(itemDataStruct.WeaponData.rangedWeaponType);
        }
        if(itemDataStruct.WeaponData.isMelee == 1){
            weapGroup = capitalizeWord(itemDataStruct.WeaponData.meleeWeaponType);
        }

        let weapCategory = capitalizeWord(itemDataStruct.WeaponData.category);
        itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-6"><p><strong>Category:</strong> '+weapCategory+'</p></div><div class="tile is-child is-6"><p><strong>Group:</strong> '+weapGroup+'</p></div></div>');

        itemDetails.append('<hr class="m-2">');

    }

    if(itemDataStruct.ArmorData != null){

        let armorCategory = capitalizeWord(itemDataStruct.ArmorData.category);
        let armorGroup = (itemDataStruct.ArmorData.armorType == 'N/A') ? '-' : capitalizeWord(itemDataStruct.ArmorData.armorType);
        itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-6"><p><strong>Category:</strong> '+armorCategory+'</p></div><div class="tile is-child is-6"><p><strong>Group:</strong> '+armorGroup+'</p></div></div>');

        itemDetails.append('<hr class="m-2">');

    }


    let price = getConvertedPriceForSize(itemDataStruct.Item.size, itemDataStruct.Item.price);
    price = getCoinToString(price);
    if(itemDataStruct.Item.quantity > 1){
        price += ' for '+itemDataStruct.Item.quantity;
    }

    let bulk = determineItemBulk(g_charSize, itemDataStruct.Item.size, itemDataStruct.Item.bulk);
    bulk = getBulkFromNumber(bulk);

    itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-4"><strong>Price</strong></div><div class="tile is-child is-4"><strong>Bulk</strong></div><div class="tile is-child is-4"><strong>Hands</strong></div></div>');
    itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-4"><p>'+price+'</p></div><div class="tile is-child is-4"><p>'+bulk+'</p></div><div class="tile is-child is-4"><p>'+getHandsToString(itemDataStruct.Item.hands)+'</p></div></div>');
    
    if(itemDataStruct.Item.usage != null){
        itemDetails.append('<hr class="m-2">');
        itemDetails.append('<p class="is-size-6 has-text-left px-3 negative-indent"><strong>Usage:</strong> '+itemDataStruct.Item.usage+'</p>');
    }

    itemDetails.append('<hr class="m-2">');

        
    if(itemDataStruct.WeaponData != null){

        let consumableTag = itemDataStruct.TagArray.find(tag => {
            return tag.id == 402; // Hardcoded Consumable Tag ID
        });

        // Fixes Prisma empty enum for dieType, like for Blowguns
        if(itemDataStruct.WeaponData.dieType == 'EMPTY_ENUM_VALUE'){
          itemDataStruct.WeaponData.dieType = '';
        }

        let damage = itemDataStruct.WeaponData.diceNum+""+itemDataStruct.WeaponData.dieType+" "+itemDataStruct.WeaponData.damageType;
        damage = (consumableTag != null) ? 'See Text' : damage;

        itemDetails.append('<div class="tile is-flex"><div class="tile is-child"><strong>Damage</strong></div></div>');
        itemDetails.append('<div class="tile is-flex"><div class="tile is-child"><p>'+damage+'</p></div></div>');

        itemDetails.append('<hr class="m-2">');

        if(itemDataStruct.WeaponData.isRanged == 1){

            let reload = itemDataStruct.WeaponData.rangedReload;
            if(reload == 0){ reload = '-'; }
            let range = itemDataStruct.WeaponData.rangedRange+" ft";
            itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-6"><strong>Range</strong></div><div class="tile is-child is-6"><strong>Reload</strong></div></div>');
            itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-6"><p>'+range+'</p></div><div class="tile is-child is-6"><p>'+reload+'</p></div></div>');

            itemDetails.append('<hr class="m-2">');

        }

    }

    if(itemDataStruct.ArmorData != null){
        
        itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-6"><strong>AC Bonus</strong></div><div class="tile is-child is-6"><strong>Dex Cap</strong></div></div>');
        itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-6"><p>'+signNumber(itemDataStruct.ArmorData.acBonus)+'</p></div><div class="tile is-child is-6"><p>'+signNumber(itemDataStruct.ArmorData.dexCap)+'</p></div></div>');

        itemDetails.append('<hr class="m-2">');

        let minStrength = (itemDataStruct.ArmorData.minStrength == 0) ? '-' : itemDataStruct.ArmorData.minStrength+'';
        let checkPenalty = (itemDataStruct.ArmorData.checkPenalty == 0) ? '-' : itemDataStruct.ArmorData.checkPenalty+'';
        let speedPenalty = (itemDataStruct.ArmorData.speedPenalty == 0) ? '-' : itemDataStruct.ArmorData.speedPenalty+' ft';
        itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-4"><strong>Strength</strong></div><div class="tile is-child is-4"><strong>Check Penalty</strong></div><div class="tile is-child is-4"><strong>Speed Penalty</strong></div></div>');
        itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-4"><p>'+minStrength+'</p></div><div class="tile is-child is-4"><p>'+checkPenalty+'</p></div><div class="tile is-child is-4"><p>'+speedPenalty+'</p></div></div>');

        itemDetails.append('<hr class="m-2">');

    }

    if(itemDataStruct.ShieldData != null){

        let speedPenalty = (itemDataStruct.ShieldData.speedPenalty == 0) ? '-' : itemDataStruct.ShieldData.speedPenalty+' ft';
        itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-6"><strong>AC Bonus</strong></div><div class="tile is-child is-6"><strong>Speed Penalty</strong></div></div>');
        itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-6"><p>'+signNumber(itemDataStruct.ShieldData.acBonus)+'</p></div><div class="tile is-child is-6"><p>'+speedPenalty+'</p></div></div>');

        itemDetails.append('<hr class="m-2">');

    }

    if(itemDataStruct.StorageData != null){
        
        let maxBagBulk = itemDataStruct.StorageData.maxBulkStorage;
        let bulkIgnored = itemDataStruct.StorageData.bulkIgnored;
        let bulkIgnoredMessage = "-";
        if(bulkIgnored != 0.0){
            if(bulkIgnored == maxBagBulk){
                bulkIgnoredMessage = "All Items";
            } else {
                bulkIgnoredMessage = "First "+bulkIgnored+" Bulk of Items";
            }
        }

        itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-6"><strong>Bulk Storage</strong></div><div class="tile is-child is-6"><strong>Bulk Ignored</strong></div></div>');
        itemDetails.append('<div class="tile is-flex"><div class="tile is-child is-6"><p>'+maxBagBulk+'</p></div><div class="tile is-child is-6"><p>'+bulkIgnoredMessage+'</p></div></div>');

        itemDetails.append('<hr class="m-2">');
    }

    itemDetails.append(processText(itemDataStruct.Item.description, true, true, 'MEDIUM'));

    if(itemDataStruct.ShieldData != null) { // If item is shield,
      itemDetails.append('<hr class="m-2">');
      itemDetails.append('<div class="columns is-centered is-marginless text-center"><div class="column is-paddingless"><p><strong>Hardness</strong></p><p>'+itemDataStruct.Item.hardness+'</p></div><div class="column is-paddingless"><p><strong>Hit Points</strong></p><p>'+itemDataStruct.Item.hitPoints+'</p></div><div class="column is-paddingless"><p><strong>BT</strong></p><p>'+itemDataStruct.Item.brokenThreshold+'</p></div></div>');
    }

    let contentSourceHTML = getContentSource(itemDataStruct.Item.id, itemDataStruct.Item.contentSrc, itemDataStruct.Item.homebrewID).replace('position: fixed;', 'position: absolute;');
    itemDetails.append(contentSourceHTML);

}