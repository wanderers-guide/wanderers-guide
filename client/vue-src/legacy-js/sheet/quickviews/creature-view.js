/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let creatureQuickView_data = null;
let creatureQuickView_stats = null;

function openCreatureQuickview(mainData) {
    addContentSource(null, mainData.data.contentSrc, mainData.data.homebrewID);

    const data = applyEliteWeak(mainData.data, mainData.eliteWeak);
    creatureQuickView_data = data;

    // Get adjusted stats
    const stats = calculateCreatureStats(data, mainData.conditions);
    creatureQuickView_stats = stats;

    // Fix null data
    for(let d in data) { if(data[d] == null){ data[d] = ''; } }

    // Fix data for JSON.parse
    if(data.traitsJSON == ''){
        data.traitsJSON = '[]'; 
    }
    if(data.languagesJSON == ''){
        data.languagesJSON = '[]'; 
    }
    if(data.skillsJSON == ''){
        data.skillsJSON = '[]'; 
    }
    if(data.itemsJSON == ''){
        data.itemsJSON = '[]'; 
    }
    if(data.interactionAbilitiesJSON == ''){
        data.interactionAbilitiesJSON = '[]'; 
    }
    if(data.immunitiesJSON == ''){
        data.immunitiesJSON = '[]'; 
    }
    if(data.weaknessesJSON == ''){
        data.weaknessesJSON = '[]'; 
    }
    if(data.resistancesJSON == ''){
        data.resistancesJSON = '[]'; 
    }
    if(data.defensiveAbilitiesJSON == ''){
        data.defensiveAbilitiesJSON = '[]'; 
    }
    if(data.otherSpeedsJSON == ''){
        data.otherSpeedsJSON = '[]'; 
    }
    if(data.attacksJSON == ''){
        data.attacksJSON = '[]'; 
    }
    if(data.spellcastingJSON == ''){
        data.spellcastingJSON = '[]'; 
    }
    if(data.offensiveAbilitiesJSON == ''){
        data.offensiveAbilitiesJSON = '[]'; 
    }


    let name = data.name;
    if(mainData.eliteWeak == 'elite' || mainData.eliteWeak == 'weak'){
        name = `<span class="has-txt-noted is-italic">${capitalizeWord(mainData.eliteWeak)}</span> ${name}`;
    }
    $('#quickViewTitle').html(name);

    $('#quickViewTitleRight').html(`Creature ${data.level}`);

    let qContent = $('#quickViewContent');

    // Traits //
    let traitsInnerHTML = '';

    switch (data.rarity) {
        case 'UNCOMMON': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-uncommon has-tooltip-bottom has-tooltip-multiline" data-tooltip="Less is known about uncommon creatures than common creatures. They typically can\'t be summoned. The DC of Recall Knowledge checks related to this creature is increased by 2.">Uncommon</button>';
            break;
        case 'RARE': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-rare has-tooltip-bottom has-tooltip-multiline" data-tooltip="As the name suggests, these creatures are rare. They typically can\'t be summoned. The DC of Recall Knowledge checks related to this creature is increased by 5.">Rare</button>';
            break;
        case 'UNIQUE': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-unique has-tooltip-bottom has-tooltip-multiline" data-tooltip="A creature with this rarity is one of a kind. The DC of Recall Knowledge checks related to this creature is increased by 10.">Unique</button>';
            break;
        default: break;
    }

    switch (data.alignment) {
        case 'LE': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom" data-tooltip="Lawful and evil">LE</button>';
            break;
        case 'LG': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom" data-tooltip="Lawful and good">LG</button>';
            break;
        case 'LN': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom" data-tooltip="Lawful and neutral">LN</button>';
            break;
        case 'CE': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom" data-tooltip="Chaotic and evil">CE</button>';
            break;
        case 'CG': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom" data-tooltip="Chaotic and good">CG</button>';
            break;
        case 'CN': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom" data-tooltip="Chaotic and neutral">CN</button>';
            break;
        case 'N': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom" data-tooltip="Neutral">N</button>';
            break;
        case 'NE': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom" data-tooltip="Neutral and evil">NE</button>';
            break;
        case 'NG': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom" data-tooltip="Neutral and good">NG</button>';
            break;
        default: break;
    }

    switch (data.size) {
        case 'TINY': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom has-tooltip-multiline" data-tooltip="A Tiny creature takes up less than a 5-foot-by-5- foot space (1 square on the grid), and multiple Tiny creatures can occupy the same square on the grid. At least four Tiny creatures can occupy the same square, and even more can occupy the same square, at the GM’s discretion. They can also occupy the same space as larger creatures, and if their reach is 0 feet, they must do so in order to attack.">Tiny</button>';
            break;
        case 'SMALL': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom has-tooltip-multiline" data-tooltip="A Small creature takes up a 5-foot-by-5-foot space (1 square on the grid) and typically has a reach of 5 feet.">Small</button>';
            break;
        case 'MEDIUM': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom has-tooltip-multiline" data-tooltip="A Medium creature takes up a 5-foot-by-5-foot space (1 square on the grid) and typically has a reach of 5 feet.">Medium</button>';
            break;
        case 'LARGE': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom has-tooltip-multiline" data-tooltip="A Large creature takes up a 10-foot-by-10-foot space (4 squares on the grid). It typically has a reach of 10 feet if the creature is tall or 5 feet if the creature is long.">Large</button>';
            break;
        case 'HUGE': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom has-tooltip-multiline" data-tooltip="A Huge creature takes up a 15-foot-by-15-foot space (9 squares on the grid). It typically has a reach of 15 feet if the creature is tall or 10 feet if the creature is long.">Huge</button>';
            break;
        case 'GARGANTUAN': traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-link has-tooltip-bottom has-tooltip-multiline" data-tooltip="A Gargantuan creature takes up a space of at least 20 feet by 20 feet (16 squares on the grid), but can be much larger. Gargantuan creatures typically have a reach of 20 feet if they are tall, or 15 feet if they are long, but larger ones could have a much longer reach.">Gargantuan</button>';
            break;
        default: break;
    }

    let traits = JSON.parse(data.traitsJSON).sort(
        function (a, b) {
            return a > b ? 1 : -1;
        }
    );

    for (const traitName of traits) {

        let tag = g_allTags.find(tag => {
            return tag.name.toLowerCase() === traitName.toLowerCase();
        });

        if (tag == null) {
            console.error('Unknown trait: ' + traitName);
            tag = {
                name: traitName,
                description: `Unknown trait!`,
                isImportant: 0,
            };
        }

        let tagDescription = tag.description;

        if (tagDescription.length > g_tagStringLengthMax) {
            tagDescription = tagDescription.substring(0, g_tagStringLengthMax);
            tagDescription += '...';
        }

        traitsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-info has-tooltip-bottom has-tooltip-multiline tagButton" data-tooltip="' + processTextRemoveIndexing(tagDescription) + '">' + tag.name + getImportantTraitIcon(tag) + '</button>';
    }
    if (traitsInnerHTML != '') {
        qContent.append('<div class="buttons is-marginless is-centered">' + traitsInnerHTML + '</div>');
        qContent.append('<hr class="mb-2 mt-1">');
    }

    $('.tagButton').click(function () {
        let tagName = $(this).text();
        openQuickView('tagView', {
            TagName: tagName,
            _prevBackData: { Type: g_QViewLastType, Data: g_QViewLastData },
        }, $('#quickviewDefault').hasClass('is-active'));
    });

    // Conditions //
    let conditionsInnerHTML = '';
    for(let condition of getAppliedConditions(mainData.conditions)){

        let fullCondition = g_allConditions.find(fullCondition => {
            return fullCondition.name.toLowerCase() === condition.name.toLowerCase();
        });

        let conditionDescription = fullCondition.description;

        if (conditionDescription.length > g_conditionStringLengthMax) {
            // Reduce to tag limit
            conditionDescription = conditionDescription.substring(0, g_conditionStringLengthMax);
            // Reduce to include up to last complete sentence.
            conditionDescription = conditionDescription.substring(0, conditionDescription.lastIndexOf(".")+1);
        }

        conditionsInnerHTML += `<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-danger has-tooltip-bottom has-tooltip-multiline tagButton" data-tooltip="${processTextRemoveIndexing(conditionDescription)}">${fullCondition.name} ${(condition.value != null ? condition.value : '')}</button>`;

    }
    if (conditionsInnerHTML != '') {
        qContent.append('<div class="buttons is-marginless is-centered">' + conditionsInnerHTML + '</div>');
    }


    // Recall Knowledge //
    // TODO


    // Perception //
    let perceptionStr = signNumber(stats.perception);
    if(stats.perception != data.perceptionBonus){
        perceptionStr = wrapAdjust(perceptionStr, (stats.perception < data.perceptionBonus));
    }

    qContent.append(`
        <div class="pl-2 pr-1">
            <p class="negative-indent">
                <span><strong>Perception </strong></span><span>${perceptionStr}${stats.perceptionConditionals}${(data.senses != ``) ? `; ${data.senses}` : ``}</span>
            </p>
        </div>
    `);

    // Languages //
    let langStr = '';
    for (let language of JSON.parse(data.languagesJSON)) {
        langStr += language + ', ';
    }
    langStr = langStr.slice(0, -2);// Trim off that last ', '
    if (data.languagesCustom != ``) {
        langStr += `; ${data.languagesCustom}`;
    }
    if (langStr != ``) {
        qContent.append(`
            <div class="pl-2 pr-1">
                <p class="negative-indent">
                    <span><strong>Languages </strong></span><span>${langStr}</span>
                </p>
            </div>
        `);
    }

    // Skills //
    let skillStr = '';
    for (let skill of stats.skills) {
        
        let singleSkillStr = `${skill.name} ${signNumber(skill.bonus)}`;

        let dSkill = data.skills.find(dSkill => {
            return dSkill.name === skill.name;
        });
        if(dSkill != null && skill.bonus != dSkill.bonus){
            singleSkillStr = wrapAdjust(singleSkillStr, (skill.bonus < dSkill.bonus));
        }

        skillStr += `${singleSkillStr}, `;
    }
    skillStr = skillStr.slice(0, -2);// Trim off that last ', '
    if (skillStr != ``) {
        qContent.append(`
            <div class="pl-2 pr-1">
                <p class="negative-indent">
                    <span><strong>Skills </strong></span><span>${skillStr}</span>
                </p>
            </div>
        `);
    }

    // Ability Mods //
    let strStr = signNumber(stats.abilityMods.str);
    let dexStr = signNumber(stats.abilityMods.dex);
    let conStr = signNumber(stats.abilityMods.con);
    let intStr = signNumber(stats.abilityMods.int);
    let wisStr = signNumber(stats.abilityMods.wis);
    let chaStr = signNumber(stats.abilityMods.cha);

    if(stats.abilityMods.str != data.strMod){
        strStr = wrapAdjust(strStr, (stats.abilityMods.str < data.strMod));
    }
    if(stats.abilityMods.dex != data.dexMod){
        dexStr = wrapAdjust(dexStr, (stats.abilityMods.dex < data.dexMod));
    }
    if(stats.abilityMods.con != data.conMod){
        conStr = wrapAdjust(conStr, (stats.abilityMods.con < data.conMod));
    }
    if(stats.abilityMods.int != data.intMod){
        intStr = wrapAdjust(intStr, (stats.abilityMods.int < data.intMod));
    }
    if(stats.abilityMods.wis != data.wisMod){
        wisStr = wrapAdjust(wisStr, (stats.abilityMods.wis < data.wisMod));
    }
    if(stats.abilityMods.cha != data.chaMod){
        chaStr = wrapAdjust(chaStr, (stats.abilityMods.cha < data.chaMod));
    }

    qContent.append(`
        <div class="pl-2 pr-1">
            <p class="negative-indent">
                <span><strong>Str </strong></span><span>${strStr}, </span>
                <span><strong>Dex </strong></span><span>${dexStr}, </span>
                <span><strong>Con </strong></span><span>${conStr}, </span>
                <span><strong>Int </strong></span><span>${intStr}, </span>
                <span><strong>Wis </strong></span><span>${wisStr}, </span>
                <span><strong>Cha </strong></span><span>${chaStr} </span>
            </p>
        </div>
    `);

    // Items //
    let itemsStr = '';
    for (let item of JSON.parse(data.itemsJSON)) {

        if (item.quantity > 1) {
            itemsStr += `${item.quantity}x `;
        }

        if (item.doIndex) {
            itemsStr += item.displayName.replace(new RegExp(item.name, 'i'), `(item: ${item.name})`).toLowerCase();
        } else {
            itemsStr += item.displayName.toLowerCase();
        }

        if (item.shieldStats != null) {
            itemsStr += ` __(${signNumber(item.shieldStats.armor)} to AC; Hardness ${item.shieldStats.hardness}, HP ${item.shieldStats.hp}, BT ${item.shieldStats.bt})__`;
        }

        itemsStr += `, `;

    }
    itemsStr = itemsStr.slice(0, -2);// Trim off that last ', '
    if (itemsStr != ``) {
        itemsStr = `~ Items: ${itemsStr}`;
        qContent.append(`
            <div class="">
                ${processText(itemsStr, false, false, 'MEDIUM')}
            </div>
        `);
    }

    // Interaction Abilities //
    let interactionAbilities = JSON.parse(data.interactionAbilitiesJSON);
    for (let ability of interactionAbilities) {
        // Remove Darkvision or other base machanics like that
        if (ability.description == `` || ability.description.startsWith(`<p>@Localize[PF2E.NPC.Abilities.Glossary.`)) { continue; }
        addAbility(qContent, ability);
    }

    qContent.append('<hr class="mb-2 mt-1">');

    // AC & Saves //
    let acStr = stats.ac;
    let fortStr = signNumber(stats.saves.fort);
    let reflexStr = signNumber(stats.saves.reflex);
    let willStr = signNumber(stats.saves.will);

    if(stats.ac != data.acValue){
        acStr = wrapAdjust(acStr, (stats.ac < data.acValue));
    }
    if(stats.saves.fort != data.fortBonus){
        fortStr = wrapAdjust(fortStr, (stats.saves.fort < data.fortBonus));
    }
    if(stats.saves.reflex != data.reflexBonus){
        reflexStr = wrapAdjust(reflexStr, (stats.saves.reflex < data.reflexBonus));
    }
    if(stats.saves.will != data.willBonus){
        willStr = wrapAdjust(willStr, (stats.saves.will < data.willBonus));
    }

    qContent.append(`
        <div class="pl-2 pr-1">
            <p class="negative-indent">
                <span><strong>AC </strong></span><span>${acStr}; </span>
                <span><strong>Fort </strong></span><span>${fortStr}, </span>
                <span><strong>Ref </strong></span><span>${reflexStr}, </span>
                <span><strong>Will </strong></span><span>${willStr}${(data.allSavesCustom != null && data.allSavesCustom != ``) ? `; ` : ``}</span>
                ${(data.allSavesCustom != null && data.allSavesCustom != ``) ? `<span>${data.allSavesCustom}</span>` : ``}
            </p>
        </div>
    `);

    // HP, Imm, Weak, Resist //
    let immunitiesStr = '';
    for (let immunity of JSON.parse(data.immunitiesJSON)) {
        immunitiesStr += `${immunity}, `;
    }
    immunitiesStr = immunitiesStr.slice(0, -2);// Trim off that last ', '

    let weaknessesStr = '';
    for (let weakness of JSON.parse(data.weaknessesJSON)) {
        weaknessesStr += `${weakness.type} ${weakness.value}`;
        if (weakness.exceptions != null && weakness.exceptions != '') {
            weaknessesStr += ` (${weakness.exceptions})`;
        }
        weaknessesStr += `, `;
    }
    weaknessesStr = weaknessesStr.slice(0, -2);// Trim off that last ', '

    let resistancesStr = '';
    for (let resistance of JSON.parse(data.resistancesJSON)) {
        resistancesStr += `${resistance.type} ${resistance.value}`;
        if (resistance.exceptions != null && resistance.exceptions != '') {
            resistancesStr += ` (${resistance.exceptions})`;
        }
        resistancesStr += `, `;
    }
    resistancesStr = resistancesStr.slice(0, -2);// Trim off that last ', '

    let hpMaxStr = stats.hpMax;
    if(stats.hpMax != data.hpMax){
        hpMaxStr = wrapAdjust(hpMaxStr, (stats.hpMax < data.hpMax));
    }

    qContent.append(`
        <div class="pl-2 pr-1">
            <p class="negative-indent">
                <strong>HP </strong>${hpMaxStr}${(data.hpDetails != ``) ? `, ${data.hpDetails}` : ``}${(immunitiesStr != ``) ? `; <strong>Immunities </strong>${immunitiesStr}` : ``}${(weaknessesStr != ``) ? `; <strong>Weaknesses </strong>${weaknessesStr}` : ``}${(resistancesStr != ``) ? `; <strong>Resistances </strong>${resistancesStr}` : ``}
            </p>
        </div>
    `);

    // Defensive Abilities //
    let defensiveAbilities = JSON.parse(data.defensiveAbilitiesJSON);
    for (let ability of defensiveAbilities) {
        if(ability.description == ``) { continue; }
        addAbility(qContent, ability);
    }

    qContent.append('<hr class="mb-2 mt-1">');

    // Speeds //
    let otherSpeedsStr = '';
    for (let otherSpeed of JSON.parse(data.otherSpeedsJSON)) {
        let speedValue = parseInt(otherSpeed.value) + stats.adj_speed;
        if(speedValue < 5){ speedValue = 5; }
        otherSpeedsStr += `, ${otherSpeed.type} ${speedValue} feet`;
    }
    let speedStr;
    if(data.speed == 0){
        speedStr = ``;
        otherSpeedsStr = otherSpeedsStr.slice(2); // Remove first ', '
    } else {
        let speedValue = parseInt(data.speed) + stats.adj_speed;
        if(speedValue < 5){ speedValue = 5; }
        speedStr = `${speedValue} feet`;
    }

    if(stats.adj_speed != 0){
        speedStr = wrapAdjust(speedStr, (stats.adj_speed < 0));
        otherSpeedsStr = wrapAdjust(otherSpeedsStr, (stats.adj_speed < 0));
    }

    qContent.append(`
        <div class="pl-2 pr-1">
            <p class="negative-indent">
                <span><strong>Speed </strong></span><span>${speedStr}${otherSpeedsStr} </span>
            </p>
        </div>
    `);

    // Attacks //
    for (let attack of JSON.parse(data.attacksJSON)) {

        let traitsStr = stringifyTraits(attack.traits, true);

        let agileTrait = attack.traits.find(trait => {
            return trait == 'agile';
        });
        let hasAgile = (agileTrait != null);

        let finesseTrait = attack.traits.find(trait => {
            return trait == 'finesse';
        });
        let hasFinesse = (finesseTrait != null);

        let brutalTrait = attack.traits.find(trait => {
            return trait == 'brutal';
        });
        let hasBrutal = (brutalTrait != null);

        let thrownTrait = attack.traits.find(trait => {
            return trait.startsWith('thrown');
        });
        let hasThrown = (thrownTrait != null);

        let propulsiveTrait = attack.traits.find(trait => {
            return trait == 'propulsive';
        });
        let hasPropulsive = (propulsiveTrait != null);

        let adj_attack = (attack.type.toLowerCase() == 'melee') ? stats.adj_meleeAttack : stats.adj_rangedAttack;
        let adj_damage = (attack.type.toLowerCase() == 'melee') ? stats.adj_meleeDamage :  stats.adj_rangedDamage;

        let data_adj_attack = (attack.type.toLowerCase() == 'melee') ? data.adj_meleeAttack : data.adj_rangedAttack;
        let data_adj_damage = (attack.type.toLowerCase() == 'melee') ? data.adj_meleeDamage :  data.adj_rangedDamage;

        // Apply trait-based adjustments (by un-baking stats and re-adjusting)
        if(hasFinesse){
            let usesDex = (data.dexMod >= data.strMod);

            let dex_adj_attack = stats.adj_rangedAttack+(usesDex ? 0 : (data.dexMod - data.strMod));
            let dex_data_adj_attack = data.adj_rangedAttack+(usesDex ? 0 : (data.dexMod - data.strMod));

            let str_adj_attack = stats.adj_meleeAttack+(usesDex ? (data.strMod - data.dexMod) : 0);
            let str_data_adj_attack = data.adj_meleeAttack+(usesDex ? (data.strMod - data.dexMod) : 0);

            if(dex_adj_attack > str_adj_attack){
                adj_attack = dex_adj_attack;
                data_adj_attack = dex_data_adj_attack;
            } else {
                adj_attack = str_adj_attack;
                data_adj_attack = str_data_adj_attack;
            }
        }
        if(hasBrutal){
            adj_attack = stats.adj_meleeAttack;
            data_adj_attack = data.adj_meleeAttack;
        }
        if(hasThrown){
            let prevStrAdj = data.strMod;
            adj_damage = stats.adj_rangedDamage + stats.abilityMods.str - prevStrAdj;
            data_adj_damage = data.adj_rangedDamage + data.strMod - prevStrAdj;
        }
        if(hasPropulsive){
            let prevStrAdj = (data.strMod > 0) ? Math.floor(data.strMod/2) : -1*data.strMod;
            if(stats.abilityMods.str > 0){
                adj_damage = stats.adj_rangedDamage + Math.floor((stats.abilityMods.str)/2) - prevStrAdj;
                data_adj_damage = data.adj_rangedDamage + Math.floor((data.strMod)/2) - prevStrAdj;
            } else {
                adj_damage = stats.adj_rangedDamage + stats.abilityMods.str - prevStrAdj;
                data_adj_damage = data.adj_rangedDamage + data.strMod - prevStrAdj;
            }
        }

        let attackBonus_1 = signNumber(attack.bonus+adj_attack);
        let attackBonus_2 = signNumber(attack.bonus+adj_attack - (hasAgile ? 4 : 5));
        let attackBonus_3 = signNumber(attack.bonus+adj_attack - (hasAgile ? 8 : 10));
        let attackBonusStr = `${attackBonus_1} / ${attackBonus_2} / ${attackBonus_3}`;

        if(adj_attack != data_adj_attack){
            attackBonusStr = wrapAdjust(attackBonusStr, (adj_attack < data_adj_attack));
        }

        let damageStr = '';
        for (let damage of attack.damage) {
            let damageType = damage.damageType;
            //if (damageType.toLowerCase() == 'piercing') { damageType = 'P'; }
            //if (damageType.toLowerCase() == 'slashing') { damageType = 'S'; }
            //if (damageType.toLowerCase() == 'bludgeoning') { damageType = 'B'; }

            if(adj_damage != data_adj_damage){

                let finalDamage = damage.damage.replace(/(\s*)([+-])(\s*)(\d+)$/, function(match, space1, numSign, space2, bonus){

                    let numBonus = parseInt(bonus);
                    if(numSign == '-'){ numBonus = -1*numBonus; }

                    let resultBonus = numBonus + adj_damage;
                    let finalSign = (resultBonus >= 0 ? '+' : '-');
                    let finalBonus = Math.abs(resultBonus);
        
                    return wrapAdjust(`${space1}${finalSign}${space2}${finalBonus}`, (adj_damage < data_adj_damage));
                });

                damageStr += `${finalDamage} ${damageType}, `;
            } else {
                if(adj_damage != 0){
                    damageStr += `${damage.damage+signNumber(adj_damage)} ${damageType}, `;
                } else {
                    damageStr += `${damage.damage} ${damageType}, `;
                }
            }
        }
        if (attack.effects != ``) {
            damageStr += `plus ${attack.effects}`;
        } else {
            damageStr = damageStr.slice(0, -2);// Trim off that last ', '
        }

        qContent.append(`
            <div class="">
                ${processText(`~ ${capitalizeWord(attack.type)}: ONE-ACTION ${attack.name.toLowerCase()} ${attackBonusStr}${traitsStr}, **Damage** ${damageStr}`, false, false, 'MEDIUM')}
            </div>
        `);

    }

    // Spellcasting //
    for (let spellcasting of JSON.parse(data.spellcastingJSON)) {

        let indexSpells = (!spellcasting.name.includes(`Ritual`));

        let spellsStr = ``;
        if (spellcasting.focus != 0) {
            spellsStr += `${spellcasting.focus} Focus Points`;
        }
        if (spellcasting.dc != 0) {
            if (spellsStr != ``) { spellsStr += `, `; }

            let spellDCStr = `DC ${spellcasting.dc+stats.adj_spellDC}`;
            if(stats.adj_spellDC != data.adj_spellDC){
                spellDCStr = wrapAdjust(spellDCStr, (stats.adj_spellDC < data.adj_spellDC));
            }

            spellsStr += spellDCStr;
        }
        if (spellcasting.attack != 0) {
            if (spellsStr != ``) { spellsStr += `, `; }

            let spellAttackStr = `attack ${signNumber(spellcasting.attack+stats.adj_spellAttack)}`;
            if(stats.adj_spellAttack != data.adj_spellAttack){
                spellAttackStr = wrapAdjust(spellAttackStr, (stats.adj_spellAttack < data.adj_spellAttack));
            }

            spellsStr += spellAttackStr;

        }
        spellsStr += `; `;

        // Spells
        let spells = spellcasting.spells.sort(
            function (a, b) {
                if (a.level === b.level) {
                    // Name is only important when levels are the same
                    return a.name > b.name ? 1 : -1;
                }
                return b.level - a.level;
            }
        );
        let spell_lastLevel = 999;
        for(let spell of spells){
            if(spell.level < spell_lastLevel){
                if(spell_lastLevel != 999){
                    spellsStr = spellsStr.slice(0, -2);// Trim off that last ', '
                    spellsStr += `; `;
                }
                if(spell.level == 0){
                    spellsStr += `**Cantrips (${rankLevel(spells[0].level)})** `;
                } else {
                    spellsStr += `**${rankLevel(spell.level)}** `;
                }
            }
            if(indexSpells){
                spellsStr += `(spell: ${spell.name.toLowerCase()})${spell.isAtWill ? ` (at will)` : ``}, `;
            } else {
                spellsStr += `${spell.name.toLowerCase()}${spell.isAtWill ? ` (at will)` : ``}, `;
            }
            spell_lastLevel = spell.level;
        }
        if(spells.length > 0){
            spellsStr = spellsStr.slice(0, -2);// Trim off that last ', '
        }
        //

        // Constant Spells
        let constantSpells = spellcasting.constantSpells.sort(
            function (a, b) {
                if (a.level === b.level) {
                    // Name is only important when levels are the same
                    return a.name > b.name ? 1 : -1;
                }
                return b.level - a.level;
            }
        );
        if(constantSpells.length > 0){
            if(spells.length > 0){
                spellsStr += `; `;
            }
            spellsStr += `**Constant** `;
        }
        let constant_lastLevel = 999;
        for(let spell of constantSpells){
            if(spell.level < constant_lastLevel){
                if(constant_lastLevel != 999){
                    spellsStr = spellsStr.slice(0, -2);// Trim off that last ', '
                    spellsStr += `; `;
                }
                if(spell.level == 0){
                    spellsStr += `**(Cantrips)** `;
                } else {
                    spellsStr += `**(${rankLevel(spell.level)})** `;
                }
            }
            if(indexSpells){
                spellsStr += `(spell: ${spell.name.toLowerCase()}), `;
            } else {
                spellsStr += `${spell.name.toLowerCase()}, `;
            }
            constant_lastLevel = spell.level;
        }
        if(constantSpells.length > 0){
            spellsStr = spellsStr.slice(0, -2);// Trim off that last ', '
        }
        //

        qContent.append(`
            <div class="">
                ${processText(`~ ${spellcasting.name}: ${spellsStr}`, false, false, 'MEDIUM')}
            </div>
        `);

    }

    // Offensive Abilities //
    let offensiveAbilities = JSON.parse(data.offensiveAbilitiesJSON);
    for (let ability of offensiveAbilities) {
        addAbility(qContent, ability);
    }

    if (data.flavorText != null && data.flavorText != ``) {
        qContent.append('<hr class="mb-2 mt-1">');

        qContent.append(`
            <div class="pl-2 pr-2 pt-2">
                <p class="text-center"><a class="has-text-info creature-view-flavor-text">[ View Description ]</a></p>
            </div>
        `);

        $('.creature-view-flavor-text').click(function () {
            openQuickView('abilityView', {
                Ability: {
                    name: data.name,
                    description: `<div class="is-italic">${data.flavorText}</div>`,
                    level: 0,
                },
                _prevBackData: { Type: g_QViewLastType, Data: g_QViewLastData },
            }, $('#quickviewDefault').hasClass('is-active'));
        });
    }

}


