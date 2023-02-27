/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

/*
  data
    title
    breakdownTitle
    breakdownTotal
    breakdownMap - Key = Source, Value = value
    conditionalMap - Key = Condition, Value = value
    isBonus
*/
function openItemBreakdownQuickview(data) {
    addBackFunctionality(data);

    $('#quickViewTitle').html(data.title);

    let qContent = $('#quickViewContent');
    
    if(data.breakdownMap != null){
      qContent.append('<p class="has-text-centered"><strong>'+data.breakdownTitle+' Breakdown</strong></p>');

      if(gOption_hasDiceRoller) { refreshStatRollButtons(); }
      //let rollerClass = (data.isBonus) ? 'stat-roll-btn' : 'damage-roll-btn';

      let breakDownInnerHTML = '';

      if(data.isBonus){
        breakDownInnerHTML += '<span class="stat-roll-btn">'+data.breakdownTotal+'</span> = ';
      } else {
        breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="This is your weapon\'s damage dice. When a Striking rune is placed onto a weapon, it is these dice that are increased.">'+data.breakdownDamageDice+'</a> + ';
      }

      for(const [source, amount] of data.breakdownMap.entries()){
        if(amount != 0){
          breakDownInnerHTML += '<a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="'+source+'">'+amount+'</a>';
          breakDownInnerHTML += ' + ';
        }
      }

      if(data.breakdownDamageType != null){
        breakDownInnerHTML = breakDownInnerHTML.slice(0, -3);// Trim off that last ' + '
        breakDownInnerHTML += ' '+data.breakdownDamageType+' + ';
      }

      if(data.modifications != null){
        for(const onHitDmgMod of data.modifications.on_hit_damage){
          
          let modification = onHitDmgMod.mod;
          if(modification.startsWith('-')){
            modification = modification.slice(1);
            breakDownInnerHTML = breakDownInnerHTML.slice(0, -3);// Trim off that last ' + '
            breakDownInnerHTML += ' - ';
          }

          let source = '';
          if(onHitDmgMod.info == 'InvItem'){
            source = 'This extra damage comes from the item itself.';
          } else if(onHitDmgMod.info == 'AttachedItem'){
            source = 'This extra damage comes from an attached item.';
          } else {
            source = 'This extra damage comes from the '+runestoneNameToRuneName(onHitDmgMod.info)+' property rune this item has.';
          }

          breakDownInnerHTML += `
              <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="${source}">${modification}</a>`;
          breakDownInnerHTML += ' + ';

        }
      }

      breakDownInnerHTML = breakDownInnerHTML.slice(0, -3);// Trim off that last ' + '

      if(g_invItemView_isCriticalHit && !data.isBonus){
        breakDownInnerHTML = `<span class="has-txt-value-number"><a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="When you critically hit, you double all damage your weapon would usually deal.">2×</a>( </span>${breakDownInnerHTML}<span class="has-txt-value-number"> )</span>`;

        if(data.modifications != null){
          breakDownInnerHTML += ' + ';
          for(const onCritDmgMod of data.modifications.on_crit_damage){
            
            let modification = onCritDmgMod.mod;
            if(modification.startsWith('-')){
              modification = modification.slice(1);
              breakDownInnerHTML = breakDownInnerHTML.slice(0, -3);// Trim off that last ' + '
              breakDownInnerHTML += ' - ';
            }
  
            let source = '';
            if(onCritDmgMod.info == 'InvItem'){
              source = 'This extra damage comes from the item itself and applies only when you critically hit.';
            } else if(onHitDmgMod.info == 'AttachedItem'){
              source = 'This extra damage comes from an attached item and applies only when you critically hit.';
            } else if(onCritDmgMod.info ==  'DeadlyTrait') {
              source = 'This extra damage comes from the deadly trait this item has. It adds an amount of extra damage (depending the item\'s Striking runes) that applies only when you critically hit.';
            } else if(onCritDmgMod.info ==  'FatalTrait') {
              source = 'This extra damage comes from the fatal trait this item has. When you critically hit, it increases the weapon\'s damage die to the size listed in the trait and adds an additional damage die of that size.';
            } else {
              source = 'This extra damage comes from the '+runestoneNameToRuneName(onCritDmgMod.info)+' property rune this item has and applies only when you critically hit.';
            }
  
            breakDownInnerHTML += `
                <a class="has-text-info has-tooltip-bottom has-tooltip-multiline" data-tooltip="${source}">${modification}</a>`;
            breakDownInnerHTML += ' + ';
  
          }
          if(breakDownInnerHTML.endsWith(' + ')){
            breakDownInnerHTML = breakDownInnerHTML.slice(0, -3);// Trim off that last ' + '
          }
        }

      }

      breakDownInnerHTML = `<p class="has-text-centered">${breakDownInnerHTML}</p>`;

      qContent.append(breakDownInnerHTML);
    }

    if(data.modifications != null && data.modifications.on_hit_other.length > 0){

      qContent.append('<hr class="m-2">');

      for(const onHitOtherMod of data.modifications.on_hit_other){

        let source = '';
        if(onHitOtherMod.info == 'InvItem'){
          source = 'This additional effect comes from the item itself.';
        } else if(onHitOtherMod.info == 'AttachedItem'){
          source = 'This additional effect comes from an attached item.';
        } else {
          source = 'This additional effect comes from the '+runestoneNameToRuneName(onHitOtherMod.info)+' property rune this item has.';
        }

        qContent.append(`<div class="text-center cursor-remove-overrides has-tooltip-bottom has-tooltip-multiline" data-tooltip="${source}">${processText(onHitOtherMod.mod, true)}</div>`);

      }

    }

    if(g_invItemView_isCriticalHit){

      if(data.modifications != null && data.modifications.on_crit_other.length > 0){

        qContent.append('<hr class="m-2">');
  
        for(const onCritOtherMod of data.modifications.on_crit_other){
  
          let source = '';
          if(onCritOtherMod.info == 'InvItem'){
            source = 'This additional effect comes from the item itself and applies only when you critically hit.';
          } else if(onCritOtherMod.info == 'AttachedItem'){
            source = 'This additional effect comes from an attached item and applies only when you critically hit.';
          } else if(onCritOtherMod.info ==  'CriticalSpecialization') {
            source = 'This is the critical specialization effect determined by your weapon\'s group (club, hammer, sword, etc).';
          } else {
            source = 'This additional effect comes from the '+runestoneNameToRuneName(onCritOtherMod.info)+' property rune this item has and applies only when you critically hit.';
          }
  
          qContent.append(`<div class="text-center cursor-remove-overrides has-tooltip-bottom has-tooltip-multiline" data-tooltip="${source}">${processText(onCritOtherMod.mod, true)}</div>`);
  
        }
  
      }

    }

    if(data.conditionalMap != null && data.conditionalMap.size != 0){

        qContent.append('<hr class="m-2">');

        qContent.append('<p class="has-text-centered"><strong>Conditionals</strong></p>');
        
        for(const [condition, valueData] of data.conditionalMap.entries()){
          let conditional = condition;
          if(gOption_hasDiceRoller){
            conditional = processDiceNotation(conditional);
            refreshDiceNotationButtons();
          }
          if (valueData.Src == 'WEAP-MOD:ON-HIT') {
            qContent.append('<p class="has-text-centered">'+conditional+'</p>');
          } else if (valueData.Src == 'WEAP-MOD:ON-CRIT') {
            if(g_invItemView_isCriticalHit) {
              qContent.append('<p class="has-text-centered">'+conditional+'</p>');
            }
          } else {
            qContent.append('<p class="has-text-centered">'+conditional+'</p>');
          }
        }

    }

}