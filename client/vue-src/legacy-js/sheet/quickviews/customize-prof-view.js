/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openCustomizeProfQuickview(data) {
    addBackFunctionality(data);

    let profName = data.ProfData.Name.replace(/_/g,' ');
    $('#quickViewTitle').html("Customize - "+capitalizeWords(profName).replace('Class Dc', 'Class DC'));
    let qContent = $('#quickViewContent');

    qContent.append('<div class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label">Proficiency</label></div><div class="field-body"><div class="field"><div class="control"><div class="select"><select id="customizeProf"><option value="chooseDefault">Default</option><option value="U">Untrained</option><option value="T">Trained</option><option value="E">Expert</option><option value="M">Master</option><option value="L">Legendary</option></select></div></div></div></div></div>');

    let userBonus = (data.ProfData.UserBonus != null) ? data.ProfData.UserBonus : 0;
    qContent.append('<div class="field is-horizontal"><div class="field-label is-normal is-long"><label class="label" style="white-space: nowrap;">Extra Bonus</label></div><div class="field-body"><div class="field"><div class="control" style="max-width: 120px;"><input id="customizeBonus" class="input" type="number" min="0" max="100" value="'+userBonus+'"></div></div></div></div>');

    qContent.append('<div class="field is-horizontal"><div class="field-label is-long"><label class="label">Bonus Notes</label></div><div class="field-body"><div class="field"><div class="control"><label class="checkbox"><input id="customizeHasNoteField" type="checkbox"></label></div></div></div></div>');

    qContent.append('<div class="buttons is-centered pt-2"><button id="customizeSaveButton" class="button is-link is-rounded">Save</button></div>');

    if(data.ProfData.UserProfOverride != null && data.ProfData.UserProfOverride){
        let userSetProfData = getUserSetData(g_profMap.get(data.ProfSrcData.To));
        console.log(userSetProfData);
        $('#customizeProf').val(userSetProfData.Prof);
    } else {
        $('#customizeProf').val('chooseDefault');
    }
    
    let noteFieldSrcStruct = {
      sourceType: 'bonus-area',
      sourceLevel: 0,
      sourceCode: 'bonus-area-'+data.NoteFieldID,
      sourceCodeSNum: 'a',
    };
    let notesData = getNotesData(noteFieldSrcStruct);
    if(notesData != null){
        $('#customizeHasNoteField').prop('checked', true);
    }

    $('#customizeSaveButton').click(function(){

        // Reloads character sheet twice, which is unnecessary.

        let prof = $('#customizeProf').val();
        let userBonus = $('#customizeBonus').val();
        let hasNoteField = $('#customizeHasNoteField').prop('checked');

        if(hasNoteField) {
            socket.emit("requestNotesFieldChange",
                getCharIDFromURL(),
                noteFieldSrcStruct,
                'Additional bonuses...',
                null);
        } else {
            socket.emit("requestNotesFieldDelete",
                getCharIDFromURL(),
                noteFieldSrcStruct);
        }


        let srcStructProf = {
            sourceType: 'user-set',
            sourceLevel: 0,
            sourceCode: data.ProfSrcData.To+",,,Prof",
            sourceCodeSNum: 'a',
        };
        if(prof === 'chooseDefault'){
            socket.emit("requestProficiencyChange",
                getCharIDFromURL(),
                {srcStruct : srcStructProf},
                null
            );
        } else {
            socket.emit("requestProficiencyChange",
                getCharIDFromURL(),
                {srcStruct : srcStructProf},
                {
                    For : data.ProfSrcData.For,
                    To : data.ProfSrcData.To,
                    Prof : prof,
                    SourceName: 'User-Override',
                }
            );
        }

        let srcStructBonus = {
            sourceType: 'user-set',
            sourceLevel: 0,
            sourceCode: data.ProfSrcData.To+",,,Bonus",
            sourceCodeSNum: 'a',
        };
        if(userBonus == 0 || userBonus == ''){
            socket.emit("requestProficiencyChange",
                getCharIDFromURL(),
                {srcStruct : srcStructBonus},
                null
            );
        } else {
            socket.emit("requestProficiencyChange",
                getCharIDFromURL(),
                {srcStruct : srcStructBonus},
                {
                    For : data.ProfSrcData.For,
                    To : data.ProfSrcData.To,
                    Prof : parseInt(userBonus),
                    SourceName: 'User-Override',
                }
            );
        }

    });

}