function addAbility(qContent, ability) {

    let traitsStr = stringifyTraits(ability.traits, true);

    let abilityID = 'creature-ability-' + ability.name.replace(/\W/g, '-');

    let actions = ability.actions;
    if (actions == null) { actions = ''; }


    if (ability.description.startsWith(`<p>@Localize[PF2E.NPC.Abilities.Glossary.`)) {
        // It's just the name of the ability and a link,

        let abilityName = ability.name;
        let extraText = ``;

        let matchFeet = ability.name.match(/ \d+ feet.*/);
        if(matchFeet != null){
            extraText = matchFeet[0];
            abilityName = ability.name.replace(extraText, '');
        } else {
            let matchNum = ability.name.match(/ \d+.*/);
            if(matchNum != null){
                extraText = matchNum[0];
                abilityName = ability.name.replace(extraText, '');
            }
        }

        qContent.append(`
            <div class="">
                ${processText(`<span id="${abilityID}-header" class=""><span class="icon is-small pr-1"><i class="fas fa-xs fa-chevron-right"></i></span><strong class="is-bold">(feat: ${abilityName})${extraText}</strong></span> ${actions}${traitsStr}`, false, false, 'MEDIUM')}
            </div>
        `);

    } else {

        qContent.append(`
            <div class="">
                ${processText(`<span id="${abilityID}-header" class="cursor-clickable"><span class="icon is-small pr-1"><i id="${abilityID}-chevron" class="fas fa-xs fa-chevron-right"></i></span><strong class="is-bold">${ability.name}</strong></span> ${actions}${traitsStr}`, false, false, 'MEDIUM')}
                <div id="${abilityID}-description" class="is-hidden pl-4">
                    ${processText(parseDescription(ability.description), false, false, 'MEDIUM')}
                </div>
            </div>
        `);

        $(`#${abilityID}-header`).click(function () {
            if ($(`#${abilityID}-description`).hasClass("is-hidden")) {
                $(`#${abilityID}-description`).removeClass('is-hidden');
                $(`#${abilityID}-chevron`).removeClass('fa-chevron-right');
                $(`#${abilityID}-chevron`).addClass('fa-chevron-down');
            } else {
                $(`#${abilityID}-description`).addClass('is-hidden');
                $(`#${abilityID}-chevron`).removeClass('fa-chevron-down');
                $(`#${abilityID}-chevron`).addClass('fa-chevron-right');
            }
        });

    }

}

