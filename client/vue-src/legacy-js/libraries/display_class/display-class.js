/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

class DisplayClass {
  constructor(containerID, classID, featMap, homebrewID=null, backButton=true) {
    startSpinnerSubLoader();

    featMap = new Map([...featMap.entries()].sort(
      function(a, b) {
          if (a[1].Feat.level === b[1].Feat.level) {
              // Name is only important when levels are the same
              return a[1].Feat.name > b[1].Feat.name ? 1 : -1;
          }
          return a[1].Feat.level - b[1].Feat.level;
      })
    );

    let classDisplayContainerID = 'class-container-'+classID;
    $('#'+containerID).parent().append('<div id="'+classDisplayContainerID+'" class="generated-display-container is-hidden"></div>');
    $('#'+containerID).addClass('is-hidden');

    socket.emit('requestGeneralClass', classID, homebrewID);
    socket.off('returnGeneralClass');
    socket.on("returnGeneralClass", function(classStruct){
      $('#'+classDisplayContainerID).load("/templates/display-class.html");
      $.ajax({ type: "GET",
        url: "/templates/display-class.html",   
        success : function(text)
        {

          if(backButton){
            $('#class-back-btn').removeClass('is-hidden');
            $('#class-back-btn').click(function() {
              $('#'+classDisplayContainerID).remove();
              $('#'+containerID).removeClass('is-hidden');
            });
            $('.category-tabs li').click(function() {
              $('#'+classDisplayContainerID).remove();
              $('#'+containerID).removeClass('is-hidden');
            });
          }

          $('#class-name').html(classStruct.class.name);

          let sourceTextName = getContentSourceTextName(classStruct.class.contentSrc);
          let sourceLink = getContentSourceLink(classStruct.class.contentSrc);
          if(classStruct.class.homebrewID != null){
            sourceTextName = 'Bundle #'+classStruct.class.homebrewID;
            sourceLink = '/homebrew/?view_id='+classStruct.class.homebrewID;
          }
          let sourceStr = '<a class="has-txt-noted" href="'+sourceLink+'" target="_blank">'+sourceTextName+'</a><span class="has-txt-faded">, #'+classStruct.class.id+'</span>';

          let classRarity = convertRarityToHTML(classStruct.class.rarity);
          if(classRarity != ''){ sourceStr = '<span class="pr-2">'+sourceStr+'</span>'; }
          $('#class-source').html(sourceStr+classRarity);

          $('#class-description').html(processText(classStruct.class.description, false, false, 'MEDIUM', false));

          showMoreCheck();// Check if description is too long, reveal show more instead

          if(classStruct.class.artworkURL != null){
            $('#class-artwork-img').removeClass('is-hidden');
            $('#class-artwork-img').attr('src', classStruct.class.artworkURL);
          } else {
            $('#class-artwork-img').addClass('is-hidden');
            $('#class-artwork-img').attr('src', '');
          }
          
          if(classStruct.class.keyAbility == 'OTHER') {
            $('#class-key-ability').html('<p class="pl-1">Varies</p>');
            $('#class-key-ability-desc').html('At 1st level, your class gives you an ability boost - usually depending on one of your class features.');
          } else {
            $('#class-key-ability').html('<p class="pl-1">'+classStruct.class.keyAbility+'</p>');
            $('#class-key-ability-desc').html('At 1st level, your class gives you an ability boost to '+classStruct.class.keyAbility+'.');
          }

          $('#class-hit-points').html('<p class="pl-1">'+classStruct.class.hitPoints+'</p>');

          $('#class-perception').html('<span class="has-txt-value-string is-italic">'+profToWord(classStruct.class.tPerception)+'</span>');
          $('#class-saving-throw-fort').html('<span class="has-txt-value-string is-italic">'+profToWord(classStruct.class.tFortitude)+'</span> in Fortitude');
          $('#class-saving-throws-reflex').html('<span class="has-txt-value-string is-italic">'+profToWord(classStruct.class.tReflex)+'</span> in Reflex');
          $('#class-saving-throws-will').html('<span class="has-txt-value-string is-italic">'+profToWord(classStruct.class.tWill)+'</span> in Will');

          let tWeaponsArray = classStruct.class.tWeapons.split(',,, ');
          for(const tWeapons of tWeaponsArray){
            let sections = tWeapons.split(':::');
            let weapTraining = sections[0];
            let weaponName = sections[1];
            if(weaponName.slice(-1) === 's'){
              // is plural
              $('#class-attacks').append('<p class="class-starting-prof"><span class="has-txt-value-string is-italic">'+profToWord(weapTraining)+'</span> in all '+weaponName+'</p>');
            } else {
              // is singular
              $('#class-attacks').append('<p class="class-starting-prof"><span class="has-txt-value-string is-italic">'+profToWord(weapTraining)+'</span> in the '+weaponName+'</p>');
            }
          }
          if(classStruct.class.weaponsExtra != null) {
            let weapLines = classStruct.class.weaponsExtra.split('\n');
            for(const weapLine of weapLines){
              let newWeapLine = weapLine;
              newWeapLine = newWeapLine.replace('Untrained','<span class="has-txt-value-string is-italic">Untrained</span>');
              newWeapLine = newWeapLine.replace('Trained','<span class="has-txt-value-string is-italic">Trained</span>');
              newWeapLine = newWeapLine.replace('Expert','<span class="has-txt-value-string is-italic">Expert</span>');
              newWeapLine = newWeapLine.replace('Master','<span class="has-txt-value-string is-italic">Master</span>');
              newWeapLine = newWeapLine.replace('Legendary','<span class="has-txt-value-string is-italic">Legendary</span>');
              $('#class-attacks').append(`<p class="class-starting-prof">${newWeapLine}</p>`);
            }
          }

          if(classStruct.class.tSkills != null){
            $('#class-skills').html('<span class="has-txt-value-string is-italic">Trained</span> in '+classStruct.class.tSkills);
          }
          $('#class-skills-extra').html('<span class="has-txt-value-string is-italic">Trained</span> in a number of additional skills equal to '+classStruct.class.tSkillsMore+' plus your Intelligence modifier');

          $('#class-class-dc').html('<span class="has-txt-value-string is-italic">'+profToWord(classStruct.class.tClassDC)+'</span>');
          
          let tArmorArray = classStruct.class.tArmor.split(',,, ');
          for(const tArmor of tArmorArray){
            let sections = tArmor.split(':::');
            let armTraining = sections[0];
            let armName = sections[1];
            $('#class-defenses').append('<p class="class-starting-prof"><span class="has-txt-value-string is-italic">'+profToWord(armTraining)+'</span> in all '+armName+'</p>');
          }

          ///

          $('#class-features-level-select').change(function(){
            $('#class-features').html('');
            let level = $(this).val();
            let firstEntry = true;
            for(const classFeature of classStruct.class_features){
              if(classFeature.level != level || classFeature.selectType == 'SELECT_OPTION'){ continue; }
              if(firstEntry) { firstEntry = false; } else { $('#class-features').append('<hr class="m-2">'); }

              let sourceTextName = getContentSourceTextName(classFeature.contentSrc);
              if(classFeature.homebrewID != null){
                sourceTextName = 'Bundle #'+classFeature.homebrewID;
              }

              $('#class-features').append(`
                <div class="pos-relative">
                  <div class="fading-reveal-container is-active">
                    <p class="is-size-4 has-text-weight-semibold has-text-centered has-txt-listing">${classFeature.name}</p>
                    ${processText(classFeature.description, false, null)}
                  </div>
                  <p class="reveal-container-text is-hidden has-text-info">Show More</p>

                  <span style="position: absolute; top: 0px; right: 5px;" class="is-size-7 has-txt-noted is-italic">${sourceTextName}</span>
                </div>
              `);

              if(classFeature.selectType == 'SELECTOR'){
                $('#class-features').append('<p class="has-text-centered is-size-5 has-text-weight-semibold">Options</p)');
                for(const subClassFeature of classStruct.class_features){
                  if(subClassFeature.selectType == 'SELECT_OPTION' && (subClassFeature.selectOptionFor == classFeature.id || subClassFeature.indivClassAbilName === classFeature.name)) {

                    let subEntryID = 'class-feature-option-'+subClassFeature.id;
                    $('#class-features').append('<div id="'+subEntryID+'" style="max-width: 300px; margin: auto;" class="border border-dark-lighter has-bg-selectable cursor-clickable p-2"><p class="has-text-centered">'+subClassFeature.name+'</p></div)');

                    $('#'+subEntryID).click(function(){
                      openQuickView('abilityView', {
                        Ability : subClassFeature
                      });
                    });
                    
                    $('#'+subEntryID).mouseenter(function(){
                      $(this).removeClass('has-bg-selectable');
                      $(this).addClass('has-bg-selectable-hover');
                    });
                    $('#'+subEntryID).mouseleave(function(){
                      $(this).removeClass('has-bg-selectable-hover');
                      $(this).addClass('has-bg-selectable');
                    });

                  }
                }
              }

              
              if(typeof g_isDeveloper !== 'undefined' && g_isDeveloper && classFeature.code != null && classFeature.code.trim() != '') {
                $('#class-features').append('<p class="is-size-6 is-bold pl-2">WSC Statements</p>');
                
                let codeHTML = '';
                for(let codeStatement of classFeature.code.split(/\n/)){
                  codeHTML += '<p class="is-size-7">'+codeStatement+'</p>';
                }
                $('#class-features').append('<div class="code-block">'+codeHTML+'</div>');
              }

            }
          });
          $('#class-features-level-select').trigger('change');

          ///

          let classFeatLevel = 0;
          for(const [featID, featStruct] of featMap.entries()){
            let tag = featStruct.Tags.find(tag => {
              return tag.id === classStruct.class.tagID;
            });
            if(tag != null){
              if(featStruct.Feat.level <= 0) { continue; }
              if(featStruct.Feat.level > classFeatLevel){
                classFeatLevel = featStruct.Feat.level;
                $('#class-feats').append('<div class="border-bottom border-dark-lighter has-bg-options-header-bold text-center is-bold"><p>Level '+classFeatLevel+'</p></div>');
              }

              let sourceTextName = getContentSourceTextName(featStruct.Feat.contentSrc);
              if(featStruct.Feat.homebrewID != null){
                sourceTextName = 'Bundle #'+featStruct.Feat.homebrewID;
              }

              let featEntryID = 'class-feat-'+featStruct.Feat.id;
              $('#class-feats').append('<div id="'+featEntryID+'" class="border-bottom border-dark-lighter px-2 py-2 has-bg-selectable cursor-clickable pos-relative"><span class="pl-4 is-p">'+featStruct.Feat.name+convertActionToHTML(featStruct.Feat.actions)+'</span><span class="pos-absolute pos-b-5 pos-r-5 is-size-7-5 is-hidden-mobile has-txt-noted is-italic">'+sourceTextName+'</span></div>');

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
          
          stopSpinnerSubLoader();
          $('#'+classDisplayContainerID).removeClass('is-hidden');
        }
      });
    });
  }
}