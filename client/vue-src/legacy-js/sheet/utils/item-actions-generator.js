/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function findItemActionsFromInvItems(){
  let itemActions = [];
  for(const invItem of g_invStruct.InvItems){
    if(invItem.description == null){ continue; }

    let actionsStruct = getActionsInText(invItem.description);
    if(actionsStruct != null){
      itemActions.push({
        InvItem: invItem,
        Item: g_itemMap.get(invItem.itemID+""),
        Name: invItem.name,
        Actions: actionsStruct,
      });
    }

  }
  return itemActions;
}

function getActionsInText(text){

  let textToTraits = function(text){
    let traitsArray = [];
    if(text == null){ return traitsArray; }

    let actionsRegex = text.match(/^(.+?)(;|\*\*|$)/);
    if(actionsRegex == null){ return traitsArray; }

    let textParts = actionsRegex[1].split(',');
    for(let textPart of textParts){
      textPart = textPart.toLowerCase();
      if(textPart.includes('(action: interact') || textPart.includes('(action:interact')){
        traitsArray.push({ name: 'Manipulate' });
      } else if(textPart.includes('(action: strike') || textPart.includes('(action:strike')){
        traitsArray.push({ name: 'Attack' });
      } else if(textPart.includes('command')){
        traitsArray.push({ name: 'Auditory' });
        traitsArray.push({ name: 'Concentrate' });
      } else if(textPart.includes('envision')){
        traitsArray.push({ name: 'Concentrate' });
      } else if(textPart.includes('(trait:')){
        traitsArray.push({ name:
          capitalizeFirstLetterOfWord(textPart.replace('(trait:','').replace(/\W/g,'').trim()) });
      }
    }

    return traitsArray;
  };


  let actions = {
    free_action: null,
    reaction: null,
    one_action: null,
    two_actions: null,
    three_actions: null,
  };
  let foundActions = false;

  let freeAction = text.match(/FREE-ACTION( (.+)(;|\n))?/);
  if(freeAction != null){
    foundActions = true;
    actions.free_action = {
      actions: 'FREE_ACTION',
      traits: textToTraits(freeAction[2]),
    };
  }

  let reaction = text.match(/REACTION( (.+)(;|\n))?/);
  if(reaction != null){
    foundActions = true;
    actions.one_action = {
      actions: 'REACTION',
      traits: textToTraits(reaction[2]),
    };
  }

  let oneAction = text.match(/ONE-ACTION( (.+)(;|\n))?/);
  if(oneAction != null){
    foundActions = true;
    actions.one_action = {
      actions: 'ACTION',
      traits: textToTraits(oneAction[2]),
    };
  }

  let twoActions = text.match(/TWO-ACTIONS( (.+)(;|\n))?/);
  if(twoActions != null){
    foundActions = true;
    actions.two_actions = {
      actions: 'TWO_ACTIONS',
      traits: textToTraits(twoActions[2]),
    };
  }

  let threeActions = text.match(/THREE-ACTIONS( (.+)(;|\n))?/);
  if(threeActions != null){
    foundActions = true;
    actions.three_actions = {
      actions: 'THREE_ACTIONS',
      traits: textToTraits(threeActions[2]),
    };
  }

  if(foundActions){
    return actions;
  } else {
    return null;
  }
}