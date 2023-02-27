/* Copyright (C) 2022, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

var notyf = new Notyf({
  duration: 5000,
  ripple: true,
  dismissible: true,
  types: [
    {
      type: 'success',
      background: '#3298dc',
    },
  ]
});


/*~ Updates to this character ~*/

socket.on('sendCharacterUpdate-Health', function(charID, newHP){
  updateCampaignCharacter(charID, null, 'hp', { value: newHP });

  if(getCharIDFromURL()+'' !== charID+'') { return; }
  
  $('#char-current-health').click();
  $('#current-health-input').val(newHP);
  healthConfirm(g_calculatedStats.maxHP);

  notyf.success('The GM updated your Hit Points.');

});

socket.on('sendCharacterUpdate-TempHealth', function(charID, newTempHP){
  if(getCharIDFromURL()+'' !== charID+'') { return; }
  
  $('#char-temp-health').click();
  $('#temp-health-input').val(newTempHP);
  tempHealthConfirm();

  notyf.success('The GM updated your Temp HP.');

});

socket.on('sendCharacterUpdate-Exp', function(charID, newExp){
  if(getCharIDFromURL()+'' !== charID+'') { return; }

  $('#exp-input').val(newExp);
  $('#exp-input').blur();

  notyf.success('The GM updated your Experience.');

});

socket.on('sendCharacterUpdate-Stamina', function(charID, newStamina){
  if(getCharIDFromURL()+'' !== charID+'') { return; }

  $('#char-current-stamina').click();
  $('#current-stamina-input').val(newStamina);
  staminaConfirm(g_calculatedStats.maxStamina);

  notyf.success('The GM updated your Stamina.');

});

socket.on('sendCharacterUpdate-Resolve', function(charID, newResolve){
  if(getCharIDFromURL()+'' !== charID+'') { return; }

  $('#char-current-resolve').click();
  $('#current-resolve-input').val(newResolve);
  resolveConfirm(g_calculatedStats.maxResolve);

  notyf.success('The GM updated your Resolve.');

});

socket.on('sendCharacterUpdate-HeroPoints', function(charID, heroPoints){
  if(getCharIDFromURL()+'' !== charID+'') { return; }

  $("#heroPointsSelect").val(heroPoints);
  $("#heroPointsSelect").change();

  notyf.success('The GM updated your Hero Points.');

});

socket.on('sendCharacterUpdate-Conditions', function(charID, conditionsObject, reloadSheet){
  updateCampaignCharacter(charID, null, 'conditions', conditionsObject);

  if(getCharIDFromURL()+'' !== charID+'') { return; }

  g_conditionsMap = objToMap(conditionsObject);

  if (reloadSheet) {
    reloadCharSheet();
  }

  notyf.success('The GM updated your Conditions.');

});

/*~ Recieve updates from other character ~*/

socket.on('sendCharacterUpdateToGM', function(charID, updates){
  if(!g_campaignDetails) { return; }

  let accessToken = g_campaignDetails.accessTokens.find(accessToken => {
    return accessToken.charID == charID;
  });

  for(let update of updates){
    updateCampaignCharacter(charID, accessToken, update.type, update.data);
  }

});

function updateCampaignCharacter(charID, accessToken, type, data){

  if(accessToken == null){
    accessToken = g_campaignDetails.accessTokens.find(accessToken => {
      return accessToken.charID == charID;
    });
  }

  if (type == 'hp') {
    accessToken.character.currentHealth = data.value;
    leftQuickview_setCharacterHealth(accessToken);
  } else if (type == 'calculated-stats') {
    accessToken.calculatedStat = data;
    leftQuickview_setCharacterConditions(accessToken);
  } else if (type == 'char-info') {
    accessToken.character.infoJSON = data;
  } else if (type == 'conditions') {

    if(!accessToken.calculatedStat){
      accessToken.calculatedStat = {};
    }
    accessToken.calculatedStat.conditions = [];

    for(const [conditionID, conditionData] of objToMap(data).entries()){
      accessToken.calculatedStat.conditions.push({
        conditionID: conditionData.Condition.id,
        name: conditionData.Condition.name,
        entryID: conditionData.EntryID,
        parentEntryID: conditionData.ParentID,
        sourceText: conditionData.SourceText,
        value: conditionData.Value,
      });
    }

    leftQuickview_setCharacterConditions(accessToken);

  }

}

/*~ Send out character updates to GM ~*/

/* Data:
  hp - { value }
  temp-hp - { value }
  exp - { value }
  stamina - { value }
  resolve - { value }
  hero-points - { value }
  calculated-stats - g_calculatedStats
  char-info - charInfoJSON
  roll-history - rollHistoryJSON
*/

let g_sendingUpdateToGM = false;
let g_updatesToGM = [];

function sendOutUpdateToGM(field, updateStruct){
  if(!g_campaignDetails) { return; }

  // Update your own campaign character
  updateCampaignCharacter(getCharIDFromURL(), null, field, updateStruct);

  g_updatesToGM.push({ type: field, data: updateStruct });
  if(!g_sendingUpdateToGM) {
    setDelayToSendOutUpdateToGM();
  }
}

function setDelayToSendOutUpdateToGM(){
  g_sendingUpdateToGM = true;
  setTimeout(() => {
    socket.emit(`requestCharacterUpdateToGM`, getCharIDFromURL(), g_updatesToGM);
    g_updatesToGM = [];
    g_sendingUpdateToGM = false;
  }, 500);
}