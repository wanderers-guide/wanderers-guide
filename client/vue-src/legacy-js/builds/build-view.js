/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openBuildView(buildID){
  window.history.pushState('builds', '', '/builds/?view_id='+buildID);// Update URL
  socket.emit('requestBuildContents', buildID);
  startSpinnerSubLoader();
}

let g_notesMap;
let g_unselectedDataArray;

socket.on("returnBuildContents", function(buildContents){

  if(buildContents == null){ console.error('Don\'t have access!'); }

  g_activeBuild = buildContents.build;

  textProcess_warningOnUnknown = true;
  g_skillMap = objToMap(buildContents.sourceMaterial.skillObject);
  g_featMap = objToMap(buildContents.sourceMaterial.featsObject);
  g_itemMap = objToMap(buildContents.sourceMaterial.itemsObject);
  g_spellMap = objToMap(buildContents.sourceMaterial.spellsObject);
  g_allTags = buildContents.sourceMaterial.allTags;
  g_allLanguages = buildContents.sourceMaterial.allLanguages;
  g_allConditions = buildContents.sourceMaterial.allConditions;

  let displayContainerID = 'build-container-'+g_activeBuild.id;
  $('#tabContent').parent().append('<div id="'+displayContainerID+'" class="is-hidden"></div>');
  $('#tabContent').addClass('is-hidden');
  stopSpinnerSubLoader();

  $('#'+displayContainerID).load("/templates/builds/display-view-build.html");
  $.ajax({ type: "GET",
    url: "/templates/builds/display-view-build.html",
    success : function(text)
    {

      $('#build-back-btn').click(function() {
        $('#'+displayContainerID).remove();
        $('#tabContent').removeClass('is-hidden');
        if($('#tabContent').is(':empty')){ $('#browseTab').trigger("click"); }
      });
      $('.category-tabs li').click(function() {
        $('#'+displayContainerID).remove();
      });

      // If mobile, reduce width of the add character button
      if(isMobileView()){ // Remove so the icon shows up proportionality correct
        $('#build-create-character-btn-text').remove();
      }

      // Generate Notes Map //
      generateNotesMap();


      $('#build-name').html(g_activeBuild.name);
      $('#build-description').html(processText(g_activeBuild.description, false, false, 'MEDIUM', false));

      $('#build-artwork-img').attr('src', g_activeBuild.artworkURL);

      let contactInfoStr = (g_activeBuild.contactInfo != '' && g_activeBuild.contactInfo != null) ? ', '+g_activeBuild.contactInfo : '';
      $('#build-contact-info').html('<span class="is-thin has-txt-partial-noted">–</span> '+g_activeBuild.authorName+' <span class="is-thin has-txt-partial-noted is-size-7">#'+g_activeBuild.userID+'</span>'+contactInfoStr);

      // Determine build level range
      let lowestLvl = 999;
      let highestLvl = 0;
      for(const data of buildContents.buildData){
        if(!processData_isCheckedData(data)) { continue; }
        if(data.sourceLevel < lowestLvl){
          lowestLvl = data.sourceLevel;
        }
        if(data.sourceLevel > highestLvl){
          highestLvl = data.sourceLevel;
        }
      }
      $('#build-lvl-range').html(`(Level ${lowestLvl} - ${highestLvl})`);

      ///

      // Hide create character button if user isn't logged in
      if($('#builds-container').attr('data-user-id') == '') {
        $('#build-create-character-btn').addClass('is-hidden');
      }

      // Create Character Button //
      $('#build-create-character-btn').click(function() {

        let homebrewNeeded = [];

        const buildHomebrew = JSON.parse(g_activeBuild.enabledHomebrew);
        for(const buildHomebrewID of buildHomebrew){
          let hBundle = buildContents.userInfo.hBundlesCollected.find(hBundle => {
            return hBundle.homebrewID == buildHomebrewID;
          });
          if(hBundle == null){
            hBundle = buildContents.userInfo.hBundlesProgess.find(hBundle => {
              return hBundle.id == buildHomebrewID;
            });
          }
          if(hBundle == null){
            homebrewNeeded.push(buildHomebrewID);
          }
        }

        startSpinnerSubLoader();

        // If requires homebrew bundles to be added, get homebrew bundles
        if(homebrewNeeded.length > 0){
          socket.emit('requestHomebrewBundlesFromArray', homebrewNeeded);
          
          socket.once('returnHomebrewBundlesFromArray', function(neededBundles){
            if(neededBundles.length > 0){
              stopSpinnerSubLoader();

              // Send confirm message asking if it's okay to add required bundles
              let requiredBundlesHTML = '';
              for(const neededBundle of neededBundles){
                if(neededBundle == null) { continue; }
                requiredBundlesHTML += `<p class="has-text-left" style="padding-left: 30%;"> - ${neededBundle.name} <span class="is-size-6-5 is-italic has-txt-partial-noted">(ID: ${neededBundle.id})</span></p>`;
              }

              new ConfirmMessage('Build Requires Homebrew', `
                <p class="has-text-centered">This build requires the following homebrew to be enabled and added to your homebrew collection:</p>
                ${requiredBundlesHTML}
                `, 'Add Homebrew to Collection', 'modal-build-add-required-homebrew', 'modal-build-add-required-homebrew-btn', 'is-info');
              $('#modal-build-add-required-homebrew-btn').click(function() {
                startSpinnerSubLoader();

                // Homebrew bundles can be added, but do any require a key?
                let neededBundlesRequireKey = [];
                for(const neededBundle of neededBundles){
                  if(neededBundle == null) { continue; }
                  if(neededBundle.hasKeys == 1){
                    neededBundlesRequireKey.push(neededBundle);
                  } else {
                    socket.emit('requestBundleChangeCollection', neededBundle.id, true);
                  }
                }

                // Some of the bundles require a key, say that.
                if(neededBundlesRequireKey.length > 0){
                  stopSpinnerSubLoader();

                  let requiredBundlesThatNeedKeyHTML = '';
                  for(const neededBundleRequireKey of neededBundlesRequireKey){
                    requiredBundlesThatNeedKeyHTML += `<p class="has-text-left" style="padding-left: 30%;"> - ${neededBundleRequireKey.name} <span class="is-size-6-5 is-italic has-txt-partial-noted">(ID: ${neededBundleRequireKey.id})</span></p>`;
                  }

                  new ConfirmMessage('Homebrew Requires Key to Access', `
                    <p class="has-text-centered">The following homebrew requires a key to access:</p>
                    ${requiredBundlesThatNeedKeyHTML}
                    <p class="has-text-centered">You can add the homebrew to your collection by individually adding the homebrew bundle and inputting the required key.</p>
                    `, 'Okay', 'modal-build-homebrew-requires-key', 'modal-build-homebrew-requires-key-btn', 'is-info');

                } else {
                  // No keys required, create the character
                  socket.emit('requestCreateCharacterFromBuild', g_activeBuild.id);
                }

              });

            } else {
              // If requires homebrew bundles, but can't find them. Just create the character and hope for the best!
              socket.emit('requestCreateCharacterFromBuild', g_activeBuild.id);
            }
          });
        } else {
          // No homebrew bundles required to be enabled, just create the character
          socket.emit('requestCreateCharacterFromBuild', g_activeBuild.id);
        }

      });

      ///

      g_unselectedDataArray = [];
      for(const data of buildContents.buildData){
        if(processData_isIncorrectOption(data)){
          g_unselectedDataArray.push(data);
        }
      }

      // Reveal warnings icon if there is incorrect data
      if(g_unselectedDataArray.length > 0){
        $('#build-warnings-icon').removeClass('is-hidden');
      }

      // Build Warnings Icon //
      $('#build-warnings-icon').click(function() {
        openQuickView('warningsView', {});
      });

      ///

      if(buildContents.mainSelections.bAncestry != null){
        $('#build-ancestry').html(buildContents.mainSelections.bAncestry.name);
        $('#build-ancestry').addClass('is-info');

        $('#build-ancestry').click(function() {
          new DisplayAncestry(displayContainerID, buildContents.mainSelections.bAncestry.id, g_featMap, buildContents.mainSelections.bAncestry.homebrewID, true);
        });

      } else {
        $('#build-ancestry').html('Any Ancestry');
      }

      if(buildContents.mainSelections.bHeritage != null || buildContents.mainSelections.bUniHeritage != null){
        if(buildContents.mainSelections.bUniHeritage != null){
          $('#build-heritage').html(buildContents.mainSelections.bUniHeritage.name);

          $('#build-heritage').click(function() {
            new DisplayUniHeritage(displayContainerID, buildContents.mainSelections.bUniHeritage.id, g_featMap, buildContents.mainSelections.bUniHeritage.homebrewID, true);
          });

        } else if(buildContents.mainSelections.bHeritage != null){
          $('#build-heritage').html(buildContents.mainSelections.bHeritage.name);

          $('#build-heritage').click(function() {
            new DisplayAncestry(displayContainerID, buildContents.mainSelections.bAncestry.id, g_featMap, buildContents.mainSelections.bAncestry.homebrewID, true);
          });

        }
        $('#build-heritage').addClass('is-info');

      } else {
        $('#build-heritage').html('Any Heritage');
      }

      if(buildContents.mainSelections.bBackground != null){
        $('#build-background').html(buildContents.mainSelections.bBackground.name);
        $('#build-background').addClass('is-info');

        $('#build-background').click(function() {
          new DisplayBackground(displayContainerID, buildContents.mainSelections.bBackground.id, buildContents.mainSelections.bBackground.homebrewID, true);
        });

      } else {
        $('#build-background').html('Any Background');
      }

      if(buildContents.mainSelections.bClass != null && buildContents.mainSelections.bClass.Class != null){
        $('#build-class').html(buildContents.mainSelections.bClass.Class.name);
        $('#build-class').addClass('is-info');

        $('#build-class').click(function() {
          new DisplayClass(displayContainerID, buildContents.mainSelections.bClass.Class.id, g_featMap, buildContents.mainSelections.bClass.Class.homebrewID, true);
        });

      } else {
        $('#build-class').html('Any Class');
      }


      


      //// Assemble Accords

      $('.accord-container').each(function() {
        let accordHeader = $(this).find('.accord-header');
        $(accordHeader).click(function() {
          let accordBody = $(this).parent().find('.accord-body');
          let accordChevron = $(this).parent().find('.accord-chevron');
          if($(accordBody).hasClass("is-hidden")) {
            $(accordBody).removeClass('is-hidden');
            $(accordChevron).removeClass('fa-chevron-down');
            $(accordChevron).addClass('fa-chevron-up');
          } else {
            $(accordBody).addClass('is-hidden');
            $(accordChevron).removeClass('fa-chevron-up');
            $(accordChevron).addClass('fa-chevron-down');
          }
        });
        $(accordHeader).mouseenter(function(){
          $(accordHeader).addClass('accord-hover');
        });
        $(accordHeader).mouseleave(function(){
          $(accordHeader).removeClass('accord-hover');
        });
      });

      //// Populate Accords

      if(buildContents.build.finalStatsJSON != null){

        let finalStats = JSON.parse(buildContents.build.finalStatsJSON);

        $('#str-score').text(finalStats.scores.str);
        $('#dex-score').text(finalStats.scores.dex);
        $('#con-score').text(finalStats.scores.con);
        $('#int-score').text(finalStats.scores.int);
        $('#wis-score').text(finalStats.scores.wis);
        $('#cha-score').text(finalStats.scores.cha);

        $('#hit-points-total').text(finalStats.maxHealth);

        $('#class-dc-total').text(finalStats.classDC.total);
        $('#class-dc-rank').text(finalStats.classDC.rank);

        $('#perception-total').text(finalStats.perception.total);
        $('#perception-rank').text(finalStats.perception.rank);

        let saves = [
          {
            Value1: 'Fortitude',
            Value2: finalStats.saves.fort.total,
            Value3: finalStats.saves.fort.rank,
          },
          {
            Value1: 'Reflex',
            Value2: finalStats.saves.reflex.total,
            Value3: finalStats.saves.reflex.rank,
          },
          {
            Value1: 'Will',
            Value2: finalStats.saves.will.total,
            Value3: finalStats.saves.will.rank,
          },
        ];
        populateAccord('saves-body', saves);

        let skills = [
          {
            Value1: 'Acrobatics',
            Value2: finalStats.skills.acrobatics.total,
            Value3: finalStats.skills.acrobatics.rank,
          },
          {
            Value1: 'Arcana',
            Value2: finalStats.skills.arcana.total,
            Value3: finalStats.skills.arcana.rank,
          },
          {
            Value1: 'Athletics',
            Value2: finalStats.skills.athletics.total,
            Value3: finalStats.skills.athletics.rank,
          },
          {
            Value1: 'Crafting',
            Value2: finalStats.skills.crafting.total,
            Value3: finalStats.skills.crafting.rank,
          },
          {
            Value1: 'Deception',
            Value2: finalStats.skills.deception.total,
            Value3: finalStats.skills.deception.rank,
          },
          {
            Value1: 'Diplomacy',
            Value2: finalStats.skills.diplomacy.total,
            Value3: finalStats.skills.diplomacy.rank,
          },
          {
            Value1: 'Intimidation',
            Value2: finalStats.skills.intimidation.total,
            Value3: finalStats.skills.intimidation.rank,
          },
          {
            Value1: 'Medicine',
            Value2: finalStats.skills.medicine.total,
            Value3: finalStats.skills.medicine.rank,
          },
          {
            Value1: 'Nature',
            Value2: finalStats.skills.nature.total,
            Value3: finalStats.skills.nature.rank,
          },
          {
            Value1: 'Occultism',
            Value2: finalStats.skills.occultism.total,
            Value3: finalStats.skills.occultism.rank,
          },
          {
            Value1: 'Performance',
            Value2: finalStats.skills.performance.total,
            Value3: finalStats.skills.performance.rank,
          },
          {
            Value1: 'Religion',
            Value2: finalStats.skills.religion.total,
            Value3: finalStats.skills.religion.rank,
          },
          {
            Value1: 'Society',
            Value2: finalStats.skills.society.total,
            Value3: finalStats.skills.society.rank,
          },
          {
            Value1: 'Stealth',
            Value2: finalStats.skills.stealth.total,
            Value3: finalStats.skills.stealth.rank,
          },
          {
            Value1: 'Survival',
            Value2: finalStats.skills.survival.total,
            Value3: finalStats.skills.survival.rank,
          },
          {
            Value1: 'Thievery',
            Value2: finalStats.skills.thievery.total,
            Value3: finalStats.skills.thievery.rank,
          },
        ];

        for(let lore of finalStats.lores){
          skills.push({
            Value1: lore.name,
            Value2: lore.total,
            Value3: lore.rank,
          });
        }
        populateAccord('skills-body', skills);

        let attacks = [
          {
            Value1: 'Simple Weapons',
            Value2: finalStats.attacks.simple_weapons.rank,
          },
          {
            Value1: 'Martial Weapons',
            Value2: finalStats.attacks.martial_weapons.rank,
          },
          {
            Value1: 'Advanced Weapons',
            Value2: finalStats.attacks.advanced_weapons.rank,
          },
          {
            Value1: 'Unarmed Attacks',
            Value2: finalStats.attacks.unarmed_weapons.rank,
          },
        ];
        populateAccord('attacks-body', attacks);

        let defenses = [
          {
            Value1: 'Light Armor',
            Value2: finalStats.defenses.light_armor.rank,
          },
          {
            Value1: 'Medium Armor',
            Value2: finalStats.defenses.medium_armor.rank,
          },
          {
            Value1: 'Heavy Armor',
            Value2: finalStats.defenses.heavy_armor.rank,
          },
          {
            Value1: 'Unarmored Defense',
            Value2: finalStats.defenses.unarmored_defense.rank,
          },
        ];
        populateAccord('defenses-body', defenses);

        let spellcasting = [];
        const arcaneSpellAttacksRank = finalStats.spellcasting.arcane.attack;
        if(arcaneSpellAttacksRank != 'U'){
          spellcasting.push({
            Value1: 'Arcane Spell Attacks',
            Value2: arcaneSpellAttacksRank,
          });
        }
        const arcaneSpellDCsRank = finalStats.spellcasting.arcane.dc;
        if(arcaneSpellDCsRank != 'U'){
          spellcasting.push({
            Value1: 'Arcane Spell DCs',
            Value2: arcaneSpellDCsRank,
          });
        }

        const divineSpellAttacksRank = finalStats.spellcasting.divine.attack;
        if(divineSpellAttacksRank != 'U'){
          spellcasting.push({
            Value1: 'Divine Spell Attacks',
            Value2: divineSpellAttacksRank,
          });
        }
        const divineSpellDCsRank = finalStats.spellcasting.divine.dc;
        if(divineSpellDCsRank != 'U'){
          spellcasting.push({
            Value1: 'Divine Spell DCs',
            Value2: divineSpellDCsRank,
          });
        }

        const occultSpellAttacksRank = finalStats.spellcasting.occult.attack;
        if(occultSpellAttacksRank != 'U'){
          spellcasting.push({
            Value1: 'Occult Spell Attacks',
            Value2: occultSpellAttacksRank,
          });
        }
        const occultSpellDCsRank = finalStats.spellcasting.occult.dc;
        if(occultSpellDCsRank != 'U'){
          spellcasting.push({
            Value1: 'Occult Spell DCs',
            Value2: occultSpellDCsRank,
          });
        }

        const primalSpellAttacksRank = finalStats.spellcasting.primal.attack;
        if(primalSpellAttacksRank != 'U'){
          spellcasting.push({
            Value1: 'Primal Spell Attacks',
            Value2: primalSpellAttacksRank,
          });
        }
        const primalSpellDCsRank = finalStats.spellcasting.primal.dc;
        if(primalSpellDCsRank != 'U'){
          spellcasting.push({
            Value1: 'Primal Spell DCs',
            Value2: primalSpellDCsRank,
          });
        }
        populateAccord('spellcasting-body', spellcasting);

        let languages = [];
        for(let langName of finalStats.languages){
          languages.push({
            Value1: langName,
            Value2: '',
          });
        }
        populateAccord('languages-body', languages);

        let resistWeaks = [];
        for(let resist of finalStats.resists){
          resistWeaks.push({
            Value1: resist,
            Value2: 'Resist.',
          });
        }
        for(let weak of finalStats.weaks){
          resistWeaks.push({
            Value1: weak,
            Value2: 'Weak.',
          });
        }
        populateAccord('resist-weaks-body', resistWeaks);

      } else {

        populateAccord('saves-body', []);
        populateAccord('skills-body', []);
        populateAccord('attacks-body', []);
        populateAccord('defenses-body', []);
        populateAccord('spellcasting-body', []);
        populateAccord('languages-body', []);
        populateAccord('resist-weaks-body', []);

      }

      //// Reading MetaData

      processMetaData(buildContents);


      $('#'+displayContainerID).removeClass('is-hidden');
    }
  });
});

