/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

let activeModalCreatureID = -1;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    creatureInitImport();

    let entries = $('.entryListing');
    for (const entry of entries) {

        let creatureID = $(entry).attr('name');
        let cardEdit = $(entry).find('.entry-update');
        let cardDelete = $(entry).find('.entry-delete');

        cardEdit.mouseenter(function () {
            $(this).addClass('entry-footer-hover');
        });
        cardEdit.mouseleave(function () {
            $(this).removeClass('entry-footer-hover');
        });
        cardEdit.click(function () {
            window.location.href = '/admin/edit/creature/' + creatureID;
        });

        cardDelete.mouseenter(function () {
            $(this).addClass('entry-footer-hover');
        });
        cardDelete.mouseleave(function () {
            $(this).removeClass('entry-footer-hover');
        });
        cardDelete.click(function () {
            $('.modal').addClass('is-active');
            $('html').addClass('is-clipped');
            activeModalCreatureID = creatureID;
        });


        $('.modal-card-close').click(function () {
            $('.modal').removeClass('is-active');
            $('html').removeClass('is-clipped');
            activeModalCreatureID = -1;
        });
        $('.modal-background').click(function () {
            $('.modal').removeClass('is-active');
            $('html').removeClass('is-clipped');
            activeModalCreatureID = -1;
        });

    }

    $('#delete-confirmation-btn').click(function () {
        socket.emit("requestAdminRemoveCreature", activeModalCreatureID);
    });

});

socket.on("returnAdminRemoveCreature", function () {
    window.location.href = '/admin/manage/Creature';
});




function creatureInitImport() {

    startSpinnerLoader();

    const fileInput = document.querySelector('#input-import-creature');
    fileInput.onchange = () => {
        if (fileInput.files.length > 0) {

            for (const file of fileInput.files) {

                let fileReader = new FileReader();

                // Closure to capture the file information.
                fileReader.onload = (function (capturedFile) {
                    return function (e) {
                        if (capturedFile.name.endsWith('.json')) {

                            let importData = JSON.parse(e.target.result);

                            if (importData.type == `npc`) {
                                parseCreatureData(importData);
                            } else if (importData.type == `hazard`) {
                                //parseHazardData(importData);
                            }

                        }
                    };
                })(file);

                fileReader.readAsText(file);

            }

        }
    };

    socket.emit("requestEncounterDetails");

}

let g_allConditions;
let g_allTags;
let g_featMap;
let g_itemMap;
let g_spellMap;
socket.on("returnEncounterDetails", function(allCreatures, allTags, featsObject, itemsObject, spellsObject, allConditions){
    g_allConditions = allConditions;
    g_allTags = allTags;
    g_featMap = objToMap(featsObject);
    g_itemMap = objToMap(itemsObject);
    g_spellMap = objToMap(spellsObject);
    stopSpinnerLoader();
});


