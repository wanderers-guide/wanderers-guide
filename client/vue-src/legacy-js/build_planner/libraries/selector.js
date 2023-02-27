/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

/*
  selectionTitle
  optionsArray: [{id, name},{id, name},{id, name}...]
  selectedOptionID
  selectorID
  locationID
  srcStruct
  selectionTagInfo
  extra_description: {id: descriptionID, map: Map(optionID -> description)}
  extra_code: {id: codeID, sourceName, map: Map(optionID -> code)}
  extra_socket: {socketRequestName, charID, extraSendData}
*/

class Selector {
  constructor(selectionTitle, optionsArray, selectedOptionID, selectorID, locationID, srcStruct, selectionTagInfo, extra_socket=null, extra_description=null, extra_code=null) {
    this.selectionTitle = selectionTitle;
    this.optionsArray = optionsArray;
    this.selectedOptionID = selectedOptionID;
    this.selectorID = selectorID;
    this.locationID = locationID;
    this.srcStruct = srcStruct; 
    this.selectionTagInfo = selectionTagInfo;

    this.extra_socket = extra_socket;
    this.extra_description = extra_description;
    this.extra_code = extra_code;

    $('#'+locationID).append(`
      <div class="field is-grouped is-grouped-centered is-marginless my-1">
        <div class="select" data-selection-info="${selectionTagInfo}">
          <select id="${selectorID}"></select>
        </div>
      </div>
    `);
    if(extra_description != null) {
      $('#'+locationID).append(`<div id="${extra_description.id}"></div>`);
    }
    if(extra_code != null) {
      $('#'+locationID).append(`<div id="${extra_code.id}"></div>`);
    }

    $('#'+selectorID).append(`<option value="chooseDefault">${selectionTitle}</option>`);
    $('#'+selectorID).append(`<optgroup label="──────────"></optgroup>`);
    for(const option of optionsArray){
      if(selectedOptionID != null && selectedOptionID == option.id) {
        $('#'+selectorID).append(`<option value="${option.id}" selected>${option.name}</option>`);
      } else {
        $('#'+selectorID).append(`<option value="${option.id}">${option.name}</option>`);
      }
    }

    if(extra_socket != null || extra_description != null || extra_code != null){

      $('#'+selectorID).change(function() {

        if($(this).val() == "chooseDefault"){

          $(this).parent().addClass("is-info");

          setChoice(srcStruct, null);

          if(extra_description != null){
            $('#'+extra_description.id).html('');
          }

          if(extra_code != null){
            $('#'+extra_code.id).html('');
          }

          if(extra_socket != null){
            socket.emit(extra_socket.socketRequestName,
                extra_socket.charID,
                srcStruct,
                null,
                extra_socket.extraSendData);
          }

        } else {

          $(this).parent().removeClass("is-info");

          setChoice(srcStruct, $(this).val());

          if(extra_description != null){
            let description = extra_description.map.get($(this).val());
            $('#'+extra_description.id).html(processText(description, false, null));
          }

          if(extra_code != null){
            let code = extra_code.map.get($(this).val());
            $('#'+extra_code.id).html('');
            processCode(code, srcStruct, extra_code.id, extra_code.sourceName);
          }

          if(extra_socket != null){
            socket.emit(extra_socket.socketRequestName,
                extra_socket.charID,
                srcStruct,
                $(this).val(),
                extra_socket.extraSendData);
          }

        }

        $(this).blur();

      });

    }


  }
}