socket.on('returnCharacterCreatedFromBuild', function(character){
  stopSpinnerSubLoader();
  window.location.href = '/profile/characters/builder/basics/?id='+character.id;
});

socket.on('returnCharacterFailedToCreateFromBuild', function(){
  stopSpinnerSubLoader();
  new ConfirmMessage('Cannot Create Character', 'It seems like you\'ve reached your max characters. To get unlimited characters, support us and what we\'re doing on Patreon!', 'Okay', 'modal-failed-max-characters', 'modal-failed-max-characters-btn', 'is-info');
});

function populateAccord(accordBodyID, optionsList){

  let content = $('#'+accordBodyID);
  content.html('');

  if(optionsList.length == 0){
    content.append(`<div class="p-1"><p class="pl-2 accord-selection-none">None</p></div>`);
    return;
  }

  for(let i = 0; i < optionsList.length; i++){
    let optionEntryID = `${accordBodyID}-entry-${i}`;
    let option = optionsList[i];

    let value1 = option.Value1;
    let value2 = option.Value2;
    let value3 = option.Value3;

    if(value3 == null){
      content.append(`
        <div id="${optionEntryID}" class="columns is-mobile is-marginless p-1 border-bottom border-dark-lighter">
          <div class="column is-8 is-paddingless"><p class="pl-2">${value1}</p></div>
          <div class="column is-4 is-paddingless"><p class="has-text-centered is-italic has-txt-noted">${value2}</p></div>
        </div>
      `);
    } else {
      content.append(`
        <div id="${optionEntryID}" class="columns is-mobile is-marginless p-1 border-bottom border-dark-lighter">
          <div class="column is-8 is-paddingless"><p class="pl-2">${value1}</p></div>
          <div class="column is-2 is-paddingless"><p class="has-text-centered">${value2}</p></div>
          <div class="column is-2 is-paddingless"><p class="has-text-centered is-italic has-txt-noted">${value3}</p></div>
        </div>
      `);
    }

  }

}

