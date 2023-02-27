/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

//------------------------- Processing SCFS -------------------------//
function processingSCFS(wscStatement, srcStruct, locationID, sourceName){

  if(wscStatement.includes("GIVE-SCFS=")){ // GIVE-SCFS=Class Feature Selector Name:WSC Statement Name
    let data = wscStatement.split('=')[1];
    let segments = data.split(':');
    createSCFS(srcStruct, locationID, segments[0], segments[1], sourceName);
  } else {
    displayError("Unknown statement (2-SCFS): \'"+wscStatement+"\'");
    statementComplete();
  }

}

//////////////////////////////// Create SCFS ///////////////////////////////////

function createSCFS(srcStruct, locationID, featureName, statementName, sourceName){

  socket.emit("requestFindClassFeatureForSCFS",
      getCharIDFromURL(),
      featureName,
      { locationID, srcStruct, statementName, sourceName });

}

socket.on("returnFindClassFeatureForSCFS", function(classFeature, allClassFeatureOptions, inputPacket){
  if(classFeature == null) { statementComplete(); return; }


  let scfsID = "scfs-"+inputPacket.locationID+"-"+inputPacket.srcStruct.sourceCode+"-"+inputPacket.srcStruct.sourceCodeSNum;
  let scfsCodeID = scfsID+"-Code";
  let scfsControlShellClass = scfsID+'-ControlShell';

  // If ID already exists, just return. This is a temporary fix - this shouldn't be an issue in the first place.
  if($('#'+scfsID).length != 0) { statementComplete(); return; }

  const selectionTagInfo = getTagFromData(inputPacket.srcStruct, inputPacket.sourceName, 'Unselected Option', 'UNSELECTED');

  $('#'+inputPacket.locationID).append('<div class="field is-grouped is-grouped-centered is-marginless my-1"><div class="select '+scfsControlShellClass+'" data-selection-info="'+selectionTagInfo+'"><select id="'+scfsID+'" class="selectLang"></select></div></div><div id="'+scfsCodeID+'"></div>');

  $('#'+scfsID).append('<option value="chooseDefault">Choose an Option</option>');
  $('#'+scfsID).append('<optgroup label="──────────"></optgroup>');

  ///
    
  let SCFSData = wscChoiceStruct.SCFSDataArray.find(SCFSData => {
    return hasSameSrc(SCFSData, inputPacket.srcStruct);
  });

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

        // Delete SCFS
        socket.emit("requestSCFSChange",
            getCharIDFromURL(),
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

        // Save SCFS
        $('.'+scfsControlShellClass).addClass("is-loading");
        socket.emit("requestSCFSChange",
            getCharIDFromURL(),
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

  statementComplete();

});


socket.on("returnSCFSChange", function(inputPacket){
  if(inputPacket.scfsControlShellClass != null) {
    $('.'+inputPacket.scfsControlShellClass).removeClass("is-loading");
    $('.'+inputPacket.scfsControlShellClass+'>select').blur();
    selectorUpdated();
  }
  if(inputPacket.wscStatement != null){
    processBuilderCode(
        inputPacket.wscStatement,
        inputPacket.srcStruct,
        inputPacket.locationID,
        inputPacket.sourceName);
  }
});
