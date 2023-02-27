/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openAbilityScoreQuickview(data){

    $('#quickViewTitle').html(data.AbilityName);
    let qContent = $('#quickViewContent');

    let abilityDescription = null;

    if(data.AbilityName == 'Strength'){
        abilityDescription = "Strength measures your character’s physical power. Strength is important if your character plans to engage in hand-to-hand combat. Your Strength modifier gets added to melee damage rolls and determines how much your character can carry.";
    } else if(data.AbilityName == 'Dexterity'){
        abilityDescription = "Dexterity measures your character’s agility, balance, and reflexes. Dexterity is important if your character plans to make attacks with ranged weapons or use stealth to surprise foes. Your Dexterity modifier is also added to your character’s AC and Reflex saving throws.";
    } else if(data.AbilityName == 'Constitution'){
        abilityDescription = "Constitution measures your character’s overall health and stamina. Constitution is an important statistic for all characters, especially those who fight in close combat. Your Constitution modifier is added to your Hit Points and Fortitude saving throws.";
    } else if(data.AbilityName == 'Intelligence'){
        abilityDescription = "Intelligence measures how well your character can learn and reason. A high Intelligence allows your character to analyze situations and understand patterns, and it means they can become trained in additional skills and might be able to master additional languages.";
    } else if(data.AbilityName == 'Wisdom'){
        abilityDescription = "Wisdom measures your character’s common sense, awareness, and intuition. Your Wisdom modifier is added to your Perception and Will saving throws.";
    } else if(data.AbilityName == 'Charisma'){
        abilityDescription = "Charisma measures your character’s personal magnetism and strength of personality. A high Charisma score helps you influence the thoughts and moods of others. ";
    }

    qContent.append('<p><strong>Ability Score:</strong> '+data.AbilityScore+'</p>');
    qContent.append('<p><strong>Ability Modifier:</strong> '+signNumber(data.AbilityMod)+'</p>');
    qContent.append('<hr class="m-2">');
    qContent.append('<p>'+abilityDescription+'</p>');
    qContent.append('<hr class="mt-2 mb-3">');
    qContent.append('<p class="has-text-centered is-size-7"><strong>What is this all for?</strong></p>');
    qContent.append('<p class="has-text-centered is-size-7">Each ability represents a certain aspect of your character. The ability score is used to calculate that ability\'s modifier. That modifier is used to dictate how good or bad your character is in that aspect.</p>');
    /*<a class="has-text-link has-tooltip-bottom has-tooltip-multiline" data-tooltip="As you may have noticed, ability scores are only used to calculate your ability score modifiers in Pathfinder 2e. To be honest, they could easily be cut and removed from the system all together as all they really do is add unnecessary complexity. With that said, they\'re around for more traditional reasons. The concept of ability scores were in Pathfinder 1e and have existed in tabletop role-playing games for decades.">ability score</a>
    qContent.append('<hr class="m-2">');
    qContent.append('<p class="has-text-centered is-size-7"><strong>Calculating Ability Modifier from Score</strong></p>');
    qContent.append('<p class="has-text-centered is-size-7">To determine the ability modifier from its score, you must look at how far away it is from 10. For every 2 higher it is than 10, your modifier is that number greater. For example, the ability modifier of 16 is +3. If the score is odd, the modifier is the same of the score of one lower. So the ability modifier of 17 is still only +3. The same works in the opposite direction – the ability modifier of 8 is -1. The actual mathmatical formula for this is:</p>');
    qContent.append('<p class="has-text-centered is-size-7">Modifier = ⌊(Score-10)/2⌋</p>');*/

}