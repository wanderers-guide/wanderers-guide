/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function processClass() {

  const charClass = getCharClass();
  $(`#initial-stats-class`).html('');
  if(charClass != null){

    // Process initial class stats //
    $(`#initial-stats-class`).html(`
    
      <div class="pt-1">
        <div class="pos-relative">
          <div class="">
            <p class="text-center"><span class="is-size-3 has-text-weight-semibold">Class</span></p>
          </div>
        </div>

        <div class="columns is-tablet">
          <div class="column text-center">
            <p class="title-font is-bold">Key Ability</p>
            <p id="class-feature-initial-stats-display-key-ability"></p>
          </div>
          <div class="column text-center">
            <p class="title-font is-bold">Hit Points</p>
            <p id="class-feature-initial-stats-display-hit-points"></p>
          </div>
        </div>
        <div class="columns is-tablet">
          <div class="column text-center">
            <p class="title-font is-bold">Perception</p>
            <p id="class-feature-initial-stats-display-perception"></p>
          </div>
          <div class="column text-center">
            <p class="title-font is-bold">Skills</p>
            <p id="class-feature-initial-stats-display-skills"></p>
          </div>
        </div>
        <div class="columns is-tablet">
          <div class="column text-center">
            <p class="title-font is-bold">Saving Throws</p>
            <p id="class-feature-initial-stats-display-saving-throws"></p>
          </div>
          <div class="column text-center">
            <p class="title-font is-bold">Class DC</p>
            <p id="class-feature-initial-stats-display-class-dc"></p>
          </div>
        </div>
        <div class="columns is-tablet">
          <div class="column text-center">
            <p class="title-font is-bold">Attacks</p>
            <p id="class-feature-initial-stats-display-attacks"></p>
          </div>
          <div class="column text-center">
            <p class="title-font is-bold">Defenses</p>
            <p id="class-feature-initial-stats-display-defenses"></p>
          </div>
        </div>

        <hr class="mt-1 mb-0 mx-5">
        <div class="mx-5 my-1">
          <div id="class-feature-initial-stats-code-key-ability"></div>
          <div id="class-feature-initial-stats-code-hit-points"></div>
          <div id="class-feature-initial-stats-code-perception"></div>
          <div id="class-feature-initial-stats-code-skills"></div>
          <div id="class-feature-initial-stats-code-skills-extra"></div>
          <div id="class-feature-initial-stats-code-saving-throws"></div>
          <div id="class-feature-initial-stats-code-class-dc"></div>
          <div id="class-feature-initial-stats-code-attacks"></div>
          <div id="class-feature-initial-stats-code-defenses"></div>
        </div>
        <hr class="mt-0 mb-1 mx-0" style="height: 1px;">
      </div>
    
    `);
    processClassStats(charClass.Class, {

      keyAbility: {
        displayID: 'class-feature-initial-stats-display-key-ability',
        codeID: 'class-feature-initial-stats-code-key-ability',
      },
      hitPoints: {
        displayID: 'class-feature-initial-stats-display-hit-points',
        codeID: 'class-feature-initial-stats-code-hit-points',
      },
  
      perception: {
        displayID: 'class-feature-initial-stats-display-perception',
        codeID: 'class-feature-initial-stats-code-perception',
      },
      skills: {
        displayID: 'class-feature-initial-stats-display-skills',
        codeID: 'class-feature-initial-stats-code-skills',
      },
      savingThrows: {
        displayID: 'class-feature-initial-stats-display-saving-throws',
        codeID: 'class-feature-initial-stats-code-saving-throws',
      },
      classDC: {
        displayID: 'class-feature-initial-stats-display-class-dc',
        codeID: 'class-feature-initial-stats-code-class-dc',
      },
      attacks: {
        displayID: 'class-feature-initial-stats-display-attacks',
        codeID: 'class-feature-initial-stats-code-attacks',
      },
      defenses: {
        displayID: 'class-feature-initial-stats-display-defenses',
        codeID: 'class-feature-initial-stats-code-defenses',
      },
  
    }, PROCESS_CLASS_STATS_TYPE.BOTH);

    // Process each class feature //
    for(const classFeature of charClass.Abilities){
      if(classFeature.selectType != 'SELECT_OPTION' && classFeature.level <= g_char_level){
        $(`#level-${classFeature.level}-body`).append(`

          <div class="class-feature-section pt-1">
            <div class="pos-relative">
              <div class="fading-reveal-container is-active">
                <p class="class-feature-header text-center"><span class="is-size-4 has-text-weight-semibold">${classFeature.name}</span></p>
                <div id="class-feature-container-${classFeature.id}" class="class-feature-container ability-text-section px-1">
                </div>
              </div>
              <p class="reveal-container-text is-hidden has-text-info">Show More</p>
            </div>

            <div id="class-feature-selector-section-${classFeature.id}"></div>

            <hr id="class-feature-code-hr-${classFeature.id}" class="mt-1 mb-0 mx-5">
            <div id="class-feature-code-${classFeature.id}" class="mx-5"></div>
            <hr class="mt-0 mb-1 mx-0" style="height: 1px;">
          </div>

        `);

        const classFeature_srcStruct = {
          sourceType: 'class',
          sourceLevel: classFeature.level,
          sourceCode: 'classAbility-'+classFeature.id,
          sourceCodeSNum: 'a'
        };
        const classFeatureChoice_srcStruct = {
          sourceType: 'class',
          sourceLevel: classFeature.level,
          sourceCode: 'classAbilitySelector-'+classFeature.id,
          sourceCodeSNum: 'a',
        };

        const classArchetypeResult = applyClassArchetypeChoice(classFeature);
        if(classArchetypeResult != null){
          $(`#class-feature-container-${classFeature.id}`).append(classArchetypeResult.tabsHTML);
          assembleClassArchetypeTabs(classArchetypeResult.tabsID, classFeature.id, classFeature.description, classFeature_srcStruct);
        } else {
          $(`#class-feature-container-${classFeature.id}`).append(processText(classFeature.description, false, null));
        }

        // Run code        
        processCode(
          replaceClassFeatureCodeFromClassArchetype(classFeature.id, classFeature.code, classFeature_srcStruct),
          classFeature_srcStruct,
          `class-feature-code-${classFeature.id}`,
          {source: 'Class Feature', sourceName: classFeature.name+' (Lvl '+classFeature.level+')'});

        // Hide top hr if no code result is generated
        if($(`#class-feature-code-${classFeature.id}`).html() == '' || $(`#class-feature-code-${classFeature.id}`).find('div').html() == ''){
          $(`#class-feature-code-hr-${classFeature.id}`).addClass('is-hidden');
        }

        // Selection Options
        if(classFeature.selectType === 'SELECTOR') {
          
          let selectionOptionListHTML = `
            <option value="chooseDefault">Choose a ${classFeature.name}</option>
            <optgroup label="──────────"></optgroup>
          `;
          
          const choice = getDataSingleClassChoice(classFeatureChoice_srcStruct);

          for(const classFeatureOption of charClass.Abilities) {
            if(classFeatureOption.selectType === 'SELECT_OPTION' && (classFeatureOption.selectOptionFor === classFeature.id || classFeatureOption.indivClassAbilName === classFeature.name)) {

              if(choice != null && choice.OptionID == classFeatureOption.id) {
                selectionOptionListHTML += '<option value="'+classFeatureOption.id+'" selected>'+classFeatureOption.name+'</option>';
              } else {
                selectionOptionListHTML += '<option value="'+classFeatureOption.id+'">'+classFeatureOption.name+'</option>';
              }

            }
          }

          $(`#class-feature-selector-section-${classFeature.id}`).html(`

            <div class="field is-grouped is-grouped-centered">
              <div class="select">
                <select id="class-feature-selector-${classFeature.id}" class="classAbilSelection">
                  ${selectionOptionListHTML}
                </select>
              </div>
            </div>
            <div id="class-feature-selector-result-${classFeature.id}" class="columns is-centered m-0 is-hidden">
              <div class="column is-mobile is-10 p-0 mb-2">
                <article class="message is-info">
                  <div class="message-body">

                    <div class="pos-relative">
                      <div class="fading-reveal-container is-active">
                        <div id="class-feature-selector-description-${classFeature.id}" class="has-text-left"></div>
                      </div>
                      <p class="reveal-container-text is-hidden has-text-info">Show More</p>
                    </div>

                    <div id="class-feature-selector-code-${classFeature.id}"></div>

                  </div>
                </article>
              </div>
            </div>

          `);

          // Class Feature Selector
          $(`#class-feature-selector-${classFeature.id}`).change(function(event, triggerSave){

            $(`#class-feature-selector-description-${classFeature.id}`).html('');
            $(`#class-feature-selector-code-${classFeature.id}`).html('');

            if($(this).val() == 'chooseDefault'){
              $(this).parent().addClass("is-info");
              $(`#class-feature-selector-result-${classFeature.id}`).addClass('is-hidden');

              // Save choice
              if(g_char_id != null){
                socket.emit("requestClassChoiceChange",
                    g_char_id,
                    classFeatureChoice_srcStruct,
                    null);

                // Clear all data under srcStruct
                socket.emit("requestDataClearAtSrcStruct",
                    g_char_id,
                    classFeatureChoice_srcStruct);
              } else {
                saveBuildMetaData();
              }

              deleteDataBySourceStruct(classFeatureChoice_srcStruct);

              if(triggerSave == null || triggerSave) {
                initExpressionProcessor();// Update getCurrentClassAbilityNameArray()
              }
              
            } else {
              $(this).parent().removeClass("is-info");
              $(`#class-feature-selector-result-${classFeature.id}`).removeClass('is-hidden');

              const chosenClassFeature = charClass.Abilities.find(cf => {
                return cf.id == $(this).val();
              });

              const classArchetypeOptionResult = applyClassArchetypeChoice(chosenClassFeature);
              if(classArchetypeOptionResult != null){
                $(`#class-feature-selector-description-${classFeature.id}`).html(classArchetypeOptionResult.tabsHTML);
                assembleClassArchetypeTabs(classArchetypeOptionResult.tabsID, chosenClassFeature.id, chosenClassFeature.description, classFeatureChoice_srcStruct);
              } else {
                $(`#class-feature-selector-description-${classFeature.id}`).html(processText(chosenClassFeature.description, false, null));
              }

              // Save choice
              if(triggerSave == null || triggerSave) {
                if(g_char_id != null){
                  socket.emit("requestClassChoiceChange",
                    g_char_id,
                    classFeatureChoice_srcStruct,
                    { SelectorID : classFeature.id, OptionID : chosenClassFeature.id });
                } else {
                  saveBuildMetaData();
                }
                setDataClassChoice(classFeatureChoice_srcStruct, classFeature.id, chosenClassFeature.id);
                initExpressionProcessor();// Update getCurrentClassAbilityNameArray()
              }

              // Run class feature option code
              processCode(
                replaceClassFeatureCodeFromClassArchetype(chosenClassFeature.id, chosenClassFeature.code, classFeatureChoice_srcStruct),
                classFeatureChoice_srcStruct,
                `class-feature-selector-code-${classFeature.id}`,
                {source: 'Class Feature Option', sourceName: classFeature.name+' - '+chosenClassFeature.name});

            }

            $(this).blur();
          });
          $(`#class-feature-selector-${classFeature.id}`).trigger('change', [false]);

        }

      }
    }

  }

}

function deleteClass(){

  resetClassArchetypes();
  deleteDataBySourceType('class');
  g_character.classID = null;

}

function setClass(classID){

  g_character.classID = classID;

}