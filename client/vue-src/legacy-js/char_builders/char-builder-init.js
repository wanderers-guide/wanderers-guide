/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();
let isBuilderInit = false;


// ~~~~~~~~~~~~~~ // General - Run On Load // ~~~~~~~~~~~~~~ //
$(function () {

    // Change page
    $("#nextButton").click(function(){
      // Hardcoded redirect to page 2
      window.location.href = '/profile/characters/builder/?id='+getCharIDFromURL()+'&page=2';
    });
    initBuilderSteps();
    
    // On load get basic character info
    socket.emit("requestCharacterDetails",
        getCharIDFromURL());

});

function initBuilderSteps(){

  $('.builder-basics-page-btn').click(function(){
    window.location.href = '/profile/characters/builder/basics/?id='+getCharIDFromURL();
  });
  $('.builder-ancestry-page-btn').click(function(){
    window.location.href = '/profile/characters/builder/?id='+getCharIDFromURL()+'&page=2';
  });
  $('.builder-background-page-btn').click(function(){
    window.location.href = '/profile/characters/builder/?id='+getCharIDFromURL()+'&page=3';
  });
  $('.builder-class-page-btn').click(function(){
    window.location.href = '/profile/characters/builder/?id='+getCharIDFromURL()+'&page=4';
  });
  // Sheet btn is set in returnCharacterDetails because it needs character object.

}

// ~~~~~~~~~~~~~~ // Processings // ~~~~~~~~~~~~~~ //

