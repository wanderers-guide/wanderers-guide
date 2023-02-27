/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

    socket.emit("requestAdminUniHeritageDetails");

});

socket.on("returnAdminUniHeritageDetails", function(uniHeritageArray, featsObject){

    let featMap = objToMap(featsObject);

    let uniHeritageID = getUniHeritageEditorIDFromURL();
    let uniHeritage = uniHeritageArray.find(uniHeritage => {
        return uniHeritage.id == uniHeritageID;
    });

    if(uniHeritage == null){
        window.location.href = '/admin/manage/uni-heritage';
        return;
    }

    $("#inputName").val(uniHeritage.name);
    $("#inputVersion").val(uniHeritage.version);
    $("#inputRarity").val(uniHeritage.rarity);
    $("#inputDescription").val(uniHeritage.description);
    $("#inputImageURL").val(uniHeritage.artworkURL);
    $("#inputContentSource").val(uniHeritage.contentSrc);
    $("#inputCode").val(uniHeritage.code);

    // Heritage Feats
    let heritageFeats = [];
    for(const [key, value] of featMap.entries()){
        let heritageTag = value.Tags.find(tag => {
            return tag.id === uniHeritage.tagID;
        });
        if(heritageTag != null){
            $("#addFeatButton").trigger("click");
            heritageFeats.push(value);
        }
    }

    heritageFeats = heritageFeats.sort(
        function(a, b) {
            if (a.Feat.level === b.Feat.level) {
                // Name is only important when levels are the same
                return a.Feat.name > b.Feat.name ? 1 : -1;
            }
            return a.Feat.level - b.Feat.level;
        }
    );

    let heritageFeatCount = 0;
    $(".heritageFeat").each(function(){
        if($(this).is(":visible")) {
            let feat = heritageFeats[heritageFeatCount];
            heritageFeatCount++;

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
                if(featTag.id != uniHeritage.tagID) {
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


    $("#updateButton").click(function(){
        $(this).unbind();
        finishUniHeritage(true);
    });

});