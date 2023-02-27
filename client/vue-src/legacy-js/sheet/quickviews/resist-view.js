/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openResistancesQuickview(data) {

    let resistAndVulnerText = '';
    if(data.ResistAndVulners.Resistances.length != 0){
        resistAndVulnerText += 'Resistances';
        if(data.ResistAndVulners.Vulnerabilities.length != 0){
            resistAndVulnerText += ' and ';
        }
    }
    if(data.ResistAndVulners.Vulnerabilities.length != 0){
        resistAndVulnerText += 'Weaknesses';
    }
    $('#quickViewTitle').html(resistAndVulnerText);

    let qContent = $('#quickViewContent');

    qContent.append('<p class="is-size-7">If you have resistance to a type of damage, each time you take that type of damage, you reduce the amount of damage you take by the listed amount (to a minimum of 0 damage). If you have more than one type of resistance that would apply to the same instance of damage, use only the highest applicable resistance value.</p>');
    qContent.append('<p class="is-size-7">Having a weakness to a type of damage is the same process but in reverse, each time you take that type of damage, increase the damage amount by the value of your weakness.</p>');
    qContent.append('<hr class="m-2">');

    if(data.ResistAndVulners.Resistances.length != 0){
      let resistMap = processResistsOrWeaksToMap(data.ResistAndVulners.Resistances, data.CharLevel);
      qContent.append('<p class="has-text-centered is-size-5"><strong>Resistances</strong></p>');
      for(const [type, amount] of resistMap.entries()){
        qContent.append('<p class="has-text-centered is-size-5">'+type+' '+amount+'</p>');
      }
    }

    if(data.ResistAndVulners.Vulnerabilities.length != 0){
      let vulnerMap = processResistsOrWeaksToMap(data.ResistAndVulners.Vulnerabilities, data.CharLevel);
      qContent.append('<p class="has-text-centered is-size-5"><strong>Weaknesses</strong></p>');
      for(const [type, amount] of vulnerMap.entries()){
        qContent.append('<p class="has-text-centered is-size-5">'+type+' '+amount+'</p>');
      }
    }

}

function processResistsOrWeaksToMap(array, charLevel){
  let map = new Map();
  for(let entry of array) {

    let type = capitalizeWords(entry.Type);
    let amount = entry.Amount.toUpperCase();
    if(amount.includes('HALF_LEVEL')){
      let halfLevel = Math.floor(charLevel/2);
      if(halfLevel == 0) { halfLevel = 1; } // Round down, minimum of 1
      amount = amount.replace('HALF_LEVEL', halfLevel);
    } else if(amount.includes('LEVEL')){
      amount = amount.replace('LEVEL', charLevel);
    }
    try{
      amount = parseInt(math.evaluate(amount));
    }catch(err){
      amount = -1;
    }

    if(map.has(type)){
      let existingAmount = map.get(type);
      if(amount > existingAmount){
        map.set(type, amount);
      }
    } else {
      map.set(type, amount);
    }
  }
  return map;
}