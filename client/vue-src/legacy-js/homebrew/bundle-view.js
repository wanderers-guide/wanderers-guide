/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openBundleView(homebrewBundle){
  g_activeBundle = homebrewBundle;
  window.history.pushState('homebrew', '', '/homebrew/?view_id='+g_activeBundle.id);// Update URL
  socket.emit('requestBundleContents', 'VIEW', homebrewBundle.id);
  startSpinnerSubLoader();
}

socket.on("returnBundleContents", function(REQUEST_TYPE, userHasBundle, userOwnsBundle, skillObject, allTags, classes, ancestries, archetypes, backgrounds, classFeatures, feats, heritages, uniheritages, items, spells, languages, toggleables){
  if(REQUEST_TYPE !== 'VIEW' && REQUEST_TYPE !== 'REQUIRE-KEY') {return;}

  textProcess_warningOnUnknown = true;
  g_skillMap = (skillObject != null) ? objToMap(skillObject) : null;
  g_allTags = allTags;
  g_allLanguages = languages;

  let featMap = new Map();
  for(let feat of feats){
    let tags = [];
    // Find tags by id
    for(let featTag of feat.featTags){
      let tag = allTags.find(tag => {
        return tag.id === featTag.tagID;
      });
      if(tag != null) {tags.push(tag);}
    }
    // Find tag for genTypeName
    if(feat.genTypeName != null){
      let tag = allTags.find(tag => {
        if(tag.isArchived == 0){ return tag.name === feat.genTypeName; } else { return false; }
      });
      if(tag != null) {tags.push(tag);}
    }
    featMap.set(feat.id+'', {Feat : feat, Tags : tags});
  }
  g_featMap = featMap;

  let itemMap = new Map();
  for(let itemStruct of items){
    let tags = [];
    // Find tags by id
    for(let itemTag of itemStruct.Item.taggedItems){
      let tag = allTags.find(tag => {
        return tag.id === itemTag.tagID;
      });
      if(tag != null) {tags.push(tag);}
    }
    itemStruct.TagArray = tags;
    itemMap.set(itemStruct.Item.id+'', itemStruct);
  }
  g_itemMap = itemMap;

  let spellMap = new Map();
  for(let spell of spells){
    let tags = [];
    // Find tags by id
    for(let spellTag of spell.taggedSpells){
      let tag = allTags.find(tag => {
        return tag.id === spellTag.tagID;
      });
      if(tag != null) {tags.push(tag);}
    }
    spellMap.set(spell.id+'', {Spell : spell, Tags : tags});
  }
  g_spellMap = spellMap;


  let displayContainerID = 'bundle-container-'+g_activeBundle.id;
  $('#tabContent').parent().append('<div id="'+displayContainerID+'" class="is-hidden"></div>');
  $('#tabContent').addClass('is-hidden');
  stopSpinnerSubLoader();

  $('#'+displayContainerID).load("/templates/homebrew/display-view-bundle.html");
  $.ajax({ type: "GET",
    url: "/templates/homebrew/display-view-bundle.html",
    success : function(text)
    {

      $('#bundle-back-btn').click(function() {
        $('#'+displayContainerID).remove();
        $('#tabContent').removeClass('is-hidden');
        if($('#tabContent').is(':empty')){ $('#browseTab').trigger("click"); }
      });
      $('.category-tabs li').click(function() {
        $('#'+displayContainerID).remove();
      });

      let bundleName = g_activeBundle.name;
      if(g_activeBundle.hasKeys === 1){
        bundleName += '<sup class="has-txt-noted is-size-5 pl-1"><i class="fas fa-lock"></i></sup>';
      }
      $('#bundleName').html(bundleName);
      $('#bundleDescription').html(processText(g_activeBundle.description, false, false, 'MEDIUM', false));

      let contactInfoStr = (g_activeBundle.contactInfo != '') ? ', '+g_activeBundle.contactInfo : '';
      $('#bundleContactInfo').html('<span class="is-thin has-txt-partial-noted">–</span> '+g_activeBundle.authorName+' <span class="is-thin has-txt-partial-noted is-size-7">#'+g_activeBundle.userID+'</span>'+contactInfoStr);

      ///

      if(userHasBundle){
        $('#bundleCollectionRemoveBtn').removeClass('is-hidden');
      } else {
        $('#bundleCollectionAddBtn').removeClass('is-hidden');
      }

      // Hide add button if user isn't logged in
      if($('#homebrew-container').attr('data-user-id') == '') {
        $('#bundleCollectionAddBtn').addClass('is-hidden');
      }

      // Add Button //
      $('#bundleCollectionAddBtn').click(function() {
        if(g_activeBundle.hasKeys === 1){
          $('#add-locked-bundle-key-input').removeClass('is-danger');
          $('#add-locked-bundle-modal').addClass('is-active');
          $('html').addClass('is-clipped');
        } else {
          socket.emit('requestBundleChangeCollection', g_activeBundle.id, true);
        }
      });

      $('#add-locked-bundle-add-btn').click(function() {
        let keyInput = $('#add-locked-bundle-key-input').val();
        if(keyInput != ''){
          socket.emit('requestBundleChangeCollection', g_activeBundle.id, true, keyInput);
        }
      });
      $('#add-locked-bundle-modal-background,#add-locked-bundle-modal-close').click(function() {
        $('#add-locked-bundle-modal').removeClass('is-active');
        $('html').removeClass('is-clipped');
      });

      // Remove Button //
      $('#bundleCollectionRemoveBtn').click(function() {
        new ConfirmMessage('Remove from Collection', 'Are you sure you want to remove this bundle from your collection? Any content your characters are using from the bundle will be removed.', 'Remove', 'modal-remove-view-collection-bundle-'+g_activeBundle.id, 'modal-remove-view-collection-bundle-btn-'+g_activeBundle.id);
        $('#modal-remove-view-collection-bundle-btn-'+g_activeBundle.id).click(function() {
          socket.emit('requestBundleChangeCollection', g_activeBundle.id, false);
        });
      });

      ///

      socket.off("returnBundleChangeCollection");
      socket.on("returnBundleChangeCollection", function(toAdd, isSuccess){
        startSpinnerSubLoader();
        $('#'+displayContainerID).remove();
        socket.emit('requestBundleContents', 'VIEW', g_activeBundle.id);
        /*if(isSuccess){
          $('#add-locked-bundle-modal').removeClass('is-active');
          $('html').removeClass('is-clipped');
          $('#add-locked-bundle-key-input').val('');
          if(toAdd) {
            $('#bundleCollectionAddBtn').addClass('is-hidden');
            $('#bundleCollectionRemoveBtn').removeClass('is-hidden');
          } else {
            $('#bundleCollectionAddBtn').removeClass('is-hidden');
            $('#bundleCollectionRemoveBtn').addClass('is-hidden');
          }
        } else {
          if($('#add-locked-bundle-modal').hasClass('is-active')) {
            $('#add-locked-bundle-key-input').addClass('is-danger');
          }
        }*/
      });

      ///

      if(userOwnsBundle && g_activeBundle.hasKeys === 1){
        $('#bundleKeyManagementBtn').removeClass('is-hidden');
      }

      $('#bundleKeyManagementBtn').click(function() {
        socket.emit('requestBundleKeys', g_activeBundle.id);
      });

      ///

      if (REQUEST_TYPE === 'REQUIRE-KEY'){

        $('#view-require-key-container').removeClass('is-hidden');
        $('#view-locked-bundle-view-btn').click(function() {
          let keyInput = $('#view-locked-bundle-key-input').val();
          if(keyInput != ''){
            startSpinnerSubLoader();
            $('#'+displayContainerID).remove();
            socket.emit('requestBundleContents', 'VIEW', g_activeBundle.id, keyInput);
          }
        });

      }

      ///

      if(classes.length > 0){
        $('#bundleSectionClasses').removeClass('is-hidden');
        $('#bundleContainerClasses').html('');
        for(const cClass of classes){
          let viewClassID = 'entry-view-class-'+cClass.id;
          $('#bundleContainerClasses').append('<div class="columns is-mobile is-marginless mt-1 sub-section-box"><div class="column is-9"><p class="is-size-5">'+cClass.name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+viewClassID+'" class="button is-info is-outlined">View</button></div></div></div>');
          $('#'+viewClassID).click(function() {
            new DisplayClass(displayContainerID, cClass.id, featMap, g_activeBundle.id);
          });
        }
      }

      ///

      if(ancestries.length > 0){
        $('#bundleSectionAncestries').removeClass('is-hidden');
        $('#bundleContainerAncestries').html('');
        for(const ancestry of ancestries){
          let viewAncestryID = 'entry-view-ancestry-'+ancestry.id;
          $('#bundleContainerAncestries').append('<div class="columns is-mobile is-marginless mt-1 sub-section-box"><div class="column is-9"><p class="is-size-5">'+ancestry.name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+viewAncestryID+'" class="button is-info is-outlined">View</button></div></div></div>');
          $('#'+viewAncestryID).click(function() {
            new DisplayAncestry(displayContainerID, ancestry.id, featMap, g_activeBundle.id);
          });
        }
      }

      ///

      if(archetypes.length > 0){
        $('#bundleSectionArchetypes').removeClass('is-hidden');
        $('#bundleContainerArchetypes').html('');
        for(const archetype of archetypes){
          let viewArchetypeID = 'entry-view-archetype-'+archetype.id;
          $('#bundleContainerArchetypes').append('<div class="columns is-mobile is-marginless mt-1 sub-section-box"><div class="column is-9"><p class="is-size-5">'+archetype.name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+viewArchetypeID+'" class="button is-info is-outlined">View</button></div></div></div>');
          $('#'+viewArchetypeID).click(function() {
            new DisplayArchetype(displayContainerID, archetype.id, featMap, g_activeBundle.id);
          });
        }
      }

      ////

      if(backgrounds.length > 0){
        $('#bundleSectionBackgrounds').removeClass('is-hidden');
        $('#bundleContainerBackgrounds').html('');
        for(const background of backgrounds){
          let viewBackgroundID = 'entry-view-background-'+background.id;
          $('#bundleContainerBackgrounds').append('<div class="columns is-mobile is-marginless mt-1 sub-section-box"><div class="column is-9"><p class="is-size-5">'+background.name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+viewBackgroundID+'" class="button is-info is-outlined">View</button></div></div></div>');
          $('#'+viewBackgroundID).click(function() {
            new DisplayBackground(displayContainerID, background.id, g_activeBundle.id);
          });
        }
      }

      ////

      if(classFeatures.length > 0){
        let foundContent = false;
        $('#bundleSectionClassFeatures').removeClass('is-hidden');
        $('#bundleContainerClassFeatures').html('');
        for(const classFeature of classFeatures){
          if(classFeature.indivClassName == null || classFeature.selectOptionFor != null) {continue;} else {foundContent = true;}

          let viewClassFeatureID = 'entry-view-class-feature-'+classFeature.id;
          $('#bundleContainerClassFeatures').append('<div class="columns is-mobile is-marginless mt-1 sub-section-box"><div class="column is-9"><p class="is-size-5">'+classFeature.name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+viewClassFeatureID+'" class="button is-info is-outlined">View</button></div></div></div>');
          $('#'+viewClassFeatureID).click(function() {
            let classText = (classFeature.indivClassName != null) ? '~ Class:: '+classFeature.indivClassName+'\n' : '';
            let classAbilText = (classFeature.indivClassAbilName != null) ? '~ Option For:: '+classFeature.indivClassAbilName+'\n' : '';
            let description = classText+classAbilText+'----\n'+classFeature.description;
            openQuickView('abilityView', {
              Ability : {
                name: classFeature.name,
                description: description,
                level: classFeature.level,
                contentSrc: classFeature.contentSrc,
                homebrewID: classFeature.homebrewID,
                code: classFeature.code,
              }
            });
          });
        }

        if(!foundContent) {
          $('#bundleSectionClassFeatures').addClass('is-hidden');
        }
      }

      ////

      if(feats.length > 0){
        let foundContent = false;
        $('#bundleSectionFeats').removeClass('is-hidden');
        $('#bundleContainerFeats').html('');
        for(const feat of feats){
          if(feat.genericType == null) {continue;} else {foundContent = true;}

          let viewFeatID = 'entry-view-feat-activity-'+feat.id;
          $('#bundleContainerFeats').append('<div class="columns is-mobile is-marginless mt-1 sub-section-box"><div class="column is-9"><p class="is-size-5">'+feat.name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+viewFeatID+'" class="button is-info is-outlined">View</button></div></div></div>');
          $('#'+viewFeatID).click(function() {
            let featStruct = featMap.get(feat.id+'');
            openQuickView('featView', {
              Feat : featStruct.Feat,
              Tags : featStruct.Tags
            });
          });
        }

        if(!foundContent) {
          $('#bundleSectionFeats').addClass('is-hidden');
        }
      }

      ////

      if(heritages.length > 0){
        let foundContent = false;
        $('#bundleSectionHeritages').removeClass('is-hidden');
        $('#bundleContainerHeritages').html('');
        for(const heritage of heritages){
          if(heritage.indivAncestryName == null) {continue;} else {foundContent = true;}

          let viewHeritageID = 'entry-view-heritage-'+heritage.id;
          $('#bundleContainerHeritages').append('<div class="columns is-mobile is-marginless mt-1 sub-section-box"><div class="column is-9"><p class="is-size-5">'+heritage.name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+viewHeritageID+'" class="button is-info is-outlined">View</button></div></div></div>');
          $('#'+viewHeritageID).click(function() {
            let ancestryText = (heritage.indivAncestryName != null) ? '~ Ancestry:: '+heritage.indivAncestryName+'\n' : '';
            let rarityText = (heritage.rarity != null) ? '~ Rarity:: '+capitalizeWord(heritage.rarity)+'\n' : '';
            let description = ancestryText+rarityText+'----\n'+heritage.description;
            openQuickView('abilityView', {
              Ability : {
                name: heritage.name,
                description: description,
                level: 0,
                contentSrc: heritage.contentSrc,
                homebrewID: heritage.homebrewID,
                code: heritage.code,
              }
            });
          });
        }

        if(!foundContent) {
          $('#bundleSectionHeritages').addClass('is-hidden');
        }
      }

      ////

      if(uniheritages.length > 0){
        $('#bundleSectionUniHeritages').removeClass('is-hidden');
        $('#bundleContainerUniHeritages').html('');
        for(const uniheritage of uniheritages){
          let viewUniHeritageID = 'entry-view-uni-heritage-'+uniheritage.id;
          $('#bundleContainerUniHeritages').append('<div class="columns is-mobile is-marginless mt-1 sub-section-box"><div class="column is-9"><p class="is-size-5">'+uniheritage.name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+viewUniHeritageID+'" class="button is-info is-outlined">View</button></div></div></div>');
          $('#'+viewUniHeritageID).click(function() {
            new DisplayUniHeritage(displayContainerID, uniheritage.id, featMap, g_activeBundle.id);
          });
        }
      }

      ////

      if(items.length > 0){
        $('#bundleSectionItems').removeClass('is-hidden');
        $('#bundleContainerItems').html('');
        for(const itemStruct of items){
          let viewItemID = 'entry-view-item-'+itemStruct.Item.id;
          $('#bundleContainerItems').append('<div class="columns is-mobile is-marginless mt-1 sub-section-box"><div class="column is-9"><p class="is-size-5">'+itemStruct.Item.name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+viewItemID+'" class="button is-info is-outlined">View</button></div></div></div>');
          $('#'+viewItemID).click(function() {
            let fullItemStruct = itemMap.get(itemStruct.Item.id+'');
            openQuickView('itemView', {
              ItemDataStruct : fullItemStruct
            });
          });
        }
      }

      ////

      if(languages.length > 0){
        $('#bundleSectionLanguages').removeClass('is-hidden');
        $('#bundleContainerLanguages').html('');
        for(const language of languages){
          let viewLanguageID = 'entry-view-language-'+language.id;
          $('#bundleContainerLanguages').append('<div class="columns is-mobile is-marginless mt-1 sub-section-box"><div class="column is-9"><p class="is-size-5">'+language.name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+viewLanguageID+'" class="button is-info is-outlined">View</button></div></div></div>');
          $('#'+viewLanguageID).click(function() {
            openQuickView('languageView', {
              Language : language
            });
          });
        }
      }

      ////

      if(spells.length > 0){
        $('#bundleSectionSpells').removeClass('is-hidden');
        $('#bundleContainerSpells').html('');
        for(const spell of spells){
          let viewSpellID = 'entry-view-spell-'+spell.id;
          $('#bundleContainerSpells').append('<div class="columns is-mobile is-marginless mt-1 sub-section-box"><div class="column is-9"><p class="is-size-5">'+spell.name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+viewSpellID+'" class="button is-info is-outlined">View</button></div></div></div>');
          $('#'+viewSpellID).click(function() {
            let spellStruct = spellMap.get(spell.id+'');
            openQuickView('spellView', {
              SpellDataStruct: spellStruct,
            });
          });
        }
      }

      ////

      if(allTags.length > 0){
        let foundContent = false;
        $('#bundleSectionTraits').removeClass('is-hidden');
        $('#bundleContainerTraits').html('');
        for(const trait of allTags){
          if(trait.homebrewID == null || trait.isHidden == 1) {continue;} else {foundContent = true;}

          let viewTraitID = 'entry-view-trait-'+trait.id;
          $('#bundleContainerTraits').append('<div class="columns is-mobile is-marginless mt-1 sub-section-box"><div class="column is-9"><p class="is-size-5">'+trait.name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+viewTraitID+'" class="button is-info is-outlined">View</button></div></div></div>');
          $('#'+viewTraitID).click(function() {
            openQuickView('tagView', {
              TagName : trait.name,
              InputTag : trait,
            });
          });
        }

        if(!foundContent) {
          $('#bundleSectionTraits').addClass('is-hidden');
        }
      }

      ////

      if(toggleables.length > 0){
        $('#bundleSectionToggleables').removeClass('is-hidden');
        $('#bundleContainerToggleables').html('');
        for(const toggleable of toggleables){
          let viewToggleableID = 'entry-view-toggleable-'+toggleable.id;
          $('#bundleContainerToggleables').append('<div class="columns is-mobile is-marginless mt-1 sub-section-box"><div class="column is-9"><p class="is-size-5">'+toggleable.name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+viewToggleableID+'" class="button is-info is-outlined">View</button></div></div></div>');
          $('#'+viewToggleableID).click(function() {
            openQuickView('abilityView', {
              Ability : {
                name: toggleable.name,
                description: toggleable.description,
                level: 0,
                contentSrc: toggleable.contentSrc,
                homebrewID: toggleable.homebrewID,
                code: toggleable.code,
              }
            });
          });
        }
      }

      ////

      $('#'+displayContainerID).removeClass('is-hidden');
    }
  });
});