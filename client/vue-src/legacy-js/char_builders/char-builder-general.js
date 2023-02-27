/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();
let isBuilderInit = false;
let isFirstLoad = true;
let g_pageNum;

// Temp global variables
let gOption_hasProfWithoutLevel = false;
let g_character = null;
//

// 
let g_char_ancestryID = null;
let g_char_backgroundID = null;
let g_char_classID_1 = null;
let g_char_classID_2 = null;
//

// Core Builder Data //
let g_abilMap = null;
let g_featMap = null;
let g_skillMap = null;
let g_itemMap = null;
let g_spellMap = null;
let g_allLanguages = null;
let g_allConditions = null;
let g_allTags = null;
let g_enabledSources = null;
let g_classArchetypes = null;
let g_unselectedData = null;
let g_rawMetaData = null;
// ~~~~~~~~~~~~~~~~~ //

$(function () {

  startDiceLoader();
  // Using an MLoad instead here
  //socket.emit("requestCharBuilderDetails", getCharIDFromURL());

});

socket.on("returnCharBuilderDetails", function(character, coreDataStruct, inChoiceStruct){
  isBuilderInit = true;

  console.log('~ LOADING BUILDER ~');

  // Core Builder Data //
  g_abilMap = objToMap(coreDataStruct.AbilObject);
  g_featMap = objToMap(coreDataStruct.FeatObject);
  g_skillMap = objToMap(coreDataStruct.SkillObject);
  g_itemMap = objToMap(coreDataStruct.ItemObject);
  g_spellMap = objToMap(coreDataStruct.SpellObject);
  g_allLanguages = coreDataStruct.AllLanguages;
  g_allConditions = coreDataStruct.AllConditions;
  g_allTags = coreDataStruct.AllTags;
  g_enabledSources = coreDataStruct.EnabledSources;
  g_classArchetypes = coreDataStruct.ClassArchetypeArray;
  g_unselectedData = coreDataStruct.UnselectedDataArray;
  g_rawMetaData = coreDataStruct.RawMetaDataArray;
  //
  g_char_ancestryID = character.ancestryID;
  g_char_backgroundID = character.backgroundID;
  g_char_classID_1 = character.classID;
  g_char_classID_2 = null;
  //
  gOption_hasProfWithoutLevel = (character.variantProfWithoutLevel == 1);
  g_character = character;
  //
  injectWSCChoiceStruct(inChoiceStruct);
  initClassArchetypes(inChoiceStruct.ClassArchetypeID);
  // ~~~~~~~~~~~~~~~~~ //

  for(const [featID, featStruct] of g_featMap.entries()){
    g_featPrereqMap.set(featID+'', meetsPrereqs(featStruct.Feat));
  }

  goToBuilderPage($('#char-builder-container').attr('data-page-num'), true);

});

function goToBuilderPage(pageNum, firstLoad=false){
  isFirstLoad = firstLoad;
  startLoadingPage();
  $("#prevButton").off();
  $("#nextButton").off();
  $("#goToCharButton").off();
  $("#goToCharBigButton").off();
  g_pageNum = pageNum;
  switch(pageNum+''){
    case '1': window.location.href = '/profile/characters/builder/basics/?id='+getCharIDFromURL(); break;
    case '2': socket.emit("requestBuilderPageAncestry", getCharIDFromURL()); break;
    case '3': socket.emit("requestBuilderPageBackground", getCharIDFromURL()); break;
    case '4': socket.emit("requestBuilderPageClass", getCharIDFromURL()); break;
    case '42': socket.emit("requestBuilderPageClass2", getCharIDFromURL()); break;
    case '5': socket.emit("requestBuilderPageFinalize", getCharIDFromURL()); break;
    default: break;
  }
}

function goToSheet(){
  // Hardcoded redirect
  window.location.href ='/profile/characters/'+getCharIDFromURL();
}

socket.on("returnBuilderPageAncestry", function(ancestryObject, uniHeritageArray){
  $('#char-builder-container').load("/templates/char_builder/display-builder-page-2.html");
  $.ajax({ type: "GET",
    url: "/templates/char_builder/display-builder-page-2.html",
    success : function(text)
    {
      console.log('PAGE: Ancestry');

      $("#prevButton").click(function(){
        goToBuilderPage(1);
      });
      $("#nextButton").parent().removeClass('is-hidden');
      $("#nextButton").click(function(){
        goToBuilderPage(3);
      });
      $("#goToCharButton").parent().removeClass('is-hidden');
      $("#goToCharButton").click(function(){
        goToSheet();
      });
      $("#goToCharBigButton").parent().addClass('is-hidden');
      initBuilderSteps();

      window.history.pushState('profile/characters/builder', '', '/profile/characters/builder/?id='+getCharIDFromURL()+'&page=2');// Update URL
      loadAncestryPage(ancestryObject, uniHeritageArray);
      timeOutFinishLoad();
    }
  });
});

