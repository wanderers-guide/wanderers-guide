/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

/*

  outputStruct: {
    hitPoints: {
      displayID,
      codeID,
    },
    size: {
      displayID,
      codeID,
    },
    speed: {
      displayID,
      codeID,
    },

    languages: {
      displayID,
      codeID,
    },
    senses: {
      displayID,
      codeID,
    },
    physicalFeatures: {
      displayID,
      codeID,
    },

    boosts: {
      displayID,
      codeID,
    },
    flaws: {
      displayID,
      codeID,
    },
  }

*/

const PROCESS_ANCESTRY_STATS_TYPE = {
  DISPLAY: 'DISPLAY',
  RUN_CODE: 'RUN_CODE',
  BOTH: 'BOTH',
};

// Designed to replicate the same sourceCode value as the old character builder to support old data //
function processAncestryStats(ancestryData, outputStruct, processType){
  const isBoth = (processType == PROCESS_ANCESTRY_STATS_TYPE.BOTH);

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Hit Points ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  if(processType == PROCESS_ANCESTRY_STATS_TYPE.DISPLAY || isBoth){
    $('#'+outputStruct.hitPoints.displayID).html(`
      <p class="is-inline is-size-6">
        ${ancestryData.Ancestry.hitPoints}
      </p>
    `);
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Size ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  if(processType == PROCESS_ANCESTRY_STATS_TYPE.DISPLAY || isBoth){
    $('#'+outputStruct.size.displayID).html(`
      <p class="is-inline is-size-6">
        ${capitalizeWords(ancestryData.Ancestry.size)}
      </p>
    `);
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Speed ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  if(processType == PROCESS_ANCESTRY_STATS_TYPE.DISPLAY || isBoth){
    $('#'+outputStruct.speed.displayID).html(`
      <p class="is-inline is-size-6">
        ${ancestryData.Ancestry.speed} ft
      </p>
    `);
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Languages ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  if(processType == PROCESS_ANCESTRY_STATS_TYPE.DISPLAY || isBoth){

    let ancestryLanguages = '';
    for(const language of ancestryData.Languages) {
      ancestryLanguages += language.name+", ";
    }
    
    const ancestryBonusLanguagesArray = ancestryData.BonusLanguages.sort(
      function(a, b) {
        return a.name > b.name ? 1 : -1;
      }
    );
    let bonusLangs = '';
    for(const bonusLang of ancestryBonusLanguagesArray) {
      bonusLangs += bonusLang.name+", ";
    }
    bonusLangs = bonusLangs.substring(0, bonusLangs.length - 2);

    ancestryLanguages += 'and <a class="has-text-info ancestry-langs-more-info">more*</a>';

    $('#'+outputStruct.languages.displayID).html(`
      <p class="is-inline is-size-6">
        ${ancestryLanguages}
      </p>
    `);

    $('.ancestry-langs-more-info').click(function(){
      openQuickView('abilityView', {
        Ability : {
          name: 'Additional Languages - '+ancestryData.Ancestry.name,
          description: 'You get to learn an additional number of languages equal your final Intelligence modifier (if it\'s positive). Choose from the following list (or any others you may have access to): '+bonusLangs,
          level: 0,
        }
      });
    });

  }

  if(processType == PROCESS_ANCESTRY_STATS_TYPE.RUN_CODE || isBoth){

    let langCount = 0;
    for(const language of ancestryData.Languages) {
      processCode(
        `GIVE-LANG-NAME=${language.name}`,
        {
          sourceType: 'ancestry',
          sourceLevel: 1,
          sourceCode: 'inits-'+langCount,
          sourceCodeSNum: '',
        },
        outputStruct.languages.codeID,
        {source: 'Ancestry', sourceName: 'Initial Ancestry'});
      langCount++;
    }

  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Senses ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  if(processType == PROCESS_ANCESTRY_STATS_TYPE.DISPLAY || isBoth){

    let ancestrySenses = '';
    if(ancestryData.VisionSense != null){
      ancestrySenses += '<a class="has-text-info ancestry-sense-vision">'+ancestryData.VisionSense.name+'</a>';
      if(ancestryData.AdditionalSense != null){
        ancestrySenses += ' and ';
      }
    }
    if(ancestryData.AdditionalSense != null){
      ancestrySenses += '<a class="has-text-info ancestry-sense-additional">'+ancestryData.AdditionalSense.name+'</a>';
    }

    $('#'+outputStruct.senses.displayID).html(`
      <p class="is-inline is-size-6">
        ${ancestrySenses}
      </p>
    `);

    $('.ancestry-sense-vision').click(function(){
      openQuickView('abilityView', {
        Ability : {
          name: ancestryData.VisionSense.name,
          description: ancestryData.VisionSense.description,
          level: 0,
        }
      });
    });
    $('.ancestry-sense-additional').click(function(){
      openQuickView('abilityView', {
        Ability : {
          name: ancestryData.AdditionalSense.name,
          description: ancestryData.AdditionalSense.description,
          level: 0,
        }
      });
    });

  }

  if(processType == PROCESS_ANCESTRY_STATS_TYPE.RUN_CODE || isBoth){

    if(ancestryData.VisionSense != null){
      processCode(
        `GIVE-SENSE-NAME=${ancestryData.VisionSense.name}`,
        {
          sourceType: 'ancestry',
          sourceLevel: 1,
          sourceCode: 'inits-1',
          sourceCodeSNum: '',
        },
        outputStruct.senses.codeID,
        {source: 'Ancestry', sourceName: 'Initial Ancestry'});
    }
    if(ancestryData.AdditionalSense != null){
      processCode(
        `GIVE-SENSE-NAME=${ancestryData.AdditionalSense.name}`,
        {
          sourceType: 'ancestry',
          sourceLevel: 1,
          sourceCode: 'inits-'+((ancestryData.VisionSense == null) ? 1 : 2),
          sourceCodeSNum: '',
        },
        outputStruct.senses.codeID,
        {source: 'Ancestry', sourceName: 'Initial Ancestry'});
    }

  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Physical Features ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  if(processType == PROCESS_ANCESTRY_STATS_TYPE.DISPLAY || isBoth){

    let ancestryPhyFeatures = '';
    if(ancestryData.PhysicalFeatureOne != null){
      ancestryPhyFeatures += '<a class="has-text-info ancestry-phy-feat-one">'+ancestryData.PhysicalFeatureOne.name+'</a>';
      if(ancestryData.PhysicalFeatureTwo != null){
        ancestryPhyFeatures += ' and ';
      }
    }
    if(ancestryData.PhysicalFeatureTwo != null){
      ancestryPhyFeatures += '<a class="has-text-info ancestry-phy-feat-two">'+ancestryData.PhysicalFeatureTwo.name+'</a>';
    }

    $('#'+outputStruct.physicalFeatures.displayID).html(`
      <p class="is-inline is-size-6">
        ${ancestryPhyFeatures}
      </p>
    `);

    $('.ancestry-phy-feat-one').click(function(){
      openQuickView('abilityView', {
        Ability : {
          name: ancestryData.PhysicalFeatureOne.name,
          description: ancestryData.PhysicalFeatureOne.description,
          level: 0,
        }
      });
    });
    $('.ancestry-phy-feat-two').click(function(){
      openQuickView('abilityView', {
        Ability : {
          name: ancestryData.PhysicalFeatureTwo.name,
          description: ancestryData.PhysicalFeatureTwo.description,
          level: 0,
        }
      });
    });

    // Hide section if no physical features
    if(ancestryData.PhysicalFeatureOne == null && ancestryData.PhysicalFeatureTwo == null){
      $('#ancestry-initial-stats-extra-features-section').addClass('is-hidden');
    } else {
      $('#ancestry-initial-stats-extra-features-section').removeClass('is-hidden');
    }

  }

  if(processType == PROCESS_ANCESTRY_STATS_TYPE.RUN_CODE || isBoth){

    if(ancestryData.PhysicalFeatureOne != null){
      // Giving Physical Feature
      processCode(
        `GIVE-PHYSICAL-FEATURE-NAME=${ancestryData.PhysicalFeatureOne.name}`,
        {
          sourceType: 'ancestry',
          sourceLevel: 1,
          sourceCode: 'inits-1',
          sourceCodeSNum: 'a',
        },
        outputStruct.physicalFeatures.codeID,
        {source: 'Ancestry', sourceName: 'Initial Ancestry'});
      
      // Running Physical Feature Code
      processCode(
        ancestryData.PhysicalFeatureOne.code,
        {
          sourceType: 'ancestry',
          sourceLevel: 1,
          sourceCode: 'inits-phyFeat-1',
          sourceCodeSNum: 'a',
        },
        outputStruct.physicalFeatures.codeID,
        {source: 'Ancestry', sourceName: ancestryData.PhysicalFeatureOne.name});
    }
    if(ancestryData.PhysicalFeatureTwo != null){
      // Giving Physical Feature
      processCode(
        `GIVE-PHYSICAL-FEATURE-NAME=${ancestryData.PhysicalFeatureTwo.name}`,
        {
          sourceType: 'ancestry',
          sourceLevel: 1,
          sourceCode: 'inits-'+((ancestryData.PhysicalFeatureOne == null) ? 1 : 2),
          sourceCodeSNum: 'a',
        },
        outputStruct.physicalFeatures.codeID,
        {source: 'Ancestry', sourceName: 'Initial Ancestry'});

      // Running Physical Feature Code
      processCode(
        ancestryData.PhysicalFeatureTwo.code,
        {
          sourceType: 'ancestry',
          sourceLevel: 1,
          sourceCode: 'inits-phyFeat-2',
          sourceCodeSNum: 'a',
        },
        outputStruct.physicalFeatures.codeID,
        {source: 'Ancestry', sourceName: ancestryData.PhysicalFeatureTwo.name});
    }

  }


  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Boosts ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
  
  if(processType == PROCESS_ANCESTRY_STATS_TYPE.DISPLAY || isBoth){

    let ancestryBoosts = '';
    for(const boost of ancestryData.Boosts){
      if(ancestryBoosts != ''){ancestryBoosts += ', ';}
      if(boost == 'Anything'){
        ancestryBoosts += 'Free';
      } else {
        ancestryBoosts += boost;
      }
    }
    if(ancestryBoosts == '') {ancestryBoosts = 'None';}

    $('#'+outputStruct.boosts.displayID).html(`
      <p class="is-size-6">
        ${ancestryBoosts}
      </p>
    `);

  }

  if(processType == PROCESS_ANCESTRY_STATS_TYPE.RUN_CODE || isBoth){
    
    let chooseBoostCount = 0;
    let nonChooseBoostCount = -1;
    for(const boost of ancestryData.Boosts){

      let abilityScore = shortenAbilityType(boost);
      if(abilityScore == 'ALL'){
        chooseBoostCount++;
        continue;
      } else {
        nonChooseBoostCount++;
      }

      processCode(
        `GIVE-ABILITY-BOOST-SINGLE=${abilityScore}`,
        {
          sourceType: 'ancestry',
          sourceLevel: 1,
          sourceCode: 'boost-nonChoose-'+nonChooseBoostCount,
          sourceCodeSNum: '',
        },
        outputStruct.boosts.codeID,
        {source: 'Ancestry', sourceName: 'Initial Ancestry'});
    }


    // Create list of free options
    let freeListOptions = new Set(['STR','DEX','CON','INT','WIS','CHA']);
    for(const boost of ancestryData.Boosts){
      freeListOptions.delete(shortenAbilityType(boost));
    }
    freeListOptions = Array.from(freeListOptions);

    let boostChooseCode = '';
    for(let i = 0; i < chooseBoostCount; i++) {
      boostChooseCode += 'GIVE-ABILITY-BOOST-SINGLE='+freeListOptions+'\n';
    }
    if(boostChooseCode != ''){
      processCode(
        boostChooseCode,
        {
          sourceType: 'ancestry',
          sourceLevel: 1,
          sourceCode: 'boost-choose',
          sourceCodeSNum: 'a',
        },
        outputStruct.boosts.codeID,
        {source: 'Ancestry', sourceName: 'Initial Ancestry'});
    }

  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Flaws ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
  
  if(processType == PROCESS_ANCESTRY_STATS_TYPE.DISPLAY || isBoth){

    let ancestryFlaws = '';
    for(const flaw of ancestryData.Flaws){
      if(ancestryFlaws != ''){ancestryFlaws += ', ';}
      if(flaw == 'Anything'){
        ancestryFlaws += 'Free';
      } else {
        ancestryFlaws += flaw;
      }
    }
    if(ancestryFlaws == '') {ancestryFlaws = 'None';}

    $('#'+outputStruct.flaws.displayID).html(`
      <p class="is-size-6">
        ${ancestryFlaws}
      </p>
    `);

  }

  if(processType == PROCESS_ANCESTRY_STATS_TYPE.RUN_CODE || isBoth){


    let chooseFlawCount = 0;
    let nonChooseFlawCount = -1;
    for(const flaw of ancestryData.Flaws){

      let abilityScore = shortenAbilityType(flaw);
      if(abilityScore == 'ALL'){
        chooseFlawCount++;
        continue;
      } else {
        nonChooseFlawCount++;
      }

      processCode(
        `GIVE-ABILITY-FLAW-SINGLE=${abilityScore}`,
        {
          sourceType: 'ancestry',
          sourceLevel: 1,
          sourceCode: 'flaw-nonChoose-'+nonChooseFlawCount,
          sourceCodeSNum: '',
        },
        outputStruct.flaws.codeID,
        {source: 'Ancestry', sourceName: 'Initial Ancestry'});
    }


    // Create list of free options
    let freeListOptions = new Set(['STR','DEX','CON','INT','WIS','CHA']);
    for(const flaw of ancestryData.Flaws){
      freeListOptions.delete(shortenAbilityType(flaw));
    }
    freeListOptions = Array.from(freeListOptions);

    let flawChooseCode = '';
    for(let i = 0; i < chooseFlawCount; i++) {
      flawChooseCode += 'GIVE-ABILITY-FLAW-SINGLE='+freeListOptions+'\n';
    }
    if(flawChooseCode != ''){
      processCode(
        flawChooseCode,
        {
          sourceType: 'ancestry',
          sourceLevel: 1,
          sourceCode: 'flaw-choose',
          sourceCodeSNum: 'a',
        },
        outputStruct.flaws.codeID,
        {source: 'Ancestry', sourceName: 'Initial Ancestry'});
    }

  }

}

function processMoreAncestryLangs(ancestryData, extraLangsCodeID){
  if(ancestryData == null) { return; }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Extra Languages ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

  let allLangData = getDataAllLanguage();

  deleteDataBySourceCode('inits-bonus-lang');

  let currentChar = 'a';
  let extraLangCode = '';
  let additionalLangs = getMod(variables_getTotal(VARIABLE.SCORE_INT));
  if(ancestryData.Ancestry.name == 'Human'){ additionalLangs++; } // Hardcoded - ancestry named Human gains +1 langs. 
  for (let i = 0; i < additionalLangs; i++) {
    extraLangCode += 'GIVE-LANG-BONUS-ONLY\n';

    let langData = allLangData.find(langData => {
      return (langData.sourceCode == 'inits-bonus-lang' && langData.sourceCodeSNum.endsWith(currentChar+'a'));
    });
    if(langData != null){
      setDataLanguage(langData, langData.value);
    }

    currentChar = processor_charIncrease(currentChar);
  }

  $('#'+extraLangsCodeID).html('');
  processCode(
    extraLangCode,
    {
      sourceType: 'class', // This is a mistake, should be ancestry
      sourceLevel: 1,
      sourceCode: 'inits-bonus-lang',
      sourceCodeSNum: 'a',
    },
    extraLangsCodeID,
    {source: 'Ancestry', sourceName: 'Extra Languages'});

}