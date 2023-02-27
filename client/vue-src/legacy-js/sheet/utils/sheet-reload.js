/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_reloadingSheet = false;

function reloadCharSheet(){
  if(!g_reloadingSheet) {
    setDelayToReloadSheet();
  }
}

function setDelayToReloadSheet(){
  g_reloadingSheet = true;
  setTimeout(() => {
    loadCharSheet();
    g_reloadingSheet = false;
  }, 175);
}