function parseCreatureData(importData) {

    console.log(importData);

    let data = {};

    data.id = importData._id;

    data.name = importData.name;
    data.level = importData.system.details.level.value;

    data.rarity = convertToWGRarity(importData.system.traits.rarity);
    data.alignment = importData.system.details.alignment.value;
    data.size = convertToWGSize(importData.system.traits.size.value);
    data.traitsJSON = JSON.stringify(importData.system.traits.value);
    data.familyType = importData.system.details.creatureType;


    data.perceptionBonus = importData.system.attributes.perception.value;
    data.senses = importData.system.traits.senses.value;

    data.languagesJSON = JSON.stringify(importData.system.traits.languages.value);
    data.languagesCustom = importData.system.traits.languages.custom;

    let skills = importData.items.filter((item) => {
        return item.type == `lore`;
    });
    let skillsDataArray = [];
    for (let skill of skills) {
        skillsDataArray.push({ name: skill.name, bonus: skill.system.mod.value });
    }
    data.skillsJSON = JSON.stringify(skillsDataArray);

    let inventory = importData.items.filter((item) => {
        return item.type == `equipment` || item.type == `weapon` || item.type == `armor` || item.type == `consumable`;
    });
    let itemsDataArray = [];
    for (let item of inventory) {

        let quantity = 1;
        if (item.type == `consumable`) {
            quantity = item.system.quantity;
        }

        let name = null;
        let doIndex = true;
        if(item.system.baseItem != null){
            name = item.system.baseItem.replace(/-/g,' ');

            if(name.includes(' armor')){
                name = name.replace(' armor', '');
            }

        } else {
            doIndex = false;
        }

        let shieldStats = null;
        if(item.system.category == 'shield'){
            shieldStats = {
                armor: item.system.armor.value,
                hardness: item.system.hardness,
                hp: item.system.hp.max,
                bt: item.system.hp.brokenThreshold,
            };
        }

        itemsDataArray.push({
            displayName: item.name,
            quantity: quantity,
            name: name,
            doIndex: doIndex,
            shieldStats: shieldStats,
        });
    }
    data.itemsJSON = JSON.stringify(itemsDataArray);

    data.strMod = importData.system.abilities.str.mod;
    data.dexMod = importData.system.abilities.dex.mod;
    data.conMod = importData.system.abilities.con.mod;
    data.intMod = importData.system.abilities.int.mod;
    data.wisMod = importData.system.abilities.wis.mod;
    data.chaMod = importData.system.abilities.cha.mod;

    let interactionAbilities = importData.items.filter((item) => {
        return item.type == `action` && item.system.actionCategory.value == `interaction`;
    });
    let interactionAbilitiesDataArray = [];
    for (let ability of interactionAbilities) {
        interactionAbilitiesDataArray.push({
            name: ability.name,
            actions: convertToWGActions(ability.system.actionType.value, ability.system.actions.value),
            traits: ability.system.traits.value,
            description: ability.system.description.value,
        });
    }
    data.interactionAbilitiesJSON = JSON.stringify(interactionAbilitiesDataArray);

    data.acValue = importData.system.attributes.ac.value;
    data.fortBonus = importData.system.saves.fortitude.value;
    data.reflexBonus = importData.system.saves.reflex.value;
    data.willBonus = importData.system.saves.will.value;
    data.allSavesCustom = importData.system.attributes.allSaves.value;

    data.hpMax = importData.system.attributes.hp.max;
    data.hpDetails = importData.system.attributes.hp.details;
    data.immunitiesJSON = JSON.stringify(importData.system.traits.di.value);
    data.weaknessesJSON = JSON.stringify(importData.system.traits.dv);
    data.resistancesJSON = JSON.stringify(importData.system.traits.dr);

    let defensiveAbilities = importData.items.filter((item) => {
        return item.type == `action` && item.system.actionCategory.value == `defensive`;
    });
    let defensiveAbilitiesDataArray = [];
    for (let ability of defensiveAbilities) {
        defensiveAbilitiesDataArray.push({
            name: ability.name,
            actions: convertToWGActions(ability.system.actionType.value, ability.system.actions.value),
            traits: ability.system.traits.value,
            description: ability.system.description.value,
        });
    }
    data.defensiveAbilitiesJSON = JSON.stringify(defensiveAbilitiesDataArray);

    data.speed = importData.system.attributes.speed.value;
    data.otherSpeedsJSON = JSON.stringify(importData.system.attributes.speed.otherSpeeds);

    let attacks = importData.items.filter((item) => {
        return item.type == `melee`;
    });
    let attacksDataArray = [];
    for (let attack of attacks) {

        let damageEffects = ``;
        
        if(attack.system.description.value != null){
            let matchP = /<p>@Localize\[PF2E\.PersistentDamage\.(\D+)(.+?)\.success]<\/p>/g.exec(attack.system.description.value);
            if(matchP != null){
                damageEffects += `${matchP[2]} persistent ${matchP[1].toLowerCase()}`;
            } else {
                let match = /@Localize\[PF2E\.PersistentDamage\.(\D+)(.+?)\.success]/g.exec(attack.system.description.value);
                if(match != null){
                    damageEffects += `${match[2]} persistent ${match[1].toLowerCase()}`;
                }
            }
        }

        if(damageEffects != ``){
            damageEffects += `, `;
        }
        damageEffects += attack.system.attackEffects.value;

        attacksDataArray.push({
            type: attack.system.weaponType.value,
            name: attack.name,
            bonus: attack.system.bonus.value,
            traits: attack.system.traits.value,
            damage: Object.values(attack.system.damageRolls),
            effects: damageEffects,
        });

    }
    data.attacksJSON = JSON.stringify(attacksDataArray);


    let spellcastings = importData.items.filter((item) => {
        return item.type == `spellcastingEntry`;
    });
    let spellcastingDataArray = [];
    for (let spellcasting of spellcastings) {

        
        let focusPoints = 0;
        if (spellcasting.system.prepared.value == `focus`) {
            focusPoints = importData.system.resources.focus.max;
        }

        let spells = importData.items.filter((item) => {
            return item.type == `spell` && item.system.location.value == spellcasting._id;
        });

        let spellsDataArray = [];
        let constantSpellsDataArray = [];
        for (let spell of spells) {

            let level = spell.system.level.value;
            if(spell.system.location.heightenedLevel != null){
                level = spell.system.location.heightenedLevel;
            }
            if(spell.system.traits.value.includes('cantrip')){
                level = 0;
            }

            let spellName = spell.name.toLowerCase();

            if(spellName.includes(` (constant)`)){

                spellName = spellName.replace(` (constant)`,``);
                constantSpellsDataArray.push({
                    name: spellName,
                    level: level,
                });

            } else {

                let isAtWill = false;
                if(spellName.includes(` (at will)`)){
                    spellName = spellName.replace(` (at will)`,``);
                    isAtWill = true;
                }

                spellsDataArray.push({
                    name: spellName,
                    level: level,
                    isAtWill: isAtWill,
                });

            }
            
        }

        spellcastingDataArray.push({
            name: spellcasting.name,
            dc: spellcasting.system.spelldc.dc,
            attack: spellcasting.system.spelldc.value,
            spells: spellsDataArray,
            constantSpells: constantSpellsDataArray,
            focus: focusPoints,
        });
    }
    data.spellcastingJSON = JSON.stringify(spellcastingDataArray);


    let offensiveAbilities = importData.items.filter((item) => {
        return item.type == `action` && item.system.actionCategory.value == `offensive`;
    });
    let offensiveAbilitiesDataArray = [];
    for (let ability of offensiveAbilities) {
        offensiveAbilitiesDataArray.push({
            name: ability.name,
            actions: convertToWGActions(ability.system.actionType.value, ability.system.actions.value),
            traits: ability.system.traits.value,
            description: ability.system.description.value,
        });
    }
    data.offensiveAbilitiesJSON = JSON.stringify(offensiveAbilitiesDataArray);

    data.flavorText = importData.system.details.publicNotes;
    data.contentSrc = convertToWGSource(importData.system.details.source.value);

    socket.emit('requestAdminAddCreature', data);


    openQuickView('creatureView', {
        data: data,
        conditions: [{name: 'flat-footed', value: null}],
        eliteWeak: 'weak',
    });

}



