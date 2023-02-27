/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let socket = io();

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

    // ~ Content Sources ~ //
    for(let contSrcData of g_contentSources){
      if(g_currentContentSource === contSrcData.CodeName){
        $("#inputContentSource").append('<option value="'+contSrcData.CodeName+'" selected>'+contSrcData.TextName+'</option>');
      } else {
        $("#inputContentSource").append('<option value="'+contSrcData.CodeName+'">'+contSrcData.TextName+'</option>');
      }
    }
    // ~ ~~~~~~~~~~~~~~~ ~ //

    socket.emit("requestAdminClassDetails");

});

socket.on("returnAdminClassDetails", function(classObject, featsObject){

    let classMap = objToMap(classObject);
    classMap = new Map([...classMap.entries()].sort(
      function(a, b) {
        return a[1].Class.name > b[1].Class.name ? 1 : -1;
      })
    );

    $('#inputClassFor').html('');
    for(const [classID, classData] of classMap.entries()){
        if(classData.Class.isArchived == 0){
            $('#inputClassFor').append('<option value="'+classData.Class.name+'">'+classData.Class.name+'</option>');
        }
    }


    $('#inputClassFor').change(function(){
        $('#inputClassFeatureFor').html('');
        for(const [classID, classData] of classMap.entries()){
            if($(this).val() == classData.Class.name){
                for(let ability of classData.Abilities){
                    if(ability.isArchived == 0 && ability.selectType == 'SELECTOR'){
                        $('#inputClassFeatureFor').append('<option value="'+ability.name+'">'+ability.name+'</option>');
                    }
                }
                break;
            }
        }
    });
    $('#inputClassFor').trigger("change");

    let newClassAbility = $("#classFeatureLayout").clone();
    newClassAbility.attr('id', "classAbility0");
    newClassAbility.removeClass('is-hidden');
    newClassAbility.removeClass('isLayout');
    newClassAbility.find('.card-header').addClass('is-hidden');
    newClassAbility.appendTo("#classFeatureContent");


    $('#inputBuilderType').change(function(){
        if($(this).val() == 'FEATURE'){
            $('#sectionClassFeatureFor').addClass('is-hidden');
            $('#classAbility0').find(".classFeatureLevelSection").removeClass('is-hidden');
            $('#classAbility0').find(".classFeatureDisplayInSheetSection").removeClass('is-hidden');
            $('#classAbility0').find(".classFeatureIsSelectorSection").removeClass('is-hidden');
            if($("#classAbility0").find(".inputClassFeatureIsSelector").is(":checked")){
              $('#classAbility0').find(".classFeatureSelectionOptions").removeClass('is-hidden');
            }
        } else if($(this).val() == 'FEATURE-OPTION'){
            $('#sectionClassFeatureFor').removeClass('is-hidden');
            $('#classAbility0').find(".classFeatureLevelSection").addClass('is-hidden');
            $('#classAbility0').find(".classFeatureDisplayInSheetSection").addClass('is-hidden');
            $('#classAbility0').find(".classFeatureIsSelectorSection").addClass('is-hidden');
            $('#classAbility0').find(".classFeatureSelectionOptions").addClass('is-hidden');
        }
    });
    $('#inputBuilderType').trigger("change");


    // When 'Is Selector' checkbox is changed
    let inputClassFeatureIsSelector = $("#classAbility0").find(".inputClassFeatureIsSelector");
    inputClassFeatureIsSelector.change(function(){
        
        if ($(this).is(":checked")) {

            let classFeatureSelectionOptions = $("#classAbility0").find(".classFeatureSelectionOptions");
            classFeatureSelectionOptions.removeClass('is-hidden');

            let classFeatureOptionsContent = $("#classAbility0").find(".classFeatureOptionsContent");
            let classFeatureAddOptionButton = $("#classAbility0").find(".classFeatureAddOptionButton");
            let classAbilityOptionsCount = 0;
            classFeatureAddOptionButton.click(function(){
                classAbilityOptionsCount++;

                let classAbilityOptionID = "classAbility0Option"+classAbilityOptionsCount;

                let newClassAbilityOption = $("#classFeatureLayout").clone();
                newClassAbilityOption.attr('id', classAbilityOptionID);
                newClassAbilityOption.removeClass('is-hidden');
                newClassAbilityOption.removeClass('isLayout');
                newClassAbilityOption.removeClass('classFeature');
                newClassAbilityOption.addClass('classFeatureOption');
                newClassAbilityOption.find(".classFeatureLevelSection").remove();
                newClassAbilityOption.find(".classFeatureDisplayInSheetSection").remove();
                newClassAbilityOption.find(".classFeatureIsSelectorSection").remove();
                newClassAbilityOption.find(".classFeatureSelectionOptions").remove();
                newClassAbilityOption.find(".card-header-title").html('Option');
                newClassAbilityOption.appendTo(classFeatureOptionsContent);

                let cardHeader = $("#"+classAbilityOptionID).find(".card-header");
                let cardContent = $("#"+classAbilityOptionID).find(".card-content");

                cardHeader.click(function(){
                    if(cardContent.is(":visible")) {
                        cardContent.addClass('is-hidden');
                    } else {
                        cardContent.removeClass('is-hidden');
                    }
                });

                let cardHeaderIcon = $("#"+classAbilityOptionID).find(".card-header-icon");
                cardHeaderIcon.click(function(){
                    $("#"+classAbilityOptionID).remove();
                });

            });

        } else {

            let classFeatureSelectionOptions = $("#classAbility0").find(".classFeatureSelectionOptions");
            classFeatureSelectionOptions.addClass('is-hidden');

        }

    });


    $("#createButton").click(function(){
        $(this).unbind();
        finishClassFeature(false);
    });

});