socket.on("returnCharacterDetails", function(character, buildInfo, clientsWithAccess, campaign, hBundles, progessBundles){
    isBuilderInit = true;

    $('.builder-finalize-page-btn').click(function(){
      if(character.name != null && character.ancestryID != null && character.backgroundID != null && character.classID != null){
        window.location.href ='/profile/characters/'+getCharIDFromURL();
      } else {
        let charRequirements = '';
        if(character.name == null){ charRequirements += '<br><span class="is-bold">Name</span>'; }
        if(character.ancestryID == null){ charRequirements += '<br><span class="is-bold">Ancestry</span>'; }
        if(character.backgroundID == null){ charRequirements += '<br><span class="is-bold">Background</span>'; }
        if(character.classID == null){ charRequirements += '<br><span class="is-bold">Class</span>'; }
        new ConfirmMessage('Incomplete Character', 'Your character requires the following before you can view their sheet:'+charRequirements, 'Okay', 'modal-incomplete-character', 'modal-incomplete-character-btn', 'is-info');
      }
    });

    displayExternalCharacterAccess(clientsWithAccess);

    // When character name changes, save name
    $("#charName").change(function(){

        let validNameRegex = /^[^@#$%^*~=\/\\]+$/;
        if(validNameRegex.test($(this).val())) {
            $(this).removeClass("is-danger");
            $("#charNameSideIcon").addClass("is-hidden");

            $("#charNameControlShell").addClass("is-medium is-loading");
            socket.emit("requestNameChange",
                getCharIDFromURL(),
                $(this).val());

        } else {
            $(this).addClass("is-danger");
            $("#charNameSideIcon").removeClass("is-hidden");
        }

    });

    // When character level changes, save level
    $("#charLevel").change(function(){
      const newLevel = $(this).val();
      if(parseInt(newLevel) < character.level){
        $("#charLevel").val(character.level);
        new ConfirmMessage('Decrease Level', 'Are you sure you want to decrease your character\'s level? Any selections you\'ve made at a higher level than the new level will be erased.', 'Change', 'modal-decrease-character-level', 'modal-decrease-character-level-btn');
        $('#modal-decrease-character-level-btn').click(function() {
          $("#charLevel").val(newLevel);
          character.level = newLevel;
          socket.emit("requestLevelChange",
              getCharIDFromURL(),
              newLevel);
        });
      } else {
        character.level = newLevel;
        socket.emit("requestLevelChange",
            getCharIDFromURL(),
            newLevel);
      }

    });

    // Display if using build
    if(buildInfo != null){
      $('#character-build').text(buildInfo.build.name);
      $('#character-build').parent().removeClass('is-hidden');

      $('#character-build').click(function(){
        window.open('/builds/?view_id='+buildInfo.build.id, '_blank');
      });
    }

    // Set builder type
    if(character.builderByLevel === 1){
      $('#builder-by-level').prop('checked', true);
      $('#builder-by-abc').prop('checked', false);
      $('.is-builder-type-by-level').removeClass('is-hidden');
      $('.is-builder-type-by-abc').addClass('is-hidden');
    } else {
      $('#builder-by-level').prop('checked', false);
      $('#builder-by-abc').prop('checked', true);
      $('.is-builder-type-by-level').addClass('is-hidden');
      $('.is-builder-type-by-abc').removeClass('is-hidden');
    }
    $("#builder-by-level").click(function(){
      $('.is-builder-type-by-level').removeClass('is-hidden');
      $('.is-builder-type-by-abc').addClass('is-hidden');
      socket.emit("requestBuilderTypeChange",
          getCharIDFromURL(),
          'by-level');
    });
    $("#builder-by-abc").click(function(){
      $('.is-builder-type-by-level').addClass('is-hidden');
      $('.is-builder-type-by-abc').removeClass('is-hidden');
      socket.emit("requestBuilderTypeChange",
          getCharIDFromURL(),
          'by-abc');
    });

    // Handle campaign content
    setupCampaignDetails(campaign);

    // When ability score changes, save them all
    $("#abilSTR").blur(function(){
        deployAbilityScoreChange();
    });
    $("#abilDEX").blur(function(){
        deployAbilityScoreChange();
    });
    $("#abilCON").blur(function(){
        deployAbilityScoreChange();
    });
    $("#abilINT").blur(function(){
        deployAbilityScoreChange();
    });
    $("#abilWIS").blur(function(){
        deployAbilityScoreChange();
    });
    $("#abilCHA").blur(function(){
        deployAbilityScoreChange();
    });

    handleCharacterOptions(character, hBundles, progessBundles);

    // Turn off page loading
    stopSpinnerLoader();

});

function setupCampaignDetails(campaign){

  let campaignName = (campaign) ? campaign.name : 'None';
  $("#campaign-name").text(campaignName);
  
  $("#campaign-leave-btn").off("click");
  $("#campaign-leave-btn").click(function(){
    new ConfirmMessage('Leave Campaign', `Are you sure you want to leave "${campaignName}"? The GM will no longer have access to this character.`, 'Leave', 'modal-leave-campaign', 'modal-leave-campaign-btn');
    $('#modal-leave-campaign-btn').click(function() {
      socket.emit("requestLeaveCampaign", getCharIDFromURL());
    });
  });

  $("#campaign-access-code-btn").off("click");
  $("#campaign-access-code-btn").click(function(){
    let accessCode = $('#campaign-access-code-input').val();
    if(accessCode && accessCode.trim() != ''){

      new ConfirmMessage('Join Campaign', `Are you sure you want to join a campaign? The GM will have viewing and editing access to this character.`, 'Join', 'modal-join-campaign', 'modal-join-campaign-btn', 'is-info');
      $('#modal-join-campaign-btn').click(function() {
        socket.emit("requestJoinCampaign", getCharIDFromURL(), accessCode.trim());
        $('#campaign-access-code-input').val('');
      });

    }
  });

  if(campaign){
    $('#campaign-container-join').addClass('is-hidden');
    $('#campaign-container-leave').removeClass('is-hidden');
  } else {
    $('#campaign-container-join').removeClass('is-hidden');
    $('#campaign-container-leave').addClass('is-hidden');
  }

}

function deployAbilityScoreChange(){

    let strVal = $('#abilSTR').val();
    let dexVal = $('#abilDEX').val();
    let conVal = $('#abilCON').val();
    let intVal = $('#abilINT').val();
    let wisVal = $('#abilWIS').val();
    let chaVal = $('#abilCHA').val();

    const MAX_VAL = 30;
    const MIN_VAL = 0;

    if(strVal <= MAX_VAL && dexVal <= MAX_VAL && conVal <= MAX_VAL && intVal <= MAX_VAL && wisVal <= MAX_VAL && chaVal <= MAX_VAL && strVal >= MIN_VAL && dexVal >= MIN_VAL && conVal >= MIN_VAL && intVal >= MIN_VAL && wisVal >= MIN_VAL && chaVal >= MIN_VAL) {
        
        $('.abilScoreSet').removeClass("is-danger");

        socket.emit("requestAbilityScoreChange", 
            getCharIDFromURL(), 
            strVal,
            dexVal,
            conVal,
            intVal,
            wisVal,
            chaVal);

    } else {
        $('.abilScoreSet').addClass("is-danger");
    }
}

function handleCharacterOptions(character, hBundles, progessBundles) {
    displayHomebrewBundles(character, hBundles, progessBundles);

    // Content Sources //
    let contentSourceArray = JSON.parse(character.enabledSources);

    $("#contentSrc-CRB").change(function(){
        socket.emit("requestCharacterSourceChange", 
            getCharIDFromURL(), 
            'CRB',
            this.checked);
    });
    $("#contentSrc-CRB").prop('checked', contentSourceArray.includes('CRB'));

    $("#contentSrc-ADV-PLAYER-GUIDE").change(function(){
        socket.emit("requestCharacterSourceChange", 
            getCharIDFromURL(), 
            'ADV-PLAYER-GUIDE',
            this.checked);
    });
    $("#contentSrc-ADV-PLAYER-GUIDE").prop('checked', contentSourceArray.includes('ADV-PLAYER-GUIDE'));

    $("#contentSrc-GM-GUIDE").change(function(){
        socket.emit("requestCharacterSourceChange", 
            getCharIDFromURL(), 
            'GM-GUIDE',
            this.checked);
    });
    $("#contentSrc-GM-GUIDE").prop('checked', contentSourceArray.includes('GM-GUIDE'));

    $("#contentSrc-BOOK-OF-DEAD").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'BOOK-OF-DEAD',
          this.checked);
    });
    $("#contentSrc-BOOK-OF-DEAD").prop('checked', contentSourceArray.includes('BOOK-OF-DEAD'));

    $("#contentSrc-SECRETS-OF-MAGIC").change(function(){
        socket.emit("requestCharacterSourceChange", 
            getCharIDFromURL(), 
            'SECRETS-OF-MAGIC',
            this.checked);
    });
    $("#contentSrc-SECRETS-OF-MAGIC").prop('checked', contentSourceArray.includes('SECRETS-OF-MAGIC'));

    $("#contentSrc-GUNS-AND-GEARS").change(function(){
        socket.emit("requestCharacterSourceChange", 
            getCharIDFromURL(), 
            'GUNS-AND-GEARS',
            this.checked);
    });
    $("#contentSrc-GUNS-AND-GEARS").prop('checked', contentSourceArray.includes('GUNS-AND-GEARS'));

    $("#contentSrc-DARK-ARCHIVE").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'DARK-ARCHIVE',
          this.checked);
    });
    $("#contentSrc-DARK-ARCHIVE").prop('checked', contentSourceArray.includes('DARK-ARCHIVE'));

    $("#contentSrc-RAGE-OF-ELEMENTS").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'RAGE-OF-ELEMENTS',
          this.checked);
    });
    $("#contentSrc-RAGE-OF-ELEMENTS").prop('checked', contentSourceArray.includes('RAGE-OF-ELEMENTS'));

    $("#contentSrc-LOST-ANCESTRY-GUIDE").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'LOST-ANCESTRY-GUIDE',
          this.checked);
    });
    $("#contentSrc-LOST-ANCESTRY-GUIDE").prop('checked', contentSourceArray.includes('LOST-ANCESTRY-GUIDE'));
    
    $("#contentSrc-LOST-CHAR-GUIDE").change(function(){
        socket.emit("requestCharacterSourceChange", 
            getCharIDFromURL(), 
            'LOST-CHAR-GUIDE',
            this.checked);
    });
    $("#contentSrc-LOST-CHAR-GUIDE").prop('checked', contentSourceArray.includes('LOST-CHAR-GUIDE'));

    $("#contentSrc-LOST-CITY-ABSALOM").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'LOST-CITY-ABSALOM',
          this.checked);
    });
    $("#contentSrc-LOST-CITY-ABSALOM").prop('checked', contentSourceArray.includes('LOST-CITY-ABSALOM'));

    $("#contentSrc-LOST-GOD-MAGIC").change(function(){
        socket.emit("requestCharacterSourceChange", 
            getCharIDFromURL(), 
            'LOST-GOD-MAGIC',
            this.checked);
    });
    $("#contentSrc-LOST-GOD-MAGIC").prop('checked', contentSourceArray.includes('LOST-GOD-MAGIC'));

    $("#contentSrc-LOST-GRAND-BAZAAR").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'LOST-GRAND-BAZAAR',
          this.checked);
    });
    $("#contentSrc-LOST-GRAND-BAZAAR").prop('checked', contentSourceArray.includes('LOST-GRAND-BAZAAR'));

    $("#contentSrc-LOST-IMPOSSIBLE-LANDS").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'LOST-IMPOSSIBLE-LANDS',
          this.checked);
    });
    $("#contentSrc-LOST-IMPOSSIBLE-LANDS").prop('checked', contentSourceArray.includes('LOST-IMPOSSIBLE-LANDS'));

    $("#contentSrc-LOST-KNIGHTS-WALL").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'LOST-KNIGHTS-WALL',
          this.checked);
    });
    $("#contentSrc-LOST-KNIGHTS-WALL").prop('checked', contentSourceArray.includes('LOST-KNIGHTS-WALL'));

    $("#contentSrc-LOST-LEGENDS").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'LOST-LEGENDS',
          this.checked);
    });
    $("#contentSrc-LOST-LEGENDS").prop('checked', contentSourceArray.includes('LOST-LEGENDS'));

    $("#contentSrc-LOST-MWANGI").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'LOST-MWANGI',
          this.checked);
    });
    $("#contentSrc-LOST-MWANGI").prop('checked', contentSourceArray.includes('LOST-MWANGI'));

    $("#contentSrc-LOST-MONSTERS-MYTH").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'LOST-MONSTERS-MYTH',
          this.checked);
    });
    $("#contentSrc-LOST-MONSTERS-MYTH").prop('checked', contentSourceArray.includes('LOST-MONSTERS-MYTH'));

    $("#contentSrc-LOST-SOCIETY-GUIDE").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'LOST-SOCIETY-GUIDE',
          this.checked);
    });
    $("#contentSrc-LOST-SOCIETY-GUIDE").prop('checked', contentSourceArray.includes('LOST-SOCIETY-GUIDE'));

    $("#contentSrc-LOST-TRAVEL-GUIDE").change(function(){
        socket.emit("requestCharacterSourceChange", 
            getCharIDFromURL(), 
            'LOST-TRAVEL-GUIDE',
            this.checked);
    });
    $("#contentSrc-LOST-TRAVEL-GUIDE").prop('checked', contentSourceArray.includes('LOST-TRAVEL-GUIDE'));

    $("#contentSrc-LOST-WORLD-GUIDE").change(function(){
        socket.emit("requestCharacterSourceChange", 
            getCharIDFromURL(), 
            'LOST-WORLD-GUIDE',
            this.checked);
    });
    $("#contentSrc-LOST-WORLD-GUIDE").prop('checked', contentSourceArray.includes('LOST-WORLD-GUIDE'));

    $("#contentSrc-ABOMINATION-VAULTS").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'ABOMINATION-VAULTS',
          this.checked);
    });
    $("#contentSrc-ABOMINATION-VAULTS").prop('checked', contentSourceArray.includes('ABOMINATION-VAULTS'));
    
    $("#contentSrc-AGENTS-OF-EDGEWATCH").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'AGENTS-OF-EDGEWATCH',
          this.checked);
    });
    $("#contentSrc-AGENTS-OF-EDGEWATCH").prop('checked', contentSourceArray.includes('AGENTS-OF-EDGEWATCH'));
    
    $("#contentSrc-AGE-OF-ASHES").change(function(){
        socket.emit("requestCharacterSourceChange", 
            getCharIDFromURL(), 
            'AGE-OF-ASHES',
            this.checked);
    });
    $("#contentSrc-AGE-OF-ASHES").prop('checked', contentSourceArray.includes('AGE-OF-ASHES'));

    $("#contentSrc-BLOOD-LORDS").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'BLOOD-LORDS',
          this.checked);
    });
    $("#contentSrc-BLOOD-LORDS").prop('checked', contentSourceArray.includes('BLOOD-LORDS'));

    $("#contentSrc-CROWN-OF-KOBOLD-KING").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'CROWN-OF-KOBOLD-KING',
          this.checked);
    });
    $("#contentSrc-CROWN-OF-KOBOLD-KING").prop('checked', contentSourceArray.includes('CROWN-OF-KOBOLD-KING'));

    $("#contentSrc-EXTINCTION-CURSE").change(function(){
        socket.emit("requestCharacterSourceChange", 
            getCharIDFromURL(), 
            'EXTINCTION-CURSE',
            this.checked);
    });
    $("#contentSrc-EXTINCTION-CURSE").prop('checked', contentSourceArray.includes('EXTINCTION-CURSE'));

    $("#contentSrc-FALL-OF-PLAGUE").change(function(){
        socket.emit("requestCharacterSourceChange", 
            getCharIDFromURL(), 
            'FALL-OF-PLAGUE',
            this.checked);
    });
    $("#contentSrc-FALL-OF-PLAGUE").prop('checked', contentSourceArray.includes('FALL-OF-PLAGUE'));

    $("#contentSrc-FIST-PHOENIX").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'FIST-PHOENIX',
          this.checked);
    });
    $("#contentSrc-FIST-PHOENIX").prop('checked', contentSourceArray.includes('FIST-PHOENIX'));

    $("#contentSrc-KINGMAKER").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'KINGMAKER',
          this.checked);
    });
    $("#contentSrc-KINGMAKER").prop('checked', contentSourceArray.includes('KINGMAKER'));

    $("#contentSrc-MALEVOLENCE").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'MALEVOLENCE',
          this.checked);
    });
    $("#contentSrc-MALEVOLENCE").prop('checked', contentSourceArray.includes('MALEVOLENCE'));

    $("#contentSrc-NIGHT-GRAY-DEATH").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'NIGHT-GRAY-DEATH',
          this.checked);
    });
    $("#contentSrc-NIGHT-GRAY-DEATH").prop('checked', contentSourceArray.includes('NIGHT-GRAY-DEATH'));

    $("#contentSrc-OUTLAWS-ALKENSTAR").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'OUTLAWS-ALKENSTAR',
          this.checked);
    });
    $("#contentSrc-OUTLAWS-ALKENSTAR").prop('checked', contentSourceArray.includes('OUTLAWS-ALKENSTAR'));

    $("#contentSrc-QUEST-FROZEN-FLAME").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'QUEST-FROZEN-FLAME',
          this.checked);
    });
    $("#contentSrc-QUEST-FROZEN-FLAME").prop('checked', contentSourceArray.includes('QUEST-FROZEN-FLAME'));

    $("#contentSrc-SLITHERING").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'SLITHERING',
          this.checked);
    });
    $("#contentSrc-SLITHERING").prop('checked', contentSourceArray.includes('SLITHERING'));

    $("#contentSrc-STRENGTH-THOUSANDS").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'STRENGTH-THOUSANDS',
          this.checked);
    });
    $("#contentSrc-STRENGTH-THOUSANDS").prop('checked', contentSourceArray.includes('STRENGTH-THOUSANDS'));

    $("#contentSrc-TROUBLES-IN-OTARI").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'TROUBLES-IN-OTARI',
          this.checked);
    });
    $("#contentSrc-TROUBLES-IN-OTARI").prop('checked', contentSourceArray.includes('TROUBLES-IN-OTARI'));

    $("#contentSrc-THRESHOLD-KNOWLEDGE").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'THRESHOLD-KNOWLEDGE',
          this.checked);
    });
    $("#contentSrc-THRESHOLD-KNOWLEDGE").prop('checked', contentSourceArray.includes('THRESHOLD-KNOWLEDGE'));

    $("#contentSrc-PATH-SOCIETY").change(function(){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'PATH-SOCIETY',
          this.checked);
    });
    $("#contentSrc-PATH-SOCIETY").prop('checked', contentSourceArray.includes('PATH-SOCIETY'));

    // Enable All Books Button //
    $('#enableAllBooksBtn').click(function() {
      let newContentSourceArray = [];
      $('.bookSwitch').each(function() {
        newContentSourceArray.push($(this).attr('name').replace('contentSrc-',''));
        $(this).prop('checked', true);
      });
      socket.emit("requestCharacterSetSources", 
          getCharIDFromURL(), 
          newContentSourceArray);
      $('#enableAllBooksBtn').blur();
    });

    // Variants //
    $("#variantAncestryParagon").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestCharacterOptionChange", 
          getCharIDFromURL(), 
          'variantAncestryParagon',
          optionTypeValue);
    });
    $("#variantAncestryParagon").prop('checked', (character.variantAncestryParagon === 1));

    $("#variantAutoBonusProgression").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestCharacterOptionChange", 
          getCharIDFromURL(), 
          'variantAutoBonusProgression',
          optionTypeValue);
    });
    $("#variantAutoBonusProgression").prop('checked', (character.variantAutoBonusProgression === 1));

    $("#variantFreeArchetype").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestCharacterOptionChange", 
          getCharIDFromURL(), 
          'variantFreeArchetype',
          optionTypeValue);
    });
    $("#variantFreeArchetype").prop('checked', (character.variantFreeArchetype === 1));

    $("#variantGradualAbilityBoosts").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestCharacterOptionChange", 
          getCharIDFromURL(), 
          'variantGradualAbilityBoosts',
          optionTypeValue);
    });
    $("#variantGradualAbilityBoosts").prop('checked', (character.variantGradualAbilityBoosts === 1));

    $("#variantProficiencyWithoutLevel").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestCharacterOptionChange", 
          getCharIDFromURL(), 
          'variantProfWithoutLevel',
          optionTypeValue);
    });
    $("#variantProficiencyWithoutLevel").prop('checked', (character.variantProfWithoutLevel === 1));

    $("#variantStamina").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestCharacterOptionChange", 
          getCharIDFromURL(), 
          'variantStamina',
          optionTypeValue);
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'STAMINA-VARIANT',
          this.checked);
    });
    $("#variantStamina").prop('checked', (character.variantStamina === 1));

    // Options //
    $("#optionPublicCharacter").change(function(){
        let optionTypeValue = (this.checked) ? 1 : 0;
        if(optionTypeValue === 1) {
            $("#optionPublicCharacterInfo").removeClass('is-hidden');
        } else {
            $("#optionPublicCharacterInfo").addClass('is-hidden');
        }
        socket.emit("requestCharacterOptionChange", 
            getCharIDFromURL(), 
            'optionPublicCharacter',
            optionTypeValue);
    });
    $("#optionPublicCharacter").prop('checked', (character.optionPublicCharacter === 1));
    if(character.optionPublicCharacter === 1) { $("#optionPublicCharacterInfo").removeClass('is-hidden'); }
    
    $("#optionAutoHeightenSpells").change(function(){
        let optionTypeValue = (this.checked) ? 1 : 0;
        socket.emit("requestCharacterOptionChange", 
            getCharIDFromURL(), 
            'optionAutoHeightenSpells',
            optionTypeValue);
    });
    $("#optionAutoHeightenSpells").prop('checked', (character.optionAutoHeightenSpells === 1));

    $("#optionAutoDetectPreReqs").change(function(){
        let optionTypeValue = (this.checked) ? 1 : 0;
        socket.emit("requestCharacterOptionChange", 
            getCharIDFromURL(), 
            'optionAutoDetectPreReqs',
            optionTypeValue);
    });
    $("#optionAutoDetectPreReqs").prop('checked', (character.optionAutoDetectPreReqs === 1));

    $("#optionDiceRoller").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestCharacterOptionChange", 
          getCharIDFromURL(), 
          'optionDiceRoller',
          optionTypeValue);
    });
    $("#optionDiceRoller").prop('checked', (character.optionDiceRoller === 1));

    $("#optionClassArchetypes").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestCharacterOptionChange", 
          getCharIDFromURL(), 
          'optionClassArchetypes',
          optionTypeValue);
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'CLASS-ARCHETYPES-OPTION',
          this.checked);
    });
    $("#optionClassArchetypes").prop('checked', (character.optionClassArchetypes === 1));
    if(character.optionClassArchetypes === 1){
      socket.emit("requestCharacterSourceChange", 
          getCharIDFromURL(), 
          'CLASS-ARCHETYPES-OPTION',
          true);
    }

    $("#optionCustomCodeBlock").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      if(optionTypeValue === 1) {
        $("#optionCustomCodeBlockInfo").removeClass('is-hidden');
        $("#option-custom-code-block-container").removeClass('is-hidden');
      } else {
        $("#optionCustomCodeBlockInfo").addClass('is-hidden');
        $("#option-custom-code-block-container").addClass('is-hidden');
        socket.emit("requestCustomCodeBlockDataClear",
            getCharIDFromURL());
      }
      socket.emit("requestCharacterOptionChange", 
          getCharIDFromURL(), 
          'optionCustomCodeBlock',
          optionTypeValue);
    });
    $("#optionCustomCodeBlock").prop('checked', (character.optionCustomCodeBlock === 1));
    if(character.optionCustomCodeBlock === 1) {
      $("#optionCustomCodeBlockInfo").removeClass('is-hidden');
      $("#option-custom-code-block-container").removeClass('is-hidden');
    }
    $("#inputCustomCodeBlock").blur(function(){
      let newCode = $(this).val();
      if(character.customCode != newCode){
        character.customCode = newCode;
        $('#inputCustomCodeBlock').parent().addClass("is-loading");
        socket.emit("requestCharacterCustomCodeBlockChange", getCharIDFromURL(), newCode);
      }
    });

    $("#optionIgnoreBulk").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestCharacterOptionChange", 
          getCharIDFromURL(), 
          'optionIgnoreBulk',
          optionTypeValue);
    });
    $("#optionIgnoreBulk").prop('checked', (character.optionIgnoreBulk === 1));

}


