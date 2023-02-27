/* Copyright (C) 2020, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();
let isSheetInit = false;
let isViewOnly = false;

/* Character Options */
let gOption_hasAutoHeightenSpells;
let gOption_hasProfWithoutLevel;
let gOption_hasStamina;
let gOption_hasDiceRoller;
let gOption_hasAutoBonusProgression;
let gOption_hasGradualAbilityBoosts;
/* ~~~~~~~~~~~~~~~~~ */

/* Internal Sheet-State Options */
let gState_hasFinesseMeleeUseDexDamage;
let gState_armoredStealth;
let gState_mightyBulwark;
let gState_unburdenedIron;
let gState_improvisedWeaponNoPenalty;
let gState_addLevelToUntrainedWeaponAttack;
let gState_addLevelToUntrainedSkill;
let gState_displayCompanionTab;
let gState_MAP = 'TIER_1';
// TIER_1 = (5/10 or 4/8 agile)
// TIER_2 = (4/8 or 3/6 agile)
// TIER_3 = (3/6 or 2/4 agile)
// TIER_4 = (2/4 or 1/2 agile)
/* ~~~~~~~~~~~~~~~~~~~ */

let g_calculatedStats = null;

let g_enabledSources = null;

let g_character = null;
let g_classDetails = null;
let g_ancestry = null;
let g_heritage = null;
let g_background = null;
let g_charTagsArray = null;

let g_campaignDetails = null;

let g_classArchetype = null;

let g_charSize = null;

let g_allTags = null;

let g_itemMap = null;
let g_invStruct = null;
let g_bulkAndCoinsStruct = null;
let g_openBagsSet = new Set();

let g_otherSpeeds = null;

let g_conditionsMap = null;
let g_allConditions = null;

let g_profMap = null;
let g_weaponProfMap = null;
let g_armorProfMap = null;

let g_equippedArmorInvItemID = null;
let g_equippedShieldInvItemID = null;
let g_equippedArmorCategory = null;

let g_abilMap = null;
let g_skillMap = null;
let g_senseArray = null;
let g_phyFeatArray = null;

let g_langArray = null;
let g_allLanguages = null;

let g_featMap = null;
let g_featChoiceArray = null;

let g_extraClassAbilities = null;
let g_allClassAbilityOptions = null;

let g_spellMap = null;
let g_spellSlotsMap = null;
let g_spellBookArray = null;
let g_innateSpellArray = null;

let g_companionData = null;

let g_resistAndVulners = null;

let g_heritageEffects = null;

let g_specializationStruct = null;
let g_weaponFamiliaritiesArray = null;

let g_runeDataStruct = null;

let g_notesFields = null;

let currentInvests = null;
let maxInvests = null;

let g_sheetStatesArray = null;

let g_unselectedDataArray = null;

let g_sheetTabSizeLock = false;

let g_inventoryTabScroll = null;
let g_selectedTabID = 'inventoryTab';
let g_selectedSubTabID = null;
let g_selectedSubTabLock = false;

let g_selectedActionSubTabID = 'actionTabEncounter';
let g_selectedAction_SkillOption = 'chooseDefault';
let g_selectedAction_ActionOption = 'chooseDefault';
let g_selectedAction_SearchText = '';
let g_selectedAction_BasicEnabled = true;
let g_selectedAction_FeatsEnabled = true;
let g_selectedAction_ItemsEnabled = true;
let g_selectedAction_SkillsEnabled = true;

let g_selectedSpellSubTabID = null;

let g_selectedDetailsSubTabID = 'detailsTabFeats';
let g_selectedDetailsOptionValue = 'All';

let g_preConditions_strScore = null;
let g_preConditions_dexScore = null;
let g_preConditions_conScore = null;
let g_preConditions_intScore = null;
let g_preConditions_wisScore = null;
let g_preConditions_chaScore = null;

let g_showHealthPanel = true; // For Stamina GMG Variant

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    // If using Silk browser, attempt to go full screen
    if (/\bSilk\b/.test(navigator.userAgent)) {
      document.documentElement.requestFullscreen({ navigationUI: "hide" });
    }

    window.setTimeout(() => {
      if(!isSheetInit){
        displayError('Sheet took too long to load. There may have been an issue when loading.');
        $('#sheet-container').addClass('is-hidden');
        stopDiceLoader();
      }
    }, 90000); // 90 seconds

    // Remove Footer //
    $('#wanderers-guide-footer').addClass('is-hidden');
    $('#main-container').addClass('is-paddingless');


    $.get('/mloads/char-sheet/?char_id='+getCharIDFromURL()).done(function(data){
      initCharSheet(data.charInfo, data.userPermissions, data.viewOnly);
    });

    startDiceLoader();
});


function initCharSheet(charInfo, userPermissions, viewOnly){
    console.log('~ Loaded Char Sheet Info ~');

    isViewOnly = viewOnly;

    // View Only //
    if(isViewOnly){
      if(userPermissions.support.supporter){ // Can copy and export characters on viewOnly

        $('#backToBuilderButton').addClass('is-hidden');
        $('#restButton').addClass('is-hidden');

        $('#copyCharButton').removeClass('is-hidden');
        $('#exportCharButton').removeClass('is-hidden');

      } else {
        $('#backToBuilderButton').attr('disabled', true);
        $('#restButton').attr('disabled', true);
      }
    }

    g_enabledSources = charInfo.EnabledSources;

    g_itemMap = objToMap(charInfo.ItemObject);
    g_itemMap = new Map([...g_itemMap.entries()].sort(
        function(a, b) {
            if(a[1].Item.itemType == 'CURRENCY'){
                return 1;
            }

            if (a[1].Item.level === b[1].Item.level) {
                // Name is only important when levels are the same
                return a[1].Item.name > b[1].Item.name ? 1 : -1;
            }
            return a[1].Item.level - b[1].Item.level;
        })
    );

    g_invStruct = charInfo.InvStruct;

    g_equippedArmorInvItemID = g_invStruct.Inventory.equippedArmorInvItemID;
    g_equippedShieldInvItemID = g_invStruct.Inventory.equippedShieldInvItemID;
    g_equippedArmorCategory = g_invStruct.Inventory.equippedArmorCategory;

    g_character = charInfo.Character;

    /* Character Options and Variants */
    gOption_hasAutoHeightenSpells = (g_character.optionAutoHeightenSpells === 1);
    gOption_hasProfWithoutLevel = (g_character.variantProfWithoutLevel === 1);
    gOption_hasStamina = (g_character.variantStamina === 1);
    gOption_hasDiceRoller = (g_character.optionDiceRoller === 1);
    gOption_hasIgnoreBulk = (g_character.optionIgnoreBulk === 1);
    gOption_hasAutoBonusProgression = (g_character.variantAutoBonusProgression === 1);
    gOption_hasGradualAbilityBoosts = (g_character.variantGradualAbilityBoosts === 1);


    /* Class Archetype ID */
    if(charInfo.ChoiceStruct.ClassArchetypeID != null){
      g_classArchetype = charInfo.ClassArchetypeArray.find(classArchetype => {
        return classArchetype.id == charInfo.ChoiceStruct.ClassArchetypeID;
      });
      if(g_classArchetype != null){
        g_classArchetype.replacementCode = JSON.parse(g_classArchetype.replacementCodeJSON);
      }
    }

    g_campaignDetails = charInfo.CampaignDetails;

    g_otherSpeeds = charInfo.OtherSpeeds;

    g_conditionsMap = objToMap(charInfo.ConditionsObject);
    g_allConditions = charInfo.AllConditions;
    g_allConditions = g_allConditions.sort(
        function(a, b) {
            return a.name > b.name ? 1 : -1;
        }
    );

    g_abilMap = objToMap(charInfo.AbilObject);
    g_skillMap = objToMap(charInfo.SkillObject);
    g_senseArray = charInfo.ChoiceStruct.SenseArray;
    g_phyFeatArray = charInfo.ChoiceStruct.PhyFeatArray;

    g_langArray = charInfo.ChoiceStruct.LangArray;
    g_langArray = g_langArray.sort(
      function(a, b) {
        if(a.value != null && b.value != null){
          return a.value.name > b.value.name ? 1 : -1;
        } else {
          return 1;
        }
      }
    );
    g_allLanguages = charInfo.AllLanguages;
    g_allLanguages = g_allLanguages.sort(
      function(a, b) {
        return a.name > b.name ? 1 : -1;
      }
    );
    
    g_specializationStruct = charInfo.SpecializeStruct;
    g_weaponFamiliaritiesArray = charInfo.WeaponFamiliarities;

    g_profMap = objToMap(charInfo.ChoiceStruct.ProfObject);
    g_weaponProfMap = buildWeaponProfMap();
    g_armorProfMap = buildArmorProfMap();

    g_runeDataStruct = generateRuneDataStruct();

    g_featMap = objToMap(charInfo.FeatObject);
    g_featMap = updateFeatMapWithMiscs(g_featMap);

    g_featChoiceArray = [];
    for(const featChoice of charInfo.ChoiceStruct.FeatArray){
      if(featChoice.sourceLevel > g_character.level) {
        console.warn(`Has feat selection at level higher than character level (lvl: ${featChoice.sourceLevel}, name: ${featChoice.value.name})!\nRemoving feat from g_featChoiceArray.`);
      } else {
        g_featChoiceArray.push(featChoice);
      }
    }
    g_featChoiceArray = g_featChoiceArray.sort(
        function(a, b) {
            if(a.value == null || b.value == null){
              return b.value != null ? 1 : -1;
            }
            if (a.value.level === b.value.level) {
              // Name is only important when levels are the same
              return a.value.name > b.value.name ? 1 : -1;
            }
            return a.value.level - b.value.level;
        }
    );

    g_extraClassAbilities = charInfo.ChoiceStruct.ExtraClassFeaturesArray;
    g_allClassAbilityOptions = charInfo.AllClassFeatureOptions;

    g_spellMap = objToMap(charInfo.SpellObject);
    g_spellMap = new Map([...g_spellMap.entries()].sort(
        function(a, b) {
            if (a[1].Spell.level === b[1].Spell.level) {
                // Name is only important when levels are the same
                return a[1].Spell.name > b[1].Spell.name ? 1 : -1;
            }
            return a[1].Spell.level - b[1].Spell.level;
        })
    );
    
    g_spellSlotsMap = objToMap(charInfo.SpellDataStruct.SpellSlotObject);
    for(let [spellSRC, slotArray] of g_spellSlotsMap.entries()){
      slotArray = slotArray.sort(
        function(a, b) {
            return a.slotLevel - b.slotLevel;
        }
      );
    }

    g_spellBookArray = charInfo.SpellDataStruct.SpellBookArray;

    g_focusPointArray = charInfo.SpellDataStruct.FocusPointsArray;
    g_focusSpellMap = objToMap(charInfo.SpellDataStruct.FocusSpellObject);
    /*g_focusSpellMap = new Map([...g_focusSpellMap.entries()].sort(
        function(a, b) {
            let aStruct = g_spellMap.get(a[1].SpellID+"");
            let bStruct = g_spellMap.get(b[1].SpellID+"");
            if (aStruct.Spell.level === bStruct.Spell.level) {
                // Name is only important when levels are the same
                return aStruct.Spell.name > bStruct.Spell.name ? 1 : -1;
            }
            return aStruct.Spell.level - bStruct.Spell.level;
        })
    );*/

    g_innateSpellArray = charInfo.SpellDataStruct.InnateSpellArray;
    g_innateSpellArray = g_innateSpellArray.sort(
        function(a, b) {
            return a.SpellLevel - b.SpellLevel;
        }
    );

    g_allTags = charInfo.AllTags;
    
    g_classDetails = charInfo.ChoiceStruct.ClassDetails;
    g_classDetails.AbilityChoices = charInfo.ChoiceStruct.ChoiceArray;

    g_ancestry = charInfo.Ancestry;
    g_heritage = charInfo.Heritage;
    g_background = charInfo.Background;

    g_charTagsArray = [];
    for(let dataTag of charInfo.ChoiceStruct.CharTagsArray){
      g_charTagsArray.push(dataTag.value);
    }
    // If has ancestry and didn't have the trait from it, add it. (For builds mainly)
    if(g_ancestry != null && g_ancestry.name != null){
      if(!g_charTagsArray.includes(g_ancestry.name)){
        g_charTagsArray.push(g_ancestry.name);
      }
    }

    g_charSize = g_ancestry.size;

    g_resistAndVulners = charInfo.ResistAndVulners;

    g_heritageEffects = charInfo.ChoiceStruct.HeritageEffectsArray;

    g_companionData = charInfo.CompanionData;
    g_companionData.AllAnimalCompanions = g_companionData.AllAnimalCompanions.sort(
      function(a, b) {
        return a.name > b.name ? 1 : -1;
      }
    );
    g_companionData.AllSpecificFamiliars = g_companionData.AllSpecificFamiliars.sort(
      function(a, b) {
        return a.name > b.name ? 1 : -1;
      }
    );


    g_notesFields = charInfo.NotesFields;

    g_unselectedDataArray = charInfo.UnselectedDataArray;

    g_sheetStatesArray = charInfo.SheetStatesArray;
    initSheetStates();

    // TODO; Update Legacy code - Could have bugs in using this
    initExpressionProcessor({
        ChoiceStruct : charInfo.ChoiceStruct,
    });

    // Automatic Progression Bonus variant, if enabled...
    if(gOption_hasAutoBonusProgression){
      g_classDetails = addAutoBonusProgressionVariant(g_classDetails);
    }

    // Add support for Gradual Ability Boosts Variant if enabled...
    if(gOption_hasGradualAbilityBoosts){
      g_classDetails = addGradualAbilityBoostsVariant(g_classDetails);
    }

    // Run All SourceBook Code as Sheet Statements //
    for(let enabledSource of g_enabledSources){

      // Run Removal Statements first
      processRemovalStatements(enabledSource.code, enabledSource.codeName, enabledSource.bundleID);

      processSheetCode(enabledSource.code, {
        source: 'SourceBook',
        sourceName: enabledSource.name,
      });
    }
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    // Check & Remove Invalid Items
    removeInvalidItemsFromInventory();

    loadCharSheet();

    initDiceRoller();

    // Turn off page loading
    stopDiceLoader();
    isSheetInit = true;
}