function finishClassFeature(isUpdate){

    let classFeatureClassName = $("#inputClassFor").val();
    let classFeatureClassAbilName = null;
    if($("#inputClassFeatureFor").is(":visible")) {
        classFeatureClassAbilName = $("#inputClassFeatureFor").val();
    }
    let classFeatureContentSrc = $("#inputContentSource").val();

    let classFeatureData = null;

    if($('#inputBuilderType').val() == 'FEATURE') {

        $(".classFeature").each(function(){
            if(!$(this).hasClass("isLayout")) {
                let classFeatureName = $(this).find(".inputClassFeatureName").val();
                let classFeatureLevel = $(this).find(".inputClassFeatureLevel").val();
                let classFeatureDesc = $(this).find(".inputClassFeatureDesc").val();
                let classFeatureCode = $(this).find(".inputClassFeatureCode").val();
                let classFeatureDisplayInSheet = ($(this).find(".inputClassFeatureDisplayInSheet:checked").val() == '1') ? 1 : 0;
                
                let classFeatureOptions = [];
                if($(this).find(".inputClassFeatureIsSelector").is(":checked")) {
                    if(!$(this).find(".classFeatureSelectionOptions").hasClass("isLayout")){
                        $(this).find(".classFeatureOption").each(function(){
                            classFeatureOptions.push({
                                name: $(this).find(".inputClassFeatureName").val(),
                                description: $(this).find(".inputClassFeatureDesc").val(),
                                code: $(this).find(".inputClassFeatureCode").val(),
                            });
                        });
                    }
                }
    
                classFeatureData = {
                    name: classFeatureName,
                    level: classFeatureLevel,
                    description: classFeatureDesc,
                    code: classFeatureCode,
                    displayInSheet: classFeatureDisplayInSheet,
                    options: classFeatureOptions,
                };
            }
        });

    } else if($('#inputBuilderType').val() == 'FEATURE-OPTION') {

        $(".classFeature").each(function(){
            if(!$(this).hasClass("isLayout")) {
                let classFeatureName = $(this).find(".inputClassFeatureName").val();
                let classFeatureDesc = $(this).find(".inputClassFeatureDesc").val();
                let classFeatureCode = $(this).find(".inputClassFeatureCode").val();
    
                classFeatureData = {
                    name: classFeatureName,
                    description: classFeatureDesc,
                    code: classFeatureCode,
                };
            }
        });

    } 
    
    let requestPacket = null;
    let classFeatureID = null;
    if(isUpdate){
        requestPacket = "requestAdminUpdateClassFeature";
        classFeatureID = getClassFeatureEditorIDFromURL();
    } else {
        requestPacket = "requestAdminAddClassFeature";
    }
    
    socket.emit(requestPacket,{
        classFeatureID,
        classFeatureData,
        classFeatureClassName,
        classFeatureClassAbilName,
        classFeatureContentSrc
    });

}

socket.on("returnAdminCompleteClassFeature", function() {
    window.location.href = '/admin/manage/class-feature';
});