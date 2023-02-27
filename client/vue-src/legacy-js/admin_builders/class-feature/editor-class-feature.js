/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

});

socket.on("returnAdminClassDetails", function(classObject, featsObject){

    let classMap = objToMap(classObject);
    
    let classFeatureID = getClassFeatureEditorIDFromURL();

    let cClass = null;
    let classFeature = null;
    for(const [classID, classData] of classMap.entries()){
        for(let ability of classData.Abilities){
            if(ability.id == classFeatureID){
                classFeature = ability;
                cClass = classData;
                break;
            }
        }
    }

    if(classFeature == null){
        window.location.href = '/admin/manage/class-feature';
        return;
    }

    $('#inputClassFor').val(classFeature.indivClassName);
    $("#inputContentSource").val(classFeature.contentSrc);

    $('#inputClassFor').trigger("change");

    if(classFeature.indivClassAbilName != null){
        $('#inputBuilderType').val('FEATURE-OPTION');
        $('#inputBuilderType').trigger("change");
        $('#inputClassFeatureFor').val(classFeature.indivClassAbilName);
    } else {
        $('#inputBuilderType').trigger("change");
    }

    $("#classAbility0").find(".inputClassFeatureName").val(classFeature.name);
    if(classFeature.level == null) {classFeature.level = 1;}
    $("#classAbility0").find(".inputClassFeatureLevel").val(classFeature.level);
    $("#classAbility0").find(".inputClassFeatureDesc").val(classFeature.description);
    $("#classAbility0").find(".inputClassFeatureCode").val(classFeature.code);
    let displayInSheet = (classFeature.displayInSheet == 1) ? true : false;
    $("#classAbility0").find(".inputClassFeatureDisplayInSheet").prop('checked', displayInSheet);

    // Minimize Class Ability
    $("#classAbility0").find(".card-header").trigger("click");
    // Trigger Class Ability Name and Tags
    $("#classAbility0").find(".inputClassFeatureName").trigger("change");

    if(classFeature.selectType === 'SELECTOR'){
        $("#classAbility0").find(".inputClassFeatureIsSelector").prop('checked', true);
        $("#classAbility0").find(".inputClassFeatureIsSelector").trigger("change");

        let classAbilOptionsArray = [];
        for(let classAbilOption of cClass.Abilities){
            if(classAbilOption.selectType === 'SELECT_OPTION' && classAbilOption.selectOptionFor === classFeature.id){
                classAbilOptionsArray.push(classAbilOption);
                $("#classAbility0").find(".classFeatureAddOptionButton").trigger("click");
            }
        }

        let classAbilOptionCount = 0;
        $("#classAbility0").find(".classFeatureOption").each(function(){
            let classAbilOption = classAbilOptionsArray[classAbilOptionCount];
            classAbilOptionCount++;

            $(this).find(".inputClassFeatureName").val(classAbilOption.name);
            $(this).find(".inputClassFeatureDesc").val(classAbilOption.description);
            $(this).find(".inputClassFeatureCode").val(classAbilOption.code);

        });

    }

    $("#updateButton").click(function(){
        $(this).unbind();
        finishClassFeature(true);
    });

});