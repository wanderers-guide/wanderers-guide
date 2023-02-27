/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

let g_homebrewID = null;

let g_classMap = null;
let g_ancestryMap = null;
let g_uniHeritageArray = null;
let g_archetypeArray = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    $("#inputFeatTags").chosen();

    socket.emit("requestHomebrewFeatDetailsPlus", $('#builder-container').attr('data-bundle-id'));

});

socket.on("returnHomebrewFeatDetailsPlus", function(featsObject, classObject, ancestryObject, uniHeritageArray, archetypeArray){

    g_classMap = objToMap(classObject);
    g_classMap = new Map([...g_classMap.entries()].sort(
        function(a, b) {
            return a[1].Class.name > b[1].Class.name ? 1 : -1;
        })
    );

    g_ancestryMap = objToMap(ancestryObject);
    g_ancestryMap = new Map([...g_ancestryMap.entries()].sort(
        function(a, b) {
            return a[1].Ancestry.name > b[1].Ancestry.name ? 1 : -1;
        })
    );

    g_uniHeritageArray = uniHeritageArray;

    g_archetypeArray = archetypeArray;


    $('#inputClassOptions').html('');
    for(const [classID, classData] of g_classMap.entries()){
        if(classData.Class.isArchived === 0){
            $('#inputClassOptions').append('<option value="'+classID+'">'+classData.Class.name+'</option>');
        }
    }

    $('#inputArchetypeOptions').html('');
    for(const archetype of g_archetypeArray){
        if(archetype.isArchived === 0){
            $('#inputArchetypeOptions').append('<option value="'+archetype.name+'">'+archetype.name+'</option>');
        }
    }

    $('#inputAncestryOptions').html('');
    for(const [ancestryID, ancestryData] of g_ancestryMap.entries()){
        if(ancestryData.Ancestry.isArchived === 0){
          $('#inputAncestryOptions').append('<option value="'+ancestryID+'">'+ancestryData.Ancestry.name+'</option>');
        }
    }
    $('#inputAncestryOptions').append('<optgroup label="──────────"></optgroup>');
    for(const uniHeritage of g_uniHeritageArray){
        if(uniHeritage.isArchived === 0){
          $('#inputAncestryOptions').append('<option value="'+uniHeritage.name+'">'+uniHeritage.name+'</option>');
        }
    }

    let builderTypeSelection = $("#inputBuilderType");
    builderTypeSelection.change(function(){
        let builderType = $(this).val();
        if(builderType == "GENERAL-FEAT"){
            $("#sectionSkill").addClass('is-hidden');
            $("#sectionMinProf").addClass('is-hidden');
            $("#sectionLevel").removeClass('is-hidden');
            $("#sectionSelectMultiple").removeClass('is-hidden');
            $("#sectionClassOptions").addClass('is-hidden');
            $("#sectionAncestryOptions").addClass('is-hidden');
            $("#sectionArchetypeOptions").addClass('is-hidden');
        } else if(builderType == "SKILL-FEAT"){
            $("#sectionSkill").removeClass('is-hidden');
            $("#sectionMinProf").addClass('is-hidden');
            $("#sectionLevel").removeClass('is-hidden');
            $("#sectionSelectMultiple").removeClass('is-hidden');
            $("#sectionClassOptions").addClass('is-hidden');
            $("#sectionAncestryOptions").addClass('is-hidden');
            $("#sectionArchetypeOptions").addClass('is-hidden');
        } else if(builderType == "CLASS-FEAT"){
            $("#sectionSkill").addClass('is-hidden');
            $("#sectionMinProf").addClass('is-hidden');
            $("#sectionLevel").removeClass('is-hidden');
            $("#sectionSelectMultiple").removeClass('is-hidden');
            $("#sectionClassOptions").removeClass('is-hidden');
            $("#sectionAncestryOptions").addClass('is-hidden');
            $("#sectionArchetypeOptions").addClass('is-hidden');
        } else if(builderType == "ANCESTRY-FEAT"){
            $("#sectionSkill").addClass('is-hidden');
            $("#sectionMinProf").addClass('is-hidden');
            $("#sectionLevel").removeClass('is-hidden');
            $("#sectionSelectMultiple").removeClass('is-hidden');
            $("#sectionClassOptions").addClass('is-hidden');
            $("#sectionAncestryOptions").removeClass('is-hidden');
            $("#sectionArchetypeOptions").addClass('is-hidden');
        } else if(builderType == "ARCHETYPE-FEAT"){
            $("#sectionSkill").addClass('is-hidden');
            $("#sectionMinProf").addClass('is-hidden');
            $("#sectionLevel").removeClass('is-hidden');
            $("#sectionSelectMultiple").removeClass('is-hidden');
            $("#sectionClassOptions").addClass('is-hidden');
            $("#sectionAncestryOptions").addClass('is-hidden');
            $("#sectionArchetypeOptions").removeClass('is-hidden');
        } else if(builderType == "BASIC-ACTION"){
            $("#sectionSkill").addClass('is-hidden');
            $("#sectionMinProf").addClass('is-hidden');
            $("#sectionLevel").addClass('is-hidden');
            $("#sectionSelectMultiple").addClass('is-hidden');
            $("#sectionClassOptions").addClass('is-hidden');
            $("#sectionAncestryOptions").addClass('is-hidden');
            $("#sectionArchetypeOptions").addClass('is-hidden');
        } else if(builderType == "SKILL-ACTION"){
            $("#sectionSkill").removeClass('is-hidden');
            $("#sectionMinProf").addClass('is-hidden');
            $("#sectionLevel").addClass('is-hidden');
            $("#sectionSelectMultiple").addClass('is-hidden');
            $("#sectionClassOptions").addClass('is-hidden');
            $("#sectionAncestryOptions").addClass('is-hidden');
            $("#sectionArchetypeOptions").addClass('is-hidden');
        } else if(builderType == "CREATURE-ACTION"){
            $("#sectionSkill").addClass('is-hidden');
            $("#sectionMinProf").addClass('is-hidden');
            $("#sectionLevel").addClass('is-hidden');
            $("#sectionSelectMultiple").addClass('is-hidden');
            $("#sectionClassOptions").addClass('is-hidden');
            $("#sectionAncestryOptions").addClass('is-hidden');
            $("#sectionArchetypeOptions").addClass('is-hidden');
        } else if(builderType == "COMPANION-ACTION"){
            $("#sectionSkill").addClass('is-hidden');
            $("#sectionMinProf").addClass('is-hidden');
            $("#sectionLevel").addClass('is-hidden');
            $("#sectionSelectMultiple").addClass('is-hidden');
            $("#sectionClassOptions").addClass('is-hidden');
            $("#sectionAncestryOptions").addClass('is-hidden');
            $("#sectionArchetypeOptions").addClass('is-hidden');
        }
    });
    builderTypeSelection.trigger("change");
    

    $("#createButton").click(function(){
        $(this).unbind();
        finishFeat(false);
    });

    if($("#createButton").length){// If button exists
      stopSpinnerLoader();
    }
});