// ~~~~~~~~~~~~~~ // Processings // ~~~~~~~~~~~~~~ //

socket.on("returnNameChange", function() {
    $("#charNameControlShell").removeClass("is-medium is-loading");
});

socket.on("returnLevelChange", function() {
    $("#charLevel").blur();
});

socket.on("returnAbilityScoreChange", function() {
});

socket.on("returnJoinCampaign", function(campaign) {
  setupCampaignDetails(campaign);
  if(!campaign){
    new ConfirmMessage('Failed to Join Campaign', `We weren't able to add you to that campaign. Make sure your access code is correct!`, 'Okay', 'modal-failed-to-join-campaign', 'modal-failed-to-join-campaign-btn');
  }
});

socket.on("returnLeaveCampaign", function() {
  setupCampaignDetails(null);
});

//

socket.on("returnCharacterSourceChange", function() {
    $(".optionSwitch").blur();
});

socket.on("returnCharacterOptionChange", function() {
    $(".optionSwitch").blur();
});

//

socket.on("returnCharacterCustomCodeBlockChange", function() {
  $('#inputCustomCodeBlock').parent().removeClass("is-loading");
});

//// Homebrew Bundles ////
function displayHomebrewBundles(character, hBundles, progessBundles){
  let homebrewBundleArray = JSON.parse(character.enabledHomebrew);

  hBundles = hBundles.sort(
    function(a, b) {
      return a.homebrewBundle.name > b.homebrewBundle.name ? 1 : -1;
    }
  );
  progessBundles = progessBundles.sort(
    function(a, b) {
      return a.name > b.name ? 1 : -1;
    }
  );

  for(let progessBundle of progessBundles) {
    let homebrewBundle = progessBundle;
    let bundleSwitchID = 'homebrew-bundle-progess-switch-'+homebrewBundle.id;
    $('#homebrewCollectionContainer').append('<div class="field"><input id="'+bundleSwitchID+'" type="checkbox" name="'+bundleSwitchID+'" class="switch is-small is-rounded is-outlined is-info optionSwitch" value="1"><label for="'+bundleSwitchID+'">'+homebrewBundle.name+' <span class="has-txt-noted is-italic">(in progress)</span></label></div>');

    $('#'+bundleSwitchID).change(function(){
      socket.emit('requestCharacterHomebrewChange', 
          getCharIDFromURL(), 
          homebrewBundle.id,
          this.checked);
    });
    $('#'+bundleSwitchID).prop('checked', homebrewBundleArray.includes(homebrewBundle.id));

  }

  for(let hBundle of hBundles) {
    let homebrewBundle = hBundle.homebrewBundle;
    let bundleSwitchID = 'homebrew-bundle-switch-'+homebrewBundle.id;

    let bundleName = homebrewBundle.name;
    if(homebrewBundle.isPublished === 0){
      bundleName += '<sup class="has-text-info is-size-8 pl-1"><i class="fa fa-wrench"></i></sup>';
    }

    $('#homebrewCollectionContainer').append('<div class="field"><input id="'+bundleSwitchID+'" type="checkbox" name="'+bundleSwitchID+'" class="switch is-small is-rounded is-outlined is-info optionSwitch" value="1"><label for="'+bundleSwitchID+'">'+bundleName+'</label></div>');

    $('#'+bundleSwitchID).change(function(){
      socket.emit('requestCharacterHomebrewChange', 
          getCharIDFromURL(), 
          homebrewBundle.id,
          this.checked);
    });
    $('#'+bundleSwitchID).prop('checked', homebrewBundleArray.includes(homebrewBundle.id));

  }

  if(hBundles.length > 0){
    let hCollectionContainer = document.getElementById('homebrewColumn');
    if(hCollectionContainer.scrollHeight > hCollectionContainer.clientHeight){
      // container has scrollbar
    } else {
      $('#homebrewCollectionContainer').addClass('pb-3');
      $('#viewHomebrewCollectionBtn').removeClass('is-hidden');
    }
  } else {
    $('#noHomebrewMessage').removeClass('is-hidden');
    $('#viewBrowseHomebrewBtn').removeClass('is-hidden');
  }

  $('#viewHomebrewCollectionBtn').click(function() {
    window.location.href = '/homebrew/?sub_tab=collection';
  });
  $('#viewBrowseHomebrewBtn').click(function() {
    window.location.href = '/homebrew/?sub_tab=browse';
  });

}

