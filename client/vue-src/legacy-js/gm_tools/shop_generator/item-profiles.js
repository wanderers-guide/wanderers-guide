/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_categories = [
  'ADJUSTMENT',
  'ARTIFACT',
  'AMMUNITION',
  'ARMOR',
  'BELT',
  'BOMB',
  'BOOK',
  'BOOTS',
  'BRACERS',
  'CATALYST',
  'CIRCLET',
  'CLOAK',
  'COMPANION',
  'CURRENCY',
  'DRUG',
  'ELIXIR',
  'EYEPIECE',
  'FULU',
  'GADGET',
  'GIFT',
  'GLOVES',
  'GRIMOIRE',
  'HAT',
  'INGREDIENT',
  'INSTRUMENT',
  'KIT',
  'MASK',
  'NECKLACE',
  'OIL',
  'POISON',
  'POTION',
  'RING',
  'ROD',
  'RUNE',
  'SCROLL',
  'SHIELD',
  'SIEGE',
  'SPELLHEART',
  'STAFF',
  'STORAGE',
  'STRUCTURE',
  'TALISMAN',
  'TATTOO',
  'TOOL',
  'WAND',
  'WEAPON',
  'OTHER',
];

let g_weaponGroups = [
  'AXE',
  'BRAWLING',
  'CLUB',
  'FLAIL',
  'HAMMER',
  'KNIFE',
  'PICK',
  'POLEARM',
  'SHIELD',
  'SPEAR',
  'SWORD',

  'BOW',
  'CROSSBOW',
  'DART',
  'FIREARM',
  'SLING',
  'BOMB',
];