function generateNotesMap(){
  g_notesMap = new Map();
  if(g_activeBuild.description == null) { return; }

  let newDescription = '';
  for(let line of g_activeBuild.description.split('\n')){
    if(line.includes(':')){
      let lineParts = line.split(':');
      if(lineParts.length == 2 && lineParts[0].length <= 60){
        g_notesMap.set(lineParts[0].toUpperCase(), lineParts[1].trim());
      } else {
        newDescription += line+'\n';
      }
    } else {
      newDescription += line+'\n';
    }
  }

  g_activeBuild.description = newDescription;

}

function processMetaData(buildContents){

  let ancestryFeats = [];
  let classSelections = [];
  let classFeats = [];
  let archetypeFeats = [];
  let skillFeats = [];
  let generalFeats = [];
  let skillData = [];

  let otherData = [];

  for(const data of buildContents.buildData){
    if(processData_isAncestryFeat(data)){
      ancestryFeats.push(data);
    } else if(processData_isSkillFeat(data)){
      skillFeats.push(data);
    } else if(processData_isGeneralFeat(data, buildContents)){
      generalFeats.push(data);
    } else if(processData_isClassFeat(data)){
      classFeats.push(data);
    } else if(processData_isArchetypeFeat(data)){
      archetypeFeats.push(data);
    } else if(processData_isSkillRelated(data)){
      skillData.push(data);
    } else if(processData_isClassSelection(data)){
      classSelections.push(data);
    } else {
      otherData.push(data);
    }
  }

  // Build Tables //
  processData_buildClassSelection('build-class-selections', classSelections, buildContents);

  processData_buildFeatTable('build-ancestry-feats', ancestryFeats);

  processData_buildFeatTable('build-class-feats', classFeats);

  processData_buildFeatTable('build-archetype-feats', archetypeFeats);

  processData_buildFeatTable('build-general-feats', generalFeats);

  processData_buildFeatTable('build-skill-feats', skillFeats);

  processData_buildSkillTable('build-skill-history', skillData);

}

