/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

  let quickviews = bulmaQuickview.attach();

});

let g_leftQuickViewScroll = 0;

function openLeftQuickView(type, data){
  if($('#quickviewLeftDefault').hasClass('is-active')){
    g_leftQuickViewScroll = $('#quickViewLeftContent').parent().scrollTop();
  } else {
    g_leftQuickViewScroll = 0;
  }

  // Load QuickView //
  $('#quickViewLeftTitle').html('');
  $('#quickViewLeftContent').html('');

  $('#quickViewLeftTitleClose').html('<a id="quickViewLeftClose" class="delete"></a>');
  $('#quickViewLeftClose').click(function(){
    closeQuickViewLeft();
  });

  if(type == 'skillsView'){
    openLeftStatsQuickview(data);
  }

}

function closeQuickViewLeft() {
  $('#quickviewLeftDefault').removeClass('is-active');
}


// ~~~~~~~~~~ Stats Quickview ~~~~~~~~~~ //
let g_openFeatsDropDown = false;

function openLeftStatsQuickview(data) {

  $('#quickviewLeftDefault').addClass('is-active');
  
  $('#quickViewLeftTitle').html('Statistics');
  let qContent = $('#quickViewLeftContent');

  let charTags = cloneObj(wscChoiceStruct.CharTagsArray);
  charTags.push({value: 'Humanoid'});
  charTags = charTags.sort(
      function(a, b) {
          return a.value > b.value ? 1 : -1;
      }
  );
  let tagsInnerHTML = '';
  for(const charTag of charTags){
    if(charTag.value != null && charTag.value != ''){
      tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-info tagButton">'+charTag.value+'</button>';
    }
  }
  if(tagsInnerHTML != ''){
    qContent.append('<div class="buttons is-marginless is-centered">'+tagsInnerHTML+'</div>');
    qContent.append('<hr class="mb-2 mt-1">');
  }

  qContent.append(`
    <div class="columns is-mobile is-centered is-marginless text-center mx-3">
      <div class="column is-2 is-paddingless"><p class="is-bold-very">Str</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold-very">Dex</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold-very">Con</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold-very">Int</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold-very">Wis</p></div>
      <div class="column is-2 is-paddingless"><p class="is-bold-very">Cha</p></div>
    </div>
  `);
  qContent.append(`
    <div class="columns is-mobile is-centered is-marginless text-center mx-3">
      <div class="column is-2 is-paddingless"><p class="">${g_abilMap.get("STR")}</p></div>
      <div class="column is-2 is-paddingless"><p class="">${g_abilMap.get("DEX")}</p></div>
      <div class="column is-2 is-paddingless"><p class="">${g_abilMap.get("CON")}</p></div>
      <div class="column is-2 is-paddingless"><p class="">${g_abilMap.get("INT")}</p></div>
      <div class="column is-2 is-paddingless"><p class="">${g_abilMap.get("WIS")}</p></div>
      <div class="column is-2 is-paddingless"><p class="">${g_abilMap.get("CHA")}</p></div>
    </div>
  `);

  qContent.append('<hr class="m-2">');

  qContent.append('<div class="columns is-mobile is-centered is-marginless"><div id="skillsColumnOne" class="column pl-0 is-half-tablet is-two-fifths-desktop"></div><div id="skillsColumnTwo" class="column pr-0 is-half-tablet is-two-fifths-desktop"></div></div>');

  let switchColumnNum = Math.ceil(g_skillMap.size/2);
  let skillCount = 0;
  for(const [skillName, skillData] of g_skillMap.entries()){
    skillCount++;

    let skillsColumnID;
    if(skillCount > switchColumnNum){
      skillsColumnID = "skillsColumnTwo";
    } else {
      skillsColumnID = "skillsColumnOne";
    }

    $('#'+skillsColumnID).append('<div><span class="is-size-7 has-txt-partial-noted">'+getProfLetterFromNumUps(skillData.NumUps)+' - </span><span class="is-size-6 has-txt-listing">'+skillData.Name+'</span></div>');
  }

  qContent.append('<div><p class="is-size-7 has-txt-partial-noted has-text-centered is-italic" style="letter-spacing: 0px;">U = Untrained, T = Trained, E = Expert, M = Master, L = Legendary</span></p>');

  qContent.append('<hr class="m-2">');

  qContent.append('<p id="myFeatsQuickviewName" class="is-size-5 has-text-centered cursor-clickable">My Feats <sub class="icon is-small pl-1"><i id="myFeatsQuickviewChevron" class="fas fa-lg fa-chevron-down"></i></sub></p><div id="myFeatsQuickviewSection" class="mb-3 is-hidden"></div>');

  $('#myFeatsQuickviewName').click(function() {
    g_openFeatsDropDown = !g_openFeatsDropDown;
    if(g_openFeatsDropDown) {
      $("#myFeatsQuickviewSection").removeClass('is-hidden');
      $("#myFeatsQuickviewChevron").removeClass('fa-chevron-down');
      $("#myFeatsQuickviewChevron").addClass('fa-chevron-up');
    } else {
      $("#myFeatsQuickviewSection").addClass('is-hidden');
      $("#myFeatsQuickviewChevron").removeClass('fa-chevron-up');
      $("#myFeatsQuickviewChevron").addClass('fa-chevron-down');
    }
  });

  const sortedFeatArray = wscChoiceStruct.FeatArray.sort(
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
  for (let i = 0; i < sortedFeatArray.length; i++) {
    const featData = sortedFeatArray[i];
    if(featData.value.level <= 0) { continue; }

    let featButtonID = 'myFeatViewButton-'+i;
    $('#myFeatsQuickviewSection').append('<button id="'+featButtonID+'" class="button is-small is-fullwidth my-1 pos-relative" style="max-width: 300px; margin: auto;"><i class="pos-absolute pos-l-0 pl-2 is-size-7 has-txt-noted">'+featData.value.level+'</i>'+featData.value.name+'</button>');

    $('#'+featButtonID).click(function(event) {
      let featStruct = g_featMap.get(featData.value.id+"");
      openQuickView('featView', {
        Feat : featStruct.Feat,
        Tags : featStruct.Tags,
        _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
      }, true);
      $(this).blur();
    });
    
  }

  qContent.append('<hr class="m-2">');

  qContent.append('<div class="columns is-centered is-marginless"><div id="finalSkillTrainingColumn" class="column pl-0"></div><div id="finalLanguagesColumn" class="column pr-0"></div></div>');

  if(wscChoiceStruct.ClassDetails.Class != null){
    let tSkillsMore = wscChoiceStruct.ClassDetails.Class.tSkillsMore;
    $('#finalSkillTrainingColumn').append('<p class="is-size-5 has-text-centered"><span class="has-tooltip-top has-tooltip-multiline" data-tooltip="You become trained in an additional number of skills equal to an amount determined by your class ('+tSkillsMore+') plus your Intelligence modifier ('+getMod(g_abilMap.get("INT"))+').">Skill Training</span></p>');
    $('#finalSkillTrainingColumn').append('<div id="sideSkillSelection"></div>');
  }

  if(wscChoiceStruct.Ancestry != null){
    let humanExtraText = '';
    if(wscChoiceStruct.Ancestry.name == 'Human'){ humanExtraText = ' Being a human gives you another language as well.'; }
    $('#finalLanguagesColumn').append('<p class="is-size-5 has-text-centered"><span class="has-tooltip-top has-tooltip-multiline" data-tooltip="You learn an additional number of languages equal to your Intelligence modifier ('+getMod(g_abilMap.get("INT"))+').'+humanExtraText+' Your ancestry dictates what languages you can select from (the lighter options, listed at the top).">Languages</span></p>');
    $('#finalLanguagesColumn').append('<div id="sideLangSelection"></div>');
  }

  statsFinalSkillsAndLangs();

}

socket.on("returnLangsAndTrainingsClear", function(profSrcStruct, langSrcStruct, data){
  if(data.SkillLocationID != 'sideSkillSelection') { return; }
  // Runs after all code is executed for leftQuickView
  setTimeout(() => {

    // Scrolls to where it last was
    $('#quickViewLeftContent').parent().scrollTop(g_leftQuickViewScroll);

  }, 10);
});

function statsFinalSkillsAndLangs(){

  let profSrcStruct = {
    sourceType: 'class',
    sourceLevel: 1,
    sourceCode: 'inits-bonus-prof',
    sourceCodeSNum: 'a',
  };

  let langSrcStruct = {
    sourceType: 'class',
    sourceLevel: 1,
    sourceCode: 'inits-bonus-lang',
    sourceCodeSNum: 'a',
  };
  
  socket.emit("requestLangsAndTrainingsClear",
      getCharIDFromURL(),
      profSrcStruct,
      langSrcStruct,
      {Character: null, SkillLocationID: 'sideSkillSelection', LangLocationID: 'sideLangSelection'});

}
