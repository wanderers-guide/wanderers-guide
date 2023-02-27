/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/
let socket = io();

// ~~~~~ Character Export ~~~~~ //
export function exportCharacter(charID){
  startSpinnerSubLoader();
  socket.emit("requestCharExport", charID);
}

socket.on("returnCharExport", function(charExportData){
  stopSpinnerSubLoader();
  let charExportDataJSON = JSON.stringify(charExportData);
  let fileName = charExportData.character.name.replaceAll(/[^a-zA-Z]/g, '').replaceAll(' ', '_');
  charExportDataFileDownload(fileName+'.guidechar', charExportDataJSON);
  $('.modal-card-close').trigger('click');
});

export function charExportDataFileDownload(filename, text) {
  let element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}



// ~~~~~ Character Copy ~~~~~ //
export function copyCharacter(charID){
  socket.emit("requestCharCopy", charID);
}

socket.on("returnCharCopy", function(){
  // Hardcoded redirect
  window.location.href = '/v/profile/characters';
});
