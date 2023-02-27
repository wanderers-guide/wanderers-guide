/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

$(function () {

    $('#rollInitiativeModalBackground').click(function(){
        closeRollInitiativeModal();
    });
    $('#rollInitiativeModalCloseButton').click(function(){
        closeRollInitiativeModal();
    });

    $('#rollInitiativeBtn').click(function () {
        let encounter = allEncounters[currentEncounterIndex];
        if(encounter == null) { return; }
        for (let i = 0; i < encounter.members.length; i++) {
            let value = $(`#init-member-roll-input-${i}`).val();
            if(value != `chooseDefault`){

                const randomD20 = Math.floor(Math.random()*Math.floor(20))+1;
                const bonus = parseInt(value);

                encounter.members[i].init = randomD20+bonus;

            }
        }
        reloadEncounterMembers();
        closeRollInitiativeModal();
    });

});


function openRollInitiativeModal() {

    $('#rollInitiativeModalContent').html('');

    let encounter = allEncounters[currentEncounterIndex];
    if(encounter == null) { return; }

    for (let i = 0; i < encounter.members.length; i++) {
        const member = encounter.members[i];

        let memberRollInput = 'init-member-roll-input-'+i;

        let selectOptionsHTML = `
            <option value="chooseDefault">Don't roll</option>
        `;

        let rollStruct = null;
        if(member.isCharacter){
          rollStruct = {
            perceptionBonus: member.characterData.calculatedStat.totalPerception,
            skills: [],
          };
          for(let skill of member.characterData.calculatedStat.totalSkills){
            rollStruct.skills.push({
              name: skill.Name,
              bonus: skill.Bonus,
            });
          }
        } else {
          let creature = g_creaturesMap.get(member.creatureID);
          if(creature != null){
            rollStruct = {
              perceptionBonus: creature.perceptionBonus,
              skills: [],
            };
            try {
              rollStruct.skills = JSON.parse(creature.skillsJSON);
            } catch (error) {}
          } else if(member.isCustom && member.comments?.length > 0) {

            rollStruct = {
              perceptionBonus: null,
              skills: [],
            };

            let percepMatch = member.comments.match(/(\n|^)(\W*)perception(\W+)((\+|\-)(\d+))/mi);
            if(percepMatch != null){
              rollStruct.perceptionBonus = parseInt(percepMatch[4]);
            }

            let match = member.comments.match(/(\n|^)(\W*)skills(\W+)(.+)(\n|$)/mi);
            if(match != null){
              let skills = match[4].split(',');
              for(let skill of skills){
                let skillMatch = skill.match(/(.+) ((\+|\-)(\d+))/mi);
                if(skillMatch != null){
                  rollStruct.skills.push({
                    name: capitalizeWords(skillMatch[1].trim()),
                    bonus: parseInt(skillMatch[2]),
                  });
                }
              }
            }

          }
        }

        if(rollStruct != null){
            selectOptionsHTML += `<optgroup label="──────────"></optgroup>`;

            let adjustment = 0;
            if(member.eliteWeak == 'elite'){
                adjustment = 2;
            }
            if(member.eliteWeak == 'weak'){
                adjustment = -2;
            }

            if(rollStruct.perceptionBonus != null){
              let selected = (member.init === 0) ? 'selected' : '';
              selectOptionsHTML += `<option value="${rollStruct.perceptionBonus+adjustment}" ${selected}>Perception (${signNumber(rollStruct.perceptionBonus+adjustment)})</option>`;
            }

            for(let skill of rollStruct.skills){
                selectOptionsHTML += `<option value="${skill.bonus+adjustment}">${skill.name} (${signNumber(skill.bonus+adjustment)})</option>`;
            }
        }

        let memberName = member.name;
        if(memberName.trim() == ``){ memberName = `Unnamed Entry`; }
        $('#rollInitiativeModalContent').append(`
            <div class="tile is-parent is-paddingless">
                <div class="tile is-child pb-1 border-bottom border-dark">
                    <div class="columns is-marginless">
                        <div class="column is-paddingless">
                            <p class="has-text-right is-size-6 mt-1 mr-1">${memberName}</p>
                        </div>
                        <div class="column is-paddingless">
                            <div class="select is-small m-1">
                                <select id="${memberRollInput}">
                                    ${selectOptionsHTML}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);

    }

    if(encounter.members.length == 0){
      $('#rollInitiativeModalContent').html(`
        <p class="has-text-centered is-italic pt-2 pb-3">This encounter has no combatant.</p>
      `);
    }

    $('#rollInitiativeModalDefault').addClass('is-active');
    $('html').addClass('is-clipped');

}

function closeRollInitiativeModal() {

    $('#rollInitiativeModalDefault').removeClass('is-active');
    $('html').removeClass('is-clipped');

}