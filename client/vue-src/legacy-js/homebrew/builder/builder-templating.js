/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

// HARDCODED Names - IDs //
const TEMPLATE_MAP_ANCESTRY = [
  { Name: 'Elf', ID: 178 },
  { Name: 'Goblin', ID: 180 },
  { Name: 'Human', ID: 176 },
  { Name: 'Kobold', ID: 175 },
  { Name: 'Shoony', ID: 155 },
];

const TEMPLATE_MAP_ARCHETYPE = [
  { Name: 'Assassin', ID: 92 },
  { Name: 'Blessed One', ID: 67 },
  { Name: 'Druid', ID: 29 },
  { Name: 'Poisoner', ID: 99 },
  { Name: 'Rogue', ID: 36 },
];

const TEMPLATE_MAP_BACKGROUND = [
  { Name: 'Amnesiac', ID: 86 },
  { Name: 'Blessed', ID: 89 },
  { Name: 'Nomad', ID: 74 },
  { Name: 'Scholar', ID: 75 },
  { Name: 'Tinker', ID: 23 },
];

const TEMPLATE_MAP_CLASS = [
  { Name: 'Alchemist', ID: 265 },
  { Name: 'Champion', ID: 225 },
  { Name: 'Fighter', ID: 270 },
  { Name: 'Oracle', ID: 279 },
  { Name: 'Wizard', ID: 260 },
];

const TEMPLATE_MAP_CLASS_FEATURE = [
  { Name: 'Eldritch Trickster', ID: 13612 },
  { Name: 'Mastermind', ID: 13613 },
  { Name: 'Nymph', ID: 13615 },
  { Name: 'Tyrant (Lawful Evil)', ID: 13606 },
  { Name: 'Warden Spells', ID: 13610 },
];

const TEMPLATE_MAP_FEAT = [
  { Name: 'Ancestral Paragon', ID: 9 },
  { Name: 'Bon Mot', ID: 8853 },
  { Name: 'Draconic Arrogance', ID: 9119 },
  { Name: 'Energy Emanation', ID: 10341 },
  { Name: 'Scare to Death', ID: 2207 },
];

const TEMPLATE_MAP_HERITAGE = [
  { Name: 'Ancient Elf', ID: 753 },
  { Name: 'Elemental Heart Dwarf', ID: 763 },
  { Name: 'Jinxed Halfling', ID: 764 },
  { Name: 'Tailed Goblin', ID: 758 },
  { Name: 'Vivacious Gnome', ID: 760 },
];

const TEMPLATE_MAP_UNI_HERITAGE = [
  { Name: 'Aasimar', ID: 9 },
  { Name: 'Changeling', ID: 15 },
  { Name: 'Dhampir', ID: 8 },
  { Name: 'Duskwalker', ID: 14 },
  { Name: 'Half-Elf', ID: 4 },
];

const TEMPLATE_MAP_ITEM = [
  { Name: 'Adventurer\'s Pack', ID: 632 },
  { Name: 'Bag of Holding II', ID: 566 },
  { Name: 'Bottled Lightning (greater)', ID: 346 },
  { Name: 'Chain Shirt', ID: 1143 },
  { Name: 'Holy Avenger', ID: 1326 },
];

const TEMPLATE_MAP_LANGUAGE = [
  { Name: 'Abyssal', ID: 12 },
  { Name: 'Celestial', ID: 16 },
  { Name: 'Common', ID: 1 },
  { Name: 'Shadowtongue', ID: 21 },
  { Name: 'Tengu', ID: 28 },
];

const TEMPLATE_MAP_SPELL = [
  { Name: 'Armor of Bones', ID: 761 },
  { Name: 'Beastmaster Trance', ID: 872 },
  { Name: 'Heal', ID: 845 },
  { Name: 'Object Reading', ID: 859 },
  { Name: 'Wyvern Sting', ID: 967 },
];

const TEMPLATE_MAP_TRAIT = [
  { Name: 'Alchemical', ID: 399 },
  { Name: 'Fatal', ID: 567 },
  { Name: 'Gnome - Item', ID: 638 },
  { Name: 'Linguistic', ID: 37 },
  { Name: 'Possession', ID: 368 },
];