function loadItemProfiles() {

  $('#section-item-profiles').html('');

  placeChart($('#profiles-chart'), 0, 'chart', false);
  placeChart($('#projected-levels-chart'), 0, 'levels', false);

  $('#add-item-profile-btn').off();
  $('#add-item-profile-btn').click(function(event, populatedEntry, input_profileID){
    if(populatedEntry == null) { populatedEntry = false; }

    let addItemProfile = function(){
      const profileSeedID = (populatedEntry) ? input_profileID : Date.now();

      const profileID = profileSeedID+'';
      const itemProfileID = 'item-profile-'+profileSeedID;

      // Make copy of item profile from layout
      let newItemProfile = $('#item-profile-layout').clone();
      newItemProfile.attr('id', itemProfileID);
      newItemProfile.removeClass('is-hidden');
      newItemProfile.removeClass('isLayout');
      newItemProfile.appendTo('#section-item-profiles');

      if(!populatedEntry){
        // Add new profile to g_shop
        g_shop.profiles.set(profileID, {
          name: 'New Item Profile',
          weight: 50,
          level_min: 0,
          level_max: 10,
          traits: new Map(),
          categories: new Map(),
          weapon_groups: new Map(),
          rarities: new Map([
            ['common', 81],
            ['uncommon', 15],
            ['rare', 3],
            ['unique', 1],
          ]),
          quantity: {
            permanent_min: 1,
            permanent_max: 4,
            consumable_min: 1,
            consumable_max: 10,
            rarity_adjustment: 50,
          },
          formula_chance: 0,
        });

        // Update Profiles & Projected Levels Chart
        generateProfilesChart();
        generateProjectedLevelsChart();
      }

      // Minimize Profile
      let cardContent = $('#'+itemProfileID).find(".card-content");
      $('#'+itemProfileID).find(".card-header").click(function(){
        if(cardContent.is(":visible")) {
          cardContent.addClass('is-hidden');
        } else {
          cardContent.removeClass('is-hidden');
        }
      });
      
      // Delete Profile
      $('#'+itemProfileID).find(".card-header-icon").click(function(event){
        event.stopImmediatePropagation();
        new ConfirmMessage('Delete “'+g_shop.profiles.get(profileID).name+'”', '<p class="has-text-centered">Are you sure you want to delete this item profile?</p>', 'Delete', 'modal-delete-item-profile-'+profileID, 'modal-delete-item-profile-btn-'+profileID);
        $('#modal-delete-item-profile-btn-'+profileID).click(function() {
          g_shop.profiles.delete(profileID);
          $('#'+itemProfileID).remove();
          generateProfilesChart();
          generateProjectedLevelsChart();
        });
      });

      // Edit Profile Name
      $('#'+itemProfileID).find('.profile-name').on('input', function(){
        g_shop.profiles.get(profileID).name = $(this).val();
        $('#'+itemProfileID).find('.card-header-name').text($(this).val());
      });
      $('#'+itemProfileID).find('.profile-name').blur(function(){
        generateProfilesChart();
        generateProjectedLevelsChart();
      });


      // Adjust Profile Weight
      $('#'+itemProfileID).find('.profile-weight').ionRangeSlider();
      $('#'+itemProfileID).find('.profile-weight').change(function() {
        g_shop.profiles.get(profileID).weight = parseInt($(this).val());
        $('#'+itemProfileID).find('.card-header-weight').text(`(${$(this).val()}%)`);
        generateProfilesChart();
        generateProjectedLevelsChart();
      });

      // Adjust Level Range
      $('#'+itemProfileID).find('.profile-level-range').ionRangeSlider();
      $('#'+itemProfileID).find('.profile-level-range').change(function() {
        g_shop.profiles.get(profileID).level_min = parseInt($(this).data('from'));
        g_shop.profiles.get(profileID).level_max = parseInt($(this).data('to'));
        generateProjectedLevelsChart();
      });

      // Traits, Categories, and Weapon Groups
      generateFilterWeights(itemProfileID, profileID, 'traits');
      generateFilterWeights(itemProfileID, profileID, 'categories');
      generateFilterWeights(itemProfileID, profileID, 'weapon_groups');

      // Rarities
      $('#'+itemProfileID).find('.common-weight').ionRangeSlider();
      $('#'+itemProfileID).find('.common-weight').change(function () {
        g_shop.profiles.get(profileID).rarities.set('common', parseInt($(this).val()));
        generateChart(profileID, 'rarities', 
        ['rgba(173, 173, 173, 0.2)', 'rgba(34, 160, 112, 0.2)', 'rgba(48, 80, 166, 0.2)', 'rgba(119, 41, 153, 0.2)'],
        ['rgba(173, 173, 173, 1)', 'rgba(34, 160, 112, 1)', 'rgba(48, 80, 166, 1)', 'rgba(119, 41, 153, 1)']);
      });

      $('#'+itemProfileID).find('.uncommon-weight').ionRangeSlider();
      $('#'+itemProfileID).find('.uncommon-weight').change(function () {
        g_shop.profiles.get(profileID).rarities.set('uncommon', parseInt($(this).val()));
        generateChart(profileID, 'rarities',
        ['rgba(173, 173, 173, 0.2)', 'rgba(34, 160, 112, 0.2)', 'rgba(48, 80, 166, 0.2)', 'rgba(119, 41, 153, 0.2)'],
        ['rgba(173, 173, 173, 1)', 'rgba(34, 160, 112, 1)', 'rgba(48, 80, 166, 1)', 'rgba(119, 41, 153, 1)']);
      });

      $('#'+itemProfileID).find('.rare-weight').ionRangeSlider();
      $('#'+itemProfileID).find('.rare-weight').change(function () {
        g_shop.profiles.get(profileID).rarities.set('rare', parseInt($(this).val()));
        generateChart(profileID, 'rarities',
        ['rgba(173, 173, 173, 0.2)', 'rgba(34, 160, 112, 0.2)', 'rgba(48, 80, 166, 0.2)', 'rgba(119, 41, 153, 0.2)'],
        ['rgba(173, 173, 173, 1)', 'rgba(34, 160, 112, 1)', 'rgba(48, 80, 166, 1)', 'rgba(119, 41, 153, 1)']);
      });

      $('#'+itemProfileID).find('.unique-weight').ionRangeSlider();
      $('#'+itemProfileID).find('.unique-weight').change(function () {
        g_shop.profiles.get(profileID).rarities.set('unique', parseInt($(this).val()));
        generateChart(profileID, 'rarities',
        ['rgba(173, 173, 173, 0.2)', 'rgba(34, 160, 112, 0.2)', 'rgba(48, 80, 166, 0.2)', 'rgba(119, 41, 153, 0.2)'],
        ['rgba(173, 173, 173, 1)', 'rgba(34, 160, 112, 1)', 'rgba(48, 80, 166, 1)', 'rgba(119, 41, 153, 1)']);
      });

      placeChart($('#'+itemProfileID).find('.profile-chart-rarities'), profileID, 'rarities', false);
      generateChart(profileID, 'rarities',
      ['rgba(173, 173, 173, 0.2)', 'rgba(34, 160, 112, 0.2)', 'rgba(48, 80, 166, 0.2)', 'rgba(119, 41, 153, 0.2)'],
      ['rgba(173, 173, 173, 1)', 'rgba(34, 160, 112, 1)', 'rgba(48, 80, 166, 1)', 'rgba(119, 41, 153, 1)']);


      // Quantity
      $('#'+itemProfileID).find('.profile-qty-permanent-items').ionRangeSlider();
      $('#'+itemProfileID).find('.profile-qty-permanent-items').change(function() {
        g_shop.profiles.get(profileID).quantity.permanent_min = parseInt($(this).data('from'));
        g_shop.profiles.get(profileID).quantity.permanent_max = parseInt($(this).data('to'));
      });

      $('#'+itemProfileID).find('.profile-qty-consumable-items').ionRangeSlider();
      $('#'+itemProfileID).find('.profile-qty-consumable-items').change(function() {
        g_shop.profiles.get(profileID).quantity.consumable_min = parseInt($(this).data('from'));
        g_shop.profiles.get(profileID).quantity.consumable_max = parseInt($(this).data('to'));
      });

      $('#'+itemProfileID).find('.profile-qty-rarity-adjustment').ionRangeSlider();
      $('#'+itemProfileID).find('.profile-qty-rarity-adjustment').change(function() {
        g_shop.profiles.get(profileID).quantity.rarity_adjustment = parseInt($(this).val());
      });

      // Formula
      $('#'+itemProfileID).find('.profile-formula-chance').ionRangeSlider();
      $('#'+itemProfileID).find('.profile-formula-chance').change(function() {
        g_shop.profiles.get(profileID).formula_chance = parseInt($(this).val());
      });

    };

    if(populatedEntry){
      addItemProfile();
    } else {
      startSpinnerSubLoader();
      setTimeout(() => {
        addItemProfile();
        stopSpinnerSubLoader();
      }, 50);// After 0.05 second
    }

  });


  // Populate profile entry for each profile
  for(const [profileID, profileData] of g_shop.profiles.entries()){
    $('#add-item-profile-btn').trigger('click', [true, profileID]);
  }
  for(const [profileID, profileData] of g_shop.profiles.entries()){
    const itemProfileID = 'item-profile-'+profileID;

    // Profile Weight
    $('#'+itemProfileID).find('.profile-weight').data('ionRangeSlider').update({
      from: profileData.weight,
    });

    // Profile Name
    $('#'+itemProfileID).find('.profile-name').val(profileData.name);
    $('#'+itemProfileID).find('.profile-name').trigger('input');

    populateFromItemProfile(profileID, profileData);

    // Make profile minimized
    $('#'+itemProfileID).find(".card-header").trigger('click');

  }


  // Profiles Chart & Projected Levels Chart
  if(g_shop.profiles.size > 0){
    generateProfilesChart();
    generateProjectedLevelsChart();
  } else {
    $('#profile-chart-0-chart').addClass('is-hidden');
    $('#profile-chart-0-levels').addClass('is-hidden');
  }

}