function processData_isCheckedData(data){
  return ((data.source == 'chosenFeats' || data.source == 'classChoice') && data.value != null);
}

function processData_isAncestryFeat(data){
  return (data.source == 'chosenFeats'
    && data.sourceCode.startsWith('ancestryFeat-')
    && data.sourceType == 'ancestry'
  );
}

function processData_isClassFeat(data){
  if(data.source == 'chosenFeats'
    && data.sourceCode.startsWith('classAbility-')
    && !data.sourceCode.startsWith('classAbility--')
    && data.sourceType == 'class'
  ) {

    let featStruct = g_featMap.get(data.value+'');
    if(featStruct.Feat.level > 0) {

      let generalTag = featStruct.Tags.find(tag => {
        return tag.id == 8; // Hardcoded General Tag IDs
      });
      return (generalTag == null);

    } else {
      return false;
    }

  } else {
    return false;
  }
}

function processData_isArchetypeFeat(data){
  return (data.source == 'chosenFeats'
    && data.sourceCode.startsWith('classAbility--')
    && data.sourceType == 'class'
  );
}

function processData_isGeneralFeat(data, buildContents){
  if (data.source == 'chosenFeats'
    && data.sourceCode.startsWith('classAbility-')
    && !data.sourceCode.startsWith('classAbility--')
    && data.sourceType == 'class'
  ) {
    
    let featStruct = g_featMap.get(data.value+'');
    let tag = featStruct.Tags.find(tag => {
      return tag.id == 8; // Hardcoded General Tag IDs
    });
    if(tag != null){

      let featureID = data.sourceCode.replace('classAbility-','');

      let classFeature = buildContents.mainSelections.bClass.Abilities.find(classFeature => {
        return classFeature.id == featureID;
      });
      if(classFeature != null){
        return (classFeature.name == 'General Feat');
      } else {
        return false;
      }

    } else {
      return false;
    }

  } else {
    return false;
  }
}

