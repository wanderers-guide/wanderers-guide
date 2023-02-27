/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openHeroPointsQuickview(data) {

    $('#quickViewTitle').html('Hero Points');
    let qContent = $('#quickViewContent');

    qContent.append(processText('Your character usually begins each game session with 1 Hero Point, and you can gain more later by devising clever strategies or performing heroic deeds - something selfless, daring, or beyond normal expectations.\nThe GM is in charge of awarding Hero Points and they may have <a class="has-text-info text-center has-tooltip-bottom has-tooltip-multiline" data-tooltip="Some GMs may have additional ways to gain Hero Points, such as if a player is being helpful out of game by setting up the game table, bringing snacks for everyone, etc. For more roleplay-intensive groups, GMs may award Hero Points to players who get invested in their characters by bringing props and staying in character as much as possible.">their own rules</a> on how one gains Hero Points.\nFor more information about Hero Points see page 467.', true, true));
    qContent.append('<hr class="m-2">');
    qContent.append('<p class="has-text-centered is-size-6 is-italic">You can spend Hero Points on the following:</p>');
    qContent.append('<p class="has-text-centered is-size-7"><strong>Spend 1 Hero Point</strong></p>');
    qContent.append('<p class="has-text-centered is-size-7 mb-2">You can reroll any check. You must use the second result. This is a fortune effect (which means you can’t use more than 1 Hero Point on a check).</p>');
    qContent.append('<p class="has-text-centered is-size-7"><strong>Spend all your Hero Points</strong></p>');
    qContent.append('<p class="has-text-centered is-size-7">You avoid death. You must spend a minimum of 1 Hero Point to do this. You can do this when your dying condition would increase. You lose the dying condition entirely and stabilize with 0 Hit Points. You don’t gain the wounded condition or increase its value from losing the dying condition in this way, but if you already had that condition, you don’t lose it or decrease its value.</p>');

}