/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openCustomizeItemQuickview(data) {
    addBackFunctionality(data);

    $('#quickViewTitle').html("Customize Item");
    let qContent = $('#quickViewContent');

    qContent.append('<div class="field is-horizontal"><div class="field-label is-normal"><label class="label">Name</label></div><div class="field-body"><div class="field"><div class="control"><input id="customizeItemName" class="input" type="text" maxlength="32" spellcheck="false" autocomplete="off" value="'+data.InvItem.name+'"></div></div></div></div>');
    qContent.append('<div class="field is-horizontal"><div class="field-label is-normal"><label class="label">Price (cp)</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="customizeItemPrice" class="input" type="number" min="0" max="99999999" value="'+data.InvItem.price+'"></div></div></div></div>');
    qContent.append('<div class="field is-horizontal"><div class="field-label is-normal"><label class="label">Bulk</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input class="input" id="customizeItemBulk" type="number" min="0" max="100" step="0.1" value="'+data.InvItem.bulk+'"></div></div></div></div>');
    qContent.append('<div class="field"><label class="label">Description <a href="/wsc_docs/#description_fields" target="_blank"><span class="icon is-small has-text-info has-tooltip-top" data-tooltip="WSC Docs"><i class="fas fa-book"></i></span></a></label><div class="control"><textarea id="customizeItemDescription" class="textarea use-custom-scrollbar">'+data.InvItem.description+'</textarea></div></div>');

    if(data.InvItem.itemIsWeapon == 1){

        qContent.append('<hr class="m-2 mb-4">');

        qContent.append('<div class="field is-horizontal"><div class="field-label is-long"><label class="label">Damage Die</label></div><div class="field-body"><div class="field"><div class="control"><div class="select"><select id="customizeWeaponDamageDie"><option value="">1</option><option value="d2">d2</option><option value="d4">d4</option><option value="d6">d6</option><option value="d8">d8</option><option value="d10">d10</option><option value="d12">d12</option><option value="d20">d20</option><option value="NONE">-</option></select></div></div></div></div></div>');
        qContent.append('<div class="field is-horizontal"><div class="field-label is-long"><label class="label">Damage Type</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="customizeWeaponDamageType" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" value="'+data.InvItem.itemWeaponDamageType+'"></div></div></div></div>');

        qContent.append('<div class="field is-horizontal"><div class="field-label is-long"><label class="label">Range</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="customizeWeaponRange" class="input" type="number" min="0" max="10000" value="'+data.InvItem.itemWeaponRange+'" step="5"></div></div></div></div>');
        qContent.append('<div class="field is-horizontal"><div class="field-label is-long"><label class="label">Reload</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="customizeWeaponReload" class="input" type="number" min="0" max="6" value="'+data.InvItem.itemWeaponReload+'" step="1"></div></div></div></div>');

        qContent.append('<hr class="m-2 mb-4">');

        qContent.append('<div class="field is-horizontal"><div class="field-label is-long"><label class="label">Attack Bonus</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input class="input" id="customizeWeaponAtkBonus" type="number" min="-99" max="99" value="'+data.InvItem.itemWeaponAtkBonus+'"></div></div></div></div>');
        qContent.append('<div class="field is-horizontal"><div class="field-label is-long"><label class="label">Damage Bonus</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input class="input" id="customizeWeaponDmgBonus" type="number" min="-99" max="99" value="'+data.InvItem.itemWeaponDmgBonus+'"></div></div></div></div>');

    }

    if(data.InvItem.itemIsStorage == 1){

      qContent.append('<hr class="m-2 mb-4">');

      qContent.append('<div class="field is-horizontal"><div class="field-label is-normal"><label class="label">Storage</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="customizeStorageMaxBulk" class="input" type="number" min="0" max="9999" value="'+data.InvItem.itemStorageMaxBulk+'" step="0.1"></div></div></div></div>');

    }

    qContent.append('<hr class="m-2 mb-4">');

    let tagsSelectOptions = '';
    for(let tag of g_allTags){
        if(tag.isHidden == 0 && tag.isArchived == 0){
            tagsSelectOptions += '<option value="'+tag.id+'">'+tag.name+'</option>';
        }
    }
    qContent.append('<div class="field is-horizontal"><div class="field-label is-normal"><label class="label">Traits</label></div><div class="field-body"><select id="customizeItemTraits" data-placeholder="Select Traits" multiple>'+tagsSelectOptions+'</select></div></div>');

    $("#customizeItemTraits").chosen({width: "100%"});

    qContent.append('<hr class="m-2 mb-4">');

    let materialSelectOptions = '<option value="">N/A</option>';
    for(const [materialCodeName, data] of g_materialsMap.entries()){
        materialSelectOptions += '<option value="'+materialCodeName+'">'+data.Name+'</option>';
    }
    qContent.append('<div class="field is-horizontal"><div class="field-label is-normal"><label class="label">Material</label></div><div class="field-body"><div class="field"><div class="control"><div class="select"><select id="customizeItemMaterial">'+materialSelectOptions+'</select></div></div></div></div></div>');

    qContent.append('<div class="field is-horizontal"><div class="field-label is-normal"><label class="label">Size</label></div><div class="field-body"><div class="field"><div class="control"><div class="select"><select id="customizeItemSize"><option value="TINY">Tiny</option><option value="SMALL">Small</option><option value="MEDIUM">Medium</option><option value="LARGE">Large</option><option value="HUGE">Huge</option><option value="GARGANTUAN">Gargantuan</option></select></div></div></div></div></div>');
    qContent.append('<div class="field is-horizontal"><div class="field-label"><label class="label">Shoddy</label></div><div class="field-body"><div class="field"><div class="control"><label class="checkbox"><input id="customizeItemShoddy" type="checkbox"></label></div></div></div></div>');

    qContent.append('<hr class="m-2 mb-4">');

    qContent.append('<div class="field is-horizontal"><div class="field-label is-normal"><label class="label">Max HP</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input class="input" id="customizeItemHitPoints" type="number" min="0" max="99999" value="'+data.InvItem.hitPoints+'"></div></div></div></div>');
    qContent.append('<div class="field is-horizontal"><div class="field-label is-normal"><label class="label">BT</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input class="input" id="customizeItemBrokenThreshold" type="number" min="0" max="99999" value="'+data.InvItem.brokenThreshold+'"></div></div></div></div>');
    qContent.append('<div class="field is-horizontal"><div class="field-label is-normal"><label class="label">Hardness</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input class="input" id="customizeItemHardness" type="number" min="0" max="99999" value="'+data.InvItem.hardness+'"></div></div></div></div>');

    qContent.append('<hr class="m-2 mb-4">');
    
    data.InvItem.code = (data.InvItem.code == null) ? '' : data.InvItem.code;
    qContent.append(`
      <div class="field is-horizontal pos-relative">
        <div class="field-label is-normal">
          <label class="label">
            Code 
            <a href="/wsc_docs/#code_basics" target="_blank"><span class="icon is-small has-text-info has-tooltip-top" data-tooltip="WSC Docs"><i class="fas fa-book"></i></span></a>
            <span class="code-block-statement-display in-quickview">Sheet Statements Only</span>
          </label>
        </div>
        <div class="field-body">
          <div class="field">
            <div class="control">
              <textarea id="customizeItemCode" class="textarea nanum-coding use-custom-scrollbar" rows="1" spellcheck="false" maxlength="990">${data.InvItem.code}</textarea>
            </div>
          </div>
        </div>
      </div>
    `);

    qContent.append('<div class="buttons is-centered pt-2"><button id="customizeItemSaveButton" class="button is-link">Save</button></div>');


    $('#customizeItemSize').val(data.InvItem.size);
    if(data.InvItem.isShoddy == 1){
        $('#customizeItemShoddy').prop('checked', true);
    }
    $('#customizeItemMaterial').val(data.InvItem.materialType);

    // Traits //
    try {
        let tagArray = JSON.parse(data.InvItem.itemTags);
        for(let tagID of tagArray){
            $("#customizeItemTraits").find('option[value='+tagID+']').attr('selected','selected');
        }
    } catch (err) {
        for(let tag of data.Item.TagArray){
            $("#customizeItemTraits").find('option[value='+tag.id+']').attr('selected','selected');
        }
    }
    $('#customizeItemTraits').trigger("chosen:updated");

    // Weapon //
    if(data.InvItem.itemIsWeapon == 1){
        $('#customizeWeaponDamageDie').val(data.InvItem.itemWeaponDieType);
    }

    $('#customizeItemSaveButton').click(function(){

        let name = $('#customizeItemName').val();
        let price = parseInt($('#customizeItemPrice').val());
        let bulk = parseFloat($('#customizeItemBulk').val());
        let description = $('#customizeItemDescription').val();
        let size = $('#customizeItemSize').val();
        let isShoddy = ($('#customizeItemShoddy').prop('checked') == true) ? 1 : 0;
        let materialType = $('#customizeItemMaterial').val();
        let hitPoints = parseInt($('#customizeItemHitPoints').val());
        let brokenThreshold = parseInt($('#customizeItemBrokenThreshold').val());
        let hardness = parseInt($('#customizeItemHardness').val());
        let code = $('#customizeItemCode').val();

        let isValid = true;

        if(name == null || name == ''){
            $('#customizeItemName').addClass('is-danger');
            isValid = false;
        } else {
            $('#customizeItemName').removeClass('is-danger');
        }

        if(price == null || price > 99999999 || price < 0 || price % 1 != 0) {
            $('#customizeItemPrice').addClass('is-danger');
            isValid = false;
        } else {
            $('#customizeItemPrice').removeClass('is-danger');
        }

        if(bulk == null || bulk > 99 || bulk < 0) {
            $('#customizeItemBulk').addClass('is-danger');
            isValid = false;
        } else {
            $('#customizeItemBulk').removeClass('is-danger');
        }

        if(description == '') {
            description = '__No Description__';
        }

        if(hitPoints == null || hitPoints > 99999 || hitPoints < 0 || hitPoints % 1 != 0) {
            $('#customizeItemHitPoints').addClass('is-danger');
            isValid = false;
        } else {
            $('#customizeItemHitPoints').removeClass('is-danger');
        }

        if(brokenThreshold == null|| brokenThreshold > hitPoints || brokenThreshold < 0 || brokenThreshold % 1 != 0) {
            $('#customizeItemBrokenThreshold').addClass('is-danger');
            isValid = false;
        } else {
            $('#customizeItemBrokenThreshold').removeClass('is-danger');
        }

        if(hardness == null || hardness > 99999 || hardness < 0 || hardness % 1 != 0) {
            $('#customizeItemHardness').addClass('is-danger');
            isValid = false;
        } else {
            $('#customizeItemHardness').removeClass('is-danger');
        }

        if(code == '') {
            code = null;
        }

        // Traits //
        let itemTagsData = JSON.stringify($("#customizeItemTraits").val());
        if(itemTagsData.length > 400){
            itemTagsData = null;
        }

        // Weapon //
        let weaponDieType, weaponDamageType = null; 
        let weaponRange = 0;
        let weaponReload = 0;
        let weaponAtkBonus = 0;
        let weaponDmgBonus = 0;
        if(data.InvItem.itemIsWeapon == 1){
          weaponDieType = $('#customizeWeaponDamageDie').val();
          weaponDamageType = $('#customizeWeaponDamageType').val();
          weaponRange = $('#customizeWeaponRange').val();
          weaponReload = $('#customizeWeaponReload').val();
          weaponAtkBonus = $('#customizeWeaponAtkBonus').val();
          weaponDmgBonus = $('#customizeWeaponDmgBonus').val();
        }
        if(weaponRange == ''){ weaponRange = null; }
        if(weaponReload == ''){ weaponReload = null; }
        if(weaponAtkBonus == ''){ weaponAtkBonus = null; }
        if(weaponDmgBonus == ''){ weaponDmgBonus = null; }

        // Storage //
        let storageMaxBulk = null;
        if(data.InvItem.itemIsStorage == 1){
          storageMaxBulk = $('#customizeStorageMaxBulk').val();
        }

        if(isValid){
            socket.emit("requestCustomizeInvItem",
                data.InvItem.id,
                {
                    name: name,
                    price: price,
                    bulk: bulk,
                    description: description,
                    size: size,
                    isShoddy: isShoddy,
                    materialType: materialType,
                    hitPoints: hitPoints,
                    brokenThreshold: brokenThreshold,
                    hardness: hardness,
                    code: code,
                    itemTagsData: itemTagsData,

                    weaponDieType: weaponDieType,
                    weaponDamageType: weaponDamageType,
                    weaponRange: weaponRange,
                    weaponReload: weaponReload,
                    weaponAtkBonus: weaponAtkBonus,
                    weaponDmgBonus: weaponDmgBonus,

                    storageMaxBulk: storageMaxBulk,
                }
            );
        }

    });

}