function loadCharSheet(){

    console.log('~ LOADING SHEET ~');

    // Saving Scroll States //
    g_inventoryTabScroll = $('#inventoryContent').scrollTop();

    // Unbind All jQuery Events //
    $('#character-sheet-section').find("*").off();

    // Clear and Reload Error Messages
    clearErrorMessages();
    reloadErrorMessages();

    // Init Sheet-States //
    gState_hasFinesseMeleeUseDexDamage = false;
    gState_armoredStealth = false;
    gState_mightyBulwark = false;
    gState_unburdenedIron = false;
    gState_improvisedWeaponNoPenalty = false;
    gState_addLevelToUntrainedWeaponAttack = false;
    gState_addLevelToUntrainedSkill = false;
    gState_displayCompanionTab = false;

    // Init Calculated Stats
    g_calculatedStats = {
      maxHP: null,
      maxStamina: null,
      maxResolve: null,
      totalClassDC: null,
      totalSpeed: null,
      totalAC: null,
      totalPerception: null,
      totalSkills: [],
      totalSaves: [],
      totalAbilityScores: [],
      weapons: [],
      conditions: [],
      generalInfo: {
        className: '',
        heritageAncestryName: '',
        backgroundName: '',
        size: '',
        traits: [],
      },
    };

    // Init StatsManager (set to new Map) //
    initStats();
    // Init WeapModManager (set to new Map) //
    initWeapModManager();

    // ~~~~~~~~~~~~~~~~~~~~~~~ Adding Stats To Map ~~~~~~~~~~~~~~~~~~~~~~~ //

    initializeVariable(VARIABLE.LEVEL, VAR_TYPE.INTEGER, g_character.level);

    initializeVariable(VARIABLE.SCORE_STR, VAR_TYPE.ABILITY_SCORE, g_abilMap.get("STR"));
    initializeVariable(VARIABLE.SCORE_DEX, VAR_TYPE.ABILITY_SCORE, g_abilMap.get("DEX"));
    initializeVariable(VARIABLE.SCORE_CON, VAR_TYPE.ABILITY_SCORE, g_abilMap.get("CON"));
    initializeVariable(VARIABLE.SCORE_INT, VAR_TYPE.ABILITY_SCORE, g_abilMap.get("INT"));
    initializeVariable(VARIABLE.SCORE_WIS, VAR_TYPE.ABILITY_SCORE, g_abilMap.get("WIS"));
    initializeVariable(VARIABLE.SCORE_CHA, VAR_TYPE.ABILITY_SCORE, g_abilMap.get("CHA"));
    initializeVariable(VARIABLE.SCORE_NONE, VAR_TYPE.ABILITY_SCORE, 10);

    initializeVariable(VARIABLE.SPEED, VAR_TYPE.INTEGER, g_ancestry.speed);
    for(const otherSpeed of g_otherSpeeds){
      initializeVariable('SPEED_'+otherSpeed.Type, VAR_TYPE.INTEGER, otherSpeed.Amount);
    }

    let classDCData = getFinalProf(g_profMap.get("Class_DC"));

    // If classDCData is null, the character builder didn't save profs correctly, abort sheet load
    if(classDCData == null){
      window.location.href = '/profile/characters/builder/?id='+getCharIDFromURL()+'&page=4';
      return;
    }

    if(g_classDetails.KeyAbility != null){
      initializeVariableProf(VARIABLE.CLASS_DC, 'SCORE_'+g_classDetails.KeyAbility, classDCData.NumUps, g_profMap.get("Class_DC"));
    } else {
      initializeVariableProf(VARIABLE.CLASS_DC, VARIABLE.SCORE_NONE, classDCData.NumUps, g_profMap.get("Class_DC"));
    }
    addStat(VARIABLE.CLASS_DC, 'USER_BONUS', classDCData.UserBonus);

    let fortData = getFinalProf(g_profMap.get("Fortitude"));
    initializeVariableProf(VARIABLE.SAVE_FORT, VARIABLE.SCORE_CON, fortData.NumUps, g_profMap.get("Fortitude"));
    addStat(VARIABLE.SAVE_FORT, 'USER_BONUS', fortData.UserBonus);
    
    let reflexData = getFinalProf(g_profMap.get("Reflex"));
    initializeVariableProf(VARIABLE.SAVE_REFLEX, VARIABLE.SCORE_DEX, reflexData.NumUps, g_profMap.get("Reflex"));
    addStat(VARIABLE.SAVE_REFLEX, 'USER_BONUS', reflexData.UserBonus);

    let willData = getFinalProf(g_profMap.get("Will"));
    initializeVariableProf(VARIABLE.SAVE_WILL, VARIABLE.SCORE_WIS, willData.NumUps, g_profMap.get("Will"));
    addStat(VARIABLE.SAVE_WILL, 'USER_BONUS', willData.UserBonus);

    for(const [skillName, skillData] of g_skillMap.entries()){
        let profData = getFinalProf(g_profMap.get(skillName));
        let skillCodeName = skillName.replace(/\s/g,'_');
        if(profData != null){
          initializeVariableProf('SKILL_'+skillCodeName, 'SCORE_'+skillData.Skill.ability, profData.NumUps, g_profMap.get(skillName));
          addStat('SKILL_'+skillCodeName, 'USER_BONUS', profData.UserBonus);
        } else {
          initializeVariableProf('SKILL_'+skillCodeName, 'SCORE_'+skillData.Skill.ability, skillData.NumUps, null);
        }
    }

    let perceptionData = getFinalProf(g_profMap.get("Perception"));
    initializeVariableProf(VARIABLE.PERCEPTION, VARIABLE.SCORE_WIS, perceptionData.NumUps, g_profMap.get("Perception"));
    addStat(VARIABLE.PERCEPTION, 'USER_BONUS', perceptionData.UserBonus);

    // Spell Attacks and DCs
    let arcaneSpellAttack = getFinalProf(g_profMap.get("ArcaneSpellAttacks"));
    if(arcaneSpellAttack != null){
      initializeVariableProf(VARIABLE.ARCANE_SPELL_ATTACK, VARIABLE.SCORE_NONE, arcaneSpellAttack.NumUps, g_profMap.get("ArcaneSpellAttacks"));
      addStat(VARIABLE.ARCANE_SPELL_ATTACK, 'USER_BONUS', arcaneSpellAttack.UserBonus);
    }
    let occultSpellAttack = getFinalProf(g_profMap.get("OccultSpellAttacks"));
    if(occultSpellAttack != null){
      initializeVariableProf(VARIABLE.OCCULT_SPELL_ATTACK, VARIABLE.SCORE_NONE, occultSpellAttack.NumUps, g_profMap.get("OccultSpellAttacks"));
      addStat(VARIABLE.OCCULT_SPELL_ATTACK, 'USER_BONUS', occultSpellAttack.UserBonus);
    }
    let primalSpellAttack = getFinalProf(g_profMap.get("PrimalSpellAttacks"));
    if(primalSpellAttack != null){
      initializeVariableProf(VARIABLE.PRIMAL_SPELL_ATTACK, VARIABLE.SCORE_NONE, primalSpellAttack.NumUps, g_profMap.get("PrimalSpellAttacks"));
      addStat(VARIABLE.PRIMAL_SPELL_ATTACK, 'USER_BONUS', primalSpellAttack.UserBonus);
    }
    let divineSpellAttack = getFinalProf(g_profMap.get("DivineSpellAttacks"));
    if(divineSpellAttack != null){
      initializeVariableProf(VARIABLE.DIVINE_SPELL_ATTACK, VARIABLE.SCORE_NONE, divineSpellAttack.NumUps, g_profMap.get("DivineSpellAttacks"));
      addStat(VARIABLE.DIVINE_SPELL_ATTACK, 'USER_BONUS', divineSpellAttack.UserBonus);
    }
    
    let arcaneSpellDC = getFinalProf(g_profMap.get("ArcaneSpellDCs"));
    if(arcaneSpellDC != null){
      initializeVariableProf(VARIABLE.ARCANE_SPELL_DC, VARIABLE.SCORE_NONE, arcaneSpellDC.NumUps, g_profMap.get("ArcaneSpellDCs"));
      addStat(VARIABLE.ARCANE_SPELL_DC, 'USER_BONUS', arcaneSpellDC.UserBonus);
    }
    let occultSpellDC = getFinalProf(g_profMap.get("OccultSpellDCs"));
    if(occultSpellDC != null){
      initializeVariableProf(VARIABLE.OCCULT_SPELL_DC, VARIABLE.SCORE_NONE, occultSpellDC.NumUps, g_profMap.get("OccultSpellDCs"));
      addStat(VARIABLE.OCCULT_SPELL_DC, 'USER_BONUS', occultSpellDC.UserBonus);
    }
    let primalSpellDC = getFinalProf(g_profMap.get("PrimalSpellDCs"));
    if(primalSpellDC != null){
      initializeVariableProf(VARIABLE.PRIMAL_SPELL_DC, VARIABLE.SCORE_NONE, primalSpellDC.NumUps, g_profMap.get("PrimalSpellDCs"));
      addStat(VARIABLE.PRIMAL_SPELL_DC, 'USER_BONUS', primalSpellDC.UserBonus);
    }
    let divineSpellDC = getFinalProf(g_profMap.get("DivineSpellDCs"));
    if(divineSpellDC != null){
      initializeVariableProf(VARIABLE.DIVINE_SPELL_DC, VARIABLE.SCORE_NONE, divineSpellDC.NumUps, g_profMap.get("DivineSpellDCs"));
      addStat(VARIABLE.DIVINE_SPELL_DC, 'USER_BONUS', divineSpellDC.UserBonus);
    }

    // Init Max HP
    initializeVariable(VARIABLE.MAX_HEALTH, VAR_TYPE.INTEGER, 0);
    initializeVariable(VARIABLE.MAX_HEALTH_BONUS_PER_LEVEL, VAR_TYPE.INTEGER, 0);

    // Init integer values, for adding bonuses/penalties to them
    initializeVariable(VARIABLE.AC, VAR_TYPE.INTEGER, VAR_NULL);
    initializeVariable(VARIABLE.DEX_CAP, VAR_TYPE.INTEGER, VAR_NULL);
    initializeVariable(VARIABLE.ARMOR_CHECK_PENALTY, VAR_TYPE.INTEGER, VAR_NULL);
    initializeVariable(VARIABLE.ARMOR_SPEED_PENALTY, VAR_TYPE.INTEGER, VAR_NULL);

    initializeVariable(VARIABLE.INVEST_LIMIT, VAR_TYPE.INTEGER, VAR_NULL);
    initializeVariable(VARIABLE.BULK_LIMIT, VAR_TYPE.INTEGER, VAR_NULL);

    initializeVariable(VARIABLE.ATTACKS, VAR_TYPE.INTEGER, VAR_NULL);
    initializeVariable(VARIABLE.ATTACKS_DMG_DICE, VAR_TYPE.INTEGER, VAR_NULL);
    initializeVariable(VARIABLE.ATTACKS_DMG_BONUS, VAR_TYPE.INTEGER, VAR_NULL);

    initializeVariable(VARIABLE.MELEE_ATTACKS, VAR_TYPE.INTEGER, VAR_NULL);
    initializeVariable(VARIABLE.MELEE_ATTACKS_DMG_DICE, VAR_TYPE.INTEGER, VAR_NULL);
    initializeVariable(VARIABLE.MELEE_ATTACKS_DMG_BONUS, VAR_TYPE.INTEGER, VAR_NULL);
    initializeVariable(VARIABLE.AGILE_MELEE_ATTACKS_DMG_BONUS, VAR_TYPE.INTEGER, VAR_NULL);
    initializeVariable(VARIABLE.NON_AGILE_MELEE_ATTACKS_DMG_BONUS, VAR_TYPE.INTEGER, VAR_NULL);

    initializeVariable(VARIABLE.RANGED_ATTACKS, VAR_TYPE.INTEGER, VAR_NULL);
    initializeVariable(VARIABLE.RANGED_ATTACKS_DMG_DICE, VAR_TYPE.INTEGER, VAR_NULL);
    initializeVariable(VARIABLE.RANGED_ATTACKS_DMG_BONUS, VAR_TYPE.INTEGER, VAR_NULL);

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

    // Run Items Code (investitures and others) //
    // -- armor and shield item code runs when equipped
    runAllItemsCode();
    determineInvestitures();
    

    // Display Ability Scores //
    displayAbilityScores();

    // Get STR and DEX score before conditions code runs (in the case of Enfeebled)
    g_preConditions_strScore = getStatTotal(VARIABLE.SCORE_STR);
    g_preConditions_dexScore = getStatTotal(VARIABLE.SCORE_DEX);
    g_preConditions_conScore = getStatTotal(VARIABLE.SCORE_CON);
    g_preConditions_intScore = getStatTotal(VARIABLE.SCORE_INT);
    g_preConditions_wisScore = getStatTotal(VARIABLE.SCORE_WIS);
    g_preConditions_chaScore = getStatTotal(VARIABLE.SCORE_CHA);

    // Run All Conditions Code //
    runAllConditionsCode();

    // Run Feats and Abilities Code //
    runAllFeatsAndAbilitiesCode();

    // Run Custom Code Block Code //
    if(g_character.optionCustomCodeBlock === 1){
      processSheetCode(g_character.customCode, {
        source: 'CustomCode',
        sourceName: 'Custom Code',
      });
    }

    // Determine Bulk and Coins //
    determineBulkAndCoins(g_invStruct.InvItems, g_itemMap);

    // Display Health and Temp -> Stamina and Resolve //
    g_variableMap.get(VARIABLE.MAX_HEALTH).Value = g_ancestry.hitPoints;
    if(gOption_hasStamina){
      g_variableMap.get(VARIABLE.MAX_HEALTH_BONUS_PER_LEVEL).Value = 0;
    } else {
      g_variableMap.get(VARIABLE.MAX_HEALTH_BONUS_PER_LEVEL).Value = getModOfValue('CON');
    }

    // Run Toggleables (Sheet State) Code //
    runAllSheetStateCode();

    initHealthPointsAndMore();

    // Determine Armor //
    determineArmor(getModOfValue('DEX'), g_preConditions_strScore);

    // Display Conditions List //
    displayConditionsList();

    // Display All Other Info //
    displayInformation();

    // Hide Spells Tab //
    if(g_spellSlotsMap.size === 0 && g_focusSpellMap.size === 0 && g_innateSpellArray.length === 0){
      $('#spellsTab').addClass('is-hidden');
    } else {
      $('#spellsTab').removeClass('is-hidden');
    }

    // Hide Companions Tab //
    if(gState_displayCompanionTab){
      $('#companionsTab').removeClass('is-hidden');
    } else {
      $('#companionsTab').addClass('is-hidden');
    }

    // Make tabs smaller if too big
    if(isOverflown($('#char-sheet-tabs'))){
      $('#char-sheet-tabs').removeClass('is-small-medium');
      $('#char-sheet-tabs').removeClass('is-medium');
      $('#char-sheet-tabs').addClass('is-small-medium');
      g_sheetTabSizeLock = true;
    } else {
      if(!g_sheetTabSizeLock){
        $('#char-sheet-tabs').removeClass('is-small-medium');
        $('#char-sheet-tabs').removeClass('is-medium');
        $('#char-sheet-tabs').addClass('is-medium');
      }
    }

    // Open Weapons Tab Temporarily // -> To get data input for Calculated Stats
    let prevSelectedTabID = g_selectedTabID;
    $('#weaponsTab').trigger("click", [true]);
    g_selectedTabID = prevSelectedTabID;

    // Set To Previous Tab //
    g_selectedSubTabLock = true;
    $('#'+g_selectedTabID).trigger("click", [true]);
    if(g_selectedSubTabID != null){
        $('#'+g_selectedSubTabID).trigger("click");
    }
    g_selectedSubTabLock = false;

    // Submit Calculated Stats //
    socket.emit("requestUpdateCalculatedStats",
        getCharIDFromURL(),
        g_calculatedStats);
    sendOutUpdateToGM('calculated-stats', g_calculatedStats);
}

