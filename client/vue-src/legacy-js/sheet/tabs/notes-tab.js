/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_notesPageArray = null;
let g_currentNotePageID = null;

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
$(function () {

  $('#note-page-more-modal-background,#note-page-more-modal-close').click(function() {
    $('#note-page-more-modal').removeClass('is-active');
    $('html').removeClass('is-clipped');
    $('#note-page-more-modal').attr('data-page-id', '');
  });

  
  $('#note-page-more-modal-page-name').blur(function(){
    let newPageName = $(this).val();
    let pageID = $('#note-page-more-modal').attr('data-page-id');
    let page = g_notesPageArray.find(page => {
      return page.id == pageID;
    });

    if(page != null && page.name != newPageName){
      page.name = newPageName;
      saveNotePages();
      loadNotesPages();
    }
  });

  $('#note-page-more-modal-page-color').change(function(){
    let newPageColor = $(this).val();
    let pageID = $('#note-page-more-modal').attr('data-page-id');
    let page = g_notesPageArray.find(page => {
      return page.id == pageID;
    });

    if(page != null && page.color != newPageColor){
      page.color = newPageColor;
      saveNotePages();
      loadNotesPages();
    }
  });

  $('#note-page-more-modal-page-delete').click(function() {
    new ConfirmMessage('Delete Page', 'Are you sure you want to delete this page?', 'Delete', 'note-page-more-delete-page-modal', 'note-page-more-delete-page-modal-del-btn');
    $('#note-page-more-delete-page-modal-del-btn').click(function() {
      
      let pageID = $('#note-page-more-modal').attr('data-page-id');
      let newNotesPageArray = [];
      for(let page of g_notesPageArray){
        if(page.id != pageID){
          newNotesPageArray.push(page);
        }
      }
      g_notesPageArray = newNotesPageArray;

      saveNotePages();
      loadNotesPages();
      $('#note-page-more-modal-close').trigger('click');

    });
  });

});

function openNotesTab(data) {

  /*
  [{
    id: pageID
    name: pageName
    color: pageColor
    data: pageData
  }, ..]
  */
  try {
    g_notesPageArray = JSON.parse(g_character.notes);
  } catch (error) {
    g_notesPageArray = [
      {
        id: 0,
        name: 'General',
        color: 'is-info',
        data: g_character.notes,
      }
    ];
  }
  if(g_notesPageArray == null){
    g_notesPageArray = [
      {
        id: 0,
        name: 'General',
        color: 'is-info',
        data: '',
      }
    ];
  }

  loadNotesPages();

}

function loadNotesPages(){

  $('#tabContent').html('<div id="notesAreaSection"></div><div id="notesPageSection" class="is-flex" style="flex-wrap: wrap;"></div>');

  for(let page of g_notesPageArray){
    $('#notesPageSection').append('<div id="notesPageTab-'+page.id+'" data-page-id="'+page.id+'" class="field has-addons pt-1 px-1 is-marginless"><div class="control"><span class="pageOpenBtn button is-outlined is-small '+page.color+'">'+page.name+'</span></div><div class="control"><span class="pageMoreBtn button is-outlined is-small '+page.color+'"><i class="fas fa-sm fa-ellipsis-h"></i></span></div></div>');
  }

  $('#notesPageSection').append('<span id="notesAddNewPageBtn" class="icon is-medium has-text-info has-tooltip-top" data-tooltip="New Page"><i class="fas fa-plus"></i></span>');

  if(g_notesPageArray.length > 0){
    if(g_currentNotePageID != null) {
      let page = g_notesPageArray.find(page => {
        return page.id == g_currentNotePageID;
      });
      if(page != null){
        openNotesPage(page);
      } else {
        openNotesPage(g_notesPageArray[0]);
      }
    } else {
      openNotesPage(g_notesPageArray[0]);
    }
  }

  $('.pageOpenBtn').click(function() {
    let pageID = $(this).parent().parent().attr('data-page-id');
    let page = g_notesPageArray.find(page => {
      return page.id == pageID;
    });
    openNotesPage(page);
  });

  $('.pageMoreBtn').click(function() {
    let pageID = $(this).parent().parent().attr('data-page-id');
    let page = g_notesPageArray.find(page => {
      return page.id == pageID;
    });
    openPageMore(page);
  });
  
  $('#notesAddNewPageBtn').click(function() {
    let newPage = {
      id: getNewNotesPageID(),
      name: 'New Page',
      color: 'is-info',
      data: '',
    };
    g_notesPageArray.push(newPage);
    loadNotesPages();
    openNotesPage(newPage);
    saveNotePages();
  });

}

function getNewNotesPageID(){
  let highestID = 0;
  for(let page of g_notesPageArray){
    if(page.id > highestID) { highestID = page.id; }
  }
  return highestID+1;
}

function openNotesPage(page){
  if(page == null) { return; }
  g_currentNotePageID = page.id;
  $('.pageOpenBtn').addClass('is-outlined');
  $('#notesPageTab-'+page.id).find('.pageOpenBtn').removeClass('is-outlined');
  loadNotesArea(page.id, page.data);
}

function openPageMore(page){
  if(page == null) { return; }

  $('#note-page-more-modal-page-name').val(page.name);
  $('#note-page-more-modal-page-color').val(page.color);

  $('#note-page-more-modal').attr('data-page-id', page.id);
  $('#note-page-more-modal').addClass('is-active');
  $('html').addClass('is-clipped');
}

function loadNotesArea(pageID, pageNotesData){

  let notesAreaID = "notesArea";
  let notesAreaControlShellID = "notesAreaControlShell";

  $('#notesAreaSection').html('<div id="'+notesAreaControlShellID+'" style="background-color: var(--notes-header-color);"><div id="'+notesAreaID+'" style="background-color: var(--notes-body-color); height: 540px; max-height: 540px; overflow-y: auto;">'+pageNotesData+'</div></div>');

  // Init Quill
  let Font = Quill.import('formats/font');
  Font.whitelist = ['proza-libre', 'nanum-gothic', 'handwriting', 'dethek', 'iokharic', 'druidic'];
  Quill.register(Font, true);

  let quill = new Quill('#'+notesAreaID, {
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'align': [] }, 'blockquote'],

        [{ 'color': [] }, { 'background': [] }],
        
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],

        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [false, 'proza-libre', 'nanum-gothic', 'handwriting', 'dethek', 'iokharic', 'druidic'] }],
      ]
    },
    placeholder: 'Feel free to write information here about your character, campaign, or anything else you\'d like!',
    theme: 'snow'
  });

  quill.root.setAttribute('spellcheck', false);

  ///  ///

  quill.root.addEventListener('blur', function () {
    if(pageNotesData != quill.container.innerHTML) {

      $("#"+notesAreaControlShellID).addClass("is-loading");      
      
      let page = g_notesPageArray.find(page => {
        return page.id == pageID;
      });
      page.data = quill.container.innerHTML;
      saveNotePages();

    }
  });

}

function saveNotePages(){
  let charNotesJSON = JSON.stringify(g_notesPageArray);
  g_character.notes = charNotesJSON;
  socket.emit("requestNotesSave",
      getCharIDFromURL(),
      charNotesJSON);
}

socket.on("returnNotesSave", function(){
  $("#notesAreaControlShell").removeClass("is-loading");
});