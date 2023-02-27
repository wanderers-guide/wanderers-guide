/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing Focus Spells ------------------------//
function processingFocusSpells(wscStatement, srcStruct, locationID, extraData){

     if(wscStatement.includes("GIVE-FOCUS-SPELL")){// GIVE-FOCUS-SPELL=Bard:Meld_Into_Stone
        let data = wscStatement.split('=')[1];
        let segments = data.split(':');
        giveFocusSpell(srcStruct, segments[0], segments[1]);
    } else if(wscStatement.includes("GIVE-FOCUS-POINT")){// GIVE-FOCUS-POINT
        giveFocusPoint(srcStruct);
    } else {
        displayError("Unknown statement (2-SpellFocus): \'"+wscStatement+"\'");
        statementComplete('SpellFocus - Unknown Statement');
    }

}

//////////////////////////////// Give Focus Spell ///////////////////////////////////
function giveFocusSpell(srcStruct, spellSRC, spellName){
  spellName = spellName.replace(/_/g," ").replace(/’/g,"'");

  let spell = null;
  for(const [spellID, spellData] of g_spellMap.entries()){
    if(spellData.Spell.name == spellName){
      spell = spellData.Spell;
      break;
    }
  }
  if(spell != null){
    setData(DATA_SOURCE.FOCUS_SPELL, srcStruct, spellSRC+"="+spell.id);
  }

  if(g_char_id != null){
    socket.emit("requestFocusSpellChange",
        g_char_id,
        srcStruct,
        spellSRC,
        spellName);
  } else {
    saveBuildMetaData();
  }
}

socket.on("returnFocusSpellChange", function(){
    statementComplete('SpellFocus - Add Spell');
});

//////////////////////////////// Give Focus Point ///////////////////////////////////
function giveFocusPoint(srcStruct){

  setData(DATA_SOURCE.FOCUS_POINT, srcStruct, '1');

  if(g_char_id != null){
    socket.emit("requestFocusPointChange",
        g_char_id,
        srcStruct);
  } else {
    saveBuildMetaData();
  }
}

socket.on("returnFocusPointChange", function(){
    statementComplete('SpellFocus - Add Point');
});