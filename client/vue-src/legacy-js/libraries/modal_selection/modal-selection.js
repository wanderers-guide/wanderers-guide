/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

/*
  selectionArray: [
    {
      id,
      name,
      rarity
    }
  ]
*/
class ModalSelection {
  constructor(title, confirmBtnText, selectionArray, selectionType, modalID, confirmBtnID, featMap, character, confirmBtnColor='is-info') {
    this.title = title;
    this.featMap = featMap;
    this.selectionArray = selectionArray;
    this.selectionType = selectionType;

    let existingSelectionID;
    if(selectionType == 'ancestry'){
      existingSelectionID = character.ancestryID;
    } else if(selectionType == 'background'){
      existingSelectionID = character.backgroundID;
    } else if(selectionType == 'class'){
      existingSelectionID = character.classID;
    } else {
      existingSelectionID = 'none';
    }
    if(existingSelectionID == null){
      existingSelectionID = 'none';
    }

    let selectedOptionID = null;

    $('#center-body').parent().append(`
      <div id="${modalID}" class="modal modal-selection" style="z-index: 30;">
        <div id="${modalID}-background" class="modal-background"></div>
        <div class="modal-card is-wider">
          <header class="modal-card-head">
            <p class="modal-card-title is-size-4 has-txt-value-number">${title}</p>
            <button id="${modalID}-card-close" class="delete modal-card-close" aria-label="close"></button>
          </header>
          <section class="modal-card-body is-paddingless">
            <div class="columns is-marginless is-mobile">
              <div class="column is-paddingless is-4 use-custom-scrollbar is-darker pos-relative" style="overflow-y: auto; overflow-x: hidden; height: calc(100vh - 200px); max-height: calc(100vh - 200px);">
                <div id="${modalID}-listings" class="accord-body"></div>
              </div>
              <div class="column is-paddingless is-8 use-custom-scrollbar is-darker pos-relative" style="overflow-y: auto; overflow-x: hidden; height: calc(100vh - 200px); max-height: calc(100vh - 200px);">
                <div id="${modalID}-preview">
                  <p class="is-italic has-txt-partial-noted text-center pt-3">Select to preview an option.</p>
                </div>
                <div class="subpageloader is-hidden"><div class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div></div>
              </div>
            </div>
          </section>
          <footer class="modal-card-foot is-paddingless p-3 field is-grouped is-grouped-centered">
            <p class="control"><a class="button ${confirmBtnColor} is-small" style="color: #fff; visibility: hidden;" id="${confirmBtnID}">${confirmBtnText}</a></p>
          </footer>
        </div>
      </div>
    `);
    $('#'+modalID+'-card-close, #'+modalID+'-background').click(function() {
      $('#'+modalID).removeClass('is-active');
      $('html').removeClass('is-clipped');
      $('#'+modalID).remove();
    });
    $('#'+confirmBtnID).click(function() {
      $('#'+confirmBtnID).addClass('is-loading');
      window.setTimeout(()=>{
        $('#'+modalID).removeClass('is-active');
        $('html').removeClass('is-clipped');
        $('#'+modalID).remove();
      }, 300);
    });

    // Allow quickview to close by clicking on modal
    $('#'+modalID).click(function(){
      if($('#quickviewDefault').hasClass('quickview-auto-close-protection')){
        $('#quickviewDefault').removeClass('quickview-auto-close-protection');
      } else {
        closeQuickView();
      }
    });

    // Generate each listing entry
    for(const selection of selectionArray){
      $(`#${modalID}-listings`).append(`
        <div id="${modalID}-listings-${selection.id}" class="columns is-mobile is-marginless p-1 border-bottom border-dark-lighter cursor-clickable">
          <div class="column is-paddingless pos-relative">
            <p class="pl-2 ${(selection.id == 'none')?'is-italic':''}">${selection.name}</p>
            <span class="pos-absolute pos-t-0 pos-r-0 is-hidden-mobile">${convertRarityToHTML(selection.rarity, true, 'is-tiny')}</span>
          </div>
        </div>
      `);

      $(`#${modalID}-listings-${selection.id}`).mouseenter(function(){
        $(`#${modalID}-listings-${selection.id}`).addClass('entry-hover-darker');
      });
      $(`#${modalID}-listings-${selection.id}`).mouseleave(function(){
        $(`#${modalID}-listings-${selection.id}`).removeClass('entry-hover-darker');
      });

      // Select option, show preview
      $(`#${modalID}-listings-${selection.id}`).click(function() {

        // Delete any generated display containers
        $('.generated-display-container').each(function() {
          $(this).remove();
        });

        // Listing is darkened
        $(`#${modalID}-listings > div.entry-selected-darker`).removeClass('entry-selected-darker');
        $(`#${modalID}-listings-${selection.id}`).addClass('entry-selected-darker');
        selectedOptionID = selection.id;

        if(selectedOptionID != existingSelectionID){
          $('#'+confirmBtnID).css('visibility', 'visible');
        } else {
          $('#'+confirmBtnID).css('visibility', 'hidden');
        }
        $('#'+confirmBtnID).attr('data-selectedOptionID', selectedOptionID);

        // Display preview
        if(selection.id == 'none'){
          $(`#${modalID}-preview`).removeClass('is-hidden');
        } else if(selectionType == 'ancestry'){
          new DisplayAncestry(modalID+'-preview', selection.id, featMap, selection.homebrewID, false);
        } else if(selectionType == 'background'){
          new DisplayBackground(modalID+'-preview', selection.id, selection.homebrewID, false);
        } else if(selectionType == 'class'){
          new DisplayClass(modalID+'-preview', selection.id, featMap, selection.homebrewID, false);
        }
      });

    }
    $(`#${modalID}-listings-${existingSelectionID}`).trigger('click');

    // Open Modal
    $('#'+modalID).addClass('is-active');
    $('html').addClass('is-clipped');
  }
}