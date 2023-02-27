/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();
let isBuilderInit = false;

let g_build_id = null;

// ~~~~~~~~~~~~~~ // General - Run On Load // ~~~~~~~~~~~~~~ //
$(function () {

    g_build_id = $('#char-builder-container').attr('data-build-id');

    // Change page
    $("#nextButton").click(function(){
      // Hardcoded redirect to page 2
      window.location.href = '/builds/create/?build_id='+g_build_id+'&page=2';
    });
    initBuilderSteps();
    
    // On load get basic build info
    socket.emit("requestBuildInfo",
        g_build_id);

});

function initBuilderSteps(){

  $('.builder-basics-page-btn').click(function(){
    window.location.href = '/builds/create/?build_id='+g_build_id+'&page=init';
  });
  $('.builder-creation-page-btn').click(function(){
    window.location.href = '/builds/create/?build_id='+g_build_id+'&page=2';
  });
  // Publish btn is set in returnBuildInfo because it needs build object.

}

// ~~~~~~~~~~~~~~ // Processings // ~~~~~~~~~~~~~~ //

socket.on("returnBuildInfo", function(build, hBundles, progessBundles){
    isBuilderInit = true;

    $('.builder-finalize-page-btn').click(function(){
      console.log('Complete charater?');
    });

    // When build name changes, save name
    $("#charName").change(function(){

        let validNameRegex = /^[^@#$%^*~=\/\\]+$/;
        if(validNameRegex.test($(this).val())) {
            $(this).removeClass("is-danger");
            $("#charNameSideIcon").addClass("is-hidden");

            $("#charNameControlShell").addClass("is-medium is-loading");
            socket.emit("requestBuildNameChange",
                g_build_id,
                $(this).val());

        } else {
            $(this).addClass("is-danger");
            $("#charNameSideIcon").removeClass("is-hidden");
        }

    });

    $("#buildDescription").blur(function(){
      if(build.description != $(this).val()) {
        $('#buildDescription').parent().addClass("is-loading");
        socket.emit("requestBuildDescriptionChange",
            g_build_id,
            $(this).val());
      }
    });

    $("#buildContactInfo").blur(function(){
      if(build.contactInfo != $(this).val()) {
        $('#buildContactInfo').parent().addClass("is-loading");
        socket.emit("requestBuildContactInfoChange",
            g_build_id,
            $(this).val());
      }
    });

    $("#buildArtworkURL").blur(function(){
      if(build.artworkURL != $(this).val()) {
        $('#buildArtworkURL').parent().addClass("is-loading");
        socket.emit("requestBuildArtworkURLChange",
            g_build_id,
            $(this).val());
      }
    });

    handleBuildOptions(build, hBundles, progessBundles);

    // Turn off page loading
    stopSpinnerLoader();

});

function handleBuildOptions(build, hBundles, progessBundles) {
    displayHomebrewBundles(build, hBundles, progessBundles);

    // Content Sources //
    let contentSourceArray = JSON.parse(build.enabledSources);

    $("#contentSrc-CRB").change(function(){
        socket.emit("requestBuildSourceChange", 
            g_build_id, 
            'CRB',
            this.checked);
    });
    $("#contentSrc-CRB").prop('checked', contentSourceArray.includes('CRB'));

    $("#contentSrc-ADV-PLAYER-GUIDE").change(function(){
        socket.emit("requestBuildSourceChange", 
            g_build_id, 
            'ADV-PLAYER-GUIDE',
            this.checked);
    });
    $("#contentSrc-ADV-PLAYER-GUIDE").prop('checked', contentSourceArray.includes('ADV-PLAYER-GUIDE'));

    $("#contentSrc-GM-GUIDE").change(function(){
        socket.emit("requestBuildSourceChange", 
            g_build_id, 
            'GM-GUIDE',
            this.checked);
    });
    $("#contentSrc-GM-GUIDE").prop('checked', contentSourceArray.includes('GM-GUIDE'));

    $("#contentSrc-BOOK-OF-DEAD").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'BOOK-OF-DEAD',
          this.checked);
    });
    $("#contentSrc-BOOK-OF-DEAD").prop('checked', contentSourceArray.includes('BOOK-OF-DEAD'));

    $("#contentSrc-SECRETS-OF-MAGIC").change(function(){
        socket.emit("requestBuildSourceChange", 
            g_build_id, 
            'SECRETS-OF-MAGIC',
            this.checked);
    });
    $("#contentSrc-SECRETS-OF-MAGIC").prop('checked', contentSourceArray.includes('SECRETS-OF-MAGIC'));

    $("#contentSrc-GUNS-AND-GEARS").change(function(){
        socket.emit("requestBuildSourceChange", 
            g_build_id, 
            'GUNS-AND-GEARS',
            this.checked);
    });
    $("#contentSrc-GUNS-AND-GEARS").prop('checked', contentSourceArray.includes('GUNS-AND-GEARS'));

    $("#contentSrc-DARK-ARCHIVE").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'DARK-ARCHIVE',
          this.checked);
    });
    $("#contentSrc-DARK-ARCHIVE").prop('checked', contentSourceArray.includes('DARK-ARCHIVE'));

    $("#contentSrc-RAGE-OF-ELEMENTS").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'RAGE-OF-ELEMENTS',
          this.checked);
    });
    $("#contentSrc-RAGE-OF-ELEMENTS").prop('checked', contentSourceArray.includes('RAGE-OF-ELEMENTS'));

    $("#contentSrc-LOST-ANCESTRY-GUIDE").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'LOST-ANCESTRY-GUIDE',
          this.checked);
    });
    $("#contentSrc-LOST-ANCESTRY-GUIDE").prop('checked', contentSourceArray.includes('LOST-ANCESTRY-GUIDE'));
    
    $("#contentSrc-LOST-CHAR-GUIDE").change(function(){
        socket.emit("requestBuildSourceChange", 
            g_build_id, 
            'LOST-CHAR-GUIDE',
            this.checked);
    });
    $("#contentSrc-LOST-CHAR-GUIDE").prop('checked', contentSourceArray.includes('LOST-CHAR-GUIDE'));

    $("#contentSrc-LOST-CITY-ABSALOM").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'LOST-CITY-ABSALOM',
          this.checked);
    });
    $("#contentSrc-LOST-CITY-ABSALOM").prop('checked', contentSourceArray.includes('LOST-CITY-ABSALOM'));

    $("#contentSrc-LOST-GOD-MAGIC").change(function(){
        socket.emit("requestBuildSourceChange", 
            g_build_id, 
            'LOST-GOD-MAGIC',
            this.checked);
    });
    $("#contentSrc-LOST-GOD-MAGIC").prop('checked', contentSourceArray.includes('LOST-GOD-MAGIC'));

    $("#contentSrc-LOST-GRAND-BAZAAR").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'LOST-GRAND-BAZAAR',
          this.checked);
    });
    $("#contentSrc-LOST-GRAND-BAZAAR").prop('checked', contentSourceArray.includes('LOST-GRAND-BAZAAR'));

    $("#contentSrc-LOST-IMPOSSIBLE-LANDS").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'LOST-IMPOSSIBLE-LANDS',
          this.checked);
    });
    $("#contentSrc-LOST-IMPOSSIBLE-LANDS").prop('checked', contentSourceArray.includes('LOST-IMPOSSIBLE-LANDS'));

    $("#contentSrc-LOST-KNIGHTS-WALL").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'LOST-KNIGHTS-WALL',
          this.checked);
    });
    $("#contentSrc-LOST-KNIGHTS-WALL").prop('checked', contentSourceArray.includes('LOST-KNIGHTS-WALL'));

    $("#contentSrc-LOST-LEGENDS").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'LOST-LEGENDS',
          this.checked);
    });
    $("#contentSrc-LOST-LEGENDS").prop('checked', contentSourceArray.includes('LOST-LEGENDS'));

    $("#contentSrc-LOST-MWANGI").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'LOST-MWANGI',
          this.checked);
    });
    $("#contentSrc-LOST-MWANGI").prop('checked', contentSourceArray.includes('LOST-MWANGI'));

    $("#contentSrc-LOST-MONSTERS-MYTH").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'LOST-MONSTERS-MYTH',
          this.checked);
    });
    $("#contentSrc-LOST-MONSTERS-MYTH").prop('checked', contentSourceArray.includes('LOST-MONSTERS-MYTH'));

    $("#contentSrc-LOST-SOCIETY-GUIDE").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'LOST-SOCIETY-GUIDE',
          this.checked);
    });
    $("#contentSrc-LOST-SOCIETY-GUIDE").prop('checked', contentSourceArray.includes('LOST-SOCIETY-GUIDE'));

    $("#contentSrc-LOST-TRAVEL-GUIDE").change(function(){
        socket.emit("requestBuildSourceChange", 
            g_build_id, 
            'LOST-TRAVEL-GUIDE',
            this.checked);
    });
    $("#contentSrc-LOST-TRAVEL-GUIDE").prop('checked', contentSourceArray.includes('LOST-TRAVEL-GUIDE'));

    $("#contentSrc-LOST-WORLD-GUIDE").change(function(){
        socket.emit("requestBuildSourceChange", 
            g_build_id, 
            'LOST-WORLD-GUIDE',
            this.checked);
    });
    $("#contentSrc-LOST-WORLD-GUIDE").prop('checked', contentSourceArray.includes('LOST-WORLD-GUIDE'));

    $("#contentSrc-ABOMINATION-VAULTS").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'ABOMINATION-VAULTS',
          this.checked);
    });
    $("#contentSrc-ABOMINATION-VAULTS").prop('checked', contentSourceArray.includes('ABOMINATION-VAULTS'));
    
    $("#contentSrc-AGENTS-OF-EDGEWATCH").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'AGENTS-OF-EDGEWATCH',
          this.checked);
    });
    $("#contentSrc-AGENTS-OF-EDGEWATCH").prop('checked', contentSourceArray.includes('AGENTS-OF-EDGEWATCH'));
    
    $("#contentSrc-AGE-OF-ASHES").change(function(){
        socket.emit("requestBuildSourceChange", 
            g_build_id, 
            'AGE-OF-ASHES',
            this.checked);
    });
    $("#contentSrc-AGE-OF-ASHES").prop('checked', contentSourceArray.includes('AGE-OF-ASHES'));

    $("#contentSrc-BLOOD-LORDS").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'BLOOD-LORDS',
          this.checked);
    });
    $("#contentSrc-BLOOD-LORDS").prop('checked', contentSourceArray.includes('BLOOD-LORDS'));

    $("#contentSrc-CROWN-OF-KOBOLD-KING").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'CROWN-OF-KOBOLD-KING',
          this.checked);
    });
    $("#contentSrc-CROWN-OF-KOBOLD-KING").prop('checked', contentSourceArray.includes('CROWN-OF-KOBOLD-KING'));

    $("#contentSrc-EXTINCTION-CURSE").change(function(){
        socket.emit("requestBuildSourceChange", 
            g_build_id, 
            'EXTINCTION-CURSE',
            this.checked);
    });
    $("#contentSrc-EXTINCTION-CURSE").prop('checked', contentSourceArray.includes('EXTINCTION-CURSE'));

    $("#contentSrc-FALL-OF-PLAGUE").change(function(){
        socket.emit("requestBuildSourceChange", 
            g_build_id, 
            'FALL-OF-PLAGUE',
            this.checked);
    });
    $("#contentSrc-FALL-OF-PLAGUE").prop('checked', contentSourceArray.includes('FALL-OF-PLAGUE'));

    $("#contentSrc-FIST-PHOENIX").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'FIST-PHOENIX',
          this.checked);
    });
    $("#contentSrc-FIST-PHOENIX").prop('checked', contentSourceArray.includes('FIST-PHOENIX'));

    $("#contentSrc-KINGMAKER").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'KINGMAKER',
          this.checked);
    });
    $("#contentSrc-KINGMAKER").prop('checked', contentSourceArray.includes('KINGMAKER'));

    $("#contentSrc-MALEVOLENCE").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'MALEVOLENCE',
          this.checked);
    });
    $("#contentSrc-MALEVOLENCE").prop('checked', contentSourceArray.includes('MALEVOLENCE'));

    $("#contentSrc-NIGHT-GRAY-DEATH").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'NIGHT-GRAY-DEATH',
          this.checked);
    });
    $("#contentSrc-NIGHT-GRAY-DEATH").prop('checked', contentSourceArray.includes('NIGHT-GRAY-DEATH'));

    $("#contentSrc-OUTLAWS-ALKENSTAR").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'OUTLAWS-ALKENSTAR',
          this.checked);
    });
    $("#contentSrc-OUTLAWS-ALKENSTAR").prop('checked', contentSourceArray.includes('OUTLAWS-ALKENSTAR'));

    $("#contentSrc-QUEST-FROZEN-FLAME").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'QUEST-FROZEN-FLAME',
          this.checked);
    });
    $("#contentSrc-QUEST-FROZEN-FLAME").prop('checked', contentSourceArray.includes('QUEST-FROZEN-FLAME'));

    $("#contentSrc-SLITHERING").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'SLITHERING',
          this.checked);
    });
    $("#contentSrc-SLITHERING").prop('checked', contentSourceArray.includes('SLITHERING'));

    $("#contentSrc-STRENGTH-THOUSANDS").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'STRENGTH-THOUSANDS',
          this.checked);
    });
    $("#contentSrc-STRENGTH-THOUSANDS").prop('checked', contentSourceArray.includes('STRENGTH-THOUSANDS'));

    $("#contentSrc-TROUBLES-IN-OTARI").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'TROUBLES-IN-OTARI',
          this.checked);
    });
    $("#contentSrc-TROUBLES-IN-OTARI").prop('checked', contentSourceArray.includes('TROUBLES-IN-OTARI'));

    $("#contentSrc-THRESHOLD-KNOWLEDGE").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'THRESHOLD-KNOWLEDGE',
          this.checked);
    });
    $("#contentSrc-THRESHOLD-KNOWLEDGE").prop('checked', contentSourceArray.includes('THRESHOLD-KNOWLEDGE'));

    $("#contentSrc-PATH-SOCIETY").change(function(){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
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
      socket.emit("requestBuildSetSources", 
          g_build_id, 
          newContentSourceArray);
      $('#enableAllBooksBtn').blur();
    });

    // Variants //
    $("#variantAncestryParagon").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestBuildOptionChange", 
          g_build_id, 
          'variantAncestryParagon',
          optionTypeValue);
    });
    $("#variantAncestryParagon").prop('checked', (build.variantAncestryParagon === 1));

    $("#variantFreeArchetype").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestBuildOptionChange", 
          g_build_id, 
          'variantFreeArchetype',
          optionTypeValue);
    });
    $("#variantFreeArchetype").prop('checked', (build.variantFreeArchetype === 1));

    $("#variantGradualAbilityBoosts").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestBuildOptionChange", 
          g_build_id, 
          'variantGradualAbilityBoosts',
          optionTypeValue);
    });
    $("#variantGradualAbilityBoosts").prop('checked', (build.variantGradualAbilityBoosts === 1));

    $("#variantStamina").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestBuildOptionChange", 
          g_build_id, 
          'variantStamina',
          optionTypeValue);
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'STAMINA-VARIANT',
          this.checked);
    });
    $("#variantStamina").prop('checked', (build.variantStamina === 1));

    // Options //
    $("#optionClassArchetypes").change(function(){
      let optionTypeValue = (this.checked) ? 1 : 0;
      socket.emit("requestBuildOptionChange", 
          g_build_id, 
          'optionClassArchetypes',
          optionTypeValue);
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
          'CLASS-ARCHETYPES-OPTION',
          this.checked);
    });
    $("#optionClassArchetypes").prop('checked', (build.optionClassArchetypes === 1));
    if(build.optionClassArchetypes === 1){
      socket.emit("requestBuildSourceChange", 
          g_build_id, 
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
      }
      socket.emit("requestBuildOptionChange", 
          g_build_id, 
          'optionCustomCodeBlock',
          optionTypeValue);
    });
    $("#optionCustomCodeBlock").prop('checked', (build.optionCustomCodeBlock === 1));
    if(build.optionCustomCodeBlock === 1) {
      $("#optionCustomCodeBlockInfo").removeClass('is-hidden');
      $("#option-custom-code-block-container").removeClass('is-hidden');
    }
    $("#inputCustomCodeBlock").blur(function(){
      let newCode = $(this).val();
      if(build.customCode != newCode){
        build.customCode = newCode;
        $('#inputCustomCodeBlock').parent().addClass("is-loading");
        socket.emit("requestBuildCustomCodeBlockChange", g_build_id, newCode);
      }
    });

}