socket.on("returnCharacterHomebrewChange", function() {
  $(".optionSwitch").blur();
});

//// External Character Access - API Clients ////

function displayExternalCharacterAccess(clientsWithAccess){
  if(clientsWithAccess != null && clientsWithAccess.length > 0){
    $('.character-access-container').removeClass('is-hidden');
  } else {
    $('.character-access-container').addClass('is-hidden');
    return;
  }

  $('#character-access-content').html('');
  $('#character-access-content').append('<hr class="mt-0 mb-2 mx-0"></hr>');

  let connectionCount = 0;
  for(let client of clientsWithAccess){

    let connectionID = 'accessConnection-'+connectionCount;
    let connectionDeleteIconID = connectionID+'-delete';

    if(connectionCount != 0){ $('#character-access-content').append('<hr class="my-2 mx-4"></hr>'); }

    $('#character-access-content').append('<div id="'+connectionID+'" class="px-3 text-left"></div>');

    $('#'+connectionID).append('<div class="columns is-mobile is-gapless is-marginless"><div class="column is-narrow is-11"><p class="is-bold is-size-5-5">'+client.appName+'</p></div><div class="column is-narrow is-1"><span id="'+connectionDeleteIconID+'" class="icon cursor-clickable has-text-danger text-right"><i class="fal fa-minus-circle fa-sm"></i></span></div></div>');
    if(client.description != null && client.description != ''){
      $('#'+connectionID).append('<div class=""><p>'+client.description+'</p></div>');
    }
    $('#'+connectionID).append('<div class=""><p class="is-bold is-size-7 has-text-info text-center">'+accessRightsToText(client.accessRights)+'</p></div>');

    $('#'+connectionDeleteIconID).click(function() {
      socket.emit("requestCharacterRemoveClientAccess", 
          getCharIDFromURL(), 
          client.clientID);
    });

    connectionCount++;
  }

  $('#character-access-dropdown').click(function() {
    if($('#character-access-content').hasClass("is-hidden")) {
      $('#character-access-content').removeClass('is-hidden');
      $('#character-access-chevron').removeClass('fa-chevron-down');
      $('#character-access-chevron').addClass('fa-chevron-up');
    } else {
      $('#character-access-content').addClass('is-hidden');
      $('#character-access-chevron').removeClass('fa-chevron-up');
      $('#character-access-chevron').addClass('fa-chevron-down');
    }
  });

  $('#character-access-dropdown').mouseenter(function(){
    $(this).addClass('has-bg-selectable-hover');
  });
  $('#character-access-dropdown').mouseleave(function(){
      $(this).removeClass('has-bg-selectable-hover');
  });

}

function accessRightsToText(accessRights){
  switch(accessRights) {
    case 'READ-ONLY': return 'Can read character information.';
    case 'READ-UPDATE': return 'Can read and update character information.';
    case 'READ-UPDATE-ADD-DELETE': return 'Can read, update, add, and delete character information.';
    default: return 'ACCESS RIGHTS NOT FOUND';
  }
}

socket.on("returnCharacterRemoveClientAccess", function(clientsWithAccess) {
  displayExternalCharacterAccess(clientsWithAccess);
});