function displayAbilityScores() {

    ////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////// Ability Scores ////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    let strScore = getStatTotal(VARIABLE.SCORE_STR);
    $("#strScore").html(strScore);
    $("#strMod").html(signNumber(getMod(strScore)));
    g_calculatedStats.totalAbilityScores.push({Name: 'Strength', Score: strScore});// Calculated Stat
    $("#strSection").click(function(){
        openQuickView('abilityScoreView', {
            AbilityName : 'Strength',
            AbilityScore : strScore,
            AbilityMod : getMod(strScore)
        });
    });
    $("#strSection").mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $("#strSection").mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

    let dexScore = getStatTotal(VARIABLE.SCORE_DEX);
    $("#dexScore").html(dexScore);
    $("#dexMod").html(signNumber(getMod(dexScore)));
    g_calculatedStats.totalAbilityScores.push({Name: 'Dexterity', Score: dexScore});// Calculated Stat
    $("#dexSection").click(function(){
        openQuickView('abilityScoreView', {
            AbilityName : 'Dexterity',
            AbilityScore : dexScore,
            AbilityMod : getMod(dexScore)
        });
    });
    $("#dexSection").mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $("#dexSection").mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

    let conScore = getStatTotal(VARIABLE.SCORE_CON);
    $("#conScore").html(conScore);
    $("#conMod").html(signNumber(getMod(conScore)));
    g_calculatedStats.totalAbilityScores.push({Name: 'Constitution', Score: conScore});// Calculated Stat
    $("#conSection").click(function(){
        openQuickView('abilityScoreView', {
            AbilityName : 'Constitution',
            AbilityScore : conScore,
            AbilityMod : getMod(conScore)
        });
    });
    $("#conSection").mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $("#conSection").mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

    let intScore = getStatTotal(VARIABLE.SCORE_INT);
    $("#intScore").html(intScore);
    $("#intMod").html(signNumber(getMod(intScore)));
    g_calculatedStats.totalAbilityScores.push({Name: 'Intelligence', Score: intScore});// Calculated Stat
    $("#intSection").click(function(){
        openQuickView('abilityScoreView', {
            AbilityName : 'Intelligence',
            AbilityScore : intScore,
            AbilityMod : getMod(intScore)
        });
    });
    $("#intSection").mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $("#intSection").mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

    let wisScore = getStatTotal(VARIABLE.SCORE_WIS);
    $("#wisScore").html(wisScore);
    $("#wisMod").html(signNumber(getMod(wisScore)));
    g_calculatedStats.totalAbilityScores.push({Name: 'Wisdom', Score: wisScore});// Calculated Stat
    $("#wisSection").click(function(){
        openQuickView('abilityScoreView', {
            AbilityName : 'Wisdom',
            AbilityScore : wisScore,
            AbilityMod : getMod(wisScore)
        });
    });
    $("#wisSection").mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $("#wisSection").mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

    let chaScore = getStatTotal(VARIABLE.SCORE_CHA);
    $("#chaScore").html(chaScore);
    $("#chaMod").html(signNumber(getMod(chaScore)));
    g_calculatedStats.totalAbilityScores.push({Name: 'Charisma', Score: chaScore});// Calculated Stat
    $("#chaSection").click(function(){
        openQuickView('abilityScoreView', {
            AbilityName : 'Charisma',
            AbilityScore : chaScore,
            AbilityMod : getMod(chaScore)
        });
    });
    $("#chaSection").mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $("#chaSection").mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

}