function populateFromItemProfile(profileID, profileData){
  const itemProfileID = 'item-profile-'+profileID;

  // Level Range
  $('#'+itemProfileID).find('.profile-level-range').data('ionRangeSlider').update({
    from: profileData.level_min,
    to: profileData.level_max,
  });

  // Traits
  for(const [typeID, typeWeight] of profileData.traits.entries()){
    $('#'+itemProfileID).find('.profile-traits').find(`option[value=${typeID}]`).attr('selected','selected');
  }
  $('#'+itemProfileID).find('.profile-traits').trigger("change");
  $('#'+itemProfileID).find('.profile-traits').trigger("chosen:updated");

  for(const [typeID, typeWeight] of profileData.traits.entries()){
    $('#'+itemProfileID).find(`.traits-weight-${typeID}`).data('ionRangeSlider').update({
      from: typeWeight,
    });
  }
  generateChart(profileID, 'traits');

  // Categories
  for(const [typeID, typeWeight] of profileData.categories.entries()){
    $('#'+itemProfileID).find('.profile-categories').find(`option[value=${typeID}]`).attr('selected','selected');
  }
  $('#'+itemProfileID).find('.profile-categories').trigger("change");
  $('#'+itemProfileID).find('.profile-categories').trigger("chosen:updated");

  for(const [typeID, typeWeight] of profileData.categories.entries()){
    $('#'+itemProfileID).find(`.categories-weight-${typeID}`).data('ionRangeSlider').update({
      from: typeWeight,
    });
  }
  generateChart(profileID, 'categories');

  // Weapon Groups
  for(const [typeID, typeWeight] of profileData.weapon_groups.entries()){
    $('#'+itemProfileID).find('.profile-weapon_groups').find(`option[value=${typeID}]`).attr('selected','selected');
  }
  $('#'+itemProfileID).find('.profile-weapon_groups').trigger("change");
  $('#'+itemProfileID).find('.profile-weapon_groups').trigger("chosen:updated");

  for(const [typeID, typeWeight] of profileData.weapon_groups.entries()){
    $('#'+itemProfileID).find(`.weapon_groups-weight-${typeID}`).data('ionRangeSlider').update({
      from: typeWeight,
    });
  }
  generateChart(profileID, 'weapon_groups');

  // Rarities
  $('#'+itemProfileID).find('.common-weight').data('ionRangeSlider').update({
    from: profileData.rarities.get('common'),
  });
  $('#'+itemProfileID).find('.uncommon-weight').data('ionRangeSlider').update({
    from: profileData.rarities.get('uncommon'),
  });
  $('#'+itemProfileID).find('.rare-weight').data('ionRangeSlider').update({
    from: profileData.rarities.get('rare'),
  });
  $('#'+itemProfileID).find('.unique-weight').data('ionRangeSlider').update({
    from: profileData.rarities.get('unique'),
  });

  // Quantity
  $('#'+itemProfileID).find('.profile-qty-permanent-items').data('ionRangeSlider').update({
    from: profileData.quantity.permanent_min,
    to: profileData.quantity.permanent_max,
  });
  $('#'+itemProfileID).find('.profile-qty-consumable-items').data('ionRangeSlider').update({
    from: profileData.quantity.consumable_min,
    to: profileData.quantity.consumable_max,
  });
  $('#'+itemProfileID).find('.profile-qty-rarity-adjustment').data('ionRangeSlider').update({
    from: profileData.quantity.rarity_adjustment,
  });

  // Formulas
  $('#'+itemProfileID).find('.profile-formula-chance').data('ionRangeSlider').update({
    from: profileData.formula_chance,
  });

}


