/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_invItemView_isCriticalHit = false;

function openInvItemQuickview(data) {
    addBackFunctionality(data);

    let viewOnly = (data.InvItem.viewOnly != null) ? true : false;

    let invItemName = data.InvItem.name;

    let itemLevel = getInvItemLevel(data.Item, data.InvItem);
    if(itemLevel > 0 && itemLevel != 999){
        invItemName += '<sup class="has-txt-listing is-size-7-5 is-italic"> Lvl '+itemLevel+'</sup>';
    }
    // Hardcoded New Item ID // If item isn't New Item, Paper, Parchment, and isn't an item with N/A level
    if(data.InvItem.name != data.Item.Item.name && data.Item.Item.id != 62 && data.Item.Item.id != 94 && data.Item.Item.id != 95 && data.Item.Item.level != 999 && data.ExtraData.IsCustomUnarmedAttack !== true){
        invItemName += '<p class="is-inline pl-1 is-size-7-5 is-italic"> ( '+data.Item.Item.name+' )</p>';
    }
    $('#quickViewTitle').html(invItemName);
    let qContent = $('#quickViewContent');

    let invItemQtyInputID = 'invItemQtyInput'+data.InvItem.id;
    let invItemHPInputID = 'invItemHPInput'+data.InvItem.id;
    
    let invItemMoveSelectID = 'invItemMoveSelect'+data.InvItem.id;
    let invItemMoveButtonID = 'invItemMoveButton'+data.InvItem.id;

    let invItemRemoveButtonID = 'invItemRemoveButton'+data.InvItem.id;
    let invItemCustomizeButtonID = 'invItemCustomizeButton'+data.InvItem.id;

    let isShoddy = (data.InvItem.isShoddy == 1);
    let maxHP = (isShoddy) ? Math.floor(data.InvItem.hitPoints/2) : data.InvItem.hitPoints;
    let brokenThreshold = (isShoddy) ? Math.floor(data.InvItem.brokenThreshold/2) : data.InvItem.brokenThreshold;

    data.InvItem.currentHitPoints = (data.InvItem.currentHitPoints > maxHP) ? maxHP : data.InvItem.currentHitPoints;

    let isBroken = (data.InvItem.currentHitPoints <= brokenThreshold);
    if(doesntHaveItemHealth(data.InvItem)) {isBroken = false;}

    let isInvestable = false;

    let tagsInnerHTML = '';

    let rarity = data.Item.Item.rarity;
    switch(rarity) {
        case 'UNCOMMON': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-uncommon">Uncommon</button>';
            break;
        case 'RARE': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-rare">Rare</button>';
            break;
        case 'UNIQUE': tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-unique">Unique</button>';
            break;
        default: break;
    }

    if(isBroken){
        tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-danger has-tooltip-bottom has-tooltip-multiline" data-tooltip="A broken object can’t be used for its normal function, nor does it grant bonuses - with the exception of armor. Broken armor still grants its item bonus to AC, but it also imparts a status penalty to AC depending on its category: -1 for broken light armor, -2 for broken medium armor, or -3 for broken heavy armor. A broken item still imposes penalties and limitations normally incurred by carrying, holding, or wearing it.">Broken</button>';
    }
    if(isShoddy){
        tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-warning has-tooltip-bottom has-tooltip-multiline" data-tooltip="Improvised or of dubious make, shoddy items are never available for purchase except for in the most desperate of communities. When available, a shoddy item usually costs half the Price of a standard item, though you can never sell one in any case. Attacks and checks involving a shoddy item take a –2 item penalty. This penalty also applies to any DCs that a shoddy item applies to (such as AC, for shoddy armor). A shoddy suit of armor also worsens the armor’s check penalty by 2. A shoddy item’s Hit Points and Broken Threshold are each half that of a normal item of its type.">Shoddy</button>';
    }

    let itemSize = data.InvItem.size;
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

    if(data.InvItem.materialType != null){
        let itemMaterial = g_materialsMap.get(data.InvItem.materialType);
        if(itemMaterial != null){
            tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom has-tooltip-multiline" data-tooltip="'+processTextRemoveIndexing(itemMaterial.Description)+'">'+itemMaterial.Name+'</button>';
        }
    }

    let tagArray = getItemTraitsArray(data.Item, data.InvItem);
    for(const tag of tagArray){
        let tagDescription = tag.description;
        if(tagDescription.length > g_tagStringLengthMax){
            tagDescription = tagDescription.substring(0, g_tagStringLengthMax);
            tagDescription += '...';
        }
        tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-info has-tooltip-bottom has-tooltip-multiline tagButton" data-tooltip="'+processTextRemoveIndexing(tagDescription)+'">'+tag.name+getImportantTraitIcon(tag)+'</button>';
        if(tag.id === 235){ // Hardcoded Invested Tag ID
            if(maxInvests > currentInvests || (maxInvests == currentInvests && data.InvItem.isInvested == 1)) {
                $('#quickViewTitleRight').html('<span class="pr-2"><span id="investedIconButton" class="button is-very-small is-info is-rounded has-tooltip-left" data-tooltip="Invest ('+currentInvests+'/'+maxInvests+')"><span id="investedIconName" class="pr-1 is-size-7">Invest</span><span class="icon is-small"><i class="fas fa-lg fa-hat-wizard"></i></span></span></span>');
            } else {
                $('#quickViewTitleRight').html('<span class="pr-2"><span class="button is-very-small is-info is-outlined is-rounded has-tooltip-left" data-tooltip="Invest ('+currentInvests+'/'+maxInvests+')" disabled><span class="pr-1 is-size-7">Invest</span><span class="icon is-small"><i class="fas fa-lg fa-hat-wizard"></i></span></span></span>');
            }
            isInvestable = true;
        }
    }

    if(tagsInnerHTML != ''){
        qContent.append('<div class="buttons is-marginless is-centered">'+tagsInnerHTML+'</div>');
        qContent.append('<hr class="mb-2 mt-1">');
    }

    $('.tagButton').click(function(){
        let tagName = $(this).text();
        openQuickView('tagView', {
            TagName : tagName,
            _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
        }, $('#quickviewDefault').hasClass('is-active'));
    });

    if(isInvestable){

        if(data.InvItem.isInvested == 1) {
            $('#investedIconButton').removeClass('is-outlined');
            $('#investedIconName').text('Invested');
        } else {
            $('#investedIconButton').addClass('is-outlined');
            $('#investedIconName').text('Invest');
        }

        $('#investedIconButton').click(function() {
            let isInvested = (data.InvItem.isInvested == 1) ? 0 : 1;
            socket.emit("requestInvItemInvestChange",
                data.InvItem.id,
                isInvested);
        });

    }

    let price = getConvertedPriceForSize(data.InvItem.size, data.InvItem.price);
    price = getCoinToString(price);
    if(data.Item.Item.quantity > 1){
        price += ' for '+data.Item.Item.quantity;
    }

    qContent.append('<p class="is-size-6 has-text-left px-3"><strong>Price</strong> '+price+'</p>');

    let usageBulkEntry = '';
    if(data.Item.Item.usage != null){
        usageBulkEntry += '<strong>Usage</strong> '+data.Item.Item.usage+'; ';
    }
    let bulk = determineItemBulk(g_charSize, data.InvItem.size, data.InvItem.bulk);

    let armorAdjBulk = getWornArmorBulkAdjustment(data.InvItem, bulk);
    let armorAdjBulkText = null;
    if(bulk == 0.1 && armorAdjBulk == 1){
      armorAdjBulkText = '<span class="is-size-6-5 has-text-info is-italic"> ➞ <strong class="has-text-info">1</strong> from carrying and not wearing armor</span>';
    } else if(armorAdjBulk > bulk) {
      armorAdjBulkText = '<span class="is-size-6-5 has-text-info is-italic"> + <strong class="has-text-info">1</strong> from carrying and not wearing armor</span>';
    }

    bulk = getBulkFromNumber(bulk);
    usageBulkEntry += '<strong>Bulk</strong> '+bulk;
    if(armorAdjBulkText != null) { usageBulkEntry += armorAdjBulkText; }
    if(data.InvItem.isDropped == 1) { usageBulkEntry += '<span class="is-size-6-5 is-italic"> (Dropped)</span>'; }
    qContent.append('<p class="is-size-6 has-text-left px-3 negative-indent">'+usageBulkEntry+'</p>');

    if(data.Item.Item.hands != 'NONE'){
        qContent.append('<p class="is-size-6 has-text-left px-3"><strong>Hands</strong> '+getHandsToString(data.Item.Item.hands)+'</p>');
    }

    qContent.append('<hr class="m-2">');

    if(data.Item.WeaponData != null){

      qContent.append('<div id="qContent-invItem-attackBonusAndDamage"></div>');

      let populateAttackBonusAndDamage = function(){

        let attackBonusAndDamageContent = $('#qContent-invItem-attackBonusAndDamage');
        attackBonusAndDamageContent.html('');

        let calcStruct = getAttackAndDamage(data.Item, data.InvItem);
        let map = generateMAP(calcStruct.AttackBonus, tagArray);

        if(g_invItemView_isCriticalHit && hasCriticalSpecialization(data.Item)){
          calcStruct.WeapStruct.damage.modifications.on_crit_other.push({
            mod: criticalSpecializationText(data.Item),
            info: 'CriticalSpecialization'
          });
        }

        if(g_invItemView_isCriticalHit){
          let deadlyTag = tagArray.find(tag => {
            return tag.name.match(/^Deadly d(\d+)$/m) != null;
          });
          if(deadlyTag != null){
            const die_type = deadlyTag.name.replace('Deadly ', '');
            let diceNum = 1;
            if(isGreaterStriking(data.InvItem.fundRuneID)){
              diceNum = 2;
            } else if(isMajorStriking(data.InvItem.fundRuneID)){
              diceNum = 3;
            }
            calcStruct.WeapStruct.damage.modifications.on_crit_damage.push({
              mod: diceNum+''+die_type+' '+calcStruct.WeapStruct.damage.type,
              info: 'DeadlyTrait'
            });
          }

          let fatalTag = tagArray.find(tag => {
            return tag.name.match(/^Fatal d(\d+)$/m) != null;
          });
          if(fatalTag != null){
            const die_type = fatalTag.name.replace('Fatal ', '');
            const old_die_type = calcStruct.WeapStruct.damage.die_type;

            calcStruct.WeapStruct.damage.die_type = die_type;
            calcStruct.Damage = calcStruct.Damage.replace(old_die_type, die_type);
            calcStruct.DamageDice = calcStruct.DamageDice.replace(old_die_type, die_type);

            calcStruct.WeapStruct.damage.modifications.on_crit_damage.push({
              mod: '1'+die_type+' '+calcStruct.WeapStruct.damage.type,
              info: 'FatalTrait'
            });
          }
        }

        let attackHasConditionals = (calcStruct.WeapStruct.attack.conditionals != null && calcStruct.WeapStruct.attack.conditionals.size != 0);
        let damageHasConditionals = ((calcStruct.WeapStruct.damage.conditionals != null && calcStruct.WeapStruct.damage.conditionals.size != 0) || calcStruct.WeapStruct.damage.modifications.on_hit_other.length != 0);

        let doubleDamageClass = (g_invItemView_isCriticalHit) ? 'damage-roll-double-result' : '';

        let weapDamageModHTML = '';
        for(const onHitDmgMod of calcStruct.WeapStruct.damage.modifications.on_hit_damage){
          let modification = onHitDmgMod.mod;
          if(modification.startsWith('-')){
            modification = modification.slice(1);
            weapDamageModHTML += ` - `;
          } else {
            weapDamageModHTML += ` + `;
          }
          weapDamageModHTML += `<span class="damage-roll-btn ${doubleDamageClass}">${modification}</span>`;
        }

        let damageHTML = `<span class="damage-roll-btn ${doubleDamageClass}">${calcStruct.Damage}</span>
                          ${weapDamageModHTML}`;
        if(g_invItemView_isCriticalHit) {
          damageHTML = `<span class="has-txt-value-number">2×( </span>${damageHTML}<span class="has-txt-value-number"> )</span>`;

          if(calcStruct.WeapStruct.damage.modifications.on_crit_other.length != 0){
            damageHasConditionals = true;
          }

          for(const onCritDmgMod of calcStruct.WeapStruct.damage.modifications.on_crit_damage){
            let modification = onCritDmgMod.mod;
            if(modification.startsWith('-')){
              modification = modification.slice(1);
              damageHTML += ` - `;
            } else {
              damageHTML += ` + `;
            }
            damageHTML += `<span class="damage-roll-btn">${modification}</span>`;
          }

        }

        attackBonusAndDamageContent.append(`
          <div class="tile text-center is-flex">
            <div class="tile is-child is-6">
              <strong id="invWeapAttackView" class="cursor-clickable px-1">Attack Bonus${(attackHasConditionals) ? ('<sup class="is-size-7 has-text-info">*</sup>') : ('')}</strong>
            </div>
            <div class="tile is-child is-6 pos-relative">
              <span id="damageCriticalHit" class="pos-absolute pos-t-0 pos-r-0 icon is-small has-text-info cursor-clickable has-tooltip-left" data-tooltip="${g_invItemView_isCriticalHit ? ('Disable') : ('Enable')} Critical Hit">
                <i class="${g_invItemView_isCriticalHit ? ('fad') : ('fal')} fa-sparkles"></i>
              </span>
              
              <strong id="invWeapDamageView" class="cursor-clickable px-1">${g_invItemView_isCriticalHit ? ('Crit. ') : ('')}Damage${(damageHasConditionals) ? ('<sup class="is-size-7 has-text-info">*</sup>') : ('')}</strong>
            </div>
          </div>
        `);
        attackBonusAndDamageContent.append(`
          <div class="tile text-center is-flex">
            <div class="tile is-child is-6">
              <span class="has-txt-listing">
                <span class="stat-roll-btn">${map.one}</span>
                <span class="has-txt-noted">/</span>
                <span class="stat-roll-btn">${map.two}</span>
                <span class="has-txt-noted">/</span>
                <span class="stat-roll-btn">${map.three}</span>
              </span>
            </div>
            <div class="tile is-child is-6">
              <span class="has-txt-listing">
                ${damageHTML}
              </span>
            </div>
          </div>
        `);
        if(gOption_hasDiceRoller) { refreshStatRollButtons(); }

        $('#damageCriticalHit').click(function() {
          g_invItemView_isCriticalHit = !g_invItemView_isCriticalHit;
          populateAttackBonusAndDamage();
        });

        $('#invWeapAttackView').click(function() {
          openQuickView('itemBreakdownView', {
            title: data.InvItem.name+' - Attack Bonus',
            breakdownTitle: 'Bonus',
            breakdownTotal: calcStruct.AttackBonus,
            breakdownMap: calcStruct.WeapStruct.attack.parts,
            conditionalMap: calcStruct.WeapStruct.attack.conditionals,
            isBonus: true,
            _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
          }, $('#quickviewDefault').hasClass('is-active'));
        });
        $('#invWeapAttackView').mouseenter(function(){
          $(this).addClass('has-bg-selectable-hover');
        });
        $('#invWeapAttackView').mouseleave(function(){
          $(this).removeClass('has-bg-selectable-hover');
        });

        $('#invWeapDamageView').click(function() {
          openQuickView('itemBreakdownView', {
            title: data.InvItem.name+(g_invItemView_isCriticalHit ? ' - Crit. Damage' : ' - Damage'),
            breakdownTitle: 'Damage',
            breakdownTotal: calcStruct.Damage,
            breakdownDamageDice: calcStruct.DamageDice,
            breakdownDamageType: calcStruct.WeapStruct.damage.type,
            breakdownMap: calcStruct.WeapStruct.damage.parts,
            conditionalMap: calcStruct.WeapStruct.damage.conditionals,
            modifications: calcStruct.WeapStruct.damage.modifications,
            isBonus: false,
            _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
          }, $('#quickviewDefault').hasClass('is-active'));
        });
        $('#invWeapDamageView').mouseenter(function(){
          $(this).addClass('has-bg-selectable-hover');
        });
        $('#invWeapDamageView').mouseleave(function(){
          $(this).removeClass('has-bg-selectable-hover');
        });

      };
      populateAttackBonusAndDamage();

      qContent.append('<hr class="m-2">');
      
      if(data.Item.WeaponData.isRanged == 1){
  
        let weaponRange = '-';
        let weaponReload = '-';
        if(data.InvItem.itemWeaponRange == null && data.InvItem.itemWeaponReload == null){
          weaponRange = data.Item.WeaponData.rangedRange;
          weaponReload = data.Item.WeaponData.rangedReload;
        } else {
          weaponRange = data.InvItem.itemWeaponRange;
          weaponReload = data.InvItem.itemWeaponReload;
        }

        for(const weapRangeMod of getWeapMod(data.InvItem.id, 'ADJUST-RANGE')){
          weaponRange += parseInt(weapRangeMod.mod);
        }
        for(const weapReloadMod of getWeapMod(data.InvItem.id, 'ADJUST-RELOAD')){
          weaponReload += parseInt(weapReloadMod.mod);
        }

        if(weaponReload == 0){ weaponReload = '-'; }
        weaponRange += ' ft';

        qContent.append(`
          <div class="tile text-center is-flex">
            <div class="tile is-child is-6">
              <strong>Range</strong>
            </div>
            <div class="tile is-child is-6">
              <strong>Reload</strong>
            </div>
          </div>
        `);
        qContent.append(`
          <div class="tile text-center is-flex">
            <div class="tile is-child is-6">
              <p>
                <span id="itemRangeAmount" class="cursor-clickable is-p pl-3">
                  ${weaponRange}<sub class="icon is-small is-size-8 pl-1"><i id="itemRangeCalcChevron" class="fas fa-lg fa-chevron-down"></i></sub>
                </span>
              </p>

              <div id="itemRangeCalcSection" class="is-hidden">
                <p class="help is-info is-italic text-center">Distance to Range Penalty</p>
                <div class="field has-addons has-addons-centered">
                  <p class="control"><input id="itemRangeCalcInput" class="input is-small" type="number" min="0" max="${6*parseInt(weaponRange)}" value="0" step="5">
                  </p>
                  <p class="control"><a class="button is-static is-small border-darker">➤</a></p>
                  <p class="control"><a id="itemRangeCalcOutput" class="button is-static is-extra is-small border-darker">-0</a></p>
                </div>
              </div>

            </div>
            <div class="tile is-child is-6">
              <p>
                ${weaponReload}
              </p>
            </div>
          </div>
        `);

        $('#itemRangeAmount').click(function() {
          if($("#itemRangeCalcSection").hasClass("is-hidden")) {
            $("#itemRangeCalcSection").removeClass('is-hidden');
            $("#itemRangeCalcChevron").removeClass('fa-chevron-down');
            $("#itemRangeCalcChevron").addClass('fa-chevron-up');
          } else {
            $("#itemRangeCalcSection").addClass('is-hidden');
            $("#itemRangeCalcChevron").removeClass('fa-chevron-up');
            $("#itemRangeCalcChevron").addClass('fa-chevron-down');
          }
        });

        $('#itemRangeCalcInput').on('keypress',function(e){
          if(e.which == 13){ // Press Enter Key
            $('#itemRangeCalcInput').blur();
          }
        });
        $('#itemRangeCalcInput').blur(function() {
          let newDistance = $(this).val();
          $(this).removeClass('is-danger');
          if(newDistance == '' || newDistance == null || newDistance == 0){
            $('#itemRangeCalcInput').val(0);
            $('#itemRangeCalcOutput').text('-0');
          } else if(newDistance > 6*parseInt(weaponRange) || newDistance < 0){
            $(this).addClass('is-danger');
            $('#itemRangeCalcOutput').text('×');
          } else {
            let penalty = (Math.ceil(newDistance/parseInt(weaponRange))-1)*2;
            // For -0 to show properly, split '-' from penalty
            $('#itemRangeCalcOutput').text('-'+penalty);
          }
        });

        qContent.append('<hr class="m-2">');

      }

    }

    if(data.Item.ArmorData != null){
        
        // Apply Shoddy to Armor
        let acBonus = data.Item.ArmorData.acBonus;
        acBonus += (isShoddy) ? -2 : 0;

        let armorCheckPenalty = data.Item.ArmorData.checkPenalty;
        armorCheckPenalty += (isShoddy) ? -2 : 0;
        //

        qContent.append('<div class="tile text-center is-flex"><div class="tile is-child is-6"><strong>AC Bonus</strong></div><div class="tile is-child is-6"><strong>Dex Cap</strong></div></div>');
        qContent.append('<div class="tile text-center is-flex"><div class="tile is-child is-6"><p>'+signNumber(acBonus)+'</p></div><div class="tile is-child is-6"><p>'+signNumber(data.Item.ArmorData.dexCap)+'</p></div></div>');

        qContent.append('<hr class="m-2">');

        let minStrength = (data.Item.ArmorData.minStrength == 0) ? '-' : data.Item.ArmorData.minStrength+'';
        let checkPenalty = (armorCheckPenalty == 0) ? '-' : armorCheckPenalty+'';
        let speedPenalty = (data.Item.ArmorData.speedPenalty == 0) ? '-' : data.Item.ArmorData.speedPenalty+' ft';
        qContent.append('<div class="tile text-center is-flex"><div class="tile is-child is-4"><strong>Strength</strong></div><div class="tile is-child is-4"><strong>Check Penalty</strong></div><div class="tile is-child is-4"><strong>Speed Penalty</strong></div></div>');
        qContent.append('<div class="tile text-center is-flex"><div class="tile is-child is-4"><p>'+minStrength+'</p></div><div class="tile is-child is-4"><p>'+checkPenalty+'</p></div><div class="tile is-child is-4"><p>'+speedPenalty+'</p></div></div>');

        qContent.append('<hr class="m-2">');

    }

    if(data.Item.ShieldData != null){

        let speedPenalty = (data.Item.ShieldData.speedPenalty == 0) ? '-' : data.Item.ShieldData.speedPenalty+' ft';
        qContent.append('<div class="tile text-center is-flex"><div class="tile is-child is-6"><strong>AC Bonus</strong></div><div class="tile is-child is-6"><strong>Speed Penalty</strong></div></div>');
        qContent.append('<div class="tile text-center is-flex"><div class="tile is-child is-6"><p>'+signNumber(data.Item.ShieldData.acBonus)+'</p></div><div class="tile is-child is-6"><p>'+speedPenalty+'</p></div></div>');

        qContent.append('<hr class="m-2">');

    }

    if(data.Item.StorageData != null){
        
        let maxBagBulk = data.InvItem.itemStorageMaxBulk;
        if(maxBagBulk == null){ maxBagBulk = data.Item.StorageData.maxBulkStorage; }
        let bulkIgnored = data.Item.StorageData.bulkIgnored;
        let bulkIgnoredMessage = "-";
        if(bulkIgnored != 0.0){
            if(bulkIgnored == maxBagBulk){
                bulkIgnoredMessage = "All Items";
            } else {
                bulkIgnoredMessage = "First "+bulkIgnored+" Bulk of Items";
            }
        }

        qContent.append('<div class="tile text-center is-flex"><div class="tile is-child is-6"><strong>Bulk Storage</strong></div><div class="tile is-child is-6"><strong>Bulk Ignored</strong></div></div>');
        qContent.append('<div class="tile text-center is-flex"><div class="tile is-child is-6"><p>'+maxBagBulk+'</p></div><div class="tile is-child is-6"><p>'+bulkIgnoredMessage+'</p></div></div>');

        qContent.append('<hr class="m-2">');
    }

    qContent.append('<div class="px-2">'+processText(data.InvItem.description, true, true, 'MEDIUM')+'</div>');

    if(data.Item.Item.craftRequirements != null){
        qContent.append('<hr class="m-2">');
        qContent.append('<div class="px-2">'+processText('~ Craft Requirements: '+data.Item.Item.craftRequirements, true, true, 'MEDIUM')+'</div>');
    }
    
    qContent.append('<hr class="m-2">');

    // Attachments
    if(data.Item.StorageData == null){
      let hasInvData = (data.InvData != null);
      // Not storage but has items stored under it.
      if((hasInvData && data.InvData.ItemIsStorage) || (!hasInvData && (g_bulkAndCoinsStruct.BagBulkMap.get(data.InvItem.id) != null))) {

        qContent.append(`
        <div>  
          <div class="text-center">
            <strong px-1">Attachments</strong>
          </div>
          <div id="itemAttachmentsSection">
            
          </div>
        </div>
        `);

        for(const attachedInvItem of g_invStruct.InvItems){
        if(data.InvItem.id == attachedInvItem.bagInvItemID){

          const itemAttachmentID = 'itemAttachment-'+attachedInvItem.id;

          $('#itemAttachmentsSection').append(`
            <p class="text-center"><span id="${itemAttachmentID}" class="has-text-info-lighter cursor-clickable">${attachedInvItem.name}</span></p>
          `);

          $('#'+itemAttachmentID).click(function(){
            if(hasInvData) {
              openQuickView('invItemView', {
                InvItem : attachedInvItem,
                Item : g_itemMap.get(attachedInvItem.itemID+""),
                InvData : {
                    OpenBagItemArray : data.InvData.OpenBagItemArray,
                    ItemIsStorage : (g_bulkAndCoinsStruct.BagBulkMap.get(attachedInvItem.id) != null),
                    ItemIsStorageAndEmpty : true
                },
                ExtraData : {},
                _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
              }, $('#quickviewDefault').hasClass('is-active'));
            } else {
              openQuickView('invItemView', {
                InvItem : attachedInvItem,
                Item : g_itemMap.get(attachedInvItem.itemID+""),
                InvData : null,
                ExtraData : {},
                _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
              }, $('#quickviewDefault').hasClass('is-active'));
            }
          });

        }
        }

        qContent.append('<hr class="m-2">');

      }
    }

    // Item Runes
    let consumableTag = tagArray.find(tag => {
        return tag.id == 402; // Hardcoded Consumable Tag ID
    });
    if(!viewOnly && consumableTag == null){ // In ViewOnly mode you cannot view weapon runes
        if(data.Item.WeaponData != null){

            displayRunesForItem(qContent, data.InvItem, true);

            qContent.append('<hr class="m-2">');

        }

        if(data.Item.ArmorData != null){

            displayRunesForItem(qContent, data.InvItem, false);

            qContent.append('<hr class="m-2">');

        }
    }

    // Item Quantity
    if(!viewOnly && data.Item.Item.hasQuantity == 1){
        qContent.append('<div class="field has-addons has-addons-centered"><p class="control"><a class="button is-static border-darker">Quantity</a></p><p class="control"><input id="'+invItemQtyInputID+'" class="input" type="number" min="0" max="9999999" value="'+data.InvItem.quantity+'"></p></div>');

        $('#'+invItemQtyInputID).blur(function() {
            let newQty = $(this).val();
            if(newQty != data.InvItem.quantity && newQty != ''){
                if(newQty <= 9999999 && newQty >= 0) {
                    $(this).removeClass('is-danger');
                    socket.emit("requestInvItemQtyChange",
                        data.InvItem.id,
                        newQty);
                } else {
                    $(this).addClass('is-danger');
                }
            } else {
              if(newQty <= 9999999 && newQty >= 0) {
                $(this).removeClass('is-danger');
              }
            }
        });
    }

    // Weapon and Armor Category
    if(data.Item.WeaponData != null){

        let weapGroup = '';
        if(data.Item.WeaponData.isRanged == 1){
          if(data.Item.WeaponData.rangedWeaponType == 'CROSSBOW'){
            weapGroup += 'Bow';
          } else {
            weapGroup += capitalizeWord(data.Item.WeaponData.rangedWeaponType);
          }
        }
        if(data.Item.WeaponData.isMelee == 1){
          if(weapGroup != ''){
            weapGroup += ' & ';
          }
          weapGroup += capitalizeWord(data.Item.WeaponData.meleeWeaponType);
        }

        let weapCategory = capitalizeWord(data.Item.WeaponData.category);
        let weapOrAttack = (weapCategory === 'Unarmed') ? 'Attack' : 'Weapon';

        if(weapGroup != ''){
            qContent.append('<div class="tile is-child text-center"><p class="is-size-7"><strong>'+weapCategory+' '+weapOrAttack+' - '+weapGroup+'</strong></p></div>');
        } else {
            qContent.append('<div class="tile is-child text-center"><p class="is-size-7"><strong>'+weapCategory+' '+weapOrAttack+'</strong></p></div>');
        }

        qContent.append('<hr class="m-2">');

    }

    if(data.Item.ArmorData != null){

        let armorTypeAndGroupListing = '';
        let armorCategory = capitalizeWord(data.Item.ArmorData.category);
        if(data.Item.ArmorData.armorType == 'N/A'){
            armorTypeAndGroupListing = (armorCategory == 'Unarmored') ? armorCategory : armorCategory+' Armor';
        } else {
            let armorGroup = capitalizeWord(data.Item.ArmorData.armorType);
            armorTypeAndGroupListing = (armorCategory == 'Unarmored') ? armorCategory+' - '+armorGroup : armorCategory+' Armor - '+armorGroup;
        }
        qContent.append('<div class="tile is-child text-center"><p class="is-size-7"><strong>'+armorTypeAndGroupListing+'</strong></p></div>');

        qContent.append('<hr class="m-2">');

    }

    // Item Specializations
    displayCriticalSpecialization(qContent, data.Item);

    // Health, Hardness, and Broken Threshold
    if(!viewOnly && !doesntHaveItemHealth(data.InvItem)) {


        qContent.append('<p id="itemHealthName" class="has-text-centered is-size-7"><strong class="cursor-clickable">Health</strong><sub class="icon is-small pl-1 cursor-clickable"><i id="itemHealthChevron" class="fas fa-lg fa-chevron-down"></i></sub></p>');

        qContent.append('<div id="itemHealthSection" class="is-hidden"></div>');

        $('#itemHealthSection').append('<div class="field has-addons has-addons-centered"><p class="control"><input id="'+invItemHPInputID+'" class="input is-small" type="number" min="0" max="'+maxHP+'" value="'+data.InvItem.currentHitPoints+'"></p><p class="control"><a class="button is-static is-small border-darker">/</a></p><p class="control"><a class="button is-static is-extra is-small border-darker">'+maxHP+'</a></p></div>');
        $('#itemHealthSection').append('<div class="columns is-centered is-marginless text-center"><div class="column is-4 is-paddingless"><p class="is-size-7 has-text-right pr-2"><strong>Hardness:</strong> '+data.InvItem.hardness+'</p></div><div class="column is-5 is-paddingless"><p class="is-size-7 has-text-left pl-2"><strong>Broken Threshold:</strong> '+brokenThreshold+'</p></div></div>');

        $('#itemHealthName').click(function() {
            if($("#itemHealthSection").hasClass("is-hidden")) {
                $("#itemHealthSection").removeClass('is-hidden');
                $("#itemHealthChevron").removeClass('fa-chevron-down');
                $("#itemHealthChevron").addClass('fa-chevron-up');
            } else {
                $("#itemHealthSection").addClass('is-hidden');
                $("#itemHealthChevron").removeClass('fa-chevron-up');
                $("#itemHealthChevron").addClass('fa-chevron-down');
            }
        });

        if(data.Item.ShieldData != null){
            $("#itemHealthName").trigger("click");
        }

        qContent.append('<hr class="mt-2 mb-3">');
        
        $('#'+invItemHPInputID).blur(function() {
            let newHP = $(this).val();
            if(newHP != data.InvItem.currentHitPoints && newHP != ''){
                if(newHP <= maxHP && newHP >= 0) {
                    $(this).removeClass('is-danger');
                    socket.emit("requestInvItemHPChange",
                        data.InvItem.id,
                        newHP);
                } else {
                    $(this).addClass('is-danger');
                }
            }
        });
    }

    // Move, Customize, and Remove Item
    if(!viewOnly) {
        if(data.InvData != null){

            qContent.append('<div class="field has-addons has-addons-centered"><div class="control"><div class="select is-small is-link"><select id="'+invItemMoveSelectID+'"></select></div></div><div class="control"><button id="'+invItemMoveButtonID+'" type="submit" class="button is-small is-link is-rounded is-outlined">Move</button></div></div>');
        
            $('#'+invItemMoveSelectID).append('<option value="Unstored">Unstored</option>');

            // Attachments //
            if(data.Item.StorageData == null && (
                data.Item.Item.itemType == 'AMMUNITION' ||
                data.Item.Item.itemType == 'TALISMAN' || 
                data.Item.Item.itemType == 'FULU' || 
                data.Item.Item.itemType == 'RUNE' || 
                data.Item.Item.itemType == 'GADGET' || 
                data.Item.Item.itemType == 'GIFT' || 
                data.Item.Item.itemType == 'ADJUSTMENT' || 
                data.Item.Item.itemType == 'OTHER' || 
                data.Item.Item.itemType == 'SPELLHEART')) {
              // Item is attachment

              $('#'+invItemMoveSelectID).append('<optgroup label="───────"></optgroup>');
              for(const attachableInvItem of g_invStruct.InvItems){
                if(data.InvItem.id != attachableInvItem.id) {

                  // Item is attachable
                  const attachableItem = g_itemMap.get(attachableInvItem.itemID+"");
                  if(attachableItem != null
                    && attachableInvItem.bagInvItemID == null // Not stored
                    && attachableItem.StorageData == null // Not storage
                    && attachableItem.Item.hidden == 0 // Not hidden
                    && (
                      attachableItem.Item.itemType == 'WEAPON' ||
                      attachableItem.Item.itemType == 'ARMOR' ||
                      attachableItem.Item.itemType == 'SHIELD' ||
                      attachableItem.Item.itemType == 'WAND' ||
                      attachableItem.Item.itemType == 'STAFF' ||
                      attachableItem.Item.itemType == 'STRUCTURE' ||
                      attachableItem.Item.itemType == 'HAT' ||
                      attachableItem.Item.itemType == 'CLOAK' ||
                      attachableItem.Item.itemType == 'BELT' ||
                      attachableItem.Item.itemType == 'BOOTS' ||
                      attachableItem.Item.itemType == 'OTHER')) {

                    if(data.InvItem.bagInvItemID == attachableInvItem.id){
                      $('#'+invItemMoveSelectID).append('<option value="'+attachableInvItem.id+'" selected>Attach ▸ '+attachableInvItem.name+'</option>');
                    } else {
                      $('#'+invItemMoveSelectID).append('<option value="'+attachableInvItem.id+'">Attach ▸ '+attachableInvItem.name+'</option>');
                    }

                  }

                }
              }

            }

            // Storage //
            if(data.InvData.ItemIsStorage && !data.InvData.ItemIsStorageAndEmpty) {
              // Don't include for storage items that contain other items.
            } else {
              $('#'+invItemMoveSelectID).append('<optgroup label="───────"></optgroup>');
              for(const bagItemStruct of data.InvData.OpenBagItemArray){
                if(data.InvItem.id != bagItemStruct.InvItem.id) {
                    if(data.InvItem.bagInvItemID == bagItemStruct.InvItem.id){
                        $('#'+invItemMoveSelectID).append('<option value="'+bagItemStruct.InvItem.id+'" selected>Store ▸ '+bagItemStruct.InvItem.name+'</option>');
                    } else {
                        $('#'+invItemMoveSelectID).append('<option value="'+bagItemStruct.InvItem.id+'">Store ▸ '+bagItemStruct.InvItem.name+'</option>');
                    }
                }
              }
            }

            $('#'+invItemMoveSelectID).append('<optgroup label="───────"></optgroup>');
            $('#'+invItemMoveSelectID).append('<option value="Dropped">Dropped</option>');
                
            if(data.InvItem.isDropped == 1){ $('#'+invItemMoveSelectID).val('Dropped'); }
            $('#'+invItemMoveButtonID).click(function() {
                let bagItemID = $('#'+invItemMoveSelectID).val();
                let isDropped = 0;
                if(bagItemID == 'Unstored') { bagItemID = null; }
                if(bagItemID == 'Dropped') { bagItemID = null; isDropped = 1; }
                $(this).addClass('is-loading');
                socket.emit("requestInvItemMoveBag",
                    data.InvItem.id,
                    bagItemID,
                    isDropped);
            });
            

            qContent.append('<div class="buttons is-centered is-marginless"><a id="'+invItemCustomizeButtonID+'" class="button is-small is-primary is-rounded is-outlined">Customize</a><a id="'+invItemRemoveButtonID+'" class="button is-small is-danger is-rounded is-outlined">Remove</a></div>');

            $('#'+invItemRemoveButtonID).click(function() {
                $(this).addClass('is-loading');
                socket.emit("requestRemoveItemFromInv",
                    data.InvItem.id);
            });

            $('#'+invItemCustomizeButtonID).click(function() {
                openQuickView('customizeItemView', {
                    Item: data.Item,
                    InvItem: data.InvItem,
                    _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
                }, $('#quickviewDefault').hasClass('is-active'));
            });
        
        } else {

          if(data.ExtraData.IsUnarmedAttack === true){
            if(data.ExtraData.IsCustomUnarmedAttack === true) {

              qContent.append('<div class="buttons is-centered is-marginless"><a id="'+invItemCustomizeButtonID+'" class="button is-small is-primary is-rounded is-outlined">Customize</a><a id="'+invItemRemoveButtonID+'" class="button is-small is-danger is-rounded is-outlined">Remove</a></div>');

              $('#'+invItemCustomizeButtonID).click(function() {
                openQuickView('addUnarmedAttackView', {
                  IsCustomize: true,
                  Item: data.Item,
                  InvItem: data.InvItem,
                  _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
                }, $('#quickviewDefault').hasClass('is-active'));
              });

              $('#'+invItemRemoveButtonID).click(function() {
                $(this).addClass('is-loading');
                socket.emit("requestRemoveItemFromInv",
                    data.InvItem.id);
              });

            } else {

              qContent.append('<div class="buttons is-centered is-marginless"><a id="'+invItemCustomizeButtonID+'" class="button is-small is-primary is-rounded is-outlined">Customize</a></div>');

              $('#'+invItemCustomizeButtonID).click(function() {
                openQuickView('addUnarmedAttackView', {
                  IsCustomize: true,
                  Item: data.Item,
                  InvItem: data.InvItem,
                  _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
                }, $('#quickviewDefault').hasClass('is-active'));
              });

            }

          }
        }

    }

}