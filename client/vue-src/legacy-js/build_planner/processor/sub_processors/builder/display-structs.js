/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/


function displaySpell(locationID, spell){
  let buttonClass = locationID+'-spellView-'+spell.Spell.id;
  $('#'+locationID).html('<button class="'+buttonClass+' button is-small is-info is-rounded is-outlined my-1">View Spell</button>');

  let inSpellName = spell.Spell.name.replace(/’/g,'\'').toUpperCase();
  for(const [spellID, spellDataStruct] of g_spellMap.entries()){
    let spellName = spellDataStruct.Spell.name.toUpperCase();
    if(inSpellName === spellName && spellDataStruct.Spell.isArchived == 0) {
        $('.'+buttonClass).click(function(){
          openQuickView('spellView', {
              SpellDataStruct: spellDataStruct,
              _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
          }, $('#quickviewDefault').hasClass('is-active'));
        });
        return;
    }
  }
}