function wrapAdjust(value, isNegative){
    if(isNegative){
        return `<span class="has-text-danger">${value}</span>`;
    } else {
        return `<span class="has-text-success">${value}</span>`;
    }
}

function stringifyTraits(traits, surroundWithParentheses = false) {
    let traitsStr = '';
    for (let trait of traits) {

        if (trait.toLowerCase().startsWith('reach-')) {

            let reachAmt = trait.toLowerCase().replace('reach-', '');
            traitsStr += `(trait: reach) ${reachAmt} feet, `;

        } else if (trait.toLowerCase().startsWith('range-')) {

            let rangeAmt = trait.toLowerCase().replace('range-', '');
            rangeAmt = rangeAmt.replace('increment-', '');
            traitsStr += `range ${rangeAmt} feet, `;

        } else if (trait.toLowerCase().startsWith('reload-')) {

            let reloadAmt = trait.toLowerCase().replace('reload-', '');
            traitsStr += `reload ${reloadAmt}, `;

        } else if (trait.toLowerCase().startsWith('thrown-')) {

            let thrownAmt = trait.toLowerCase().replace('thrown-', '');
            traitsStr += `(trait: thrown) ${thrownAmt} feet, `;

        } else {
            traitsStr += `(trait: ${trait.replace(/-/g, ' ')}), `;
        }

    }
    traitsStr = traitsStr.slice(0, -2);// Trim off that last ', '
    if (traitsStr != '' && surroundWithParentheses) { traitsStr = ` (${traitsStr})`; }
    return traitsStr;
}

