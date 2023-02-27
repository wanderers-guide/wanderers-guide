/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function getClassEditorIDFromURL(){
  let spl1 = window.location.pathname.split("class/");
  return parseInt(spl1[1]);
}

function getAncestryEditorIDFromURL(){
    let spl1 = window.location.pathname.split("ancestry/");
    return parseInt(spl1[1]);
}

function getBackgroundEditorIDFromURL(){
  let spl1 = window.location.pathname.split("background/");
  return parseInt(spl1[1]);
}

function getFeatEditorIDFromURL(){
  let spl1 = window.location.pathname.split("feat-action/");
  return parseInt(spl1[1]);
}

function getItemEditorIDFromURL(){
  let spl1 = window.location.pathname.split("item/");
  return parseInt(spl1[1]);
}

function getSpellEditorIDFromURL(){
  let spl1 = window.location.pathname.split("spell/");
  return parseInt(spl1[1]);
}

function getArchetypeEditorIDFromURL(){
  let spl1 = window.location.pathname.split("archetype/");
  return parseInt(spl1[1]);
}

function getUniHeritageEditorIDFromURL(){
  let spl1 = window.location.pathname.split("uni-heritage/");
  return parseInt(spl1[1]);
}

function getClassFeatureEditorIDFromURL(){
  let spl1 = window.location.pathname.split("class-feature/");
  return parseInt(spl1[1]);
}

function getHeritageEditorIDFromURL(){
  let spl1 = window.location.pathname.split("heritage/");
  return parseInt(spl1[1]);
}

function getExtraEditorIDFromURL(){
  let spl1 = window.location.pathname.split("extra/");
  return parseInt(spl1[1]);
}