function processData_isSkillFeat(data){
  if (data.source == 'chosenFeats'
    && data.sourceCode.startsWith('classAbility-')
    && !data.sourceCode.startsWith('classAbility--')
    && data.sourceType == 'class'
  ) {
    
    let featStruct = g_featMap.get(data.value+'');
    let tag = featStruct.Tags.find(tag => {
      return tag.id == 9; // Hardcoded Skill Tag IDs
    });
    return (tag != null);

  } else {
    return false;
  }
}

function processData_isSkillRelated(data){
  return (data.source == 'proficiencies'
    && data.value.startsWith('Skill:::')
  );
}

function processData_isClassSelection(data){
  return (data.source == 'classChoice'
    && data.sourceCode.startsWith('classAbilitySelector-')
    && data.sourceType == 'class'
  );
}

function processData_isIncorrectOption(data){
  return (data.source == 'unselectedData'
    && data.value.includes('"INCORRECT"')
  );
}


function processData_buildFeatTable(locationID, featDataArray){
  if(featDataArray.length > 0){
    $('#'+locationID+'-section').removeClass('is-hidden');
  } else {
    return;
  }

  let containsNotes = false;
  for(let data of featDataArray){
    let featStruct = g_featMap.get(data.value+'');
    if(featStruct != null && g_notesMap.has(featStruct.Feat.name.toUpperCase())){
      containsNotes = true;
    }
  }
  if(!containsNotes){
    $('#'+locationID).addClass('is-short');
  }

  $('#'+locationID).html(`
    <div class="columns is-marginless is-mobile">
      <div class="column p-1 is-2 border-bottom border-dark-lighter has-bg-options-header-bold is-bold">
        <span class="is-p pl-2">Level</span>
      </div>
      <div class="column p-1 border-bottom border-dark-lighter has-bg-options-header-bold is-bold">
        <span class="is-p pl-3">Feat</span>
      </div>
      ${(containsNotes) ? `
        <div class="column p-1 border-bottom border-dark-lighter has-bg-options-header-bold is-bold">
          <span class="is-p pl-3">Notes</span>
        </div>
      ` : ``}
    </div>
    <div id="${locationID}-list" class="use-custom-scrollbar" style="max-height: 450px; overflow-y: scroll;"></div>
  `);
  for(let data of featDataArray){
    let featStruct = g_featMap.get(data.value+'');
    if(featStruct == null) { continue; }
    let featEntryID = 'feat-table-entry-'+featStruct.Feat.id;

    let notes = null;
    if(containsNotes){
      notes = g_notesMap.get(featStruct.Feat.name.toUpperCase());
      if(notes == null) { notes = ''; }
    }

    $('#'+locationID+'-list').append(`
      <div class="columns is-marginless is-mobile">
        <div class="column is-2 border-bottom border-dark-lighter p-2 has-bg-selectable">
          <span class="is-p pl-2">${data.sourceLevel}</span>
        </div>
        <div id="${featEntryID}" class="column border-bottom border-dark-lighter p-2 has-bg-selectable cursor-clickable">
          <span class="is-p pl-2">${featStruct.Feat.name+convertActionToHTML(featStruct.Feat.actions)}</span>
        </div>
        ${(containsNotes) ? `
          <div class="column border-bottom border-dark-lighter p-2 pl-3 has-bg-selectable">
            <span class="is-p is-size-7">${notes}</span>
          </div>
        ` : ``}
      </div>
    `);

    $('#'+featEntryID).click(function(){
      openQuickView('featView', {
        Feat : featStruct.Feat,
        Tags : featStruct.Tags
      });
    });
  
    $('#'+featEntryID).mouseenter(function(){
      $(this).removeClass('has-bg-selectable');
      $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+featEntryID).mouseleave(function(){
      $(this).removeClass('has-bg-selectable-hover');
      $(this).addClass('has-bg-selectable');
    });

  }

}

function processData_buildSkillTable(locationID, skillDataArray){
  if(skillDataArray.length > 0){
    $('#'+locationID+'-section').removeClass('is-hidden');
  } else {
    return;
  }

  skillDataArray = skillDataArray.sort(
    function(aData, bData) {
      if (aData.sourceLevel == bData.sourceLevel) {
        // Skill Source is only important when levels are the same
        let aSource = aData.value.split(':::')[3];
        let bSource = bData.value.split(':::')[3];
        if(aSource == bSource){
          // Skill Name is only important when sources are the same
          return aData.value > bData.value ? 1 : -1;
        } else {
          return aData.value.split(':::')[3] > bData.value.split(':::')[3] ? 1 : -1;
        }
      } else {
        return aData.sourceLevel - bData.sourceLevel;
      }
    }
  );

  $('#'+locationID).html(`
    <div class="columns is-marginless is-mobile">
      <div class="column p-1 is-2 border-bottom border-dark-lighter has-bg-options-header-bold is-bold">
        <span class="is-p pl-2">Level</span>
      </div>
      <div class="column p-1 border-bottom border-dark-lighter has-bg-options-header-bold is-bold">
        <span class="is-p pl-3">Skill Proficiency</span>
      </div>
      <div class="column p-1 border-bottom border-dark-lighter has-bg-options-header-bold is-bold">
        <span class="is-p pl-3">Notes</span>
      </div>
    </div>
    <div id="${locationID}-list" class="use-custom-scrollbar" style="max-height: 450px; overflow-y: scroll;"></div>
  `);
  for(let data of skillDataArray){
    if(data.value == null) { continue; }
    
    let parts = data.value.split(':::');
    const skillName = parts[1];
    const profRank = parts[2];
    const source = parts[3];

    $('#'+locationID+'-list').append(`
      <div class="columns is-marginless is-mobile">
        <div class="column is-2 border-bottom border-dark-lighter p-2 has-bg-selectable">
          <span class="is-p pl-2">${data.sourceLevel}</span>
        </div>
        <div class="column border-bottom border-dark-lighter p-2 has-bg-selectable">
          <span class="is-p pl-2">${capitalizeWords(skillName.replace(/_/g,' '))} <span class="has-txt-partial-noted">(${profToWord(profRank)})</span></span>
        </div>
        <div class="column border-bottom border-dark-lighter p-2 has-bg-selectable">
          <span class="is-p pl-2 is-size-7"><span class="has-txt-partial-noted">From</span> ${source}</span>
        </div>
      </div>
    `);

  }

}

function processData_buildClassSelection(locationID, selectionDataArray, buildContents){
  if(selectionDataArray.length > 0){
    $('#'+locationID+'-section').removeClass('is-hidden');
  } else {
    return;
  }

  selectionDataArray = selectionDataArray.sort(
    function(aData, bData) {
      return aData.sourceLevel - bData.sourceLevel;
    }
  );

  $('#'+locationID).html(`
    <div class="columns is-marginless is-mobile">
      <div class="column p-1 is-2 border-bottom border-dark-lighter has-bg-options-header-bold is-bold">
        <span class="is-p pl-2">Level</span>
      </div>
      <div class="column p-1 border-bottom border-dark-lighter has-bg-options-header-bold is-bold">
        <span class="is-p pl-3">Class Selection</span>
      </div>
    </div>
    <div id="${locationID}-list" class="use-custom-scrollbar" style="max-height: 208px; overflow-y: scroll;"></div>
  `);
  for(let data of selectionDataArray){
    if(data.value == null) { continue; }
    
    let parts = data.value.split(':::');
    const selectorID = parts[0];
    const optionID = parts[1];

    let selectorFeature = buildContents.mainSelections.bClass.Abilities.find(classFeature => {
      return classFeature.id == selectorID;
    });

    let optionFeature = buildContents.mainSelections.bClass.Abilities.find(classFeature => {
      return classFeature.id == optionID;
    });

    let selectorEntryID = 'selection-table-entry-1-'+selectorFeature.id+'-'+optionFeature.id;
    let optionEntryID = 'selection-table-entry-2-'+selectorFeature.id+'-'+optionFeature.id;

    $('#'+locationID+'-list').append(`
      <div class="columns is-marginless is-mobile">
        <div class="column is-2 border-bottom border-dark-lighter p-2 has-bg-selectable">
          <span class="is-p pl-2">${data.sourceLevel}</span>
        </div>
        <div class="column border-bottom border-dark-lighter has-bg-selectable is-paddingless">
          <div class="pl-2 is-inline-flex">
            <div id="${selectorEntryID}" class="py-2 pl-2 pr-1 cursor-clickable">
              <span class="is-p">${selectorFeature.name}</span>
            </div>
            <div id="${optionEntryID}" class="py-2 pl-1 pr-2 cursor-clickable">
              <span class="is-p has-txt-partial-noted">(${optionFeature.name})</span>
            </div>
          </div>
        </div>
      </div>
    `);

    $('#'+selectorEntryID).click(function(){
      openQuickView('abilityView', {
        Ability : selectorFeature
      });
    });
    $('#'+selectorEntryID).mouseenter(function(){
      $(this).removeClass('has-bg-selectable');
      $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+selectorEntryID).mouseleave(function(){
      $(this).removeClass('has-bg-selectable-hover');
      $(this).addClass('has-bg-selectable');
    });


    $('#'+optionEntryID).click(function(){
      openQuickView('abilityView', {
        Ability : optionFeature
      });
    });
    $('#'+optionEntryID).mouseenter(function(){
      $(this).removeClass('has-bg-selectable');
      $(this).addClass('has-bg-selectable-hover');
    });
    $('#'+optionEntryID).mouseleave(function(){
      $(this).removeClass('has-bg-selectable-hover');
      $(this).addClass('has-bg-selectable');
    });

  }

}