function generateFilterWeights(itemProfileID, profileID, type){

  const typeSelection = $('#'+itemProfileID).find('.profile-'+type);

  // Populate multi-selectors with options
  if(type == 'traits'){
    for(const trait of g_allTags){
      if(trait.isHidden == 1 || trait.isArchived == 1) { continue; }
      typeSelection.append(`<option value="${trait.id}">${trait.name}</option>`);
    }
  } else if(type == 'categories'){
    for(const category of g_categories){
      typeSelection.append(`<option value="${category}">${capitalizeWords(category)}</option>`);
    }
  } else if(type == 'weapon_groups'){
    for(const weaponGroup of g_weaponGroups){
      typeSelection.append(`<option value="${weaponGroup}">${capitalizeWords(weaponGroup)}</option>`);
    }
  }

  typeSelection.chosen({width: "300px"});

  // On adding new option from selector,
  typeSelection.chosen().change(function(){

    const typeWeights = $('#'+itemProfileID).find('.profile-weights-'+type);
    typeWeights.html('');

    const selectedOptions = $(this).find('option:selected').toArray().map(option => option.value);

    // Regenerate weight adjusters
    let newTypes = new Map();
    for(const typeID of selectedOptions){
      let typeWeight = g_shop.profiles.get(profileID)[type].get(typeID);
      if(typeWeight == null){ typeWeight = 50; }
      newTypes.set(typeID, typeWeight);
    }

    if(selectedOptions.length > 0){
      // Add 'other' if has 1 or more options selected
      let otherTypeWeight = g_shop.profiles.get(profileID)[type].get('other');
      if(otherTypeWeight == null){ otherTypeWeight = 50; }
      newTypes.set('other', otherTypeWeight);

      // If any options selected, reveal canvas
      $('#profile-chart-'+profileID+'-'+type).removeClass('is-hidden');
    } else {
      // If no options selected, hide canvas
      $('#profile-chart-'+profileID+'-'+type).addClass('is-hidden');
    }

    g_shop.profiles.get(profileID)[type] = newTypes;

    for(const [typeID, typeWeight] of g_shop.profiles.get(profileID)[type].entries()){

      let typeStruct = null;

      if(typeID == 'other'){
        typeStruct = { name: 'Other '+capitalizeWords(type.replace(/_/g,' ')) };
      } else {
        if(type == 'traits'){
          typeStruct = g_allTags.find(trait => {
            return trait.id == typeID;
          });
        } else {
          typeStruct = { name: capitalizeWords(typeID) };
        }
      }

      typeWeights.append(`
        <div class="pt-1">
          <p>${(typeStruct != null) ? typeStruct.name : 'Error: Unknown Type'}</p>
          <input type="text" class="${type}-weight-${typeID}" value=""
            data-min="0"
            data-max="100"
            data-from="${typeWeight}"
            data-postfix="%"
          />
        </div>
      `);
      $('#'+itemProfileID).find(`.${type}-weight-${typeID}`).ionRangeSlider();
      $('#'+itemProfileID).find(`.${type}-weight-${typeID}`).change(function () {
        g_shop.profiles.get(profileID)[type].set(typeID, parseInt($(this).val()));

        generateChart(profileID, type);

      });

    }

    generateChart(profileID, type);

  });

  placeChart($('#'+itemProfileID).find('.profile-chart-'+type), profileID, type);

}