function displayInformation() {

    ////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////// Character Info ////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    $('#character-name').html(g_character.name);
    let heritageAndAncestryName = '';
    if(g_heritage == null){
        heritageAndAncestryName = g_ancestry.name;
    } else {
        if(g_heritage.tagID != null){
            heritageAndAncestryName = g_heritage.name+' '+g_ancestry.name;
        } else {
            heritageAndAncestryName = g_heritage.name;
        }
    }
    $('#character-type').html(heritageAndAncestryName+" "+g_classDetails.Class.name);
    $('#character-level').html("Lvl "+g_character.level);

    // Calculated Stat
    g_calculatedStats.generalInfo.className = g_classDetails.Class.name;
    g_calculatedStats.generalInfo.heritageAncestryName = heritageAndAncestryName;
    g_calculatedStats.generalInfo.backgroundName = g_background.name;
    g_calculatedStats.generalInfo.size = capitalizeWord(g_charSize);

    let charTraits = cloneObj(g_charTagsArray);
    charTraits.push('Humanoid');
    charTraits = charTraits.sort(
        function(a, b) {
            return a > b ? 1 : -1;
        }
    );
    g_calculatedStats.generalInfo.traits = charTraits;
    //
    
    $("#charInfoContent").click(function(){
        openQuickView('charInfoView', {
        });
    });
    $("#charInfoContent").mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $("#charInfoContent").mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////// Experience //////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    let expInput = $('#exp-input');
    expInput.val(g_character.experience);
    $(expInput).blur(function(){
        let experience = $(this).val();
        if(experience == null || experience > 99999 || experience < 0 || experience == '' || experience % 1 != 0) {
            expInput.addClass('is-danger');
        } else {
            expInput.removeClass('is-danger');
            socket.emit("requestExperienceSave",
                getCharIDFromURL(),
                experience);
            g_character.experience = parseInt(experience);
            sendOutUpdateToGM('exp', { value: g_character.experience });
        }
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////// Resist and Vulners //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    let resistAndVulnerText = '';
    if(g_resistAndVulners.Resistances.length != 0){
        resistAndVulnerText += 'Resistances';
        if(g_resistAndVulners.Vulnerabilities.length != 0){
            resistAndVulnerText += ' | ';
        }
    }
    if(g_resistAndVulners.Vulnerabilities.length != 0){
        resistAndVulnerText += 'Weaknesses';
    }

    if(resistAndVulnerText != ''){
        $('#resistAndVulnerContent').removeClass('is-hidden');
        $('#resistAndVulnerText').html(resistAndVulnerText);
        $('#resistAndVulnerContent').click(function(){
            openQuickView('resistView',{
                ResistAndVulners: g_resistAndVulners,
                CharLevel : g_character.level,
            });
        });
        $("#resistAndVulnerContent").mouseenter(function(){
            $(this).addClass('has-bg-selectable-hover');
        });
        $("#resistAndVulnerContent").mouseleave(function(){
            $(this).removeClass('has-bg-selectable-hover');
        });
    } else {
        $('#resistAndVulnerContent').addClass('is-hidden');
    }

    $('#resistAndVulnerViewAllBtn').click(function(){
      openQuickView('resistListView',{
        ResistAndVulners: g_resistAndVulners,
        CharLevel : g_character.level,
      });
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////// Conditions ///////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    $('#addNewConditionsButton').click(function(){
        openSelectConditionsModal();
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////// Class DC ///////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    let classDCContent = $("#classDCContent");

    let classDC = getStatTotal(VARIABLE.CLASS_DC)+10;
    let classDCBonusDisplayed = (hasConditionals(VARIABLE.CLASS_DC)) 
            ? classDC+'<sup class="is-size-6 has-text-info">*</sup>' : classDC;
    classDCContent.html(classDCBonusDisplayed);
    g_calculatedStats.totalClassDC = classDC;// Calculated Stat

    let classDCData = getFinalProf(g_profMap.get("Class_DC"));
    let classDCProfNum = getProfNumber(classDCData.NumUps, g_character.level);
    $("#classDCSection").click(function(){
        openQuickView('classDCView', {
            ProfData : classDCData,
            ProfNum : classDCProfNum,
            KeyMod : getModOfValue(g_classDetails.KeyAbility),
            TotalDC : classDC,
            CharLevel : g_character.level,
        });
    });

    $("#classDCSection").mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $("#classDCSection").mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////// Hero Points //////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    $("#heroPointsSelect").val(g_character.heroPoints);
    $("#heroPointsSelect").change(function(){
        socket.emit("requestHeroPointsSave",
            getCharIDFromURL(),
            $(this).val());
        g_character.heroPoints = parseInt($(this).val());
        sendOutUpdateToGM('hero-points', { value: g_character.heroPoints });
    });
    $("#heroPointsTitle").click(function(){
        openQuickView('heroPointsView', {});
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////// Back to Builder ////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////
    $("#backToBuilderButton").click(function(){
        if(!isViewOnly){
            // Hardcoded redirect
            window.location.href = '/profile/characters/builder/basics/?id='+getCharIDFromURL();
        }
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////// Take Rest ///////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////
    $("#restButton").click(function(){
        if(!isViewOnly){
            takeRest();
        }
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////// Copy and Export ////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////
    $('#copyCharButton').click(function() {
      copyCharacter(getCharIDFromURL());
      startSpinnerSubLoader();
    });

    $('#exportCharButton').click(function() {
      exportCharacter(getCharIDFromURL());
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////// Unselected Data ////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////
    if(g_unselectedDataArray.length > 0){
      $('#warnings-icon').removeClass('is-hidden');
      $('#warnings-icon').click(function() {
        openQuickView('warningsView', {});
      });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////// Saves /////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    let fortBonus = getStatTotal(VARIABLE.SAVE_FORT);
    let fortBonusContent = $("#fortSave");
    let fortBonusDisplayed = (hasConditionals(VARIABLE.SAVE_FORT)) ? signNumber(fortBonus)+'<sup class="is-size-6 has-text-info">*</sup>' : signNumber(fortBonus);
    fortBonusContent.html(fortBonusDisplayed);
    g_calculatedStats.totalSaves.push({Name: 'Fortitude', Bonus: fortBonus});// Calculated Stat

    let fortData = getFinalProf(g_profMap.get("Fortitude"));
    let fortProfNum = getProfNumber(fortData.NumUps, g_character.level);
    $("#fortSection").click(function(){
        openQuickView('savingThrowView', {
            ProfSrcData : {For:'Save',To:'Fortitude'},
            ProfData : fortData,
            ProfNum : fortProfNum,
            AbilMod : getModOfValue('CON'),
            TotalBonus : fortBonus,
            CharLevel : g_character.level,
            VARIABLE: VARIABLE.SAVE_FORT,
            AbilityName : 'Constitution',
            SavingThrowDescription : 'A Fortitude saving throw is used when your character’s health or vitality is under attack, such as from poison or disease.'
        });
    });
    $("#fortSection").mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $("#fortSection").mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

    let reflexBonus = getStatTotal(VARIABLE.SAVE_REFLEX);
    let reflexBonusContent = $("#reflexSave");
    let reflexBonusDisplayed = (hasConditionals(VARIABLE.SAVE_REFLEX)) ? signNumber(reflexBonus)+'<sup class="is-size-6 has-text-info">*</sup>' : signNumber(reflexBonus);
    reflexBonusContent.html(reflexBonusDisplayed);
    g_calculatedStats.totalSaves.push({Name: 'Reflex', Bonus: reflexBonus});// Calculated Stat

    let reflexData = getFinalProf(g_profMap.get("Reflex"));
    let reflexProfNum = getProfNumber(reflexData.NumUps, g_character.level);
    $("#reflexSection").click(function(){
        openQuickView('savingThrowView', {
            ProfSrcData : {For:'Save',To:'Reflex'},
            ProfData : reflexData,
            ProfNum : reflexProfNum,
            AbilMod : getModOfValue('DEX'),
            TotalBonus : reflexBonus,
            CharLevel : g_character.level,
            VARIABLE: VARIABLE.SAVE_REFLEX,
            AbilityName : 'Dexterity',
            SavingThrowDescription : 'A Reflex saving throw is called for when your character must dodge away from danger, usually something that affects a large area, such as the scorching blast of a fireball spell.'
        });
    });
    $("#reflexSection").mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $("#reflexSection").mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

    let willBonus = getStatTotal(VARIABLE.SAVE_WILL);
    let willBonusContent = $("#willSave");
    let willBonusDisplayed = (hasConditionals(VARIABLE.SAVE_WILL)) ? signNumber(willBonus)+'<sup class="is-size-6 has-text-info">*</sup>' : signNumber(willBonus);
    willBonusContent.html(willBonusDisplayed);
    g_calculatedStats.totalSaves.push({Name: 'Will', Bonus: willBonus});// Calculated Stat

    let willData = getFinalProf(g_profMap.get("Will"));
    let willProfNum = getProfNumber(willData.NumUps, g_character.level);
    $("#willSection").click(function(){
        openQuickView('savingThrowView', {
            ProfSrcData : {For:'Save',To:'Will'},
            ProfData : willData,
            ProfNum : willProfNum,
            AbilMod : getModOfValue('WIS'),
            TotalBonus : willBonus,
            CharLevel : g_character.level,
            VARIABLE: VARIABLE.SAVE_WILL,
            AbilityName : 'Wisdom',
            SavingThrowDescription : 'A Will saving throw is often used as your character’s defense against spells and effects that target their mind, such as a charm or confusion spell.'
        });
    });
    $("#willSection").mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
    });
    $("#willSection").mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////// Speed /////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    let speedContent = $("#speedContent");
    let speedNum = getStatTotal(VARIABLE.SPEED);
    speedNum = (speedNum > 5) ? speedNum : 5;

    let speedDisplayed = (hasConditionals(VARIABLE.SPEED)) ?
            speedNum+' ft<sup class="is-size-6 has-text-info">*</sup>' : speedNum+' ft';
    speedContent.html(speedDisplayed);
    g_calculatedStats.totalSpeed = speedNum;// Calculated Stat

    $("#speedSection").click(function(){
        openQuickView('speedView', {
        });
    });

    if(g_otherSpeeds.length != 0){
        $("#speedBottom").removeClass('is-hidden');
    } else {
        $("#speedBottom").addClass('is-hidden');
    }

    $("#speedSection").mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
        $("#speedDivider").addClass('hr-highlighted');
    });
    $("#speedSection").mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
        $("#speedDivider").removeClass('hr-highlighted');
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////// Perception ///////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////
    
    let visionSenseArray = [];
    let additionalSenseArray = [];
    let primaryVisionSense = null;
    for(const sense of g_senseArray){
        if(sense.value.isVisionType == 0){
            additionalSenseArray.push(sense.value);
        } else {
            visionSenseArray.push(sense.value);
            if(primaryVisionSense == null || sense.value.visionPrecedence > primaryVisionSense.visionPrecedence) {
                primaryVisionSense = sense.value;
            }
        }
    }

    if(primaryVisionSense != null){
      $("#perceptionPrimaryVisionSense").html(primaryVisionSense.name);
    } else {
      $("#perceptionPrimaryVisionSense").html('None');
    }

    let perceptionBonusContent = $("#perceptionBonusContent");
    let perceptionBonus = getStatTotal(VARIABLE.PERCEPTION);
    let perceptionBonusDisplayed = (hasConditionals(VARIABLE.PERCEPTION)) 
            ? signNumber(perceptionBonus)+'<sup class="is-size-6 has-text-info">*</sup>' : signNumber(perceptionBonus);
    perceptionBonusContent.html(perceptionBonusDisplayed);
    g_calculatedStats.totalPerception = perceptionBonus;// Calculated Stat

    let perceptionData = getFinalProf(g_profMap.get("Perception"));
    let perceptionProfNum = getProfNumber(perceptionData.NumUps, g_character.level);
    $("#perceptionBonusSection").click(function(){
        openQuickView('perceptionView', {
            ProfData : perceptionData,
            ProfNum : perceptionProfNum,
            WisMod : getModOfValue('WIS'),
            TotalBonus : perceptionBonus,
            CharLevel : g_character.level,
            PrimaryVisionSense : primaryVisionSense,
            VisionSenseArray : visionSenseArray,
            AdditionalSenseArray : additionalSenseArray
        });
    });

    $("#perceptionBonusSection").mouseenter(function(){
        $(this).addClass('has-bg-selectable-hover');
        $("#perceptionBonusDivider").addClass('hr-highlighted');
    });
    $("#perceptionBonusSection").mouseleave(function(){
        $(this).removeClass('has-bg-selectable-hover');
        $("#perceptionBonusDivider").removeClass('hr-highlighted');
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////// Attacks and Defenses /////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    $("#addNewProfButton").click(function(){
        openQuickView('addProfView', {
        });
    });

    let otherProfsNum = 0;

    let attacks = $("#attacksContent");
    attacks.html('');

    let profSimpleWeapons = getFinalProf(g_profMap.get("Simple_Weapons"));
    if(profSimpleWeapons != null){

        if(variables_getValue(VARIABLE.SIMPLE_WEAPONS) == null){
          initializeVariableProf(VARIABLE.SIMPLE_WEAPONS, VARIABLE.SCORE_NONE, profSimpleWeapons.NumUps, g_profMap.get("Simple_Weapons"));
        }

        let profWord = getProfNameFromNumUps(profSimpleWeapons.NumUps);
        otherProfsNum++;
        otherProfBuild(attacks, profWord, 'Simple Weapons', otherProfsNum, profSimpleWeapons, {For:'Attack',To:'Simple_Weapons'}, VARIABLE.SIMPLE_WEAPONS);
    }
    let profMartialWeapons = getFinalProf(g_profMap.get("Martial_Weapons"));
    if(profMartialWeapons != null){

        if(variables_getValue(VARIABLE.MARTIAL_WEAPONS) == null){
          initializeVariableProf(VARIABLE.MARTIAL_WEAPONS, VARIABLE.SCORE_NONE, profMartialWeapons.NumUps, g_profMap.get("Martial_Weapons"));
        }

        let profWord = getProfNameFromNumUps(profMartialWeapons.NumUps);
        otherProfsNum++;
        otherProfBuild(attacks, profWord, 'Martial Weapons', otherProfsNum, profMartialWeapons, {For:'Attack',To:'Martial_Weapons'}, VARIABLE.MARTIAL_WEAPONS);
    }
    let profAdvancedWeapons = getFinalProf(g_profMap.get("Advanced_Weapons"));
    if(profAdvancedWeapons != null){

        if(variables_getValue(VARIABLE.ADVANCED_WEAPONS) == null){
          initializeVariableProf(VARIABLE.ADVANCED_WEAPONS, VARIABLE.SCORE_NONE, profAdvancedWeapons.NumUps, g_profMap.get("Advanced_Weapons"));
        }

        let profWord = getProfNameFromNumUps(profAdvancedWeapons.NumUps);
        otherProfsNum++;
        otherProfBuild(attacks, profWord, 'Advanced Weapons', otherProfsNum, profAdvancedWeapons, {For:'Attack',To:'Advanced_Weapons'}, VARIABLE.ADVANCED_WEAPONS);
    }
    let profUnarmedAttacks = getFinalProf(g_profMap.get("Unarmed_Attacks"));
    if(profUnarmedAttacks != null){

        if(variables_getValue(VARIABLE.UNARMED_ATTACKS) == null){
          initializeVariableProf(VARIABLE.UNARMED_ATTACKS, VARIABLE.SCORE_NONE, profUnarmedAttacks.NumUps, g_profMap.get("Unarmed_Attacks"));
        }

        let profWord = getProfNameFromNumUps(profUnarmedAttacks.NumUps);
        otherProfsNum++;
        otherProfBuild(attacks, profWord, 'Unarmed Attacks', otherProfsNum, profUnarmedAttacks, {For:'Attack',To:'Unarmed_Attacks'}, VARIABLE.UNARMED_ATTACKS);
    }
    for(const [profName, profDataArray] of g_profMap.entries()){
        const finalProfData = getFinalProf(profDataArray);
        if(finalProfData.For == "Attack" && profName != "Simple_Weapons" && profName != "Martial_Weapons" && profName != "Advanced_Weapons" && profName != "Unarmed_Attacks"){
            let dProfName = profName.replace(/_/g,' ');
            let profWord = getProfNameFromNumUps(finalProfData.NumUps);

            // Get variable, init if null
            let VARIABLE_NAME = 'WEAPON_'+profName.replace(/\s/g, "_").toUpperCase();
            if(variables_getValue(VARIABLE_NAME) == null){
              initializeVariableProf(VARIABLE_NAME, VARIABLE.SCORE_NONE, finalProfData.NumUps, profDataArray);
            }

            otherProfsNum++;
            otherProfBuild(attacks, profWord, capitalizeWords(dProfName), otherProfsNum, finalProfData, {For:'Attack',To:profName}, VARIABLE_NAME);

        } else if(finalProfData.For == "Group"){
            let dProfName = profName.replace(/_/g,' ');
            let profWord = getProfNameFromNumUps(finalProfData.NumUps);

            // Get variable, init if null
            let VARIABLE_NAME = 'GROUP_'+profName.replace(/\s/g, "_").toUpperCase();
            if(variables_getValue(VARIABLE_NAME) == null){
              initializeVariableProf(VARIABLE_NAME, VARIABLE.SCORE_NONE, finalProfData.NumUps, profDataArray);
            }

            otherProfsNum++;
            otherProfBuild(attacks, profWord, capitalizeWords(dProfName)+'s', otherProfsNum, finalProfData, {For:'Group',To:profName}, VARIABLE_NAME);
            
        } else if(finalProfData.For == "Trait"){
          let dProfName = profName.replace(/_/g,' ');
          let profWord = getProfNameFromNumUps(finalProfData.NumUps);

          // Get variable, init if null
          let VARIABLE_NAME = 'HAS_TRAIT_'+profName.replace(/\s/g, "_").toUpperCase();
          if(variables_getValue(VARIABLE_NAME) == null){
            initializeVariableProf(VARIABLE_NAME, VARIABLE.SCORE_NONE, finalProfData.NumUps, profDataArray);
          }

          otherProfsNum++;
          otherProfBuild(attacks, profWord, capitalizeWords(dProfName)+'s', otherProfsNum, finalProfData, {For:'Trait',To:profName}, VARIABLE_NAME);
        }
    }


    let defenses = $("#defensesContent");
    defenses.html('');

    let profLightArmor = getFinalProf(g_profMap.get("Light_Armor"));
    if(profLightArmor != null){

        if(variables_getValue(VARIABLE.LIGHT_ARMOR) == null){
          initializeVariableProf(VARIABLE.LIGHT_ARMOR, VARIABLE.SCORE_NONE, profLightArmor.NumUps, g_profMap.get("Light_Armor"));
        }

        let profWord = getProfNameFromNumUps(profLightArmor.NumUps);
        otherProfsNum++;
        otherProfBuild(defenses, profWord, 'Light Armor', otherProfsNum, profLightArmor, {For:'Defense',To:'Light_Armor'}, VARIABLE.LIGHT_ARMOR);
    }
    let profMediumArmor = getFinalProf(g_profMap.get("Medium_Armor"));
    if(profMediumArmor != null){

        if(variables_getValue(VARIABLE.MEDIUM_ARMOR) == null){
          initializeVariableProf(VARIABLE.MEDIUM_ARMOR, VARIABLE.SCORE_NONE, profMediumArmor.NumUps, g_profMap.get("Medium_Armor"));
        }

        let profWord = getProfNameFromNumUps(profMediumArmor.NumUps);
        otherProfsNum++;
        otherProfBuild(defenses, profWord, 'Medium Armor', otherProfsNum, profMediumArmor, {For:'Defense',To:'Medium_Armor'}, VARIABLE.MEDIUM_ARMOR);
    }
    let profHeavyArmor = getFinalProf(g_profMap.get("Heavy_Armor"));
    if(profHeavyArmor != null){

        if(variables_getValue(VARIABLE.HEAVY_ARMOR) == null){
          initializeVariableProf(VARIABLE.HEAVY_ARMOR, VARIABLE.SCORE_NONE, profHeavyArmor.NumUps, g_profMap.get("Heavy_Armor"));
        }

        let profWord = getProfNameFromNumUps(profHeavyArmor.NumUps);
        otherProfsNum++;
        otherProfBuild(defenses, profWord, 'Heavy Armor', otherProfsNum, profHeavyArmor, {For:'Defense',To:'Heavy_Armor'}, VARIABLE.HEAVY_ARMOR);
    }
    let profUnarmoredDefense = getFinalProf(g_profMap.get("Unarmored_Defense"));
    if(profUnarmoredDefense != null){

        if(variables_getValue(VARIABLE.UNARMORED_DEFENSE) == null){
          initializeVariableProf(VARIABLE.UNARMORED_DEFENSE, VARIABLE.SCORE_NONE, profUnarmoredDefense.NumUps, g_profMap.get("Unarmored_Defense"));
        }

        let profWord = getProfNameFromNumUps(profUnarmoredDefense.NumUps);
        otherProfsNum++;
        otherProfBuild(defenses, profWord, 'Unarmored Defense', otherProfsNum, profUnarmoredDefense, {For:'Defense',To:'Unarmored_Defense'}, VARIABLE.UNARMORED_DEFENSE);
    }
    for(const [profName, profDataArray] of g_profMap.entries()){
        const finalProfData = getFinalProf(profDataArray);
        if(finalProfData.For == "Defense" && profName != "Light_Armor" && profName != "Medium_Armor" && profName != "Heavy_Armor" && profName != "Unarmored_Defense"){
            let dProfName = profName.replace(/_/g,' ');
            let profWord = getProfNameFromNumUps(finalProfData.NumUps);

            // Get variable, init if null
            let VARIABLE_NAME = 'ARMOR_'+profName.replace(/\s/g, "_").toUpperCase();
            if(variables_getValue(VARIABLE_NAME) == null){
              initializeVariableProf(VARIABLE_NAME, VARIABLE.SCORE_NONE, finalProfData.NumUps, profDataArray);
            }

            otherProfsNum++;
            otherProfBuild(defenses, profWord, capitalizeWords(dProfName), otherProfsNum, finalProfData, {For:'Defense',To:profName}, VARIABLE_NAME);
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////// Spells ////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    let spells = $("#spellsContent");
    spells.html('');

    let arcaneSpellAttack = getFinalProf(g_profMap.get("ArcaneSpellAttacks"));
    if(arcaneSpellAttack != null){
        let profWord = getProfNameFromNumUps(arcaneSpellAttack.NumUps);
        otherProfsNum++;
        otherProfBuild(spells, profWord, 'Arcane Attacks', otherProfsNum, arcaneSpellAttack, {For:'SpellAttack',To:'ArcaneSpellAttacks'}, VARIABLE.ARCANE_SPELL_ATTACK, { SpellTradition: 'ARCANE', SpellPart: 'Attack' });
    }

    let arcaneSpellDC = getFinalProf(g_profMap.get("ArcaneSpellDCs"));
    if(arcaneSpellDC != null){
        let profWord = getProfNameFromNumUps(arcaneSpellDC.NumUps);
        otherProfsNum++;
        otherProfBuild(spells, profWord, 'Arcane DCs', otherProfsNum, arcaneSpellDC, {For:'SpellDC',To:'ArcaneSpellDCs'}, VARIABLE.ARCANE_SPELL_DC, { SpellTradition: 'ARCANE', SpellPart: 'DC' });
    }

    let divineSpellAttack = getFinalProf(g_profMap.get("DivineSpellAttacks"));
    if(divineSpellAttack != null){
        let profWord = getProfNameFromNumUps(divineSpellAttack.NumUps);
        otherProfsNum++;
        otherProfBuild(spells, profWord, 'Divine Attacks', otherProfsNum, divineSpellAttack, {For:'SpellAttack',To:'DivineSpellAttacks'}, VARIABLE.DIVINE_SPELL_ATTACK, { SpellTradition: 'DIVINE', SpellPart: 'Attack' });
    }

    let divineSpellDC = getFinalProf(g_profMap.get("DivineSpellDCs"));
    if(divineSpellDC != null){
        let profWord = getProfNameFromNumUps(divineSpellDC.NumUps);
        otherProfsNum++;
        otherProfBuild(spells, profWord, 'Divine DCs', otherProfsNum, divineSpellDC, {For:'SpellDC',To:'DivineSpellDCs'}, VARIABLE.DIVINE_SPELL_DC, { SpellTradition: 'DIVINE', SpellPart: 'DC' });
    }

    let occultSpellAttack = getFinalProf(g_profMap.get("OccultSpellAttacks"));
    if(occultSpellAttack != null){
        let profWord = getProfNameFromNumUps(occultSpellAttack.NumUps);
        otherProfsNum++;
        otherProfBuild(spells, profWord, 'Occult Attacks', otherProfsNum, occultSpellAttack, {For:'SpellAttack',To:'OccultSpellAttacks'}, VARIABLE.OCCULT_SPELL_ATTACK, { SpellTradition: 'OCCULT', SpellPart: 'Attack' });
    }

    let occultSpellDC = getFinalProf(g_profMap.get("OccultSpellDCs"));
    if(occultSpellDC != null){
        let profWord = getProfNameFromNumUps(occultSpellDC.NumUps);
        otherProfsNum++;
        otherProfBuild(spells, profWord, 'Occult DCs', otherProfsNum, occultSpellDC, {For:'SpellDC',To:'OccultSpellDCs'}, VARIABLE.OCCULT_SPELL_DC, { SpellTradition: 'OCCULT', SpellPart: 'DC' });
    }

    let primalSpellAttack = getFinalProf(g_profMap.get("PrimalSpellAttacks"));
    if(primalSpellAttack != null){
        let profWord = getProfNameFromNumUps(primalSpellAttack.NumUps);
        otherProfsNum++;
        otherProfBuild(spells, profWord, 'Primal Attacks', otherProfsNum, primalSpellAttack, {For:'SpellAttack',To:'PrimalSpellAttacks'}, VARIABLE.PRIMAL_SPELL_ATTACK, { SpellTradition: 'PRIMAL', SpellPart: 'Attack' });
    }

    let primalSpellDC = getFinalProf(g_profMap.get("PrimalSpellDCs"));
    if(primalSpellDC != null){
        let profWord = getProfNameFromNumUps(primalSpellDC.NumUps);
        otherProfsNum++;
        otherProfBuild(spells, profWord, 'Primal DCs', otherProfsNum, primalSpellDC, {For:'SpellDC',To:'PrimalSpellDCs'}, VARIABLE.PRIMAL_SPELL_DC, { SpellTradition: 'PRIMAL', SpellPart: 'DC' });
    }

    if(spells.html() == ''){
        $('#spellsContentSection').addClass('is-hidden');
    } else {
        $('#spellsContentSection').removeClass('is-hidden');
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////// Skills ////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    $("#addNewLoreButton").click(function(){
      openQuickView('addLoreView', {
      });
    });

    let skills = $("#skills");
    skills.html('');
    let hasFascinatedCondition = hasCondition(14); // Hardcoded - Fascinated condition decreases all skills by -2
    let untrainedImprovisation = g_featChoiceArray.find(feat => {
        return feat.value != null && feat.value.id == 2270; // Hardcoded Untrained Improvisation Feat ID
    });
    let hasUntrainedImprovisationFeat = (untrainedImprovisation != null);
    for(const [skillName, skillData] of g_skillMap.entries()){
        let profData = getFinalProf(g_profMap.get(skillName));
        if(profData == null){ profData = skillData; }

        let skillButtonID = ("skillButton"+skillName).replace(/\W/g,'_');

        let abilMod = getModOfValue(skillData.Skill.ability);
        let profNum = getProfNumber(profData.NumUps, g_character.level);

        if(hasUntrainedImprovisationFeat){
            if(profData.NumUps === 0 && !gOption_hasProfWithoutLevel){
                if(g_character.level < 7){
                    let profBonus = Math.floor(g_character.level/2);
                    addStat('SKILL_'+skillName, 'PROFICIENCY_BONUS', profBonus, 'Untrained Improvisation');
                } else {
                    addStat('SKILL_'+skillName, 'PROFICIENCY_BONUS', g_character.level, 'Untrained Improvisation');
                }
            }
        }

        if(gState_addLevelToUntrainedSkill) {
          if(profData.NumUps === 0 && !gOption_hasProfWithoutLevel){
            addStat('SKILL_'+skillName, 'PROFICIENCY_BONUS', g_character.level, 'Level to Untrained Skills');
          }
        }

        if(hasFascinatedCondition){
            addStatAndSrc('SKILL_'+skillName, 'STATUS_PENALTY', -2, 'Fascinated');
        }

        let totalBonus = getStatTotal('SKILL_'+skillName);

        let conditionalStar = (hasConditionals('SKILL_'+skillName)) ? '<sup class="is-size-7 has-text-info">*</sup>' : '';


        let skillNameHTML = '<span class="has-txt-listing">'+skillName+'</span>';

        // Underline if lore is user-added
        if(skillName.includes(' Lore')){
          let userAddedData = getUserAddedData(g_profMap.get(skillName));
          if(userAddedData != null){
            skillNameHTML = '<span class="has-txt-listing is-underlined-thin-darker">'+skillName+'</span>';
          }
        }

        skills.append(`
          <a id="${skillButtonID}" class="panel-block skillButton border-dark-lighter pos-relative">
            <span class="panel-icon has-txt-value-number">${signNumber(totalBonus)+conditionalStar}</span>
            <span class="pl-3">${skillNameHTML}</span>
            <span class="pos-absolute pos-t-5 pos-r-5 is-italic has-txt-noted is-size-7-5">${getProfLetterFromNumUps(profData.NumUps)}</span>
          </a>
        `);
        g_calculatedStats.totalSkills.push({Name: skillName, Bonus: totalBonus});// Calculated Stat

        $('#'+skillButtonID).click(function(){
            openQuickView('skillView', {
                Skill : skillData.Skill,
                SkillName : skillName,
                ProfData : profData,
                AbilMod : abilMod,
                ProfNum : profNum,
                TotalBonus : totalBonus,
                CharLevel : g_character.level,
                VARIABLE: 'SKILL_'+skillName,
            });
        });

    }


    ////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////// Actions Tab //////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    let encounterFeatStructArray = [];
    let explorationFeatStructArray = [];
    let downtimeFeatStructArray = [];

    for(const [featID, featStruct] of g_featMap.entries()){

        if(featStruct.Feat.isDefault == 1){

            // Hardcoded Exploration and Downtime Tag IDs
            let explorationTag = featStruct.Tags.find(tag => {
                return tag.id === 15;
            });
            let downtimeTag = featStruct.Tags.find(tag => {
                return tag.id === 218;
            });
    
            if(explorationTag != null){
                explorationFeatStructArray.push(featStruct);
            } else if(downtimeTag != null){
                downtimeFeatStructArray.push(featStruct);
            } else if(featStruct.Feat.actions != 'NONE'){
                encounterFeatStructArray.push(featStruct);
            }
        }
    }


    encounterFeatStructArray = encounterFeatStructArray.sort(
        function(a, b) {
            return (a.Feat.name > b.Feat.name) ? 1 : -1;
        }
    );
    explorationFeatStructArray = explorationFeatStructArray.sort(
        function(a, b) {
            return (a.Feat.name > b.Feat.name) ? 1 : -1;
        }
    );
    downtimeFeatStructArray = downtimeFeatStructArray.sort(
        function(a, b) {
            return (a.Feat.name > b.Feat.name) ? 1 : -1;
        }
    );

    $('#actionsTab').click(function(event, preventQuickviewClose){
        if(preventQuickviewClose){
            event.stopImmediatePropagation();
        }
        changeTab('actionsTab', {
            FeatMap : g_featMap,
            FeatChoiceArray : g_featChoiceArray,
            SkillMap : g_skillMap,
            EncounterFeatStructArray : encounterFeatStructArray,
            ExplorationFeatStructArray : explorationFeatStructArray,
            DowntimeFeatStructArray : downtimeFeatStructArray
        });
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////// Weapons Tab //////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    $('#weaponsTab').click(function(event, preventQuickviewClose){
        if(preventQuickviewClose){
            event.stopImmediatePropagation();
        }
        changeTab('weaponsTab', {
            StrMod : getMod(getStatTotal(VARIABLE.SCORE_STR)),
            DexMod : getMod(getStatTotal(VARIABLE.SCORE_DEX)),
        });
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////// Spells Tab //////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    $('#spellsTab').click(function(event, preventQuickviewClose){
        if(preventQuickviewClose){
            event.stopImmediatePropagation();
        }
        changeTab('spellsTab', null);
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////// Inventory Tab /////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    $('#inventoryTab').click(function(event, preventQuickviewClose){
        if(preventQuickviewClose){
            event.stopImmediatePropagation();
        }
        changeTab('inventoryTab', {
        });
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////// Companions Tab /////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    $('#companionsTab').click(function(event, preventQuickviewClose){
        if(preventQuickviewClose){
            event.stopImmediatePropagation();
        }
        changeTab('companionsTab', {
        });
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////// Details Tab //////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    $('#detailsTab').click(function(event, preventQuickviewClose){
        if(preventQuickviewClose){
            event.stopImmediatePropagation();
        }
        changeTab('detailsTab', {
            FeatMap : g_featMap,
            FeatChoiceArray : g_featChoiceArray,
            AbilityMap : g_abilMap,
            Character : g_character,
            Heritage : g_heritage,
            Background : g_background,
            PhyFeats : g_phyFeatArray,
            ClassDetails : g_classDetails,
            Ancestry : g_ancestry
        });
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////// Notes Tab ///////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    $('#notesTab').click(function(event, preventQuickviewClose){
        if(preventQuickviewClose){
            event.stopImmediatePropagation();
        }
        changeTab('notesTab', {
        });
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////// Languages ///////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    $("#addNewLangButton").click(function(){
      openQuickView('addLangView', {
      });
    });

    let languagesContent = $('#languagesContent');
    languagesContent.html('');
    let langCount = 0;
    for(const lang of g_langArray){
        if(lang.value == null) {continue;}
        if(langCount != 0){languagesContent.append(', ');}
        langCount++;
        let langID = 'langLink'+lang.value.id+"C"+langCount;
        

        let langNameHTML = '<span class="">'+lang.value.name+'</span>';

        // Underline if lang is user-added
        if(lang.sourceType == 'user-added'){
          langNameHTML = '<span class="is-underlined-thin-darker">'+lang.value.name+'</span>';
        }

        languagesContent.append('<a id="'+langID+'" class="is-size-6">'+langNameHTML+'</a>');
        $('#'+langID).click(function(){
            openQuickView('languageView', {
                Language : lang.value,
                SourceType : lang.sourceType,
            });
        });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////// Left Quickview /////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    $('#leftQuickviewButton').click(function(event){
      event.stopImmediatePropagation();
      openLeftQuickView('Toggleables');
    });

}

////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////// Health ////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

function initHealthPointsAndMore() {

  // TODO - Rework this
  // Sets the g_calculatedStats for both health and stamina
  initHealthAndTemp();
  initStaminaAndResolve();
  //

  if(gOption_hasStamina){
    
    if(g_showHealthPanel){
      initHealthAndTemp();
    } else {
      initStaminaAndResolve();
    }

    $('#pointSwitchOutContainer').removeClass('is-hidden');
    $('#pointSwitchOutBtn').off();
    $('#pointSwitchOutBtn').click(function(){
      g_showHealthPanel = !g_showHealthPanel;
      if(g_showHealthPanel){
        initHealthAndTemp();
      } else {
        initStaminaAndResolve();
      }
    });
  } else {
    initHealthAndTemp();
  }

}

function initHealthAndTemp() {
    $('#healthPointsContainer').removeClass('is-hidden');
    $('#tempPointsContainer').removeClass('is-hidden');
    $('#staminaPointsContainer').addClass('is-hidden');
    $('#resolvePointsContainer').addClass('is-hidden');

    let maxHealth = $('#char-max-health');
    let maxHealthNum = getStatTotal(VARIABLE.MAX_HEALTH);

    if(gOption_hasStamina){
      maxHealthNum += (Math.floor(g_classDetails.Class.hitPoints/2)+getStatTotal(VARIABLE.MAX_HEALTH_BONUS_PER_LEVEL))*g_character.level;
    } else {
      maxHealthNum += (g_classDetails.Class.hitPoints+getStatTotal(VARIABLE.MAX_HEALTH_BONUS_PER_LEVEL))*g_character.level;
    }
    
    if(maxHealthNum < 0){ maxHealthNum = 0; }
    maxHealth.html(maxHealthNum);
    g_calculatedStats.maxHP = maxHealthNum;// Calculated Stat

    if(g_character.currentHealth == null){
        g_character.currentHealth = maxHealthNum;
    }
    g_character.currentHealth = (g_character.currentHealth > maxHealthNum) ? maxHealthNum : g_character.currentHealth;

    let currentHealth = $('#char-current-health');
    let animationDelay = getAnimationDelayFromCurrentHP(g_character.currentHealth, maxHealthNum);

    currentHealth.html('<p class="is-size-5 health-variable-color is-unselectable text-center" style="width: 70px; animation-delay: '+animationDelay+'!important;">'+g_character.currentHealth+'</p>');

    $(currentHealth).off('click');
    $(currentHealth).click(function(){
        if(!$(this).hasClass('is-in-input-mode')) {

            $(this).addClass('is-in-input-mode');
            $(this).html('<input id="current-health-input" class="input" type="text" min="0" max="'+maxHealthNum+'" style="width: 70px;" value="'+g_character.currentHealth+'" autofocus onfocus="var temp_value=this.value; this.value=null; this.value=temp_value">');
            $('#current-health-input').focus();

            $('#current-health-input').blur(function(){
                healthConfirm(maxHealthNum);
            });

            // Press Enter Key
            $('#current-health-input').on('keypress',function(e){
                if(e.which == 13){
                    healthConfirm(maxHealthNum);
                }
            });

        }
    });


    let tempHealth = $('#char-temp-health');
    
    if(g_character.tempHealth == null){
        g_character.tempHealth = 0;
    }

    if(g_character.tempHealth == 0){
        tempHealth.html('<p class="is-size-5 is-unselectable text-center has-txt-value-number" style="width: 70px; margin: auto;">―</p>');
    } else {
        tempHealth.html('<p class="is-size-5 is-unselectable text-center has-text-info" style="width: 70px; margin: auto;">'+g_character.tempHealth+'</p>');
    }

    $(tempHealth).off('click');
    $(tempHealth).click(function(){
        if(!$(this).hasClass('is-in-input-mode')) {

            $(this).addClass('is-in-input-mode');
            $(this).html('<input id="temp-health-input" class="input" type="text" min="0" max="999" style="width: 70px; margin: auto;" value="'+g_character.tempHealth+'" autofocus onfocus="var temp_value=this.value; this.value=null; this.value=temp_value">');
            $('#temp-health-input').focus();

            $('#temp-health-input').blur(function(){
                tempHealthConfirm();
            });

            // Press Enter Key
            $('#temp-health-input').on('keypress',function(e){
                if(e.which == 13){
                    tempHealthConfirm();
                }
            });

        }
    });

}

function healthConfirm(maxHealthNum){
  let currentHealthNum = $('#current-health-input').val();

  let newCurrentHealth;
  try {
    newCurrentHealth = parseInt(math.evaluate(currentHealthNum));
    if(newCurrentHealth > maxHealthNum) { newCurrentHealth = maxHealthNum; }
    if(newCurrentHealth < 0) { newCurrentHealth = 0; }
    if(isNaN(newCurrentHealth)) { throw 'Value is not a number!'; }
  } catch (err) {
    $('#current-health-input').addClass('is-danger');
    return;
  }

  if(g_character.currentHealth === 0 && newCurrentHealth > 0){
    removeCondition(11); // Hardcoded ID - Remove Dying Condition
    let woundedCondition = getCondition(35); // Hardcoded ID - Wounded
    if(woundedCondition != null){
        let woundedValue = woundedCondition.Value + 1;
        addCondition(35,
            woundedValue,
            woundedCondition.SourceText,
            woundedCondition.ParentID);
    } else {
        addCondition(35, 1, null);
    }
  }

  g_character.currentHealth = newCurrentHealth;
  let animationDelay = getAnimationDelayFromCurrentHP(g_character.currentHealth, maxHealthNum);

  $('#char-current-health').html('<p class="is-size-5 health-variable-color is-unselectable text-center" style="width: 70px; animation-delay: '+animationDelay+'!important;">'+g_character.currentHealth+'</p>');
  
  $('#char-current-health').removeClass('is-in-input-mode');
  socket.emit("requestCurrentHitPointsSave",
      getCharIDFromURL(),
      g_character.currentHealth);
  sendOutUpdateToGM('hp', { value: g_character.currentHealth });

  if(g_character.currentHealth === 0){
      let dyingValue = 1;
      let woundedCondition = getCondition(35); // Hardcoded ID - Wounded
      if(woundedCondition != null){
          dyingValue += woundedCondition.Value;
      }
      addCondition(11, dyingValue, null); // Hardcoded ID - Add Dying Condition
  }
}

function tempHealthConfirm(){
  let tempHealth = $('#char-temp-health');
  let tempHealthNum = $('#temp-health-input').val();

  let newTempHealth;
  try {
    if(tempHealthNum == '') { tempHealthNum = '0'; }
    newTempHealth = parseInt(math.evaluate(tempHealthNum));
    if(newTempHealth > 999) { newTempHealth = 999; }
    if(newTempHealth < 0 || isNaN(newTempHealth)) { newTempHealth = 0; }
  } catch (err) {
    $('#temp-health-input').addClass('is-danger');
    return;
  }

  g_character.tempHealth = newTempHealth;
  if(g_character.tempHealth == 0){
      tempHealth.html('<p class="is-size-5 is-unselectable text-center has-txt-value-number" style="width: 70px;">―</p>');
  } else {
      tempHealth.html('<p class="is-size-5 is-unselectable text-center has-text-info" style="width: 70px;">'+g_character.tempHealth+'</p>');
  }
  $('#char-temp-health').removeClass('is-in-input-mode');
  socket.emit("requestTempHitPointsSave",
      getCharIDFromURL(),
      g_character.tempHealth);
  sendOutUpdateToGM('temp-hp', { value: g_character.tempHealth });
}

///////

function initStaminaAndResolve() {
  $('#staminaPointsContainer').removeClass('is-hidden');
  $('#resolvePointsContainer').removeClass('is-hidden');
  $('#healthPointsContainer').addClass('is-hidden');
  $('#tempPointsContainer').addClass('is-hidden');

  let maxStamina = $('#char-max-stamina');
  let maxStaminaNum = (Math.floor(g_classDetails.Class.hitPoints/2)+getModOfValue('CON'))*g_character.level;
  
  if(maxStaminaNum < 0){ maxStaminaNum = 0; }
  maxStamina.html(maxStaminaNum);
  g_calculatedStats.maxStamina = maxStaminaNum;// Calculated Stat

  if(g_character.currentStamina == null){
      g_character.currentStamina = maxStaminaNum;
  }
  g_character.currentStamina = (g_character.currentStamina > maxStaminaNum) ? maxStaminaNum : g_character.currentStamina;

  let currentStamina = $('#char-current-stamina');
  currentStamina.html('<p class="is-size-5 is-unselectable text-center has-text-primary" style="width: 40px;">'+g_character.currentStamina+'</p>');

  $(currentStamina).off('click');
  $(currentStamina).click(function(){
      if(!$(this).hasClass('is-in-input-mode')) {

          $(this).addClass('is-in-input-mode');
          $(this).html('<input id="current-stamina-input" class="input" type="text" min="0" max="'+maxStaminaNum+'" style="width: 70px;" value="'+g_character.currentStamina+'" autofocus onfocus="var temp_value=this.value; this.value=null; this.value=temp_value">');
          $('#current-stamina-input').focus();

          $('#current-stamina-input').blur(function(){
            staminaConfirm(maxStaminaNum);
          });

          // Press Enter Key
          $('#current-stamina-input').on('keypress',function(e){
              if(e.which == 13){
                staminaConfirm(maxStaminaNum);
              }
          });

      }
  });


  let maxResolve = $('#char-max-resolve');
  let maxResolveNum = getModOfValue(g_classDetails.KeyAbility);
  
  if(maxResolveNum < 0){ maxResolveNum = 0; }
  maxResolve.html(maxResolveNum);
  g_calculatedStats.maxResolve = maxResolveNum;// Calculated Stat

  if(g_character.currentResolve == null){
      g_character.currentResolve = maxResolveNum;
  }
  g_character.currentResolve = (g_character.currentResolve > maxResolveNum) ? maxResolveNum : g_character.currentResolve;

  let currentResolve = $('#char-current-resolve');
  currentResolve.html('<p class="is-size-5 is-unselectable text-center has-text-link" style="width: 40px;">'+g_character.currentResolve+'</p>');

  $(currentResolve).off('click');
  $(currentResolve).click(function(){
      if(!$(this).hasClass('is-in-input-mode')) {

          $(this).addClass('is-in-input-mode');
          $(this).html('<input id="current-resolve-input" class="input" type="text" min="0" max="'+maxResolveNum+'" style="width: 70px;" value="'+g_character.currentResolve+'" autofocus onfocus="var temp_value=this.value; this.value=null; this.value=temp_value">');
          $('#current-resolve-input').focus();

          $('#current-resolve-input').blur(function(){
            resolveConfirm(maxResolveNum);
          });

          // Press Enter Key
          $('#current-resolve-input').on('keypress',function(e){
              if(e.which == 13){
                resolveConfirm(maxResolveNum);
              }
          });

      }
  });

}

function staminaConfirm(maxStaminaNum){
  let currentStaminaNum = $('#current-stamina-input').val();

  let newCurrentStamina;
  try {
    newCurrentStamina = parseInt(math.evaluate(currentStaminaNum));
    if(newCurrentStamina > maxStaminaNum) { newCurrentStamina = maxStaminaNum; }
    if(newCurrentStamina < 0) { newCurrentStamina = 0; }
    if(isNaN(newCurrentStamina)) { throw 'Value is not a number!'; }
  } catch (err) {
    $('#current-stamina-input').addClass('is-danger');
    return;
  }

  g_character.currentStamina = newCurrentStamina;
  $('#char-current-stamina').html('<p class="is-size-5 is-unselectable text-center has-text-primary" style="width: 40px;">'+g_character.currentStamina+'</p>');
  $('#char-current-stamina').removeClass('is-in-input-mode');
  socket.emit("requestCurrentStaminaPointsSave",
      getCharIDFromURL(),
      g_character.currentStamina);
  sendOutUpdateToGM('stamina', { value: g_character.currentStamina });
}

function resolveConfirm(maxResolveNum){
  let currentResolveNum = $('#current-resolve-input').val();

  let newCurrentResolve;
  try {
    newCurrentResolve = parseInt(math.evaluate(currentResolveNum));
    if(newCurrentResolve > maxResolveNum) { newCurrentResolve = maxResolveNum; }
    if(newCurrentResolve < 0) { newCurrentResolve = 0; }
    if(isNaN(newCurrentResolve)) { throw 'Value is not a number!'; }
  } catch (err) {
    $('#current-resolve-input').addClass('is-danger');
    return;
  }

  g_character.currentResolve = newCurrentResolve;
  $('#char-current-resolve').html('<p class="is-size-5 is-unselectable text-center has-text-link" style="width: 40px;">'+g_character.currentResolve+'</p>');
  $('#char-current-resolve').removeClass('is-in-input-mode');
  socket.emit("requestCurrentResolvePointsSave",
      getCharIDFromURL(),
      g_character.currentResolve);
  sendOutUpdateToGM('resolve', { value: g_character.currentResolve });
}

////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////// Armor and Shields ///////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

function determineArmor(dexMod, strScore) {

    let shieldStruct = findEquippedShield();
    if(shieldStruct != null){

        let tagArray = getItemTraitsArray(shieldStruct.Item, shieldStruct.InvItem);
        let investedTag = tagArray.find(tag => {
            return tag.id === 235; // Hardcoded Invested Tag ID
        });
        if(investedTag == null){
            processSheetCode(shieldStruct.InvItem.code, {
              source: 'InvItem',
              sourceName: shieldStruct.InvItem.name,
              invItemID: shieldStruct.InvItem.id,
              bagInvItemID: shieldStruct.InvItem.bagInvItemID,
            });
        }

        // Halve maxHP if it's shoddy
        let maxHP = (shieldStruct.InvItem.isShoddy == 1) ? Math.floor(shieldStruct.InvItem.hitPoints/2) : shieldStruct.InvItem.hitPoints;

        const speedPenalty = shieldStruct.Item.ShieldData.speedPenalty;
        if(speedPenalty < 0){
          addStat(VARIABLE.SPEED, 'PENALTY (SHIELD)', speedPenalty);
        }

        $('#shieldSection').removeClass('is-hidden');
        $('#shieldBonus').html('+'+shieldStruct.Item.ShieldData.acBonus);
        $('#shieldSection').attr('data-tooltip', shieldStruct.InvItem.name+'\nHardness: '+shieldStruct.InvItem.hardness+'\nHealth: '+shieldStruct.InvItem.currentHitPoints+'/'+maxHP);

        $("#shieldSection").click(function(){
          openQuickView('invItemView', {
              InvItem : shieldStruct.InvItem,
              Item : shieldStruct.Item,
              InvData : null,
              ExtraData : {}
          });
        });

    } else {
        $('#shieldSection').addClass('is-hidden');
    }

    let armorStruct = findEquippedArmor();
    if(armorStruct != null){

        let tagArray = getItemTraitsArray(armorStruct.Item, armorStruct.InvItem);
        
        let investedTag = tagArray.find(tag => {
            return tag.id === 235; // Hardcoded Invested Tag ID
        });
        if(investedTag == null){
            processSheetCode(armorStruct.InvItem.code, {
              source: 'InvItem',
              sourceName: armorStruct.InvItem.name,
              invItemID: armorStruct.InvItem.id,
              bagInvItemID: armorStruct.InvItem.bagInvItemID,
            });
        }

        let profData = g_armorProfMap.get(armorStruct.Item.ArmorData.profName);

        let profNumUps = null;
        if(profData != null){
            profNumUps = profData.NumUps;
            addStat(VARIABLE.AC, 'USER_BONUS', profData.UserBonus);
        } else {
            profNumUps = 0;
        }

        let profNumber = getProfNumber(profNumUps, g_character.level);

        let pre_dexMod = getMod(g_preConditions_dexScore);
        let dexCap = (getStatBonusTotal(VARIABLE.DEX_CAP) != null) ? getStatBonusTotal(VARIABLE.DEX_CAP) : armorStruct.Item.ArmorData.dexCap;
        let newDexMod = (pre_dexMod > dexCap) ? dexCap : pre_dexMod;
        dexMod = newDexMod - (pre_dexMod-dexMod);

        // Apply armor's rune effects to character...
        if(isArmorPotencyOne(armorStruct.InvItem.fundPotencyRuneID)){
          addStat(VARIABLE.AC, 'ITEM_BONUS', 1);
        } else if(isArmorPotencyTwo(armorStruct.InvItem.fundPotencyRuneID)){
          addStat(VARIABLE.AC, 'ITEM_BONUS', 2);
        } else if(isArmorPotencyThree(armorStruct.InvItem.fundPotencyRuneID)){
          addStat(VARIABLE.AC, 'ITEM_BONUS', 3);
        } else if(isArmorPotencyFour(armorStruct.InvItem.fundPotencyRuneID)){
          addStat(VARIABLE.AC, 'ITEM_BONUS', 4);
        }
        if(isResilient(armorStruct.InvItem.fundRuneID)){
          addStat(VARIABLE.SAVE_FORT, 'ITEM_BONUS', 1);
          addStat(VARIABLE.SAVE_WILL, 'ITEM_BONUS', 1);
          addStat(VARIABLE.SAVE_REFLEX, 'ITEM_BONUS', 1);
        } else if(isGreaterResilient(armorStruct.InvItem.fundRuneID)){
          addStat(VARIABLE.SAVE_FORT, 'ITEM_BONUS', 2);
          addStat(VARIABLE.SAVE_WILL, 'ITEM_BONUS', 2);
          addStat(VARIABLE.SAVE_REFLEX, 'ITEM_BONUS', 2);
        } else if(isMajorResilient(armorStruct.InvItem.fundRuneID)){
          addStat(VARIABLE.SAVE_FORT, 'ITEM_BONUS', 3);
          addStat(VARIABLE.SAVE_WILL, 'ITEM_BONUS', 3);
          addStat(VARIABLE.SAVE_REFLEX, 'ITEM_BONUS', 3);
        }
        runPropertyRuneCode(armorStruct.InvItem.propRune1ID, armorStruct.InvItem.id);
        runPropertyRuneCode(armorStruct.InvItem.propRune2ID, armorStruct.InvItem.id);
        runPropertyRuneCode(armorStruct.InvItem.propRune3ID, armorStruct.InvItem.id);
        runPropertyRuneCode(armorStruct.InvItem.propRune4ID, armorStruct.InvItem.id);

        // Halve maxHP if it's shoddy
        let maxHP = (armorStruct.InvItem.isShoddy == 1) ? Math.floor(armorStruct.InvItem.hitPoints/2) : armorStruct.InvItem.hitPoints;
        // Reduce currentHP if it's over maxHP
        armorStruct.InvItem.currentHitPoints = (armorStruct.InvItem.currentHitPoints > maxHP) ? maxHP : armorStruct.InvItem.currentHitPoints;
        // Halve brokenThreshold if it's shoddy
        let brokenThreshold = (armorStruct.InvItem.isShoddy == 1) ? Math.floor(armorStruct.InvItem.brokenThreshold/2) : armorStruct.InvItem.brokenThreshold;

        let brokenPenalty = 0;
        let isBroken = (armorStruct.InvItem.currentHitPoints <= brokenThreshold);
        if(doesntHaveItemHealth(armorStruct.InvItem)) {isBroken = false;}
        if(isBroken){
            switch(armorStruct.Item.ArmorData.category){
                case 'LIGHT': brokenPenalty = -1; break;
                case 'MEDIUM': brokenPenalty = -2; break;
                case 'HEAVY': brokenPenalty = -3; break;
                default: break;
            }
        }

        let shoddyPenalty = (armorStruct.InvItem.isShoddy == 1) ? -2 : 0;
        let totalArmorBonus = armorStruct.Item.ArmorData.acBonus + brokenPenalty + shoddyPenalty;

        let totalAC = 10 + dexMod + profNumber + totalArmorBonus;
        totalAC += getStatBonusTotal(VARIABLE.AC);

        // Apply armor penalties to character...
        g_variableMap.get(VARIABLE.ARMOR_CHECK_PENALTY).Value = armorStruct.Item.ArmorData.checkPenalty;
        g_variableMap.get(VARIABLE.ARMOR_SPEED_PENALTY).Value = armorStruct.Item.ArmorData.speedPenalty;
        let checkPenalty = getStatTotal(VARIABLE.ARMOR_CHECK_PENALTY);
        let speedPenalty = getStatTotal(VARIABLE.ARMOR_SPEED_PENALTY);

        checkPenalty += (armorStruct.InvItem.isShoddy == 1) ? -2 : 0;

        let noisyTag = tagArray.find(tag => {
            return tag.id === 559; // Hardcoded Noisy Tag ID
        });
        if(strScore >= armorStruct.Item.ArmorData.minStrength) {

            speedPenalty += 5;

            if(checkPenalty != 0){
                if(noisyTag != null){
                    if(gState_armoredStealth && profNumUps > 0){
                        // If you have Armor Stealth and are trained in the armor, ignore noisy trait
                    } else {
                        applyArmorCheckPenaltyToSkill('Stealth', checkPenalty);
                    }
                }
            }

        } else {

            if(checkPenalty != 0){
                let flexibleTag = tagArray.find(tag => {
                    return tag.id === 558; // Hardcoded Flexible Tag ID
                });
                if(flexibleTag == null){
                    applyArmorCheckPenaltyToSkill('Acrobatics', checkPenalty);
                    applyArmorCheckPenaltyToSkill('Athletics', checkPenalty);
                }
                if(gState_armoredStealth && profNumUps > 0 && noisyTag == null) {
                    /*  If you have Armor Stealth and are trained in the armor, 
                        ignore noisy trait and reduce Stealth penalty if no noisy trait.
                    */
                    let stealthCheckPenalty = checkPenalty;
                    let stealthRank = variables_getFinalRank(VARIABLE.SKILL_STEALTH);
                    if(stealthRank == 'L'){ // Legendary
                        stealthCheckPenalty += 3;
                    } else if(stealthRank == 'M'){ // Master
                        stealthCheckPenalty += 2;
                    } else { // Expert or less
                        stealthCheckPenalty += 1;
                    }
                    if(stealthCheckPenalty > 0) { stealthCheckPenalty = 0; }
                    applyArmorCheckPenaltyToSkill('Stealth', stealthCheckPenalty);
                } else {
                    applyArmorCheckPenaltyToSkill('Stealth', checkPenalty);
                }
                applyArmorCheckPenaltyToSkill('Thievery', checkPenalty);
            }

        }

        if(speedPenalty < 0 && !gState_unburdenedIron){
          addStat(VARIABLE.SPEED, 'PENALTY (ARMOR)', speedPenalty);
        }

        // Final Product
        let totalACDisplayed = (hasConditionals(VARIABLE.AC)) ? totalAC+'<sup class="is-size-6 has-text-info">*</sup>' : totalAC;
        $('#acNumber').html(totalACDisplayed);
        $('#acSection').attr('data-tooltip', armorStruct.InvItem.name);
        g_calculatedStats.totalAC = totalAC;// Calculated Stat

        // Apply conditional if the armor has the Bulwark trait
        let bulwarkTag = tagArray.find(tag => {
            return tag.id === 560; // Hardcoded Bulwark Tag ID
        });
        if(bulwarkTag != null){
            if(gState_mightyBulwark) {
                addConditionalStat(VARIABLE.SAVE_REFLEX, 'You add a +4 modifier instead of your Dexterity modifier.', 'Worn Armor');
            } else {
                addConditionalStat(VARIABLE.SAVE_REFLEX, 'On saves to avoid a damaging effect, you add a +3 modifier instead of your Dexterity modifier.', 'Worn Armor');
            }
        }

        $("#acSection").click(function(){
            openQuickView('acView', {
                TotalAC : totalAC,
                DexMod : dexMod,
                ArmorItemName : armorStruct.InvItem.name,
                ProfNum : profNumber,
                CharLevel : g_character.level,
                NumUps : profNumUps,
                ArmorBonus : totalArmorBonus,
            });
        });

    } else {

        let profData = g_armorProfMap.get('No Armor'); // Hardcoded - No Armor Hidden Prof Name

        let profNumUps = null;
        if(profData != null){
            profNumUps = profData.NumUps;
            addStat(VARIABLE.AC, 'USER_BONUS', profData.UserBonus);
        } else {
            profNumUps = 0;
        }

        let profNumber = getProfNumber(profNumUps, g_character.level);

        let totalArmorBonus = 0;

        let dexCap = getStatBonusTotal(VARIABLE.DEX_CAP);
        let dexModCapped = (dexCap != null) ? ((dexMod > dexCap) ? dexCap : dexMod) : dexMod;

        let totalAC = 10 + dexModCapped + profNumber + totalArmorBonus;
        totalAC += getStatBonusTotal(VARIABLE.AC);

        // Final Product
        let totalACDisplayed = (hasConditionals(VARIABLE.AC)) ? totalAC+'<sup class="is-size-6 has-text-info">*</sup>' : totalAC;
        $('#acNumber').html(totalACDisplayed);
        $('#acSection').attr('data-tooltip', 'Wearing Nothing');
        g_calculatedStats.totalAC = totalAC;// Calculated Stat

        $("#acSection").click(function(){
            openQuickView('acView', {
                TotalAC : totalAC,
                DexMod : dexModCapped,
                ArmorItemName : 'Wearing Nothing',
                ProfNum : profNumber,
                CharLevel : g_character.level,
                NumUps : profNumUps,
                ArmorBonus : totalArmorBonus,
            });
        });

    }

}

function runPropertyRuneCode(propertyRuneID, invItemID){

    if(propertyRuneID == null){ return; }

    for(const [itemID, itemData] of g_itemMap.entries()){
        if(itemData.RuneData != null && itemData.RuneData.id == propertyRuneID){
            let propertyRuneCode = itemData.Item.code;
            if(propertyRuneCode != null){
                processSheetCode(propertyRuneCode, {
                  source: 'PropertyRune',
                  sourceName: itemData.Item.name,
                  invItemID: invItemID,
                });
            }
            return;
        }
    }

}

function applyArmorCheckPenaltyToSkill(skillName, checkPenalty){

    addStat('SKILL_'+skillName, 'PENALTY (ARMOR)', checkPenalty);
    addConditionalStat('SKILL_'+skillName, signNumber(checkPenalty)+" penalty from armor is NOT applied to skill checks that have the attack trait", 'Worn Armor');

}

function findEquippedArmor() {
    for(const invItem of g_invStruct.InvItems){
        if(invItem.id == g_equippedArmorInvItemID) {
            let item = g_itemMap.get(invItem.itemID+"");
            if(item == null) { continue; }
            if(invItem.bagInvItemID == null && item.ArmorData != null){
                return { Item : item, InvItem : invItem };
            }
        }
    }
    return null;
}

function findEquippedShield() {
    for(const invItem of g_invStruct.InvItems){
        if(invItem.id == g_equippedShieldInvItemID) {
            let item = g_itemMap.get(invItem.itemID+"");
            if(item == null) { continue; }
            if(invItem.bagInvItemID == null && item.ShieldData != null){

                // Halve maxHP if it's shoddy
                let maxHP = (invItem.isShoddy == 1) ? Math.floor(invItem.hitPoints/2) : invItem.hitPoints;
                // Reduce currentHP if it's over maxHP
                invItem.currentHitPoints = (invItem.currentHitPoints > maxHP) ? maxHP : invItem.currentHitPoints;
                // Halve brokenThreshold if it's shoddy
                let brokenThreshold = (invItem.isShoddy == 1) ? Math.floor(invItem.brokenThreshold/2) : invItem.brokenThreshold;
                
                if(invItem.currentHitPoints > brokenThreshold){
                    return { Item : item, InvItem : invItem };
                } else {
                    g_equippedShieldInvItemID = null;
                    return null;
                }
                
            }
        }
    }
    return null;
}

function removeInvalidItemsFromInventory(){

  for(const invItem of g_invStruct.InvItems){
        
    let item = g_itemMap.get(invItem.itemID+"");
    if(item == null) {
      console.warn("Removing invalid item from inventory: "+invItem.name);
      socket.emit("requestRemoveItemFromInv", invItem.id);
    }

  }

}

////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////// Rune Data Struct //////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

function generateRuneDataStruct(){

    let weaponRuneArray = [];
    let armorRuneArray = [];
    for(const [itemID, itemData] of g_itemMap.entries()){
        if(itemData.RuneData != null){
            if(itemData.RuneData.etchedType == 'WEAPON'){
                weaponRuneArray[itemData.RuneData.id] = itemData;
            } else if(itemData.RuneData.etchedType == 'ARMOR'){
                armorRuneArray[itemData.RuneData.id] = itemData;
            }
        }
    }
    let runesSort = function(a, b) {
        if(a.RuneData.isFundamental == 1 && b.RuneData.isFundamental == 1){
            if(a.Item.name.includes('Potency')) {
                if(!b.Item.name.includes('Potency')){ // A is, B is not
                    return 1;
                } else {
                    return a.Item.id - b.Item.id; // Both are Potency
                }
            } else {
                if(b.Item.name.includes('Potency')){ // A is not, B is
                    return -1;
                } else {
                    return a.Item.id - b.Item.id; // Neither are Potency
                }
            }
        } else {
            if (a.Item.level === b.Item.level) {
                // Name is only important when levels are the same
                return a.Item.name > b.Item.name ? 1 : -1;
            } else {
                return a.Item.level - b.Item.level;
            }
        }
    };
    weaponRuneArray = weaponRuneArray.sort(runesSort);
    armorRuneArray = armorRuneArray.sort(runesSort);

    return { WeaponArray : weaponRuneArray, ArmorArray : armorRuneArray };

}

////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////// Determine Bulk And Coins ///////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

function determineBulkAndCoins(invItems, itemMap){

    let bagBulkMap = new Map();
    let totalBulk = 0;

    let copperCoins = 0;
    let silverCoins = 0;
    let goldCoins = 0;
    let platinumCoins = 0;

    let droppedItemArray = [];
    for(const invItem of invItems){
        if(invItem.isDropped == 1) { droppedItemArray.push(invItem.id); continue; }

        // Coins - Hardcoded IDs //
        let isCurrency = false;
        if(invItem.itemID == 22){ // Copper
          isCurrency = true;
          copperCoins += invItem.quantity;
        } else if(invItem.itemID == 23){ // Silver
          isCurrency = true;
          silverCoins += invItem.quantity;
        } else if(invItem.itemID == 24){ // Gold
          isCurrency = true;
          goldCoins += invItem.quantity;
        } else if(invItem.itemID == 25){ // Platinum
          isCurrency = true;
          platinumCoins += invItem.quantity;
        }
            
        // Bulk //
        if(invItem.bagInvItemID != null){
            let bagBulk = bagBulkMap.get(invItem.bagInvItemID);
            if(bagBulk == null){
                let bagInvItem = invItems.find(searchInvItem => {
                    return searchInvItem.id == invItem.bagInvItemID;
                });
                if(bagInvItem != null){
                  let bagItem = itemMap.get(bagInvItem.itemID+"");
                  if(bagItem != null){
                    let invItemQuantity = (invItem.quantity == null) ? 1 : invItem.quantity;
                    let invItemBulk = determineItemBulk(g_charSize, invItem.size, invItem.bulk);
                    invItemBulk = getWornArmorBulkAdjustment(invItem, invItemBulk);
                    invItemBulk = (invItemBulk == 0.0) ? 0.001 : invItemBulk;
                    let invItemTotalBulk = invItemBulk * invItemQuantity;

                    if(isCurrency){
                      invItemTotalBulk = Math.floor(invItemQuantity / 1000);
                    }
                    
                    let bulkIgnored = (bagItem.StorageData != null) ? bagItem.StorageData.bulkIgnored : 0;

                    bagBulkMap.set(invItem.bagInvItemID, invItemTotalBulk-bulkIgnored);
                  }
                }
            } else {
                let invItemQuantity = (invItem.quantity == null) ? 1 : invItem.quantity;
                let invItemBulk = determineItemBulk(g_charSize, invItem.size, invItem.bulk);
                invItemBulk = getWornArmorBulkAdjustment(invItem, invItemBulk);
                invItemBulk = (invItemBulk == 0.0) ? 0.001 : invItemBulk;
                let invItemTotalBulk = invItemBulk * invItemQuantity;

                if(isCurrency){
                  invItemTotalBulk = Math.floor(invItemQuantity / 1000);
                }

                bagBulkMap.set(invItem.bagInvItemID, bagBulk+invItemTotalBulk);
            }
        } else {

            let includeSelf = true;
            let item = itemMap.get(invItem.itemID+"");

            if(item != null){

              if(item.StorageData != null){
                if(item.StorageData.ignoreSelfBulkIfWearing == 1){
                    includeSelf = false;
                }
              }

              if(includeSelf){
                  let invItemQuantity = (invItem.quantity == null) ? 1 : invItem.quantity;
                  let invItemBulk = determineItemBulk(g_charSize, invItem.size, invItem.bulk);
                  invItemBulk = getWornArmorBulkAdjustment(invItem, invItemBulk);
                  invItemBulk = (invItemBulk == 0.0) ? 0.001 : invItemBulk;
                  let invItemTotalBulk = invItemBulk * invItemQuantity;

                  if(isCurrency){
                    invItemTotalBulk = Math.floor(invItemQuantity / 1000);
                  }

                  totalBulk += invItemTotalBulk;
              }

            }
        }
    }

    for(const [bagInvItemID, bulkAmount] of bagBulkMap.entries()){
        if(bulkAmount > 0 && !droppedItemArray.includes(bagInvItemID)){
            totalBulk += bulkAmount;
        }
    }

    totalBulk = round(totalBulk, 1);

    let strMod = getMod(g_preConditions_strScore);
    let weightEncumbered = 5+strMod;
    let weightMax = 10+strMod;
    
    weightEncumbered = Math.floor(weightEncumbered*getBulkLimitModifierForSize(g_charSize));
    weightMax = Math.floor(weightMax*getBulkLimitModifierForSize(g_charSize));

    let bulkLimitBonus = getStatBonusTotal(VARIABLE.BULK_LIMIT);
    if(bulkLimitBonus != null){
        weightEncumbered += bulkLimitBonus;
        weightMax += bulkLimitBonus;
    }

    let isEncumbered = false;
    let cantMove = false;

    let encumberedSrcText = 'Exceeding the amount of Bulk you can even hold.';
    let immobilizedSrcText = 'Holding more Bulk than you can carry.';
    if(!gOption_hasIgnoreBulk){
      if(totalBulk > weightMax) { // Hardcoded Condition IDs
        addCondition(13, null, encumberedSrcText);
        cantMove = true;
      } else {
        removeCondition(13, encumberedSrcText);
        if(totalBulk > weightEncumbered){
          addCondition(1, null, immobilizedSrcText);
          isEncumbered = true;
        } else {
          removeCondition(1, immobilizedSrcText);
        }
      }
    } else { // Remove conditions if they did exist before,
      removeCondition(13, encumberedSrcText);
      removeCondition(1, immobilizedSrcText);
    }

    g_bulkAndCoinsStruct = {
        TotalBulk : totalBulk,
        BagBulkMap : bagBulkMap,
        IsEncumbered : isEncumbered,
        CantMove : cantMove,
        WeightMax : weightMax,
        WeightEncumbered : weightEncumbered,
        CopperCoins : copperCoins,
        SilverCoins : silverCoins,
        GoldCoins : goldCoins,
        PlatinumCoins : platinumCoins,
    };

    return g_bulkAndCoinsStruct;

}

////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////// Determine Investitures ////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
function determineInvestitures(){

    maxInvests = 10;

    let investLimitBonus = getStatBonusTotal(VARIABLE.INVEST_LIMIT);
    if(investLimitBonus != null){
        maxInvests += investLimitBonus;
    }

    currentInvests = 0;
    for(const invItem of g_invStruct.InvItems){
        if(invItem.isInvested == 1) {

            currentInvests++;

            const item = g_itemMap.get(invItem.itemID+"");
            if(item == null){ continue; }
            if(item.ArmorData != null){
                if(g_equippedArmorInvItemID != invItem.id){
                    continue;
                }
            } else if(item.ShieldData != null){
                if(g_equippedShieldInvItemID != invItem.id){
                    continue;
                }
            }
            
            processSheetCode(invItem.code, {
              source: 'InvItem',
              sourceName: invItem.name,
              invItemID: invItem.id,
              bagInvItemID: invItem.bagInvItemID,
            });
            runPropertyRuneCode(invItem.propRune1ID, invItem.id);
            runPropertyRuneCode(invItem.propRune2ID, invItem.id);
            runPropertyRuneCode(invItem.propRune3ID, invItem.id);
            runPropertyRuneCode(invItem.propRune4ID, invItem.id);

        }
    }

}

////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// Feats, Abilities, Items Code /////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

function runAllItemsCode() {
        
    for(const invItem of g_invStruct.InvItems){
        
        let item = g_itemMap.get(invItem.itemID+"");
        if(item == null) { continue; }

        let tagArray = getItemTraitsArray(item, invItem);
        let investedTag = tagArray.find(tag => {
            return tag.id === 235; // Hardcoded Invested Tag ID
        });

        if(investedTag == null && item.ArmorData == null && item.ShieldData == null){
            processSheetCode(invItem.code, {
              source: 'InvItem',
              sourceName: invItem.name,
              invItemID: invItem.id,
              bagInvItemID: invItem.bagInvItemID,
            });
            runPropertyRuneCode(invItem.propRune1ID, invItem.id);
            runPropertyRuneCode(invItem.propRune2ID, invItem.id);
            runPropertyRuneCode(invItem.propRune3ID, invItem.id);
            runPropertyRuneCode(invItem.propRune4ID, invItem.id);
        }
        
    }

}

function runAllFeatsAndAbilitiesCode() {

    let totalClassAbilities = cloneObj(g_classDetails.Abilities);
    for(let extraClassAbil of g_extraClassAbilities){
      extraClassAbil.value.dontRunCode = extraClassAbil.dontRunCode;
      totalClassAbilities.push(extraClassAbil.value);
    }
    for(let heritageEffect of g_heritageEffects){
      let ability = cloneObj(heritageEffect.value);
      ability.level = heritageEffect.sourceLevel;
      ability.name = 'Heritage Benefits - '+ability.name;
      totalClassAbilities.push(ability);
    }

    for(let classAbil of totalClassAbilities){
        if(classAbil.selectType != 'SELECT_OPTION' && classAbil.level <= g_character.level) {

            let dontRunCode = classAbil.dontRunCode;
            if(dontRunCode == null) { dontRunCode = false; }

            if(!dontRunCode){
              processSheetCode(classAbil.code, {
                source: 'ClassAbility',
                sourceName: classAbil.name,
                abilityID: classAbil.id,
                abilityLevel: classAbil.level,
                selectType: classAbil.selectType,
              });
            }

            if(classAbil.selectType == "SELECTOR"){
                for(let classAbilChoice of g_classDetails.AbilityChoices){
                    if(classAbilChoice.SelectorID == classAbil.id){

                        let abilityOption = g_allClassAbilityOptions.find(ability => {
                            return ability.id == classAbilChoice.OptionID;
                        });
                        if(abilityOption != null){
                          if(!dontRunCode){
                            processSheetCode(abilityOption.code, {
                              source: 'ClassAbilityOption',
                              sourceName: abilityOption.name,
                              abilityID: abilityOption.id,
                              abilityLevel: abilityOption.level,
                            });
                          }
                        }
                        break;

                    }
                }
            }

        }
    }

    for(let phyFeat of g_phyFeatArray){
        if(phyFeat.value == null) { continue; }
        processSheetCode(phyFeat.value.code, {
          source: 'PhyFeat',
          sourceName: phyFeat.value.name,
          phyFeatID: phyFeat.value.id,
        });
    }
    
    if(g_heritage != null){
        processSheetCode(g_heritage.code, {
          source: 'Heritage',
          sourceName: g_heritage.name+' Heritage',
          heritageID: g_heritage.id,
        });
    }
    processSheetCode(g_background.code, {
      source: 'Background',
      sourceName: g_background.name+' Background',
      backgroundID: g_background.id,
    });


    for(const [featID, featStruct] of g_featMap.entries()){
      if(featStruct.Feat.isDefault == 1){
          processSheetCode(featStruct.Feat.code, {
            source: 'Feat',
            sourceName: featStruct.Feat.name,
            featID: featStruct.Feat.id,
          });
      }
    }

    // Sort selected feats by what defines variables to execute first.
    let sorted_featChoiceArray = g_featChoiceArray.sort(
      function(a, b) {
          if(a.value == null || b.value == null){
            return b.value != null ? 1 : -1;
          }

          if(a.value.code == null || b.value.code == null){
            return b.value.code != null ? 1 : -1;
          }

          let definesVarA = a.value.code.toUpperCase().includes('DEFINE-VARIABLE=');
          let definesVarB = b.value.code.toUpperCase().includes('DEFINE-VARIABLE=');
          if(definesVarA || definesVarB){
            return definesVarB ? 1 : -1;
          }

          return a.value.level - b.value.level;
      }
    );
    for(const feat of sorted_featChoiceArray){
      if(feat != null && feat.value != null){
          processSheetCode(feat.value.code, {
            source: 'Feat',
            sourceName: feat.value.name,
            featID: feat.value.id,
            srcStructKey: srcStructToCompositeKey(feat),
          });
      }
    }

}

function runAllSheetStateCode() {

  for(const sheetState of getSheetStates()){
    if(sheetState.isActive){
      processSheetCode(sheetState.code, {
        source: 'SheetState',
        sourceName: sheetState.name+' (toggled)',
        sheetStateID: sheetState.id,
      });
    }
  }

}

////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////// Other Profs //////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

function otherProfBuild(content, prof, name, otherProfsNum, profData, profSrcData, VARIABLE, extraData={}){

    if(profData.UserAdded){
        prof = '<span class="is-underlined-thin-darker">'+prof+'</span>';
    } else {
        prof = '<span>'+prof+'</span>';
    }

    if(profData.UserBonus != 0 || profData.UserProfOverride){
        prof += '<sup>*</sup>';
    }


    content.append(`
      <div id="otherProf${otherProfsNum}" class="cursor-clickable my-3">
        <div class="columns is-mobile text-overflow-ellipsis">
          <div class="column is-4 is-paddingless pr-1">
            <p class="is-size-8 is-italic has-text-right pt-1">${prof}-</p>
          </div>
          <div class="column is-8 is-paddingless">
            <p class="is-size-7 has-text-weight-bold has-text-left">${name}</p>
          </div>
        </div>
      </div>
    `);

    $("#otherProf"+otherProfsNum).click(function(){
        openQuickView('otherProfsView', {
            ProfSrcData : profSrcData,
            ProfData : profData,
            Name : name,
            ExtraData : extraData,
            VARIABLE: VARIABLE,
        });
    });

}

////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////// Rest /////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

function takeRest(){

    // Regen Health
    let conMod = getModOfValue('CON');
    if(1 > conMod){ conMod = 1; }
    let regenAmount = g_character.level*conMod;
    g_character.currentHealth += regenAmount;

    socket.emit("requestCurrentHitPointsSave",
        getCharIDFromURL(),
        g_character.currentHealth);
    sendOutUpdateToGM('hp', { value: g_character.currentHealth });

    // Regen Stamina and Resolve
    if(gOption_hasStamina){
      g_character.currentStamina = (Math.floor(g_classDetails.Class.hitPoints/2)+getModOfValue('CON'))*g_character.level;
      socket.emit("requestCurrentStaminaPointsSave",
          getCharIDFromURL(),
          g_character.currentStamina);
      sendOutUpdateToGM('stamina', { value: g_character.currentStamina });
  
      g_character.currentResolve = getModOfValue(g_classDetails.KeyAbility);
      socket.emit("requestCurrentResolvePointsSave",
          getCharIDFromURL(),
          g_character.currentResolve);
      sendOutUpdateToGM('resolve', { value: g_character.currentResolve });
    }

    // Reset Innate Spells
    for(let innateSpell of g_innateSpellArray){
        innateSpell.TimesCast = 0;
        socket.emit("requestInnateSpellCastingUpdate",
            innateSpell,
            0);
    }

    // Reset Focus Points
    for(let focusPointData of g_focusPointArray){
        focusPointData.value = 1;
        socket.emit("requestFocusPointUpdate",
            getCharIDFromURL(),
            focusPointData,
            focusPointData.value);
    }

    // Reset Spell Slots
    for(const [level, slotArray] of g_spellSlotsMap.entries()){
        for(let slot of slotArray){
            slot.used = false;
            socket.emit("requestSpellSlotUpdate",
                getCharIDFromURL(),
                slot);
        }
    }

    // Remove Fatigued Condition
    removeCondition(15); // Hardcoded ID - Fatigued

    // Decrease Drained Condition
    let drainedCondition = getCondition(10); // Hardcoded ID - Drained
    if(drainedCondition != null){
        let drainedValue = drainedCondition.Value - 1;
        if(drainedValue > 0){
            addCondition(10,
                drainedValue,
                drainedCondition.SourceText,
                drainedCondition.ParentID);
        } else {
            removeCondition(10);
        }
    }

    // Decrease Doomed Condition
    let doomedCondition = getCondition(9); // Hardcoded ID - Doomed
    if(doomedCondition != null){
        let doomedValue = doomedCondition.Value - 1;
        if(doomedValue > 0){
            addCondition(9,
                doomedValue,
                doomedCondition.SourceText,
                doomedCondition.ParentID);
        } else {
            removeCondition(9);
        }
    }

    reloadCharSheet();
    
}

////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////// Socket Returns ////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

socket.on("returnProfsAndSkills", function(profObject, skillObject){
    g_profMap = objToMap(profObject);
    g_skillMap = objToMap(skillObject);
    g_weaponProfMap = buildWeaponProfMap();
    g_armorProfMap = buildArmorProfMap();
    reloadCharSheet();
    closeQuickView();
});

socket.on("returnHeroPointsSave", function(){
});

socket.on("returnProficiencyChange", function(profChangePacket){
  socket.emit("requestProfsAndSkills",
      getCharIDFromURL());
});

socket.on("returnLoreChange", function(srcStruct, loreName, inputPacket, prof){
  socket.emit("requestProfsAndSkills",
      getCharIDFromURL());
});

socket.on("returnSpellSlotChange", function(spellSRC, spellSlot){
  if(spellSlot != null){ // Add Spell Slot
    let slotArray = g_spellSlotsMap.get(spellSRC);
    if(slotArray != null){
      slotArray.push(spellSlot);
      g_spellSlotsMap.set(spellSRC, slotArray);
    }
  }
  current_spellSRC = null;
  closeManageSpellsModal();
  reloadCharSheet();
  closeQuickView();
});

socket.on("returnLanguageChange", function(){
  g_langArray = g_langArray.sort(
    function(a, b) {
      if(a.value != null && b.value != null){
        return a.value.name > b.value.name ? 1 : -1;
      } else {
        return 1;
      }
    }
  );
  reloadCharSheet();
  closeQuickView();
});

socket.on("returnResistanceChange", function(resistData){
  if(resistData.Added){ // Add Resist
    g_resistAndVulners.Resistances.push(resistData);
  } else {
    let newResistArray = []; // Remove Resist
    for(let resists of g_resistAndVulners.Resistances){
      if(!hasSameSrc(resists, resistData)){
        newResistArray.push(resists);
      }
    }
    g_resistAndVulners.Resistances = newResistArray;
  }
  closeQuickView();
  reloadCharSheet();
});

socket.on("returnVulnerabilityChange", function(vulnerData){
  if(vulnerData.Added){ // Add Weakness
    g_resistAndVulners.Vulnerabilities.push(vulnerData);
  } else {
    let newVulnerArray = []; // Remove Weakness
    for(let vulners of g_resistAndVulners.Vulnerabilities){
      if(!hasSameSrc(vulners, vulnerData)){
        newVulnerArray.push(vulners);
      }
    }
    g_resistAndVulners.Vulnerabilities = newVulnerArray;
  }
  closeQuickView();
  reloadCharSheet();
});

socket.on("returnAddFundamentalRune", function(invItemID, invStruct){
    $('#invItemAddFundamentalRuneButton'+invItemID).removeClass('is-loading');
    g_invStruct = invStruct;
    reloadCharSheet();
    closeQuickView();
});

socket.on("returnAddItemToInv", function(item, invItem, invStruct){
    $('#addItemAddItem'+item.id).parent().removeClass('is-loading');
    $('#addItemAddItem'+item.id).removeClass('is-loading');
    $('#createCustomItemBtn').removeClass('is-loading');
    g_invStruct = invStruct;
    processDefaultItemRuneSheetCode(item.code, item.id, invItem.id);
    reloadCharSheet();
});

socket.on("returnRemoveItemFromInv", function(invItemID, invStruct){
    $('#invItemRemoveButton'+invItemID).removeClass('is-loading');
    g_invStruct = invStruct;
    reloadCharSheet();
    closeQuickView();
});

socket.on("returnInvItemMoveBag", function(invItemID, invStruct){
    $('#invItemMoveSelect'+invItemID).removeClass('is-loading');
    g_invStruct = invStruct;
    reloadCharSheet();
    closeQuickView();
});

socket.on("returnAddItemToBag", function(){
    // Reloads inventory manually after some time.
});

socket.on("returnInvItemUpdated", function(invStruct){
    g_invStruct = invStruct;
    reloadCharSheet();
    closeQuickView();
});

socket.on("returnInvUpdate", function(invStruct){
    g_invStruct = invStruct;
    reloadCharSheet();
});

////

socket.on("returnNotesFieldChange", function(newNotesData, noteChangePacket) {
  let newNoteData = {
    charID: getCharIDFromURL(),
    placeholderText: newNotesData.placeholderText,
    source: 'notesField',
    sourceCode: newNotesData.sourceCode,
    sourceCodeSNum: newNotesData.sourceCodeSNum,
    sourceLevel: newNotesData.sourceLevel,
    sourceType: newNotesData.sourceType,
    value: newNotesData.value,
    text: '',
  };
  let existingNoteData = g_notesFields.find(noteData => {
    return hasSameSrc(noteData, newNoteData);
  });
  if(existingNoteData == null){
    g_notesFields.push(newNoteData);
  }
});

socket.on("returnNotesFieldDelete", function(srcStruct) {
  let newNotesFieldArray = [];
  for(let notesData of g_notesFields){
      if(srcStruct.sourceCode === notesData.sourceCode &&
              srcStruct.sourceCodeSNum === notesData.sourceCodeSNum){
      } else {
          newNotesFieldArray.push(notesData);
      }
  }
  g_notesFields = newNotesFieldArray;
});