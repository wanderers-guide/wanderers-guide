/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

// ========================================================================================= //
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Wanderer's Guide Code ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
// ========================================================================================= //

let supportedWebLinks = [
    {Website: '2e.aonprd.com', Title: 'Archives of Nethys - 2e'},
    {Website: 'pf2.easytool.es', Title: 'PF2 EasyTool'},
    {Website: 'pf2easy.com', Title: 'PF2 EasyTool'},
    {Website: 'pathfinder2.dragonlash.com', Title: 'Dragonlash - 2e'},
    {Website: 'pf2srd.com', Title: 'PF2SRD'},
    {Website: 'pf2.d20pfsrd.com', Title: 'Pf2 Srd'},
    {Website: 'youtube.com', Title: 'YouTube'},
    {Website: 'paizo.com', Title: 'Paizo'},
];

let textProcess_warningOnUnknown = false;
function textProcess_canIndex(dataCollection){
   return (typeof dataCollection !== 'undefined' && dataCollection != null);
}

const regexFeatLinkExt = /\((Feat|Ability|Action|Activity):(lvl-([\-0-9]+):|type-([a-z]+):|)\s*([^(:]+?)\s*\|\s*(.+?)\s*\)/ig;
const regexFeatLink = /\((Feat|Ability|Action|Activity):(lvl-([\-0-9]+):|type-([a-z]+):|)\s*([^(:]+?)\s*\)/ig;
const regexItemLinkExt = /\((Item):\s*([^(:]+?)\s*\|\s*(.+?)\s*\)/ig;
const regexItemLink = /\((Item):\s*([^(:]+?)\s*\)/ig;
const regexSpellLinkExt = /\((Spell):\s*([^(:]+?)\s*\|\s*(.+?)\s*\)/ig;
const regexSpellLink = /\((Spell):\s*([^(:]+?)\s*\)/ig;
const regexLanguageLinkExt = /\((Language):\s*([^(:]+?)\s*\|\s*(.+?)\s*\)/ig;
const regexLanguageLink = /\((Language):\s*([^(:]+?)\s*\)/ig;
const regexTraitLinkExt = /\((Trait):\s*([^(:]+?)\s*\|\s*(.+?)\s*\)/ig;
const regexTraitLink = /\((Trait):\s*([^(:]+?)\s*\)/ig;

/*
Optional Requirements:
  - g_allConditions
  - g_allLanguages
  - g_allTags
  - g_featMap
  - g_itemMap
  - g_spellMap
*/
let temp_textProcess_j = '';
let temp_textProcess_s = '';

function processText(text, isSheet, isJustified = false, size = 'MEDIUM', indexConditions = true) {
    if(text == null) {return text;}

    let _j;
    if(isJustified == null){
        _j = ' has-text-center-justified ';
    } else {
        _j = (isJustified) ? ' has-text-justified ' : '';
    }
    let _s = '';

    let _incS = '';
    switch(size) {
        case 'SMALL':
            _s = ' is-size-7 '; _incS = ' is-size-6 '; break;
        case 'MEDIUM':
            _s = ' is-size-6 '; _incS = ' is-size-5 '; break;
        case 'LARGE':
            _s = ' is-size-5 '; _incS = ' is-size-4 '; break;
        default:
            break;
    }

    temp_textProcess_j = _j;
    temp_textProcess_s = _s;

    // Replace dice notation with roll button
    if(typeof gOption_hasDiceRoller !== 'undefined' && gOption_hasDiceRoller){
      text = processDiceNotation(text);
      refreshDiceNotationButtons();
    }

    //////////////////////////////

    // Stage cleaner detection (creates tables that are then processed)
    text = text.replace(/(\*\*|)Stage (\d+)(\*\*|) ([^;\n]+.|$)/gm, handleStages);

    // Table detection comes before most, to prevent HTML from existing
    text = text.replace(regexTableDetection, handleTableCreation);

    // Wrap in a paragraph
    if(text.startsWith('<p') && text.endsWith('</p>')){
      // Don't wrap if already wrapped
    } else {
      text = '<p class="p-1 pl-2 '+_j+_s+'">'+text+'</p>';
    }

    // ---- - Makes horizontal divider
    text = text.replace(/\n\s*\-\-\-\-/g, '<hr class="m-1">');

    // ***word*** - Makes word bigger and bold
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="is-bold-very'+_incS+'">$1</strong>');

    // **word** - Makes word bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="is-bold">$1</strong>');

    // ^^word^^ - Makes word superscript
    text = text.replace(/\^\^(.+?)\^\^/g, '<sup>$1</sup>');

    // __word__ - Makes word italicized
    text = text.replace(/\_\_(.+?)\_\_/g, '<em>$1</em>');

    // $$grey:word$$ - Makes word italicized
    //text = text.replace(/\$\$grey:(.+?)\$\$/gi, '<span class="has-txt-noted is-italic">$1</span>');

    // ~~word~~ - Makes word strikethrough
    text = text.replace(/\~\~(.+?)\~\~/g, '<s>$1</s>');

    // ~ Some Text Here: Other Text
    let regexNonBulletList = /[\n]?\~ (.*?)\:/g;
    text = text.replace(regexNonBulletList, '</p><p class="pl-2 pr-1 negative-indent has-text-left '+_s+'"><strong class="is-bold">$1</strong>');

    // * Some Text Here: Other Text
    let regexBulletList = /[\n]?\* (.*?)\:/g;
    text = text.replace(regexBulletList, '</p><p class="pl-2 pr-1 negative-indent has-text-left '+_s+'">&#x2022;<strong class="is-bold">$1</strong>');

    // :> Some Text
    let regexNonBulletSpacedList = /[\n]?\:\> /g;
    text = text.replace(regexNonBulletSpacedList, '</p><p class="pl-4 ml-1 pr-1 has-text-left '+_s+'">');

    // \n -> Newline
    text = text.replace(/\n/g, '</p><p class="p-1 pl-2 '+_j+_s+'">');

    // Website Link - [URL]
    let regexURL = /\[(.+?)\]/g;
    text = text.replace(regexURL, handleLink);

    // Sheet variables & tooltips
    // {WIS_MOD} -> Character Wisdom Modifier (unsigned)
    // {WIS_MOD|Wisdom Modifier} -> Character Wisdom Modifier (unsigned). Can hover over to reveal text.
    // {+WIS_MOD} ->  Character Wisdom Modifier (signed)
    let regexSheetVariables = /\{(.+?)\}/g;
    text = text.replace(regexSheetVariables, handleSheetVariablesAndTooltips);

    // (Feat: Striking | Strike)
    // Optional (Feat:lvl-0: Quick Alchemies | Quick Alchemy)
    // or
    // Optional (Feat:type-companion: Quick Alchemies | Quick Alchemy)
    if(typeof g_featMap !== 'undefined' && g_featMap != null) {
        text = text.replace(regexFeatLinkExt, handleFeatLinkExt);
    } else {
        text = text.replace(regexFeatLinkExt, '<span class="is-underlined-warning">$5</span>');
    }

    // (Feat: Strike)
    // Optional (Feat:lvl-0: Quick Alchemy)
    // or
    // Optional (Feat:type-companion: Quick Alchemy)
    if(typeof g_featMap !== 'undefined' && g_featMap != null) {
        text = text.replace(regexFeatLink, handleFeatLink);
    } else {
        text = text.replace(regexFeatLink, '<span class="is-underlined-warning">$5</span>');
    }

    // (Item: Striking | Strike)
    if(typeof g_itemMap !== 'undefined' && g_itemMap != null) {
        text = text.replace(regexItemLinkExt, handleItemLinkExt);
    } else {
        text = text.replace(regexItemLinkExt, '<span class="is-underlined-warning">$2</span>');
    }

    // (Item: Strike)
    if(typeof g_itemMap !== 'undefined' && g_itemMap != null) {
        text = text.replace(regexItemLink, handleItemLink);
    } else {
        text = text.replace(regexItemLink, '<span class="is-underlined-warning">$2</span>');
    }

    // (Spell: Striking | Strike)
    if(typeof g_spellMap !== 'undefined' && g_spellMap != null) {
        text = text.replace(regexSpellLinkExt, handleSpellLinkExt);
    } else {
        text = text.replace(regexSpellLinkExt, '<span class="is-underlined-warning">$2</span>');
    }

    // (Spell: Strike)
    if(typeof g_spellMap !== 'undefined' && g_spellMap != null) {
        text = text.replace(regexSpellLink, handleSpellLink);
    } else {
        text = text.replace(regexSpellLink, '<span class="is-underlined-warning">$2</span>');
    }

    // (Language: Gnomish-like | Gnomish)
    if(typeof g_allLanguages !== 'undefined' && g_allLanguages != null) {
        text = text.replace(regexLanguageLinkExt, handleLanguageLinkExt);
    } else {
        text = text.replace(regexLanguageLinkExt, '<span class="is-underlined-warning">$2</span>');
    }

    // (Language: Gnomish)
    if(typeof g_allLanguages !== 'undefined' && g_allLanguages != null) {
        text = text.replace(regexLanguageLink, handleLanguageLink);
    } else {
        text = text.replace(regexLanguageLink, '<span class="is-underlined-warning">$2</span>');
    }

    // (Trait: Infusing | Infused)
    if(typeof g_allTags !== 'undefined' && g_allTags != null) {
        text = text.replace(regexTraitLinkExt, handleTraitLinkExt);
    } else {
        text = text.replace(regexTraitLinkExt, '<span class="is-underlined-warning">$2</span>');
    }

    // (Trait: Infused)
    if(typeof g_allTags !== 'undefined' && g_allTags != null) {
        text = text.replace(regexTraitLink, handleTraitLink);
    } else {
        text = text.replace(regexTraitLink, '<span class="is-underlined-warning">$2</span>');
    }

    // Conditions Search and Replace
    if(typeof g_allConditions !== 'undefined' && g_allConditions != null && indexConditions) {
        text = handleIndexConditions(text);
    }

    // FREE-ACTION
    // REACTION
    // ONE-ACTION
    // TWO-ACTIONS
    // THREE-ACTIONS
    text = text.replace(/FREE-ACTION/g, '<span class="pf-icon">[free-action]</span>');
    text = text.replace(/REACTION/g, '<span class="pf-icon">[reaction]</span>');
    text = text.replace(/ONE-ACTION/g, '<span class="pf-icon">[one-action]</span>');
    text = text.replace(/TWO-ACTIONS/g, '<span class="pf-icon">[two-actions]</span>');
    text = text.replace(/THREE-ACTIONS/g, '<span class="pf-icon">[three-actions]</span>');


    // Critical Success:text
    // Success:text
    // Failure:text
    // Critical Failure:text
    text = text.replace('Critical Success:','</p><p class="pl-2 pr-1 negative-indent has-text-left '+_s+'"><strong class="is-bold">Critical Success</strong>');
    text = text.replace('Success:','</p><p class="pl-2 pr-1 negative-indent has-text-left '+_s+'"><strong class="is-bold">Success</strong>');
    text = text.replace('Critical Failure:','</p><p class="pl-2 pr-1 negative-indent has-text-left '+_s+'"><strong class="is-bold">Critical Failure</strong>');
    text = text.replace('Failure:','</p><p class="pl-2 pr-1 negative-indent has-text-left '+_s+'"><strong class="is-bold">Failure</strong>');

    // page ### -> Core Rulebook Link
    let regexCoreRules = /page\s+(\d+)/g;
    text = text.replace(regexCoreRules, '<a href="https://paizo.com/products/btq01zp3?Pathfinder-Core-Rulebook" target="_blank" class="external-link">page $1</a>');

    // Bestiary pg. ### -> Bestiary Link
    let regexBestiary = /Bestiary pg\.\s+(\d+)/g;
    text = text.replace(regexBestiary, '<a href="https://paizo.com/products/btq01zp4?Pathfinder-Bestiary" target="_blank" class="external-link">Bestiary $1</a>');

    // Clean up any random spaces that were created...
    text = text.replaceAll('<p class="p-1 pl-2 '+_j+_s+'"></p>', '');

    return text;

}

function processTextRemoveIndexing(text) {
  if(text == null) {return text;}

  // ~ : Some Text
  let regexNonBullet = /\~\s*:/g;
  text = text.replace(regexNonBullet, '');

  // * : Some Text
  let regexBullet = /\*\s*:/g;
  text = text.replace(regexBullet, '&#8226;');

  // :> Some Text
  let regexNonBulletSpaced = /:\>/g;
  text = text.replace(regexNonBulletSpaced, '');



  // (Feat: Striking | Strike)
  // Optional (Feat:lvl-0: Quick Alchemies | Quick Alchemy)
  // or
  // Optional (Feat:type-companion: Quick Alchemies | Quick Alchemy)
  let regexFeatLinkExt = /\((Feat|Ability|Action|Activity):(lvl-([\-0-9]+):|type-([a-z]+):|)\s*([^(:]+?)\s*\|\s*(.+?)\s*\)/ig;
  text = text.replace(regexFeatLinkExt, '$4');

  // (Feat: Strike)
  // Optional (Feat:lvl-0: Quick Alchemy)
  // or
  // Optional (Feat:type-companion: Quick Alchemy)
  let regexFeatLink = /\((Feat|Ability|Action|Activity):(lvl-([\-0-9]+):|type-([a-z]+):|)\s*([^(:]+?)\s*\)/ig;
  text = text.replace(regexFeatLink, '$4');

  // (Item: Striking | Strike)
  let regexItemLinkExt = /\((Item):\s*([^(:]+?)\s*\|\s*(.+?)\s*\)/ig;
  text = text.replace(regexItemLinkExt, '$2');

  // (Item: Strike)
  let regexItemLink = /\((Item):\s*([^(:]+?)\s*\)/ig;
  text = text.replace(regexItemLink, '$2');

  // (Spell: Striking | Strike)
  let regexSpellLinkExt = /\((Spell):\s*([^(:]+?)\s*\|\s*(.+?)\s*\)/ig;
  text = text.replace(regexSpellLinkExt, '$2');

  // (Spell: Strike)
  let regexSpellLink = /\((Spell):\s*([^(:]+?)\s*\)/ig;
  text = text.replace(regexSpellLink, '$2');

  // (Language: Gnomish-like | Gnomish)
  let regexLanguageLinkExt = /\((Language):\s*([^(:]+?)\s*\|\s*(.+?)\s*\)/ig;
  text = text.replace(regexLanguageLinkExt, '$2');

  // (Language: Gnomish)
  let regexLanguageLink = /\((Language):\s*([^(:]+?)\s*\)/ig;
  text = text.replace(regexLanguageLink, '$2');

  // (Trait: Infusing | Infused)
  let regexTraitLinkExt = /\((Trait):\s*([^(:]+?)\s*\|\s*(.+?)\s*\)/ig;
  text = text.replace(regexTraitLinkExt, '$2');

  // (Trait: Infused)
  let regexTraitLink = /\((Trait):\s*([^(:]+?)\s*\)/ig;
  text = text.replace(regexTraitLink, '$2');

  return text;
}

/////

const regexTableDetection = /((^((.+)\|(.+))$)(\n|$)){3,}/igm;
function handleTableCreation(match) {

  let rows = match.split(/\n/);

  // Verify table
  let validTable = true;
  let prevColumnNum = -1;
  for (let i = 0; i < rows.length; i++) {
    let row = rows[i];
    if(row == '') { continue; }

    // Check alignment row
    if(i == 1){
      let columns = row.split(/\|/g);
      for(let column of columns){
        let columnTrimmed = column.trim();
        if(columnTrimmed != ':--' && columnTrimmed != ':-:' && columnTrimmed != '--:'){
          validTable = false;
          break;
        }
      }
    }

    let columnNum = row.split(/\|/g).length;
    if(prevColumnNum != -1){
      if(prevColumnNum != columnNum){
        validTable = false;
        break;
      }
    } else {
      prevColumnNum = columnNum;
    }
  }
  if(prevColumnNum == -1){
    validTable = false;
  }

  if(!validTable){
    return match;
  }

  // Construct table
  let tableAlignMap = new Map();
  let tableHTML = '</p><div class="wsc-table-container use-custom-scrollbar is-darker"><table class="wsc-table table-bck">';
  for (let i = 0; i < rows.length; i++) {
    let row = rows[i];
    if(row == '') { continue; }

    let columns = row.split(/\|/g);

    if(i == 1){

      tableAlignMap.clear();
      for (let j = 0; j < columns.length; j++) {
        let column = columns[j].trim();
        if(column == ':--'){
          tableAlignMap.set(j, 'has-text-left');
        } else if(column == ':-:'){
          tableAlignMap.set(j, 'has-text-centered');
        } else if(column == '--:'){
          tableAlignMap.set(j, 'has-text-right');
        }
      }

    }

    if(i == 0){
      
      tableHTML += '<tr class="">';
      for (let j = 0; j < columns.length; j++) {
        let column = columns[j].trim();
        tableHTML += '<th class="wsc-th has-text-centered p-1 is-bold" style="color: #b9b9b9;">'+column+'</th>';
      }
      tableHTML += '</tr>';

    } else if(i != 1) {

      let rowBackgroundClass = (i % 2 == 0) ? 'table-row-a' : 'table-row-b';
      tableHTML += '<tr class="'+rowBackgroundClass+'">';
      for (let j = 0; j < columns.length; j++) {
        let column = columns[j].trim();
        let textAlignClass = tableAlignMap.get(j);
        tableHTML += '<td class="wsc-td px-2 py-1 has-txt-listing '+textAlignClass+'">'+column+'</td>';
      }
      tableHTML += '</tr>';

    }

  }
  tableHTML += '</table></div><p class="p-1 pl-2 '+temp_textProcess_j+temp_textProcess_s+'">';

  return tableHTML;
}

/////

function handleFeatLink(match, linkName, limitation, limitLvl, limitType, innerTextName) {
    return handleFeatLinkExt(match, linkName, limitation, limitLvl, limitType, innerTextName, innerTextName);
}

function handleFeatLinkExt(match, linkName, limitation, limitLvl, limitType, innerTextDisplay, innerTextName) {

    let isLevelLimit = limitation.toLowerCase().startsWith('lvl-');
    let isTypeLimit = limitation.toLowerCase().startsWith('type-');
    let requiredType = null;
    if(isTypeLimit){
      switch(limitType.toLowerCase()) {
        case 'general': requiredType = 'GENERAL-FEAT'; break;
        case 'skill': requiredType = 'SKILL-FEAT'; break;
        case 'class': requiredType = 'CLASS-FEAT'; break;
        case 'ancestry': requiredType = 'ANCESTRY-FEAT'; break;
        case 'archetype': requiredType = 'ARCHETYPE-FEAT'; break;
        case 'basic': requiredType = 'BASIC-ACTION'; break;
        case 'skillaction': requiredType = 'SKILL-ACTION'; break;
        case 'creature': requiredType = 'CREATURE-ACTION'; break;
        case 'companion': requiredType = 'COMPANION-ACTION'; break;

        case 'feat': requiredType = 'IS-FEAT'; break;
        case 'action': requiredType = 'IS-ACTION'; break;
        default: break;
      }
    }

    let innerTextNameUpper = innerTextName.replace(/’/g,'\'').toUpperCase();
    for(const [featID, featStruct] of g_featMap.entries()){

        if(isLevelLimit){
          if(featStruct.Feat.level != limitLvl) { continue; }
        } else if(isTypeLimit){
          if(requiredType == 'IS-FEAT'){
            if(featStruct.Feat.genericType != null && !featStruct.Feat.genericType.endsWith('-FEAT')) { continue; }
          } else if(requiredType == 'IS-ACTION'){
            if(featStruct.Feat.genericType == null || !featStruct.Feat.genericType.endsWith('-ACTION')) { continue; }
          } else {
            if(featStruct.Feat.genericType != requiredType) { continue; }
          }
        }

        let featName = featStruct.Feat.name.toUpperCase();
        if(innerTextNameUpper === featName && featStruct.Feat.isArchived == 0) {
            let featLinkClass = 'featTextLink'+featStruct.Feat.id;
            let featLinkText = '<span class="'+featLinkClass+' has-text-info-lighter cursor-clickable">'+innerTextDisplay+'</span>';
            setTimeout(function() {
                $('.'+featLinkClass).off('click');
                $('.'+featLinkClass).click(function(event){
                    if($('#quickviewDefault').hasClass('is-active')) { event.stopImmediatePropagation(); }
                    openQuickView('featView', {
                        Feat : featStruct.Feat,
                        Tags : featStruct.Tags,
                        _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
                    }, $('#quickviewDefault').hasClass('is-active'));
                });
            }, 100);
            return featLinkText;
        }
    }
    if(typeof isFeatHidden === "function" && isFeatHidden(innerTextNameUpper)){
        return innerTextName;
    } else {
        if(textProcess_warningOnUnknown) {
          return '<span class="is-underlined-warning">'+innerTextDisplay+'</span>';
        } else {
          return '<span class="has-text-danger">Unknown '+capitalizeWord(linkName)+'</span>';
        }
    }
}


function handleItemLink(match, linkName, innerTextName) {
    return handleItemLinkExt(match, linkName, innerTextName, innerTextName);
}

function handleItemLinkExt(match, linkName, innerTextDisplay, innerTextName) {
    innerTextName = innerTextName.replace(/’/g,'\'').toUpperCase();
    for(const [itemID, itemDataStruct] of g_itemMap.entries()){
        let itemName = itemDataStruct.Item.name.replace(/[\(\)]/g,'').toUpperCase();
        if(innerTextName === itemName && itemDataStruct.Item.isArchived == 0) {
            let itemLinkClass = 'itemTextLink'+itemDataStruct.Item.id;
            let itemLinkText = '<span class="'+itemLinkClass+' has-text-info-lighter cursor-clickable">'+innerTextDisplay+'</span>';
            setTimeout(function() {
                $('.'+itemLinkClass).off('click');
                $('.'+itemLinkClass).click(function(event){
                    if($('#quickviewDefault').hasClass('is-active')) { event.stopImmediatePropagation(); }
                    openQuickView('itemView', {
                        ItemDataStruct : itemDataStruct,
                        _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
                    }, $('#quickviewDefault').hasClass('is-active'));
                });
            }, 100);
            return itemLinkText;
        }
    }
    if(textProcess_warningOnUnknown) {
      return '<span class="is-underlined-warning">'+innerTextDisplay+'</span>';
    } else {
      return '<span class="has-text-danger">Unknown Item</span>';
    }
}


function handleSpellLink(match, linkName, innerTextName) {
    return handleSpellLinkExt(match, linkName, innerTextName, innerTextName);
}

function handleSpellLinkExt(match, linkName, innerTextDisplay, innerTextName) {
    innerTextName = innerTextName.replace(/’/g,'\'').toUpperCase();
    for(const [spellID, spellDataStruct] of g_spellMap.entries()){
        let spellName = spellDataStruct.Spell.name.toUpperCase();
        if(innerTextName === spellName && spellDataStruct.Spell.isArchived == 0) {
            let spellLinkClass = 'spellTextLink'+spellDataStruct.Spell.id;
            let spellLinkText = '<span class="'+spellLinkClass+' has-text-info-lighter is-italic cursor-clickable">'+innerTextDisplay+'</span>';
            setTimeout(function() {
                $('.'+spellLinkClass).off('click');
                $('.'+spellLinkClass).click(function(event){
                    if($('#quickviewDefault').hasClass('is-active')) { event.stopImmediatePropagation(); }
                    openQuickView('spellView', {
                        SpellDataStruct: spellDataStruct,
                        _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
                    }, $('#quickviewDefault').hasClass('is-active'));
                });
            }, 100);
            return spellLinkText;
        }
    }
    if(textProcess_warningOnUnknown) {
      return '<span class="is-underlined-warning">'+innerTextDisplay+'</span>';
    } else {
      return '<span class="has-text-danger">Unknown Spell</span>';
    }
}


function handleLanguageLink(match, linkName, innerTextName) {
    return handleLanguageLinkExt(match, linkName, innerTextName, innerTextName);
}

function handleLanguageLinkExt(match, linkName, innerTextDisplay, innerTextName) {
    innerTextName = innerTextName.replace(/’/g,'\'').toUpperCase();
    for(const language of g_allLanguages){
        let langName = language.name.toUpperCase();
        if(innerTextName === langName) {
            let langLinkClass = 'langTextLink'+language.id;
            let langLinkText = '<span class="'+langLinkClass+' has-text-info-lighter cursor-clickable">'+innerTextDisplay+'</span>';
            setTimeout(function() {
                $('.'+langLinkClass).off('click');
                $('.'+langLinkClass).click(function(event){
                    if($('#quickviewDefault').hasClass('is-active')) { event.stopImmediatePropagation(); }
                    openQuickView('languageView', {
                        Language : language,
                        _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
                    }, $('#quickviewDefault').hasClass('is-active'));
                });
            }, 100);
            return langLinkText;
        }
    }
    if(textProcess_warningOnUnknown) {
      return '<span class="is-underlined-warning">'+innerTextDisplay+'</span>';
    } else {
      return '<span class="has-text-danger">Unknown Language</span>';
    }
}


function handleTraitLink(match, linkName, innerTextName) {
    return handleTraitLinkExt(match, linkName, innerTextName, innerTextName);
}

function handleTraitLinkExt(match, linkName, innerTextDisplay, innerTextName) {
    let traitLinkClass = 'traitTextLink'+(innerTextName.replace(/[' ]/g, ''));
    let traitLinkText = '<span class="'+traitLinkClass+' is-underlined-info cursor-clickable">'+innerTextDisplay+'</span>';
    setTimeout(function() {
        $('.'+traitLinkClass).off('click');
        $('.'+traitLinkClass).click(function(){
            openQuickView('tagView', {
                TagName : innerTextName,
                _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
            }, $('#quickviewDefault').hasClass('is-active'));
        });
    }, 100);
    return traitLinkText;
}

/////

function handleIndexConditions(text){
    for(const condition of g_allConditions){
        let conditionName = condition.name.toLowerCase();
        let conditionLinkClass = 'conditionTextLink'+conditionName.replace(/ /g,'-');
        let conditionLinkText = ' <span class="'+conditionLinkClass+' is-underlined-info cursor-clickable">'+conditionName+'</span>';
        let conditionNameRegex = new RegExp('(\\W|^)'+conditionName, "g");
        text = text.replace(conditionNameRegex, '$1'+conditionLinkText);
        setTimeout(function() {
            $('.'+conditionLinkClass).off('click');
            $('.'+conditionLinkClass).click(function(event){
                if($('#quickviewDefault').hasClass('is-active')) { event.stopImmediatePropagation(); }
                openQuickView('conditionView', {
                    Condition : condition,
                    _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
                }, $('#quickviewDefault').hasClass('is-active'));
            });
        }, 100);
    }
    return text;
}

/////

// Stages Cleaner
function handleStages(match, boldOne, stageNum, boldTwo, text){
  text = text.trim();
  if(text.endsWith(';')){ text = text.slice(0, -1); }

  let tableText = '';
  if(stageNum == 1){
    tableText = '\nStage|Effect\n:-:|:--';
  }
  tableText += `\n**${stageNum}**|${text}`;

  return tableText;
}

/////

function handleLink(match, innerTextURL) {
    let urlObj = null;
    try {
        urlObj = new URL(innerTextURL);
    } catch(err) {
        //displayError("Invalid URL: \'"+innerTextURL+"\'");
        return '['+innerTextURL+']';
    }
    let websiteName = urlObj.hostname;
    if(websiteName.startsWith('www.')){ websiteName = websiteName.substring(4); }
    let foundWebsite = supportedWebLinks.find(website => {
        return website.Website == websiteName;
    });
    if(foundWebsite != null){
        return '<a href="'+urlObj.href+'" target="_blank" rel="external" class="has-tooltip-top" data-tooltip="'+foundWebsite.Title+' Link"><img width="16" height="16" src="https://www.google.com/s2/favicons?domain='+foundWebsite.Website+'"></img></a>';
    } else {
        return '['+innerTextURL+']';
    }
}


/////////////// SHEET VARIABLES & TOOLTIPS ///////////////
function processTextOnlyVariablesAndTooltips(text){
  if(text == null){ return null; }

  let regexSheetVariables = /\{(.+?)\}/g;
  text = text.replace(regexSheetVariables, handleSheetVariablesAndTooltips);

  return text;
}

function handleSheetVariablesAndTooltips(match, innerText){
    if(innerText.includes("|")){
        let innerTextData = innerText.split("|");
        innerTextVariable = innerTextData[0].replace(/\s/g, "").toUpperCase();

        let sheetVar = null;
        if(isSheetPage()){
          sheetVar = acquireSheetVariable(innerTextVariable);
        }
        if(sheetVar == null && typeof g_variableMap !== 'undefined'){
          let varValue = getVariableValue(innerTextVariable, false);
          if(varValue != 'Error'){ sheetVar = varValue; }
        }
        if(sheetVar == null){ sheetVar = innerTextData[0]; }

        let bulmaColor = 'has-text-info';
        if(typeof sheetVar === "string"){
          if(sheetVar.toUpperCase().startsWith('NORMAL:')){
            bulmaColor = '';
            sheetVar = sheetVar.replace(/NORMAL:/i, '');
          } else if(sheetVar.toUpperCase().startsWith('BLUE:')){
            bulmaColor = 'has-text-info';
            sheetVar = sheetVar.replace(/BLUE:/i, '');
          } else if(sheetVar.toUpperCase().startsWith('GREEN:')){
            bulmaColor = 'has-text-success';
            sheetVar = sheetVar.replace(/GREEN:/i, '');
          } else if(sheetVar.toUpperCase().startsWith('CYAN:')){
            bulmaColor = 'has-text-cyan';
            sheetVar = sheetVar.replace(/CYAN:/i, '');
          } else if(sheetVar.toUpperCase().startsWith('RED:')){
            bulmaColor = 'has-text-danger';
            sheetVar = sheetVar.replace(/RED:/i, '');
          } else if(sheetVar.toUpperCase().startsWith('YELLOW:')){
            bulmaColor = 'has-text-warning';
            sheetVar = sheetVar.replace(/YELLOW:/i, '');
          }
          else if(sheetVar.toUpperCase().startsWith('BLUE_UNDERLINE:')){
            bulmaColor = 'is-underlined-info';
            sheetVar = sheetVar.replace(/BLUE_UNDERLINE:/i, '');
          } else if(sheetVar.toUpperCase().startsWith('GREEN_UNDERLINE:')){
            bulmaColor = 'is-underlined-success';
            sheetVar = sheetVar.replace(/GREEN_UNDERLINE:/i, '');
          } else if(sheetVar.toUpperCase().startsWith('CYAN_UNDERLINE:')){
            bulmaColor = 'is-underlined-cyan';
            sheetVar = sheetVar.replace(/CYAN_UNDERLINE:/i, '');
          } else if(sheetVar.toUpperCase().startsWith('RED_UNDERLINE:')){
            bulmaColor = 'is-underlined-danger';
            sheetVar = sheetVar.replace(/RED_UNDERLINE:/i, '');
          } else if(sheetVar.toUpperCase().startsWith('YELLOW_UNDERLINE:')){
            bulmaColor = 'is-underlined-warning';
            sheetVar = sheetVar.replace(/YELLOW_UNDERLINE:/i, '');
          }
        }
        return '<a class="'+bulmaColor+' has-tooltip-top" data-tooltip="'+innerTextData[1]+'">'+sheetVar+'</a>';
    } else {
      if(isSheetPage() || typeof g_variableMap !== 'undefined'){
        innerText = innerText.replace(/\s/g, "").toUpperCase();
        let sheetVar = null;
        if(isSheetPage()) {
          sheetVar = acquireSheetVariable(innerText);
        }
        if(sheetVar == null && typeof g_variableMap !== 'undefined'){
          let varValue = getVariableValue(innerText, false);
          if(varValue != 'Error'){ sheetVar = varValue; }
        }
        sheetVar = (sheetVar != null) ? sheetVar : '<span class="has-text-danger has-tooltip-top" data-tooltip="'+innerText+'">Unknown Variable</span>';
        return '<span class="has-text-info">'+sheetVar+'</span>';
      } else {
        return innerText;
      }
    }
}

// Old system, really need to replace getStatTotal() with getVariableValue()
function acquireSheetVariable(variableName){
    if(variableName.charAt(0) === '+') {
        variableName = variableName.substring(1);
        if(variableName.slice(-3) === "_DC") {
            variableName = variableName.slice(0, -3);
            return signNumber(getStatTotal(variableName, false)+10);
        } else if(variableName.slice(-4) === "_MOD") {
            variableName = variableName.slice(0, -4);
            return signNumber(getModOfValue(variableName, false));
        } else {
            return null;
        }
    } else {
        if(variableName.slice(-3) === "_DC") {
            variableName = variableName.slice(0, -3);
            return getStatTotal(variableName, false)+10;
        } else if(variableName.slice(-4) === "_MOD") {
            variableName = variableName.slice(0, -4);
            return getModOfValue(variableName, false);
        } else {
            return null;
        }
    }
}

function processTextBakeSheetVariables(text){
  if(text == null){ return null; }

  let handleVariables = function(match, innerText){
    if(innerText.includes("|")){
        let innerTextData = innerText.split("|");
        innerTextVariable = innerTextData[0].replace(/\s/g, "").toUpperCase();
        let sheetVar = acquireSheetVariable(innerTextVariable);
        if(sheetVar == null){ return match; }
        return sheetVar;
    } else {
        innerText = innerText.replace(/\s/g, "").toUpperCase();
        let sheetVar = acquireSheetVariable(innerText);
        if(sheetVar == null){ return match; }
        return sheetVar;
    }
  };

  const regexSheetVariables = /\{(.+?)\}/g;
  text = text.replace(regexSheetVariables, handleVariables);

  return text;
}

function processTextRemoveTooltips(text, removeOnlyIfMatches=null){
  if(text == null){ return null; }

  let handleRemoval = function(match, word, tooltipWords){
    if(removeOnlyIfMatches != null){
      // Doesn't match, don't remove
      if(word.match(removeOnlyIfMatches) == null){
        return match;
      }
    }

    if(word.toUpperCase().startsWith('NORMAL:')){
      word = word.replace(/NORMAL:/i, '');
    } else if(word.toUpperCase().startsWith('BLUE:')){
      word = word.replace(/BLUE:/i, '');
    } else if(word.toUpperCase().startsWith('GREEN:')){
      word = word.replace(/GREEN:/i, '');
    } else if(word.toUpperCase().startsWith('CYAN:')){
      word = word.replace(/CYAN:/i, '');
    } else if(word.toUpperCase().startsWith('RED:')){
      word = word.replace(/RED:/i, '');
    } else if(word.toUpperCase().startsWith('YELLOW:')){
      word = word.replace(/YELLOW:/i, '');
    }
    else if(word.toUpperCase().startsWith('BLUE_UNDERLINE:')){
      word = word.replace(/BLUE_UNDERLINE:/i, '');
    } else if(word.toUpperCase().startsWith('GREEN_UNDERLINE:')){
      word = word.replace(/GREEN_UNDERLINE:/i, '');
    } else if(word.toUpperCase().startsWith('CYAN_UNDERLINE:')){
      word = word.replace(/CYAN_UNDERLINE:/i, '');
    } else if(word.toUpperCase().startsWith('RED_UNDERLINE:')){
      word = word.replace(/RED_UNDERLINE:/i, '');
    } else if(word.toUpperCase().startsWith('YELLOW_UNDERLINE:')){
      word = word.replace(/YELLOW_UNDERLINE:/i, '');
    }
    return word;
  };

  const regexSheetTooltips = /\{([^\|]+?)\|([^\|]+?)\}/g;
  text = text.replace(regexSheetTooltips, handleRemoval);

  return text;
}