function placeChart(chartParent, profileID, type, hidden=true){
  chartParent.html(`
    <canvas id="profile-chart-${profileID}-${type}" class="${(hidden) ? 'is-hidden': ''}">Your browser does not support the canvas element.</canvas>
  `);
}

// Profile Chart
function generateChart(profileID, type, bgColor=[
      'rgba(54, 162, 235, 0.2)',
      'rgba(255, 99, 132, 0.2)',
      'rgba(255, 206, 86, 0.2)',
      'rgba(75, 192, 192, 0.2)',
      'rgba(153, 102, 255, 0.2)',
      'rgba(255, 159, 64, 0.2)',
      'rgba(27, 133, 62, 0.2)',
      'rgba(201, 67, 193, 0.2)',
      'rgba(48, 191, 188, 0.2)',
      'rgba(80, 48, 191, 0.2)',
      'rgba(201, 73, 29, 0.2)',
      'rgba(122, 201, 29, 0.2)',
    ], borderColor=[
      'rgba(54, 162, 235, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)',
      'rgba(27, 133, 62, 1)',
      'rgba(201, 67, 193, 1)',
      'rgba(48, 191, 188, 1)',
      'rgba(80, 48, 191, 1)',
      'rgba(201, 73, 29, 1)',
      'rgba(122, 201, 29, 1)',
    ]){

  let chartID = 'profile-chart-'+profileID+'-'+type;
  let chartParent = $('#'+chartID).parent();
  let chartIsHidden = $('#'+chartID).hasClass('is-hidden');
  $('#'+chartID).remove();
  placeChart(chartParent, profileID, type, chartIsHidden);

  let dataLabels = [];
  let dataValues = [];

  for(const [typeID, typeWeight] of g_shop.profiles.get(profileID)[type].entries()){
      
    let typeStruct = null;

    if(typeID == 'other'){
      typeStruct = { name: 'Other '+capitalizeWords(type.replace(/_/g,' ')) };
    } else {
      if(type == 'traits'){
        typeStruct = g_allTags.find(trait => {
          return trait.id == typeID;
        });
      } else {
        typeStruct = { name: capitalizeWords(typeID) };
      }
    }

    if(typeStruct != null){
      dataLabels.push(typeStruct.name);
      dataValues.push(typeWeight);
    }

  }


  const ctx = document.getElementById(chartID);
  const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: dataLabels,
        datasets: [{
          label: capitalizeWord(type)+' Generation Ratio',
          data: dataValues,
          parsing: false,
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: 1,
          hoverOffset: 0,
        }]
      },
      options: {
        animation: false,
        tension: false,
        showLine: false,
        stepped: 0,
        borderDash: [],
        plugins: {
          legend: {
            onClick: () => {},
          }
        }
      }
  });


}

