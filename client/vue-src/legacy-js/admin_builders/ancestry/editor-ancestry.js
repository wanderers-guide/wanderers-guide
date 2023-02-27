/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

    socket.emit("requestAdminAncestryDetails");

});

socket.on("returnAdminAncestryDetails", function(ancestryObject, featsObject){

    let ancestryMap = objToMap(ancestryObject);
    let featMap = objToMap(featsObject);
    
    let ancestry = ancestryMap.get(getAncestryEditorIDFromURL()+"");

    if(ancestry == null){
        window.location.href = '/admin/manage/ancestry';
        return;
    }

    $("#inputName").val(ancestry.Ancestry.name);
    $("#inputVersion").val(ancestry.Ancestry.version);
    $("#inputRarity").val(ancestry.Ancestry.rarity);
    $("#inputHitPoints").val(ancestry.Ancestry.hitPoints);
    $("#inputSize").val(ancestry.Ancestry.size);
    $("#inputSpeed").val(ancestry.Ancestry.speed);
    $("#inputVisionSense").val(ancestry.Ancestry.visionSenseID);
    $("#inputAdditionalSense").val(ancestry.Ancestry.additionalSenseID);
    $("#inputPhysicalFeatureOne").val(ancestry.Ancestry.physicalFeatureOneID);
    $("#inputPhysicalFeatureTwo").val(ancestry.Ancestry.physicalFeatureTwoID);
    $("#inputDescription").val(ancestry.Ancestry.description);
    $("#inputImageURL").val(ancestry.Ancestry.artworkURL);
    $("#inputContentSource").val(ancestry.Ancestry.contentSrc);

    // Ancestry Boosts and Flaws
    let firstFreeSelected = false;
    for(let boost of ancestry.Boosts){
        if(boost == 'Anything'){
            if(firstFreeSelected){
                $('#boostOptionAnything2').attr('selected','selected');
            } else {
                $('#boostOptionAnything1').attr('selected','selected');
                firstFreeSelected = true;
            }
        } else {
            $('#inputBoosts option[value="'+boost+'"]').attr('selected','selected');
        }
    }
    for(let flaw of ancestry.Flaws){
        $('#inputFlaws option[value="'+flaw+'"]').attr('selected','selected');
    }

    // Ancestry Langs
    for(let lang of ancestry.Languages){
        $('#inputLangs option[name="'+lang.name+'"]').attr('selected','selected');
    }
    $('#inputLangs').trigger("chosen:updated");
    for(let bonusLang of ancestry.BonusLanguages){
        $('#inputBonusLangs option[name="'+bonusLang.name+'"]').attr('selected','selected');
    }
    $('#inputBonusLangs').trigger("chosen:updated");

    // Ancestry Heritages
    let filteredAncestryHeritages = [];
    for(let heritage of ancestry.Heritages){
      if(heritage.indivAncestryName == null){
        filteredAncestryHeritages.push(heritage);
      }
    }

    for(let heritage of filteredAncestryHeritages){
      $("#addHeritageButton").trigger("click");
    }

    let ancestryHeritageCount = 0;
    $(".ancestryHeritage").each(function(){
        if($(this).is(":visible")) {
            let heritage = filteredAncestryHeritages[ancestryHeritageCount];
            ancestryHeritageCount++;

            let heritageName = heritage.name.replace(" "+ancestry.Ancestry.name,"");
            $(this).find(".inputHeritageName").val(heritageName);
            $(this).find(".inputHeritageDesc").val(heritage.description);
            $(this).find(".inputHeritageCode").val(heritage.code);

            // Minimize Heritage
            $(this).find(".card-header").trigger("click");
            // Trigger Heritage Name and Tags
            $(this).find(".inputHeritageName").trigger("change");
        }
    });


    // Ancestry Feats
    let ancestryFeats = [];
    for(const [key, value] of featMap.entries()){
        let ancestryTag = value.Tags.find(tag => {
            return tag.id === ancestry.Tag.id;
        });
        if(ancestryTag != null && value.Feat.genericType == null){
            $("#addFeatButton").trigger("click");
            ancestryFeats.push(value);
        }
    }

    ancestryFeats = ancestryFeats.sort(
        function(a, b) {
            if (a.Feat.level === b.Feat.level) {
                // Name is only important when levels are the same
                return a.Feat.name > b.Feat.name ? 1 : -1;
            }
            return a.Feat.level - b.Feat.level;
        }
    );

    let ancestryFeatCount = 0;
    $(".ancestryFeat").each(function(){
        if($(this).is(":visible")) {
            let feat = ancestryFeats[ancestryFeatCount];
            ancestryFeatCount++;

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
                if(featTag.id != ancestry.Tag.id) {
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


    $("#updateAncestryButton").click(function(){
        $(this).unbind();
        finishAncestry(true);
    });

});