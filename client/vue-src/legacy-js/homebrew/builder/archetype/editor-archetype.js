/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

  socket.emit("requestHomebrewArchetypeDetails", $('#builder-container').attr('data-bundle-id'));

});

socket.on("returnHomebrewArchetypeDetails", function(archetypeArray, featsObject){

    let featMap = objToMap(featsObject);
    
    let archetypeID = $('#builder-container').attr('data-archetype-id');
    let archetype = archetypeArray.find(archetype => {
        return archetype.id == archetypeID;
    });

    if(archetype == null){
        window.location.href = '/homebrew';
        return;
    }

    let dedicationFeat = null;

    $("#inputName").val(archetype.name);

    let multiclassCheckBoxState = (archetype.isMulticlass == 1) ? true : false;
    $("#inputIsMulticlass").prop('checked', multiclassCheckBoxState);

    $("#inputDescription").val(archetype.description);


    // Archetype Feats //
    let archetypeFeats = [];
    for(const [key, value] of featMap.entries()){
        let archetypeTag = value.Tags.find(tag => {
            return tag.id === archetype.tagID;
        });
        if(archetypeTag != null){
            $("#addFeatButton").trigger("click");
            archetypeFeats.push(value);
        }

        if(value.Feat.id === archetype.dedicationFeatID) {
            dedicationFeat = value;
        }
    }

    archetypeFeats = archetypeFeats.sort(
        function(a, b) {
            if (a.Feat.level === b.Feat.level) {
                // Name is only important when levels are the same
                return a.Feat.name > b.Feat.name ? 1 : -1;
            }
            return a.Feat.level - b.Feat.level;
        }
    );

    let archetypeFeatCount = 0;
    $(".archetypeFeat").each(function(){
        if($(this).is(":visible")) {
            let feat = archetypeFeats[archetypeFeatCount];
            archetypeFeatCount++;

            $(this).find(".inputFeatName").val(feat.Feat.name);
            $(this).find(".inputFeatLevel").val(feat.Feat.level);
            $(this).find(".inputFeatActions").val(feat.Feat.actions);
            $(this).find(".inputFeatRarity").val(feat.Feat.rarity);
            $(this).find(".inputFeatPrereq").val(feat.Feat.prerequisites);
            $(this).find(".inputFeatReq").val(feat.Feat.requirements);
            $(this).find(".inputFeatFreq").val(feat.Feat.frequency);
            $(this).find(".inputFeatCost").val(feat.Feat.cost);
            $(this).find(".inputFeatTrigger").val(feat.Feat.trigger);
            $(this).find(".inputFeatDesc").val(feat.Feat.description);
            $(this).find(".inputFeatSpecial").val(feat.Feat.special);
            let checkBoxState = (feat.Feat.canSelectMultiple == 1) ? true : false;
            $(this).find(".inputFeatSelectMultiple").prop('checked', checkBoxState);
            $(this).find(".inputFeatCode").val(feat.Feat.code);

            for(let featTag of feat.Tags){
                if(featTag.id != archetype.tagID) {
                    $(this).find(".inputFeatTags").find('option[value='+featTag.id+']').attr('selected','selected');
                }
            }

            // Minimize Feat
            $(this).find(".card-header").trigger("click");
            // Trigger Feat Name and Tags
            $(this).find(".inputFeatName").trigger("change");
            $(this).find(".inputFeatTags").trigger("chosen:updated");
        }
    });


    if(dedicationFeat != null){
        let feat = dedicationFeat;

        $('#dedicationFeat').find(".inputFeatLevel").val(feat.Feat.level);
        $('#dedicationFeat').find(".inputFeatActions").val(feat.Feat.actions);
        $('#dedicationFeat').find(".inputFeatRarity").val(feat.Feat.rarity);
        $('#dedicationFeat').find(".inputFeatPrereq").val(feat.Feat.prerequisites);
        $('#dedicationFeat').find(".inputFeatReq").val(feat.Feat.requirements);
        $('#dedicationFeat').find(".inputFeatFreq").val(feat.Feat.frequency);
        $('#dedicationFeat').find(".inputFeatCost").val(feat.Feat.cost);
        $('#dedicationFeat').find(".inputFeatTrigger").val(feat.Feat.trigger);
        $('#dedicationFeat').find(".inputFeatDesc").val(feat.Feat.description);
        $('#dedicationFeat').find(".inputFeatSpecial").val(feat.Feat.special);
        let checkBoxState = (feat.Feat.canSelectMultiple == 1) ? true : false;
        $('#dedicationFeat').find(".inputFeatSelectMultiple").prop('checked', checkBoxState);
        $('#dedicationFeat').find(".inputFeatCode").val(feat.Feat.code);

        for(let featTag of feat.Tags){
            if(featTag.id != archetype.tagID) {
                $('#dedicationFeat').find(".inputFeatTags").find('option[value='+featTag.id+']').attr('selected','selected');
            }
        }

        $('#dedicationFeat').find(".inputFeatTags").trigger("chosen:updated");

    }


    $("#updateButton").click(function(){
        $(this).unbind();
        finishArchetype(true);
    });

    stopSpinnerLoader();
});