const TEMPLATE_MAP_TOGGLEABLE = [
  { Name: 'Panache', ID: 2 },
  { Name: 'Rage', ID: 1 },
];
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
function initNewContentTemplating() {

  $('#scratch-template-modal-background,#scratch-template-modal-close').click(function() {
    $('#scratch-template-modal').removeClass('is-active');
    $('html').removeClass('is-clipped');
    $('#scratch-template-modal').attr('data-content-type', '');
  });
  $('#choose-template-modal-background,#choose-template-modal-close').click(function() {
    $('#choose-template-modal').removeClass('is-active');
    $('html').removeClass('is-clipped');
    $('#choose-template-modal-body').html('');
  });

  $('#scratch-template-modal-template-btn').click(function() {
    $('#scratch-template-modal').removeClass('is-active');
    $('#choose-template-modal-body').html('');
    $('html').addClass('is-clipped');
    const CONTENT_TYPE = $('#scratch-template-modal').attr('data-content-type');

    let TEMPLATES = null;
    switch(CONTENT_TYPE){
      case 'CLASS': TEMPLATES = TEMPLATE_MAP_CLASS; break;
      case 'ANCESTRY': TEMPLATES = TEMPLATE_MAP_ANCESTRY; break;
      case 'ARCHETYPE': TEMPLATES = TEMPLATE_MAP_ARCHETYPE; break;
      case 'BACKGROUND': TEMPLATES = TEMPLATE_MAP_BACKGROUND; break;
      case 'CLASS-FEATURE': TEMPLATES = TEMPLATE_MAP_CLASS_FEATURE; break;
      case 'FEAT-ACTIVITY': TEMPLATES = TEMPLATE_MAP_FEAT; break;
      case 'HERITAGE': TEMPLATES = TEMPLATE_MAP_HERITAGE; break;
      case 'UNI-HERITAGE': TEMPLATES = TEMPLATE_MAP_UNI_HERITAGE; break;
      case 'ITEM': TEMPLATES = TEMPLATE_MAP_ITEM; break;
      case 'LANGUAGE': TEMPLATES = TEMPLATE_MAP_LANGUAGE; break;
      case 'SPELL': TEMPLATES = TEMPLATE_MAP_SPELL; break;
      case 'TRAIT': TEMPLATES = TEMPLATE_MAP_TRAIT; break;
      case 'TOGGLEABLE': TEMPLATES = TEMPLATE_MAP_TOGGLEABLE; break;
      default: break;
    }
    
    for(const TEMPLATE of TEMPLATES){
      let templateEntryBtn = 'entry-content-template-btn-'+TEMPLATE.ID;// IDs shouldn't collide
      $('#choose-template-modal-body').append('<div class="columns is-mobile is-marginless mb-1 sub-section-box"><div class="column"><p class="is-size-5">'+TEMPLATE.Name+'</p></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="'+templateEntryBtn+'" class="button is-info is-outlined">Use Template</button></div></div></div>');
      $('#'+templateEntryBtn).click(function() {
        window.location.href = '/homebrew/edit/'+CONTENT_TYPE.toLowerCase()+'/?id='+g_activeBundle.id+'&content_id='+TEMPLATE.ID;
      });
    }
    $('#choose-template-modal-body').append('<div class="columns is-mobile is-marginless mb-1 sub-section-box"><div class="column"><div class="field"><div class="control"><input class="input" id="entry-content-template-by-id-input" type="number" placeholder="Get Template by ID" spellcheck="false" autocomplete="off"></div></div></div><div class="column"><div class="is-pulled-right buttons are-small"><button id="entry-content-template-btn-by-id" class="button is-info is-outlined">Use Template</button></div></div></div>');
    $('#entry-content-template-btn-by-id').click(function() {
      let templateID = $('#entry-content-template-by-id-input').val();
      if(templateID != ''){
        window.location.href = '/homebrew/edit/'+CONTENT_TYPE.toLowerCase()+'/?id='+g_activeBundle.id+'&content_id='+templateID;
      }
    });

    $('#choose-template-modal').addClass('is-active');
  });

  $('#scratch-template-modal-scratch-btn').click(function() {
    $('#scratch-template-modal').removeClass('is-active');
    $('html').removeClass('is-clipped');
    const CONTENT_TYPE = $('#scratch-template-modal').attr('data-content-type');

    switch(CONTENT_TYPE){
      case 'CLASS': window.location.href = '/homebrew/create/class/?id='+g_activeBundle.id; break;
      case 'ANCESTRY': window.location.href = '/homebrew/create/ancestry/?id='+g_activeBundle.id; break;
      case 'ARCHETYPE': window.location.href = '/homebrew/create/archetype/?id='+g_activeBundle.id; break;
      case 'BACKGROUND': window.location.href = '/homebrew/create/background/?id='+g_activeBundle.id; break;
      case 'CLASS-FEATURE': window.location.href = '/homebrew/create/class-feature/?id='+g_activeBundle.id; break;
      case 'FEAT-ACTIVITY': window.location.href = '/homebrew/create/feat-activity/?id='+g_activeBundle.id; break;
      case 'HERITAGE': window.location.href = '/homebrew/create/heritage/?id='+g_activeBundle.id; break;
      case 'UNI-HERITAGE': window.location.href = '/homebrew/create/uni-heritage/?id='+g_activeBundle.id; break;
      case 'ITEM': window.location.href = '/homebrew/create/item/?id='+g_activeBundle.id; break;
      case 'LANGUAGE': window.location.href = '/homebrew/create/language/?id='+g_activeBundle.id; break;
      case 'SPELL': window.location.href = '/homebrew/create/spell/?id='+g_activeBundle.id; break;
      case 'TRAIT': window.location.href = '/homebrew/create/trait/?id='+g_activeBundle.id; break;
      case 'TOGGLEABLE': window.location.href = '/homebrew/create/toggleable/?id='+g_activeBundle.id; break;
      default: break;
    }

  });

}

function createNewBundleContent(CONTENT_TYPE){

  $('#scratch-template-modal').attr('data-content-type', CONTENT_TYPE);
  $('#scratch-template-modal').addClass('is-active');
  $('html').addClass('is-clipped');

}