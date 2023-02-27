/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function openWarningsQuickview(data) {

  $('#quickViewTitle').html('Warnings <span class="icon is-small has-text-warning"><i class="fas fa-xs fa-exclamation-triangle"></i></span>');
  let qContent = $('#quickViewContent');

  let sortedUnselectedDataArray = g_unselectedDataArray.sort(
    function(a, b) {
      let aData = JSON.parse(a.value);
      let bData = JSON.parse(b.value);
      if(aData.STATE != bData.STATE){
        return aData.STATE > bData.STATE ? 1 : -1;
      } else {
        return aData.sourceName > bData.sourceName ? 1 : -1;
      }
    }
  );

  for(let unselectedDataStruct of sortedUnselectedDataArray){

    let unselectedData = JSON.parse(unselectedDataStruct.value);

    let unselectedSymbol = '';
    if(unselectedData.STATE == 'UNSELECTED'){
      unselectedSymbol = '<span class="icon has-text-info is-pulled-right"><i class="far fa-circle"></i></span>';
    } else if(unselectedData.STATE == 'INCORRECT'){
      unselectedSymbol = '<span class="icon has-text-danger is-pulled-right"><i class="fas fa-times"></i></span>';
    }

    qContent.append(`
      <div class="columns is-mobile is-marginless">
        <div class="column is-1 pr-1">
          ${unselectedSymbol}
        </div>
        <div class="column is-11 pl-1">
          <span class="is-pulled-left">
            <span class="has-txt-listing">${unselectedData.details}</span>
            <span class="has-txt-noted">- ${unselectedData.sourceName}</span>
          </span>
        </div>
      </div>
    `);

  }

}