socket.on("returnBuilderPageBackground", function(backgrounds){
  $('#char-builder-container').load("/templates/char_builder/display-builder-page-3.html");
  $.ajax({ type: "GET",
    url: "/templates/char_builder/display-builder-page-3.html",
    success : function(text)
    {
      console.log('PAGE: Background');

      $("#prevButton").click(function(){
        goToBuilderPage(2);
      });
      $("#nextButton").parent().removeClass('is-hidden');
      $("#nextButton").click(function(){
        goToBuilderPage(4);
      });
      $("#goToCharButton").parent().removeClass('is-hidden');
      $("#goToCharButton").click(function(){
        goToSheet();
      });
      $("#goToCharBigButton").parent().addClass('is-hidden');
      initBuilderSteps();

      window.history.pushState('profile/characters/builder', '', '/profile/characters/builder/?id='+getCharIDFromURL()+'&page=3');// Update URL
      loadBackgroundPage(backgrounds);
      timeOutFinishLoad();
    }
  });
});

socket.on("returnBuilderPageClass", function(classObject){
  $('#char-builder-container').load("/templates/char_builder/display-builder-page-4.html");
  $.ajax({ type: "GET",
    url: "/templates/char_builder/display-builder-page-4.html",
    success : function(text)
    {
      console.log('PAGE: Class');

      $("#prevButton").click(function(){
        goToBuilderPage(3);
      });
      $("#nextButton").parent().removeClass('is-hidden');
      $("#nextButton").click(function(){
        if(hasDualClassVariant()){
          goToBuilderPage(42);
        } else {
          goToBuilderPage(5);
        }
      });
      $("#goToCharButton").parent().removeClass('is-hidden');
      $("#goToCharButton").click(function(){
        goToSheet();
      });
      $("#goToCharBigButton").parent().addClass('is-hidden');
      initBuilderSteps();

      window.history.pushState('profile/characters/builder', '', '/profile/characters/builder/?id='+getCharIDFromURL()+'&page=4');// Update URL
      loadClassPage(classObject, 1);
      timeOutFinishLoad();
    }
  });
});

socket.on("returnBuilderPageClass2", function(classObject){
  $('#char-builder-container').load("/templates/char_builder/display-builder-page-4-2.html");
  $.ajax({ type: "GET",
    url: "/templates/char_builder/display-builder-page-4-2.html",
    success : function(text)
    {
      console.log('PAGE: Class 2');

      $("#prevButton").click(function(){
        goToBuilderPage(4);
      });
      $("#nextButton").parent().removeClass('is-hidden');
      $("#nextButton").click(function(){
        goToBuilderPage(5);
      });
      $("#goToCharButton").parent().removeClass('is-hidden');
      $("#goToCharButton").click(function(){
        goToSheet();
      });
      $("#goToCharBigButton").parent().addClass('is-hidden');
      initBuilderSteps();

      window.history.pushState('profile/characters/builder', '', '/profile/characters/builder/?id='+getCharIDFromURL()+'&page=42');// Update URL
      loadClassPage(classObject, 2);
      timeOutFinishLoad();
    }
  });
});

socket.on("returnBuilderPageFinalize", function(character, unselectedDataArray){
  $('#char-builder-container').load("/templates/char_builder/display-builder-page-5.html");
  $.ajax({ type: "GET",
    url: "/templates/char_builder/display-builder-page-5.html",
    success : function(text)
    {
      console.log('PAGE: Finalize');

      $("#prevButton").click(function(){
        goToBuilderPage(4);
      });
      $("#nextButton").parent().addClass('is-hidden');
      $("#goToCharButton").parent().addClass('is-hidden');
      $("#goToCharBigButton").parent().removeClass('is-hidden');
      $('#goToCharBigButton').click(function(){
        if(!$(this).hasClass('has-text-danger')){
          goToSheet();
        }
      });
      initBuilderSteps();

      window.history.pushState('profile/characters/builder', '', '/profile/characters/builder/?id='+getCharIDFromURL()+'&page=5');// Update URL
      loadFinalizePage(character, unselectedDataArray);
      timeOutFinishLoad();
    }
  });
});

function initBuilderSteps(){

  $('.builder-basics-page-btn').click(function(){
    goToBuilderPage(1);
  });
  $('.builder-ancestry-page-btn').click(function(){
    goToBuilderPage(2);
  });
  $('.builder-background-page-btn').click(function(){
    goToBuilderPage(3);
  });
  $('.builder-class-page-btn').click(function(){
    goToBuilderPage(4);
  });
  $('.builder-class-2-page-btn').click(function(){
    goToBuilderPage(42);
  });
  $('.builder-finalize-page-btn').click(function(){
    goToBuilderPage(5);
  });

}

function startLoadingPage() {
  // Turn on page loading
  if(!isFirstLoad) { startSpinnerLoader(); }
}
function finishLoadingPage() {
  // Turn off page loading
  if(!isFirstLoad) { stopSpinnerLoader(); } else { stopDiceLoader(); }
  selectorUpdated();
  if(hasDualClassVariant()){
    $('#class-2-page-icon').removeClass('is-hidden');
  }
}

function timeOutFinishLoad(){
  window.setTimeout(() => {
    finishLoadingPage();
  }, 15000); // 15 seconds
}