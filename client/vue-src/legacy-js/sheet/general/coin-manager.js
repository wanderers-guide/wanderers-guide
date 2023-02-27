/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function getTotalCoinsInCP(){
  let totalCP = g_bulkAndCoinsStruct.CopperCoins;
  totalCP += g_bulkAndCoinsStruct.SilverCoins*10;
  totalCP += g_bulkAndCoinsStruct.GoldCoins*100;
  totalCP += g_bulkAndCoinsStruct.PlatinumCoins*1000;
  return totalCP;
}

function hasCoins(costInCP){
  return getTotalCoinsInCP() >= costInCP;
}

function reduceAndSimplifyCoins(costInCP){
  if(!hasCoins(costInCP)) { return false; }

  let homeBagInvItemID = null;
  let remainingCost = costInCP;
  let reduceCoinRecords = [];

  let sortedInvItems = g_invStruct.InvItems.sort(
    function(a, b) {
      if (a.itemID === b.itemID) {
        // bagInvItemID is only important when itemIDs are the same
        return a.bagInvItemID - b.bagInvItemID;
      }
      return b.itemID - a.itemID;
    }
  );
  for(const invItem of sortedInvItems){

    let itemValue = null;
    // Coins - Hardcoded IDs //
    if(invItem.itemID == 22){ // Copper
      itemValue = 1;
    } else if(invItem.itemID == 23){ // Silver
      itemValue = 10;
    } else if(invItem.itemID == 24){ // Gold
      itemValue = 100;
    } else if(invItem.itemID == 25){ // Platinum
      itemValue = 1000;
    }
    if(itemValue == null) {continue;}
    if(invItem.bagInvItemID != null && homeBagInvItemID == null) { homeBagInvItemID = invItem.bagInvItemID; }

    let qty;
    for(qty = 0; qty < invItem.quantity; qty++){
      if(remainingCost <= 0) { break; }
      remainingCost -= itemValue;
    }

    reduceCoinRecords.push({
      invItemID: invItem.id,
      newQty: invItem.quantity-qty,
    });
    if(remainingCost <= 0) { break; }

  }

  // Update Coin Qtys
  for(const coinRecord of reduceCoinRecords){
    if(coinRecord.newQty == 0){
      socket.emit("requestRemoveItemFromInv",
          coinRecord.invItemID);
    } else {
      socket.emit("requestInvItemQtyChange",
          coinRecord.invItemID,
          coinRecord.newQty);
    }
  }

  // Give Back Overdrawn Cost
  let coinsToReturn = convertRemainingCost(remainingCost);
  if(coinsToReturn.pp != 0){
    addCoinToReturn(25, coinsToReturn.pp, homeBagInvItemID); // Platinum
  }
  if(coinsToReturn.gp != 0){
    addCoinToReturn(24, coinsToReturn.gp, homeBagInvItemID); // Gold
  }
  if(coinsToReturn.sp != 0){
    addCoinToReturn(23, coinsToReturn.sp, homeBagInvItemID); // Silver
  }
  if(coinsToReturn.cp != 0){
    addCoinToReturn(22, coinsToReturn.cp, homeBagInvItemID); // Copper
  }

  return true;
}

function convertRemainingCost(remainingCost){
  remainingCost = (remainingCost == 0) ? 0 : remainingCost*-1;
  let pp = Math.floor(remainingCost/1000);
  remainingCost = remainingCost%1000;
  let gp = Math.floor(remainingCost/100);
  remainingCost = remainingCost%100;
  let sp = Math.floor(remainingCost/10);
  remainingCost = remainingCost%10;
  let cp = remainingCost;
  return {pp, gp, sp, cp};
}

function addCoinToReturn(coinItemID, qty, homeBagInvItemID){

  let coinInvItemInBag = g_invStruct.InvItems.find(invItem => {
    return invItem.bagInvItemID == homeBagInvItemID && invItem.itemID == coinItemID;
  });

  if(coinInvItemInBag != null){

    socket.emit("requestInvItemQtyChange",
        coinInvItemInBag.id,
        coinInvItemInBag.quantity+qty);

  } else {

    if(homeBagInvItemID == null){
      socket.emit("requestAddItemToInv",
          getCharIDFromURL(),
          g_invStruct.Inventory.id,
          coinItemID,
          qty);
    } else {
      socket.emit("requestAddItemToBag",
          coinItemID,
          qty,
          homeBagInvItemID);
    }

  }

}