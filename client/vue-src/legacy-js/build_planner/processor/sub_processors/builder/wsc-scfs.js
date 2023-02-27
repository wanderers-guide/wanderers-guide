/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing SCFS -------------------------//
function processingSCFS(wscStatement, srcStruct, locationID, extraData){

  if(wscStatement.includes("GIVE-SCFS=")){ // GIVE-SCFS=Class Feature Selector Name:WSC Statement Name
    let data = wscStatement.split('=')[1];
    let segments = data.split(':');
    createSCFS(srcStruct, locationID, segments[0], segments[1], extraData);
  } else {
    displayError("Unknown statement (2-SCFS): \'"+wscStatement+"\'");
    statementComplete('SCFS - Unknown Statement');
  }

}

//////////////////////////////// Create SCFS ///////////////////////////////////

function createSCFS(srcStruct, locationID, featureName, statementName, extraData){

  if(g_char_id != null){// TODO - Support builds
    socket.emit("requestFindClassFeatureForSCFS",
        g_char_id,
        featureName,
        { locationID, srcStruct, statementName, sourceName: extraData.sourceName });
  }

}

socket.on("returnFindClassFeatureForSCFS", function(classFeature, allClassFeatureOptions, inputPacket){
  console.log(`Waited for 'returnFindClassFeatureForSCFS'.`);
  if(classFeature == null) { statementComplete('SCFS - Add Null'); return; }


  let scfsID = "scfs-"+inputPacket.locationID+"-"+inputPacket.srcStruct.sourceCode+"-"+inputPacket.srcStruct.sourceCodeSNum;
  let scfsCodeID = scfsID+"-Code";
  let scfsControlShellClass = scfsID+'-ControlShell';

  // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
  if($('#'+scfsID).length != 0) { statementComplete('SCFS - Add Error'); return; }

  const selectionTagInfo = getTagFromData(inputPacket.srcStruct, inputPacket.sourceName, 'Unselected Option', 'UNSELECTED');

  $('#'+inputPacket.locationID).append('<div class="field is-grouped is-grouped-centered is-marginless my-1"><div class="select '+scfsControlShellClass+'" data-selection-info="'+selectionTagInfo+'"><select id="'+scfsID+'" class="selectLang"></select></div></div><div id="'+scfsCodeID+'"></div>');

  $('#'+scfsID).append('<option value="chooseDefault">Choose an Option</option>');
  $('#'+scfsID).append('<optgroup label="──────────"></optgroup>');

  ///
  
  //Get saved SCFS
  const SCFSData = getDataSingle(DATA_SOURCE.SCFS, inputPacket.srcStruct);

  let selectedClassFeatureOption = null;
  if(SCFSData != null && SCFSData.value != null){
    selectedClassFeatureOption = allClassFeatureOptions.find(classFeatureOption => {
      return classFeatureOption.id == SCFSData.value;
    });
  }

  ///

  let optionsMap = new Map(); // { option ID } -> { WSC statement }

  for(const classFeatureOption of allClassFeatureOptions) {
    if(classFeatureOption.selectType === 'SELECT_OPTION' && (classFeatureOption.selectOptionFor === classFeature.id || classFeatureOption.indivClassAbilName === classFeature.name)) {

      const codeStatements = classFeatureOption.code.split(/\n/);
      const wscStatement = codeStatements.find(statement => {
        return statement.startsWith(inputPacket.statementName);
      });

      if(wscStatement != null){

        if(selectedClassFeatureOption != null && selectedClassFeatureOption.id == classFeatureOption.id) {
          $('#'+scfsID).append('<option value="'+classFeatureOption.id+'" selected>'+classFeatureOption.name+'</option>');
        } else {
          $('#'+scfsID).append('<option value="'+classFeatureOption.id+'">'+classFeatureOption.name+'</option>');
        }

        optionsMap.set(classFeatureOption.id+"", wscStatement);

      }

    }
  }

  ///

  $('#'+scfsID).change(function() {

    let classFeatureOptionID = $(this).val();
    let wscStatement = optionsMap.get(classFeatureOptionID+"");

    if($(this).val() == "chooseDefault"){
        $('.'+scfsControlShellClass).addClass("is-info");

        // Clear generated code
        $('#'+scfsCodeID).html('');

        deleteData(DATA_SOURCE.SCFS, inputPacket.srcStruct);

        // Delete SCFS
        socket.emit("requestSCFSChange",
            g_char_id,
            inputPacket.srcStruct,
            null,
            {
              wscStatement: null,
              scfsControlShellClass, 
              srcStruct: inputPacket.srcStruct,
              locationID: scfsCodeID,
              sourceName: inputPacket.sourceName,
            });

    } else {
        $('.'+scfsControlShellClass).removeClass("is-info");

        // Clear generated code
        $('#'+scfsCodeID).html('');

        setData(DATA_SOURCE.SCFS, inputPacket.srcStruct, classFeatureOptionID);

        // Save SCFS
        $('.'+scfsControlShellClass).addClass("is-loading");
        socket.emit("requestSCFSChange",
            g_char_id,
            inputPacket.srcStruct,
            classFeatureOptionID,
            {
              wscStatement,
              scfsControlShellClass, 
              srcStruct: inputPacket.srcStruct,
              locationID: scfsCodeID,
              sourceName: inputPacket.sourceName,
            });

    }
    
  });

  $('#'+scfsID).trigger("change");

  statementComplete('SCFS - Add');

});


socket.on("returnSCFSChange", function(inputPacket){
  if(inputPacket.scfsControlShellClass != null) {
    $('.'+inputPacket.scfsControlShellClass).removeClass("is-loading");
    $('.'+inputPacket.scfsControlShellClass+'>select').blur();
    selectorUpdated();
  }
  if(inputPacket.wscStatement != null){
    processCode(
      inputPacket.wscStatement,
      inputPacket.srcStruct,
      inputPacket.locationID,
      {source: 'SCFS', sourceName: inputPacket.sourceName});
  }
});
