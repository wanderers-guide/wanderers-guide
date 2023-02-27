/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openCreatureCustomQuickview(data) {

    let name = data.name;
    if(name.trim() == ``){ name = `Unnamed Entry`; }
    $('#quickViewTitle').html(`${name}`);

    $('#quickViewTitleRight').html(`Level ${data.level}`);

    let qContent = $('#quickViewContent');

    // Conditions //
    let conditionsInnerHTML = '';
    for(let condition of getAppliedConditions(data.conditions)){

        let fullCondition = g_allConditions.find(fullCondition => {
            return fullCondition.name.toLowerCase() === condition.name.toLowerCase();
        });

        let conditionDescription = fullCondition.description;

        if (conditionDescription.length > g_conditionStringLengthMax) {
            // Reduce to tag limit
            conditionDescription = conditionDescription.substring(0, g_conditionStringLengthMax);
            // Reduce to include up to last complete sentence.
            conditionDescription = conditionDescription.substring(0, conditionDescription.lastIndexOf(".")+1);
        }

        conditionsInnerHTML += `<button class="button is-paddingless px-2 is-marginless mr-2 mb-1 is-very-small is-danger has-tooltip-bottom has-tooltip-multiline tagButton" data-tooltip="${processTextRemoveIndexing(conditionDescription)}">${fullCondition.name} ${(condition.value != null ? condition.value : '')}</button>`;

    }
    if (conditionsInnerHTML != '') {
        qContent.append('<div class="buttons is-marginless is-centered">' + conditionsInnerHTML + '</div>');
    }

    // HP //
    let hpMaxStr = data.maxHP;
    if(data.customData.hpMax != data.maxHP){
        hpMaxStr = `<span class="has-text-danger">${hpMaxStr}</span>`;
    }
    qContent.append(`
        <div class="pl-2 pr-1">
            <p class="negative-indent">
              <strong>HP </strong>${hpMaxStr}
            </p>
        </div>
    `);

    // Comments //
    let comments = data.comments;
    if(comments.trim() == ``){
        comments = `__Any comments or notes would be displayed here.__`;
    }
    qContent.append('<div>'+processText(comments, false, true, 'MEDIUM')+'</div>');

}