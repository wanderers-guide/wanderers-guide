/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

  let page_dontLeave = true;
  window.onbeforeunload = function (e) {
    if(page_dontLeave){
      e = e || window.event;

      // For IE and Firefox prior to version 4
      if (e) {
          e.returnValue = 'Sure?';
      }
  
      // For Safari
      return 'Sure?';
    }
  };

  function canLeavePage() {
    page_dontLeave = false;
  }