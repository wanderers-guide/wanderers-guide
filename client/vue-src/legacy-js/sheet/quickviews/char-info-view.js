/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_charInfoData;

function openCharInfoQuickview(data) {

  $('#quickViewTitle').html('Character Info');

  let qContent = $('#quickViewContent');

  qContent.append('<div class="columns is-marginless"><div id="charInfoBasicInfoSection" class="column is-8 is-paddingless"></div><div id="charInfoPictureSection" class="column is-4 is-paddingless pt-2"></div></div>');

  /// Basic Info ///
  $('#charInfoBasicInfoSection').append('<p class="is-size-4 has-text-centered has-txt-value-string text-overflow-ellipsis">'+g_character.name+'</p>');

  $('#charInfoBasicInfoSection').append('<div class="field is-horizontal is-marginless"><div class="field-label"><label class="label">Class</label></div><div class="field-label"><p class="is-size-6 has-text-left has-txt-value-string">'+g_calculatedStats.generalInfo.className+'</p></div></div>');

  $('#charInfoBasicInfoSection').append('<div class="field is-horizontal is-marginless"><div class="field-label"><label class="label">Ancestry</label></div><div class="field-label"><p class="is-size-6 has-text-left has-txt-value-string">'+g_calculatedStats.generalInfo.heritageAncestryName+'</p></div></div>');

  $('#charInfoBasicInfoSection').append('<div class="field is-horizontal is-marginless"><div class="field-label"><label class="label">Background</label></div><div class="field-label"><p class="is-size-6 has-text-left has-txt-value-string">'+g_calculatedStats.generalInfo.backgroundName+'</p></div></div>');

  $('#charInfoPictureSection').append('<figure class="image is-128x128 is-marginless"><img id="charInfoPicture" class="is-rounded character-icon" src=""></figure>');

  ///         ///

  let tagsInnerHTML = '';
  tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-1 mb-1 is-very-small is-link tagButton">'+g_calculatedStats.generalInfo.size+'</button>';
  for(const charTag of g_calculatedStats.generalInfo.traits){
    if(charTag != null && charTag != ''){
      tagsInnerHTML += '<button class="button is-paddingless px-2 is-marginless mr-1 mb-1 is-very-small is-info tagButton">'+charTag+'</button>';
    }
  }
  if(tagsInnerHTML != ''){
    qContent.append('<div class="mb-4 pb-1"><div class="buttons is-marginless is-pulled-right">'+tagsInnerHTML+'</div></div>');
  }

  ///         ///

  qContent.append('<hr class="m-2">');

  qContent.append('<div class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Appearance</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><textarea id="charInfoInput-Appearance" class="input use-custom-scrollbar" type="text" maxlength="400" autocomplete="off" placeholder="Appearance"></textarea></div></div></div></div>');

  qContent.append('<div class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Personality</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Personality" class="input" type="text" maxlength="40" autocomplete="off" placeholder="Personality"></div></div></div></div>');

  qContent.append('<div class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Alignment</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Alignment" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Alignment"></div></div></div></div>');

  qContent.append('<div class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Beliefs</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Beliefs" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Beliefs"></div></div></div></div>');

  qContent.append('<hr class="m-2">');

  qContent.append('<div class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Age</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Age" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Age"></div></div></div></div>');

  qContent.append('<div class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Gender</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Gender" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Gender"></div></div></div></div>');

  qContent.append('<div class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Pronouns</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Pronouns" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Pronouns"></div></div></div></div>');

  qContent.append('<div class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Title</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Title" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Title"></div></div></div></div>');

  qContent.append('<hr class="m-2">');

  qContent.append('<div class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Faction</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Faction" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Faction"></div></div></div></div>');

  qContent.append('<div class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Ethnicity</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Ethnicity" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Ethnicity"></div></div></div></div>');

  qContent.append('<div class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Nationality</label></div><div class="field-body"><div class="field is-narrow"><div class="control"><input id="charInfoInput-Nationality" class="input" type="text" maxlength="40" spellcheck="false" autocomplete="off" placeholder="Nationality"></div></div></div></div>');

  qContent.append('<hr class="m-2">');

  qContent.append('<div class="control"><input id="charInfoInput-ImageURL" class="input isURL" type="text" spellcheck="false" autocomplete="off" placeholder="Image URL"></div>');


  // //

  /*
  {
    appearance:
    personality:
    alignment:
    beliefs:
    age:
    gender:
    pronouns:
    title:
    faction:
    ethnicity:
    nationality:

    imageURL:
  }
  */
  try {
    g_charInfoData = JSON.parse(g_character.infoJSON);
  } catch (error) {
    g_charInfoData = {};
  }
  if(g_charInfoData == null) { g_charInfoData = {}; }

  $('#charInfoInput-Appearance').val(g_charInfoData.appearance);
  $('#charInfoInput-Personality').val(g_charInfoData.personality);
  $('#charInfoInput-Alignment').val(g_charInfoData.alignment);
  $('#charInfoInput-Beliefs').val(g_charInfoData.beliefs);
  $('#charInfoInput-Age').val(g_charInfoData.age);
  $('#charInfoInput-Gender').val(g_charInfoData.gender);
  $('#charInfoInput-Pronouns').val(g_charInfoData.pronouns);
  $('#charInfoInput-Title').val(g_charInfoData.title);
  $('#charInfoInput-Faction').val(g_charInfoData.faction);
  $('#charInfoInput-Ethnicity').val(g_charInfoData.ethnicity);
  $('#charInfoInput-Nationality').val(g_charInfoData.nationality);

  $('#charInfoInput-ImageURL').val(g_charInfoData.imageURL);
  updateCharInfoPicture();

  // //

  $('#charInfoInput-Appearance').blur(function(){
    if($(this).val() != g_charInfoData.appearance){
      g_charInfoData.appearance = $(this).val();
      saveCharInfo();
    }
  });

  $('#charInfoInput-Personality').blur(function(){
    if($(this).val() != g_charInfoData.personality){
      g_charInfoData.personality = $(this).val();
      saveCharInfo();
    }
  });

  $('#charInfoInput-Alignment').blur(function(){
    if($(this).val() != g_charInfoData.alignment){
      g_charInfoData.alignment = $(this).val();
      saveCharInfo();
    }
  });

  $('#charInfoInput-Beliefs').blur(function(){
    if($(this).val() != g_charInfoData.beliefs){
      g_charInfoData.beliefs = $(this).val();
      saveCharInfo();
    }
  });

  $('#charInfoInput-Age').blur(function(){
    if($(this).val() != g_charInfoData.age){
      g_charInfoData.age = $(this).val();
      saveCharInfo();
    }
  });

  $('#charInfoInput-Gender').blur(function(){
    if($(this).val() != g_charInfoData.gender){
      g_charInfoData.gender = $(this).val();
      saveCharInfo();
    }
  });

  $('#charInfoInput-Pronouns').blur(function(){
    if($(this).val() != g_charInfoData.pronouns){
      g_charInfoData.pronouns = $(this).val();
      saveCharInfo();
    }
  });

  $('#charInfoInput-Title').blur(function(){
    if($(this).val() != g_charInfoData.title){
      g_charInfoData.title = $(this).val();
      saveCharInfo();
    }
  });

  $('#charInfoInput-Faction').blur(function(){
    if($(this).val() != g_charInfoData.faction){
      g_charInfoData.faction = $(this).val();
      saveCharInfo();
    }
  });

  $('#charInfoInput-Ethnicity').blur(function(){
    if($(this).val() != g_charInfoData.ethnicity){
      g_charInfoData.ethnicity = $(this).val();
      saveCharInfo();
    }
  });

  $('#charInfoInput-Nationality').blur(function(){
    if($(this).val() != g_charInfoData.nationality){
      g_charInfoData.nationality = $(this).val();
      saveCharInfo();
    }
  });

  $('#charInfoInput-ImageURL').blur(function(){
    if($(this).val() != g_charInfoData.imageURL){
      g_charInfoData.imageURL = $(this).val();
      saveCharInfo();
      updateCharInfoPicture();
    }
  });


}

function updateCharInfoPicture(){
  if(g_charInfoData.imageURL != null && g_charInfoData.imageURL.match(/\.(jpeg|jpg|gif|png|webp)$/) != null){
    $('#charInfoPicture').attr('src', g_charInfoData.imageURL);
  } else {
    $('#charInfoPicture').attr('src', '/images/fb_profile_pic.png');
  }
}

function saveCharInfo(){
  let charInfoJSON = JSON.stringify(g_charInfoData);
  if(charInfoJSON > 3000) {return;}
  g_character.infoJSON = charInfoJSON;
  socket.emit("requestCharInfoSave",
      getCharIDFromURL(),
      charInfoJSON);
  sendOutUpdateToGM('char-info', charInfoJSON);
}

socket.on("returnCharInfoSave", function(){
  
});