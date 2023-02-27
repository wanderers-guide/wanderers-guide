/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

const STORE_ENTRY_LIMIT = 100;

function clearCacheStore(){
  localStorage.clear();
}

//

function storeString(key, str){
  try {
    localStorage[key] = str;
  } catch (err) {
    console.error(err);
  }
}

function retrieveString(key){
  try {
    let data = localStorage[key];
    return (data != null) ? data : false;
  } catch (err) {
    console.error(err);
    return false;
  }
}

//

function storeArray(key, array){
  let chunkedArray = chunkArray(array, STORE_ENTRY_LIMIT);
  for (let i = 0; i < chunkedArray.length; i++) {
    let subArray = chunkedArray[i];
    let arrayKey = key+'-'+i;
    try {
      localStorage[arrayKey] = JSON.stringify(subArray);
    } catch (err) {
      console.error(err);
    }
  }
}

function retrieveArray(key){
  let chunkArray = [];
  let i = 0;
  while (true) {
    let arrayKey = key+'-'+i;
    try {
      let rawArrayStr = localStorage[arrayKey];
      if(rawArrayStr != null){
        chunkArray.push(JSON.parse(rawArrayStr));
      } else {
        return dechunkArray(chunkArray);
      }
    } catch (err) {
      console.error(err);
      return false;
    }
    i++;
  }
}

//

function storeMap(key, map){
  let chunkedMapArray = chunkMap(map, STORE_ENTRY_LIMIT);
  for (let i = 0; i < chunkedMapArray.length; i++) {
    let subMap = chunkedMapArray[i];
    let mapKey = key+'-'+i;
    try {
      localStorage[mapKey] = JSON.stringify(mapToObj(subMap));
    } catch (err) {
      console.error(err);
    }
  }
}

function retrieveMap(key){
  let chunkMapArray = [];
  let i = 0;
  while (true) {
    let mapKey = key+'-'+i;
    try {
      let rawMapStr = localStorage[mapKey];
      if(rawMapStr != null){
        chunkMapArray.push(objToMap(JSON.parse(rawMapStr)));
      } else {
        return dechunkMap(chunkMapArray);
      }
    } catch (err) {
      console.error(err);
      return false;
    }
    i++;
  }
}



// Utils //
function chunkArray(array, chunk_size){
  let chunkArray = [];
  for (let i = 0; i < array.length; i += chunk_size) {
    chunkArray.push(array.slice(i, i+chunk_size));
  }
  return chunkArray;
}
function dechunkArray(chunkArray){
  let completeArray = [];
  for(let subArray of chunkArray) {
    completeArray = completeArray.concat(subArray);
  }
  return completeArray;
}

function chunkMap(map, chunk_size){
  let chunkMapArray = [];
  let count = 1;
  let tempMap = new Map();
  for(const [key, value] of map.entries()){
    tempMap.set(key, value);
    if(count == chunk_size){
      count = 1;
      chunkMapArray.push(new Map(tempMap));
      tempMap = new Map();
    } else {
      count++;
    }
  }
  chunkMapArray.push(new Map(tempMap));
  return chunkMapArray;
}
function dechunkMap(chunkMapArray){
  let completeMap = new Map();
  for(let chunkMap of chunkMapArray) {
    chunkMap.forEach((value, key) => completeMap.set(key, value));
  }
  return completeMap;
}