function parseDescription(text) {

    text = text.replace(/\[\[\/(r|br) (.*?)\]\]{(.*?)}/g, handleParse_DamageExt);
    text = text.replace(/\[\[\/(r|br) (.*)\]\]/g, handleParse_Damage);
    text = text.replace(/<hr \/>\n<p>@Compendium\[pf2e\.bestiary-effects\.Effect:(.+?)<\/p>/gi, '');
    text = text.replace(/@Compendium\[(.+?)\]{(.*?)}/g, handleParse_Compendium);
    text = text.replace(/@Template\[(.+?)\]/g, handleParse_Template);
    text = text.replace(/@Check\[(.+?)\]/g, handleParse_Check);
    text = text.replace(/@Localize\[PF2E\.NPC\.Abilities\.Glossary\.(.+?)\]/g, handleParse_Glossary);

    // Adjustments
    if(creatureQuickView_stats.adj_generalDamage != 0){
        text = text.replace(/(^| )(\d+)+d(\d+)((\s*[+-]\s*\d+)*)($|\D)/g, function(match, startChar, diceNum, diceType, extraBonuses, lastBonus, endChar){

            let generalDamageStr = signNumber(creatureQuickView_stats.adj_generalDamage);
            if(creatureQuickView_stats.adj_generalDamage != creatureQuickView_data.adj_generalDamage){
                generalDamageStr = wrapAdjust(generalDamageStr, (creatureQuickView_stats.adj_generalDamage < creatureQuickView_data.adj_generalDamage));
            }

            return `${startChar}${diceNum}d${diceType}${extraBonuses}${generalDamageStr}${endChar}`;
        });
    }
    if(creatureQuickView_stats.adj_generalDC != 0){
        text = text.replace(/(^| )DC (\d+)($|\D)/g, function(match, startChar, dcValue, endChar){

            let generalDCStr = ''+(parseInt(dcValue) + creatureQuickView_stats.adj_generalDC);
            if(creatureQuickView_stats.adj_generalDC != creatureQuickView_data.adj_generalDC){
                generalDCStr = wrapAdjust(generalDCStr, (creatureQuickView_stats.adj_generalDC < creatureQuickView_data.adj_generalDC));
            }

            return `${startChar}DC ${generalDCStr}${endChar}`;
        });
    }

    return text;
}

function handleParse_DamageExt(match, rBr, innerText, displayText) {
    return displayText;
}

function handleParse_Damage(match, rBr, innerText) {
    return innerText.replace(/\W/g, ' ').trim();
}

function handleParse_Glossary(match, innerText) {

    if (typeof g_featMap !== 'undefined' && g_featMap != null) {
        innerText = innerText.toLowerCase();

        for (const [featID, featStruct] of g_featMap.entries()) {
            let reducedName = featStruct.Feat.name.replace(/ /g, '').toLowerCase();
            if (reducedName === innerText) {

                let description = ``;

                if (featStruct.Feat.frequency != null && featStruct.Feat.frequency != '') {
                    description += `**Frequency** ${featStruct.Feat.frequency}\n`;
                }
                if (featStruct.Feat.cost != null && featStruct.Feat.cost != '') {
                    description += `**Cost** ${featStruct.Feat.cost}\n`;
                }
                if (featStruct.Feat.trigger != null && featStruct.Feat.trigger != '') {
                    description += `**Trigger** ${featStruct.Feat.trigger}\n`;
                }
                if (featStruct.Feat.requirements != null && featStruct.Feat.requirements != '') {
                    description += `**Requirements** ${featStruct.Feat.requirements}\n`;
                }

                return description+featStruct.Feat.description;
            }
        }
        return `Failed to find description of ${innerText}.`;
    } else {
        return `Description of ${innerText}.`;
    }

}

function handleParse_Compendium(match, innerText, displayText) {
    if (innerText.includes('Persistent Damage')) {
        return 'damage';
    } else {
        return displayText.toLowerCase();
    }
}

function handleParse_Template(match, innerText) {
    innerText = innerText.toLowerCase();

    let type = null;
    let distance = null;

    let values = innerText.split('|');
    for (let value of values) {

        if (value.startsWith('type:')) {
            type = value.replace('type:', '');
        } else if (value.startsWith('distance:')) {
            distance = value.replace('distance:', '');
        }

    }

    if (type != null && distance != null) {
        return `${distance}-foot ${type} `;
    } else {
        return innerText;
    }

}

function handleParse_Check(match, innerText) {
    innerText = innerText.toLowerCase();

    let type = null;
    let dc = null;
    let basic = null;
    let name = null;
    let traits = null;

    let values = innerText.split('|');
    for (let value of values) {

        if (value.startsWith('type:')) {
            type = value.replace('type:', '');
        } else if (value.startsWith('dc:')) {
            dc = value.replace('dc:', '');
        } else if (value.startsWith('basic:')) {
            basic = value.replace('basic:', '');
        } else if (value.startsWith('name:')) {
            name = value.replace('name:', '');
        } else if (value.startsWith('traits:')) {
            traits = value.replace('traits:', '');
        }

    }

    if (dc != null && type != null) {
        let basicStr = (basic != null && basic == 'true') ? 'basic ' : '';
        return `DC ${dc} ${basicStr}${capitalizeWords(type)}`;
    } else {
        return innerText;
    }

}