function convertToWGRarity(rarity) {
    switch (rarity) {
        case 'common': return 'COMMON';
        case 'uncommon': return 'UNCOMMON';
        case 'rare': return 'RARE';
        case 'unique': return 'UNIQUE';
        default: return 'COMMON';
    }
}

function convertToWGSize(size) {
    switch (size) {
        case 'tiny': return 'TINY';
        case 'sm': return 'SMALL';
        case 'med': return 'MEDIUM';
        case 'lg': return 'LARGE';
        case 'huge': return 'HUGE';
        case 'grg': return 'GARGANTUAN';
        default: return 'MEDIUM';
    }
}

function convertToWGActions(actionType, actions) {
    if (actionType == 'passive') {
        return null;
    } else if (actionType == 'reaction') {
        return 'REACTION';
    } else if (actionType == 'free') {
        return 'FREE-ACTION';
    } else if (actionType == 'action') {
        if (actions == 1) {
            return 'ONE-ACTION';
        } else if (actions == 2) {
            return 'TWO-ACTIONS';
        } else if (actions == 3) {
            return 'THREE-ACTIONS';
        }
    }
    return null;
}

function convertToWGSource(source) {
    switch (source) {
        case 'Pathfinder Bestiary': return 'BEST-1';
        case 'Pathfinder Bestiary 2': return 'BEST-2';
        case 'Pathfinder Bestiary 3': return 'BEST-3';
        case 'Pathfinder Gamemastery Guide': return 'GM-GUIDE';
        case 'Pathfinder Lost Omens: The Mwangi Expanse': return 'LOST-MWANGI';
        case 'Pathfinder Adventure: Malevolence': return 'MALEVOLENCE';
        case 'Pathfinder #145: Hellknight Hill': return 'AGE-OF-ASHES';
        case 'Pathfinder Kingmaker': return 'KINGMAKER'
        default: return source;
    }
}