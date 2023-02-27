

function runBuilderStatements(wscStatement, wscStatementUpper, srcStruct, locationID, extraData){

  if(wscStatementUpper == "CLEAR-DATA-FROM-CODE-BLOCK"){
    
    let newSrcStruct = cloneObj(srcStruct);
    newSrcStruct.sourceCodeSNum = newSrcStruct.sourceCodeSNum.substring(1);
    if(g_char_id != null){
      socket.emit("requestWSCSrcStructDataClear",
          g_char_id,
          newSrcStruct);
    } else {
      saveBuildMetaData();
    }
    deleteDataSNumChildren(newSrcStruct);

    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-SCFS")){ // Needs to come before the rest
    processingSCFS(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-CHAR-TRAIT")){
    processingCharTags(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-PHYSICAL-FEATURE")){
    processingPhysicalFeatures(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-SENSE")){
    processingSenses(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-CLASS-FEATURE")){
    processingClassFeatures(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-FEAT")){
    processingFeats(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-PROF")){
    processingProf(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("GIVE-SKILL")){
    processingSkills(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-LANG")){
    processingLangs(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-ABILITY-BOOST") || wscStatementUpper.includes("-ABILITY-FLAW")){
    processingAbilityBoosts(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-INNATE")){
    processingInnateSpells(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-FOCUS")){
    processingFocusSpells(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-SPELL")){
    processingSpells(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-LORE")){
    processingLore(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-RESISTANCE") || wscStatementUpper.includes("-WEAKNESS")){
    processingResistances(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-DOMAIN")){
    processingDomains(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-SPECIALIZATION")){
    processingSpecializations(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-FAMILIARITY")){
    processingFamiliarities(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-NOTES")){
    processingNotes(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("GIVE-SPEED")){
    processingSpeeds(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-KEY-ABILITY")){
    processingKeyAbilities(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  if(wscStatementUpper.includes("-HERITAGE-EFFECTS")){
    processingHeritageEffects(wscStatementUpper, srcStruct, locationID, extraData);
    return PROCESS_RETURN.NEXT;
  }

  return PROCESS_RETURN.UNKNOWN;

}
