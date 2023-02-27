/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openResistancesListQuickview(data) {
    
    $('#quickViewTitle').html('Resistance / Weakness List');

    let qContent = $('#quickViewContent');

    qContent.append('<p class="is-size-6">This is a list of all of your resistances and weaknesses. Here you\'re able to add or remove any custom resistances or weaknesses you might have.</p>');

    // // //

    let addResistBtnID = 'resistListAddBtn';
    qContent.append('<p class="has-text-centered"><span class="is-size-5"><strong>Resistances</strong></span> <span id="'+addResistBtnID+'" class="icon has-text-info cursor-clickable"><i class="fal fa-plus-circle"></i></span></p>');

    $('#'+addResistBtnID).click(function(){
      openQuickView('addResistView',{
        _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
      }, $('#quickviewDefault').hasClass('is-active'));
    });

    if(data.ResistAndVulners.Resistances.length == 0){
      qContent.append('<p class="has-text-centered is-size-6 is-italic has-txt-noted">None</p>');
    }

    for (let i = 0; i < data.ResistAndVulners.Resistances.length; i++) {
      const resists = data.ResistAndVulners.Resistances[i];
      let type = capitalizeWords(resists.Type);
      let amount = capitalizeWords(resists.Amount);

      if(resists.sourceType == 'user-added'){

        let removeBtnID = 'resistListRemoveBtn-'+i;
        qContent.append('<p class="has-text-centered"><span class="is-size-5">'+type+' : '+amount+'</span> <span id="'+removeBtnID+'" class="icon has-text-danger is-pulled-right cursor-clickable mt-2 has-tooltip-left" data-tooltip="Remove '+type+'"><i class="fal fa-minus-circle"></i></span></p>');

        $('#'+removeBtnID).click(function(){
          let srcStruct = {
            sourceType: 'user-added',
            sourceLevel: 0,
            sourceCode: resists.Type+' '+resists.Amount+' Resist',
            sourceCodeSNum: 'a',
          };
          socket.emit("requestResistanceChange",
            getCharIDFromURL(),
            srcStruct,
            null,
            null
          );
        });

      } else {
        qContent.append('<p class="has-text-centered"><span class="is-size-5">'+type+' : '+amount+'</span></p>');
      }

    }

    // // //

    let addWeakBtnID = 'weakListAddBtn';
    qContent.append('<p class="has-text-centered"><span class="is-size-5"><strong>Weaknesses</strong></span> <span id="'+addWeakBtnID+'" class="icon has-text-info cursor-clickable"><i class="fal fa-plus-circle"></i></span></p>');

    $('#'+addWeakBtnID).click(function(){
      openQuickView('addWeakView',{
        _prevBackData: {Type: g_QViewLastType, Data: g_QViewLastData},
      }, $('#quickviewDefault').hasClass('is-active'));
    });

    if(data.ResistAndVulners.Vulnerabilities.length == 0){
      qContent.append('<p class="has-text-centered is-size-6 is-italic has-txt-noted">None</p>');
    }

    for (let i = 0; i < data.ResistAndVulners.Vulnerabilities.length; i++) {
      const vulners = data.ResistAndVulners.Vulnerabilities[i];
      let type = capitalizeWords(vulners.Type);
      let amount = capitalizeWords(vulners.Amount);

      if(vulners.sourceType == 'user-added'){

        let removeBtnID = 'vulnerListRemoveBtn-'+i;
        qContent.append('<p class="has-text-centered"><span class="is-size-5">'+type+' : '+amount+'</span> <span id="'+removeBtnID+'" class="icon has-text-danger is-pulled-right cursor-clickable mt-2 has-tooltip-left" data-tooltip="Remove '+type+'"><i class="fal fa-minus-circle"></i></span></p>');

        $('#'+removeBtnID).click(function(){
          let srcStruct = {
            sourceType: 'user-added',
            sourceLevel: 0,
            sourceCode: vulners.Type+' '+vulners.Amount+' Weak',
            sourceCodeSNum: 'a',
          };
          socket.emit("requestVulnerabilityChange",
            getCharIDFromURL(),
            srcStruct,
            null,
            null
          );
        });

      } else {
        qContent.append('<p class="has-text-centered"><span class="is-size-5">'+type+' : '+amount+'</span></p>');
      }

    }

}