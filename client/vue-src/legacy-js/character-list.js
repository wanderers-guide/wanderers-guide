/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/
import "./build_planner/ui-handler";
import { isTabletView } from "./general-utils";
import {
  initCharacterExportToPDF as initCharacterExportToPDFInternal,
  setup as setupPopulatePdf,
} from "./char_export/populate-pdf";
import { exportCharacter, copyCharacter } from "./char_export/export-handler";

let activeModalCharID = -1;
let activeModalCharName = "";
let socket = io();

setupPopulatePdf(socket);

// ~~~~~~~~~~~~~~ // Run on Load // ~~~~~~~~~~~~~~ //
export function setup() {
  // If in tablet view, just show icons
  if (isTabletView()) {
    $(".character-card-edit-text").remove();
    $(".character-card-options-text").remove();
    $(".character-card-delete-text").remove();
  }
  //

  let characterCards = $(".character-card");
  for (const characterCard of characterCards) {
    let characterID = $(characterCard).attr("data-char-id");
    let characterName = $(characterCard).attr("data-char-name");
    let cardContent = $(characterCard).find(".card-content");
    let cardEdit = $(characterCard).find(".character-card-edit");
    let cardDelete = $(characterCard).find(".character-card-delete");
    let cardOptions = $(characterCard).find(".character-card-options");

    cardContent.mouseenter(function () {
      $(this).addClass("card-content-hover");
    });
    cardContent.mouseleave(function () {
      $(this).removeClass("card-content-hover");
    });
    cardContent.click(function () {
      window.location.href = "/profile/characters/" + characterID;
    });

    cardEdit.mouseenter(function () {
      $(this).addClass("card-footer-hover");
    });
    cardEdit.mouseleave(function () {
      $(this).removeClass("card-footer-hover");
    });
    cardEdit.click(function () {
      window.location.href =
        "/profile/characters/builder/basics/?id=" + characterID;
    });

    cardDelete.mouseenter(function () {
      $(this).addClass("card-footer-hover");
    });
    cardDelete.mouseleave(function () {
      $(this).removeClass("card-footer-hover");
    });
    cardDelete.click(function () {
      $(".modal-char-delete").addClass("is-active");
      $("html").addClass("is-clipped");
      activeModalCharID = characterID;
      activeModalCharName = characterName;
      $("#modal-char-delete-title").text(
        "Delete Character: " + activeModalCharName,
      );
    });

    cardOptions.mouseenter(function () {
      $(this).addClass("card-footer-hover");
    });
    cardOptions.mouseleave(function () {
      $(this).removeClass("card-footer-hover");
    });
    cardOptions.click(function () {
      $(".modal-char-options").addClass("is-active");
      $("html").addClass("is-clipped");
      activeModalCharID = characterID;
      activeModalCharName = characterName;
    });
  }

  $(".modal-card-close").click(function () {
    $(".modal").removeClass("is-active");
    $("html").removeClass("is-clipped");
    activeModalCharID = -1;
    activeModalCharName = "";
  });
  $(".modal-background").click(function () {
    $(".modal").removeClass("is-active");
    $("html").removeClass("is-clipped");
    activeModalCharID = -1;
    activeModalCharName = "";
  });

  if ($("#icon-character-import").length) {
    // If icon-character-import exists, AKA has permissions
    initCharacterImport();
    initCharacterCopy();
  }

  $("#btn-export-to-pdf").click(function () {
    initCharacterExportToPDF(activeModalCharID); // <- PDF
  });
  $("#btn-export-character").click(function () {
    initCharacterExport(activeModalCharID); // <- PDF
  });
}
export function teardown() {
  //once we implement actual pages, this will need to be run to clean the state of this file
}

// ~~~~~ Character Import ~~~~~ //
function initCharacterImport() {
  const fileInput = document.querySelector("#input-character-import");
  fileInput.onchange = () => {
    if (fileInput.files.length > 0) {
      let file = fileInput.files[0];
      let fileReader = new FileReader();

      // Closure to capture the file information.
      fileReader.onload = (function (capturedFile) {
        return function (e) {
          if (capturedFile.name.endsWith(".guidechar")) {
            try {
              let charExportData = JSON.parse(e.target.result);
              socket.emit("requestCharImport", charExportData);
              startSpinnerSubLoader();
            } catch (err) {
              console.log(err);
              console.log('Failed to import "' + capturedFile.name + '"');
            }
          }
        };
      })(file);

      fileReader.readAsText(file);
    }
  };
}

socket.on("returnCharImport", function () {
  // Hardcoded redirect
  window.location.href = "/v/profile/characters";
});

// ~~~~~ Character Export ~~~~~ //
export function initCharacterExport(charID) {
  exportCharacter(charID ?? activeModalCharIDactiveModalCharID);
}
export function initCharacterExportToPDF(charID) {
  initCharacterExportToPDFInternal(charID ?? activeModalCharID);
}

// ~~~~~ Character Copy ~~~~~ //
function initCharacterCopy() {
  $("#btn-duplicate-character").click(function () {
    copyCharacter(activeModalCharID);
    $(".modal-card-close").trigger("click");
    startSpinnerSubLoader();
  });
}
