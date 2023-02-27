/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openAddProfQuickview(data) {

    $('#quickViewTitle').html("Add Proficiency");
    let qContent = $('#quickViewContent');

    qContent.append('<div class="field is-grouped is-grouped-centered"><div class="control"><div class="select"><select id="addProfType"><option value="Attack">Weapon</option><option value="Defense">Armor</option><option value="SpellAttack">Spell Attack</option><option value="SpellDC">Spell DC</option></select></div></div></div>');

    qContent.append('<div class="field is-grouped is-grouped-centered"><div class="control"><div class="select"><select id="addProfSubType"></select></div></div><div class="control"><div class="select"><select id="addProfProf"><option value="U">Untrained</option><option value="T" selected>Trained</option><option value="E">Expert</option><option value="M">Master</option><option value="L">Legendary</option></select></div></div></div>');

    qContent.append('<div class="buttons is-centered pt-2"><button id="addProfAddButton" class="button is-link is-rounded">Add</button></div>');

    let sortedItemMap = new Map([...g_itemMap.entries()].sort(
      function(a, b) {
        return a[1].Item.name > b[1].Item.name ? 1 : -1;
      })
    );

    $('#addProfType').change(function() {
        let profSubType = $('#addProfSubType');
        profSubType.html('');

        let profType = $(this).val();

        if(profType == 'Attack'){

            profSubType.append('<option value="Simple_Weapons">Simple Weapons</option>');
            profSubType.append('<option value="Martial_Weapons">Martial Weapons</option>');
            profSubType.append('<option value="Advanced_Weapons">Advanced Weapons</option>');
            profSubType.append('<option value="Unarmed_Attacks">Unarmed Attacks</option>');

            profSubType.append('<optgroup label="──────────"></optgroup>');

            for(const [itemID, itemDataStruct] of sortedItemMap.entries()){
                if(itemDataStruct.Item.itemType == 'WEAPON' && itemDataStruct.Item.hidden === 0 && itemDataStruct.WeaponData != null && itemDataStruct.WeaponData.profName == itemDataStruct.Item.name){

                    let profValue = itemDataStruct.Item.name.replace(/\s/g,'_');
                    profSubType.append('<option value="'+profValue+'">'+itemDataStruct.Item.name+'</option>');

                }
            }

        } else if(profType == 'Defense'){

            profSubType.append('<option value="Light_Armor">Light Armor</option>');
            profSubType.append('<option value="Medium_Armor">Medium Armor</option>');
            profSubType.append('<option value="Heavy_Armor">Heavy Armor</option>');
            profSubType.append('<option value="Unarmored_Defense">Unarmored Defense</option>');

            profSubType.append('<optgroup label="──────────"></optgroup>');

            for(const [itemID, itemDataStruct] of sortedItemMap.entries()){
                
                if(itemDataStruct.Item.itemType == 'ARMOR' && itemDataStruct.Item.hidden === 0 && itemDataStruct.ArmorData != null && itemDataStruct.ArmorData.profName == itemDataStruct.Item.name){
                    
                    let profValue = itemDataStruct.Item.name.replace(/\s/g,'_');
                    profSubType.append('<option value="'+profValue+'">'+itemDataStruct.Item.name+'</option>');

                }
            }

        } else if(profType == 'SpellAttack'){

            profSubType.append('<option value="ArcaneSpellAttacks">Arcane</option>');
            profSubType.append('<option value="OccultSpellAttacks">Occult</option>');
            profSubType.append('<option value="PrimalSpellAttacks">Primal</option>');
            profSubType.append('<option value="DivineSpellAttacks">Divine</option>');

        } else if(profType == 'SpellDC'){

            profSubType.append('<option value="ArcaneSpellDCs">Arcane</option>');
            profSubType.append('<option value="OccultSpellDCs">Occult</option>');
            profSubType.append('<option value="PrimalSpellDCs">Primal</option>');
            profSubType.append('<option value="DivineSpellDCs">Divine</option>');

        }

    });
    $('#addProfType').trigger("change");

    $('#addProfAddButton').click(function(){

        let type = $('#addProfType').val();
        let subType = $('#addProfSubType').val();
        let prof = $('#addProfProf').val();

        let srcStruct = {
            sourceType: 'user-added',
            sourceLevel: 0,
            sourceCode: subType,
            sourceCodeSNum: 'a',
        };
        socket.emit("requestProficiencyChange",
            getCharIDFromURL(),
            {srcStruct : srcStruct},
            {
                For : type,
                To : subType,
                Prof : prof,
                SourceName: 'User-Added'
            }
        );

    });

}