// Shop Charts
function generateProjectedLevelsChart(){

  let chartID = 'profile-chart-0-levels';
  let chartParent = $('#'+chartID).parent();
  $('#'+chartID).remove();

  let chartIsHidden = false;
  if(g_shop.profiles.size <= 0){
    chartIsHidden = true;
  }

  placeChart(chartParent, 0, 'levels', chartIsHidden);

  // If chart is hidden, hide column as well
  if(chartIsHidden){
    $('#'+chartID).parent().parent().parent().addClass('is-hidden');
  } else {
    $('#'+chartID).parent().parent().parent().removeClass('is-hidden');
  }


  let dataLabels = [];
  let dataSets = [];

  for(let n = 0; n <= 30; n++){
    dataLabels.push(n+'');
  }

  const backgroundColors = [
    'rgba(54, 162, 235, 0.4)',
    'rgba(255, 99, 132, 0.4)',
    'rgba(255, 206, 86, 0.4)',
    'rgba(75, 192, 192, 0.4)',
    'rgba(153, 102, 255, 0.4)',
    'rgba(255, 159, 64, 0.4)',
    'rgba(27, 133, 62, 0.4)',
    'rgba(201, 67, 193, 0.4)',
    'rgba(48, 191, 188, 0.4)',
    'rgba(80, 48, 191, 0.4)',
    'rgba(201, 73, 29, 0.4)',
    'rgba(122, 201, 29, 0.4)',
  ];

  const getValueFromArrayByProfile = function(profileID, array){
    let profileIndex = Array.from(g_shop.profiles.keys()).indexOf(profileID);
    let arrayIndex = profileIndex % array.length;
    return array[arrayIndex];
  };

  const getDataForLevelRange = function(min_level, max_level, chance){
    let dataArray = [];
    for(let n = 0; n <= 30; n++){
      if(n >= min_level && n <= max_level){
        dataArray.push(chance);
      } else {
        dataArray.push(0);
      }
    }
    return dataArray;
  };

  let totalProfileWeight = 0;
  for(const [profileID, profileData] of g_shop.profiles.entries()){
    totalProfileWeight += profileData.weight;
  }

  for(const [profileID, profileData] of g_shop.profiles.entries()){
    dataSets.push({
      label: profileData.name,
      data: getDataForLevelRange(profileData.level_min, profileData.level_max, profileData.weight/totalProfileWeight),
      backgroundColor: getValueFromArrayByProfile(profileID, backgroundColors),
      fill: true,
      stepped: true,
      spanGaps: true,
    });
  }

  const ctx = document.getElementById(chartID);
  const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dataLabels,
        datasets: dataSets,
      },
      options: {
        responsive: true,
        animation: false,
        tension: false,
        borderDash: [],
        elements: {
          point: {
            radius: 0,
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Projected Item Levels'
          },
          tooltip: {
            enabled: false,
          },
          legend: {
            onClick: () => {},
          },
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Level'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Chance'
            }
          }
        }
      }
  });

}

function generateProfilesChart(){

  let chartID = 'profile-chart-0-chart';
  let chartParent = $('#'+chartID).parent();
  $('#'+chartID).remove();

  let chartIsHidden = false;
  if(g_shop.profiles.size <= 0){
    chartIsHidden = true;
  }

  placeChart(chartParent, 0, 'chart', chartIsHidden);

  // If chart is hidden, hide column as well
  if(chartIsHidden){
    $('#'+chartID).parent().parent().parent().addClass('is-hidden');
  } else {
    $('#'+chartID).parent().parent().parent().removeClass('is-hidden');
  }


  let dataLabels = [];
  let dataValues = [];

  for(const [profileID, profileData] of g_shop.profiles.entries()){
    dataLabels.push(profileData.name);
    dataValues.push(profileData.weight);
  }

  const ctx = document.getElementById(chartID);
  const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: dataLabels,
        datasets: [{
          label: 'Item Profile Generation Ratio',
          data: dataValues,
          parsing: false,
          backgroundColor: [
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 99, 132, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)',
            'rgba(27, 133, 62, 0.2)',
            'rgba(201, 67, 193, 0.2)',
            'rgba(48, 191, 188, 0.2)',
            'rgba(80, 48, 191, 0.2)',
            'rgba(201, 73, 29, 0.2)',
            'rgba(122, 201, 29, 0.2)',
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(27, 133, 62, 1)',
            'rgba(201, 67, 193, 1)',
            'rgba(48, 191, 188, 1)',
            'rgba(80, 48, 191, 1)',
            'rgba(201, 73, 29, 1)',
            'rgba(122, 201, 29, 1)',
          ],
          borderWidth: 1,
          hoverOffset: 0,
        }]
      },
      options: {
        animation: false,
        tension: false,
        showLine: false,
        stepped: 0,
        borderDash: [],
        layout: {
        },
        plugins: {
          title: {
            display: true,
            text: 'Projected Profile Spread'
          },
          legend: {
            onClick: () => {},
            position: 'top',
          }
        }
      }
  });

}