// ~~~~~~~~~~~~~~ // Processings // ~~~~~~~~~~~~~~ //

socket.on("returnBuildNameChange", function() {
  $("#charNameControlShell").removeClass("is-medium is-loading");
});

socket.on("returnBuildDescriptionChange", function() {
  $('#buildDescription').parent().removeClass("is-loading");
});

socket.on("returnBuildContactInfoChange", function() {
  $('#buildContactInfo').parent().removeClass("is-loading");
});

socket.on("returnBuildArtworkURLChange", function() {
  $('#buildArtworkURL').parent().removeClass("is-loading");
});

//

socket.on("returnBuildSourceChange", function() {
    $(".optionSwitch").blur();
});

socket.on("returnBuildOptionChange", function() {
    $(".optionSwitch").blur();
});

//

socket.on("returnBuildCustomCodeBlockChange", function() {
  $('#inputCustomCodeBlock').parent().removeClass("is-loading");
});

//// Homebrew Bundles ////
function displayHomebrewBundles(build, hBundles, progessBundles){
  let homebrewBundleArray = JSON.parse(build.enabledHomebrew);

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
      socket.emit('requestBuildHomebrewChange', 
          g_build_id, 
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
      socket.emit('requestBuildHomebrewChange', 
          g_build_id, 
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

socket.on("returnBuildHomebrewChange", function() {
  $(".optionSwitch").blur();
});
