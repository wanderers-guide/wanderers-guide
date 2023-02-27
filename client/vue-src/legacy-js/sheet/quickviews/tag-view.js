/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

/*
  Use this for more than just traits
*/
let g_tagViewMapper = new Map();
g_tagViewMapper.set('somatic', 'Spell Component');
g_tagViewMapper.set('verbal', 'Spell Component');
g_tagViewMapper.set('material', 'Spell Component');
g_tagViewMapper.set('focus', 'Spell Component');

function openTagQuickview(data) {
    addBackFunctionality(data);

    let tagType = g_tagViewMapper.get(data.TagName.toLowerCase());
    if(tagType == null) { tagType = 'Trait'; }

    $('#quickViewTitle').html(tagType+' - '+capitalizeFirstLetterOfWord(data.TagName));

    let tag = g_allTags.find(tag => {
      return tag.name.toUpperCase() === data.TagName.toUpperCase();
    });

    if(tag != null){

      addContentSource(tag.id, null, tag.homebrewID);

      let qContent = $('#quickViewContent');
      qContent.append(processText(tag.description, true, true, 'MEDIUM'));

    } else {

      let qContent = $('#quickViewContent');
      qContent.append('<p class="pl-2 pr-1 negative-indent has-text-left has-text-danger"><em>Unknown trait!</em></p>');

    }

}