function finishFeat(isUpdate){

    let builderType = $("#inputBuilderType").val();
    let featName = $("#inputFeatName").val();
    let featLevel = ($("#inputFeatLevel").is(":visible")) ? $("#inputFeatLevel").val() : null;
    let featMinProf = ($("#inputFeatMinProf").is(":visible")) ? $("#inputFeatMinProf").val() : null;
    let featSkillID = ($("#inputFeatSkill").is(":visible")) ? $("#inputFeatSkill").val() : null;
    let featActions = $("#inputFeatActions").val();
    let featRarity = $("#inputFeatRarity").val();
    let featTagsArray = $("#inputFeatTags").val();
    let featPrereq = $("#inputFeatPrereq").val();
    let featReq = $("#inputFeatReq").val();
    let featFreq = $("#inputFeatFreq").val();
    let featCost = $("#inputFeatCost").val();
    let featTrigger = $("#inputFeatTrigger").val();
    let featDesc = $("#inputFeatDesc").val();
    let featSpecial = $("#inputFeatSpecial").val();
    let featSelectMultiple = null;
    if($("#inputFeatSelectMultiple").is(":visible")) {
        featSelectMultiple = ($("#inputFeatSelectMultiple:checked").val() == '1') ? 1 : 0;
    }
    let featCode = $("#inputFeatCode").val();
    
    let featGenTypeName = null;
    if($("#inputClassOptions").is(":visible")) {
      let classID = $('#inputClassOptions').val();
      let classData = g_classMap.get(classID+"");
      if(classData != null){
        featGenTypeName = classData.Class.name;
      }
    } else if($("#inputAncestryOptions").is(":visible")) {
      let ancestryID = $('#inputAncestryOptions').val();
      if(isNaN(ancestryID)){
        featGenTypeName = ancestryID; // Must be UniHeritage Name
      } else {
        let ancestryData = g_ancestryMap.get(ancestryID+"");
        if(ancestryData != null){
          featGenTypeName = ancestryData.Ancestry.name;
        }
      }
    } else if($("#inputArchetypeOptions").is(":visible")) {
      featGenTypeName = $('#inputArchetypeOptions').val()+' Archetype';
    }


    let requestPacket = null;
    g_homebrewID = $('#builder-container').attr('data-bundle-id');
    let featID = $('#builder-container').attr('data-feat-id');
    if(isUpdate){
        requestPacket = "requestHomebrewUpdateFeat";
    } else {
        requestPacket = "requestHomebrewAddFeat";
    }

    
    socket.emit(requestPacket, g_homebrewID, {
        featID,
        builderType,
        featName,
        featLevel,
        featMinProf,
        featSkillID,
        featActions,
        featRarity,
        featTagsArray,
        featPrereq,
        featReq,
        featFreq,
        featCost,
        featTrigger,
        featDesc,
        featSpecial,
        featSelectMultiple,
        featCode,
        featGenTypeName,
    });

}

socket.on("returnHomebrewCompleteFeat", function() {
  window.location.href = '/homebrew/?edit_id='+g_homebrewID;
});