/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

let g_profConversionMap = new Map();

g_profConversionMap.set(VARIABLE.LIGHT_ARMOR, {Name: 'Light_Armor', Category: 'Defense', AbilScore: 'NONE'});
g_profConversionMap.set(VARIABLE.MEDIUM_ARMOR, {Name: 'Medium_Armor', Category: 'Defense', AbilScore: 'NONE'});
g_profConversionMap.set(VARIABLE.HEAVY_ARMOR, {Name: 'Heavy_Armor', Category: 'Defense', AbilScore: 'NONE'});
g_profConversionMap.set(VARIABLE.UNARMORED_DEFENSE, {Name: 'Unarmored_Defense', Category: 'Defense', AbilScore: 'NONE'});

// Old
g_profConversionMap.set('LIGHTARMOR', {Name: 'Light_Armor', Category: 'Defense'});
g_profConversionMap.set('MEDIUMARMOR', {Name: 'Medium_Armor', Category: 'Defense'});
g_profConversionMap.set('HEAVYARMOR', {Name: 'Heavy_Armor', Category: 'Defense'});
g_profConversionMap.set('UNARMOREDDEFENSE', {Name: 'Unarmored_Defense', Category: 'Defense'});

g_profConversionMap.set(VARIABLE.SIMPLE_WEAPONS, {Name: 'Simple_Weapons', Category: 'Attack', AbilScore: 'NONE'});
g_profConversionMap.set(VARIABLE.MARTIAL_WEAPONS, {Name: 'Martial_Weapons', Category: 'Attack', AbilScore: 'NONE'});
g_profConversionMap.set(VARIABLE.ADVANCED_WEAPONS, {Name: 'Advanced_Weapons', Category: 'Attack', AbilScore: 'NONE'});
g_profConversionMap.set(VARIABLE.UNARMED_ATTACKS, {Name: 'Unarmed_Attacks', Category: 'Attack', AbilScore: 'NONE'});

// Old
g_profConversionMap.set('SIMPLEWEAPONS', {Name: 'Simple_Weapons', Category: 'Attack'});
g_profConversionMap.set('MARTIALWEAPONS', {Name: 'Martial_Weapons', Category: 'Attack'});
g_profConversionMap.set('ADVANCEDWEAPONS', {Name: 'Advanced_Weapons', Category: 'Attack'});
g_profConversionMap.set('UNARMEDATTACKS', {Name: 'Unarmed_Attacks', Category: 'Attack'});

g_profConversionMap.set(VARIABLE.SAVE_FORT, {Name: 'Fortitude', Category: 'Save', AbilScore: 'CON'});
g_profConversionMap.set(VARIABLE.SAVE_REFLEX, {Name: 'Reflex', Category: 'Save', AbilScore: 'DEX'});
g_profConversionMap.set(VARIABLE.SAVE_WILL, {Name: 'Will', Category: 'Save', AbilScore: 'WIS'});

// Old
g_profConversionMap.set('FORTITUDE', {Name: 'Fortitude', Category: 'Save'});
g_profConversionMap.set('REFLEX', {Name: 'Reflex', Category: 'Save'});
g_profConversionMap.set('WILL', {Name: 'Will', Category: 'Save'});

g_profConversionMap.set(VARIABLE.PERCEPTION, {Name: 'Perception', Category: 'Perception', AbilScore: 'WIS'});

// Old
g_profConversionMap.set('PERCEPTION', {Name: 'Perception', Category: 'Perception'});

g_profConversionMap.set(VARIABLE.CLASS_DC, {Name: 'Class_DC', Category: 'Class_DC', AbilScore: 'NONE'});

// Old
g_profConversionMap.set('CLASSDC', {Name: 'Class_DC', Category: 'Class_DC'});

g_profConversionMap.set(VARIABLE.ARCANE_SPELL_ATTACK, {Name: 'ArcaneSpellAttacks', Category: 'SpellAttack', AbilScore: 'NONE'});
g_profConversionMap.set(VARIABLE.OCCULT_SPELL_ATTACK, {Name: 'OccultSpellAttacks', Category: 'SpellAttack', AbilScore: 'NONE'});
g_profConversionMap.set(VARIABLE.PRIMAL_SPELL_ATTACK, {Name: 'PrimalSpellAttacks', Category: 'SpellAttack', AbilScore: 'NONE'});
g_profConversionMap.set(VARIABLE.DIVINE_SPELL_ATTACK, {Name: 'DivineSpellAttacks', Category: 'SpellAttack', AbilScore: 'NONE'});

// Old
g_profConversionMap.set('ARCANESPELLATTACKS', {Name: 'ArcaneSpellAttacks', Category: 'SpellAttack'});
g_profConversionMap.set('OCCULTSPELLATTACKS', {Name: 'OccultSpellAttacks', Category: 'SpellAttack'});
g_profConversionMap.set('PRIMALSPELLATTACKS', {Name: 'PrimalSpellAttacks', Category: 'SpellAttack'});
g_profConversionMap.set('DIVINESPELLATTACKS', {Name: 'DivineSpellAttacks', Category: 'SpellAttack'});

g_profConversionMap.set(VARIABLE.ARCANE_SPELL_DC, {Name: 'ArcaneSpellDCs', Category: 'SpellDC', AbilScore: 'NONE'});
g_profConversionMap.set(VARIABLE.OCCULT_SPELL_DC, {Name: 'OccultSpellDCs', Category: 'SpellDC', AbilScore: 'NONE'});
g_profConversionMap.set(VARIABLE.PRIMAL_SPELL_DC, {Name: 'PrimalSpellDCs', Category: 'SpellDC', AbilScore: 'NONE'});
g_profConversionMap.set(VARIABLE.DIVINE_SPELL_DC, {Name: 'DivineSpellDCs', Category: 'SpellDC', AbilScore: 'NONE'});

// Old
g_profConversionMap.set('ARCANESPELLDCS', {Name: 'ArcaneSpellDCs', Category: 'SpellDC'});
g_profConversionMap.set('OCCULTSPELLDCS', {Name: 'OccultSpellDCs', Category: 'SpellDC'});
g_profConversionMap.set('PRIMALSPELLDCS', {Name: 'PrimalSpellDCs', Category: 'SpellDC'});
g_profConversionMap.set('DIVINESPELLDCS', {Name: 'DivineSpellDCs', Category: 'SpellDC'});

g_profConversionMap.set('ARCANESPELLDC', {Name: 'ArcaneSpellDCs', Category: 'SpellDC'});
g_profConversionMap.set('OCCULTSPELLDC', {Name: 'OccultSpellDCs', Category: 'SpellDC'});
g_profConversionMap.set('PRIMALSPELLDC', {Name: 'PrimalSpellDCs', Category: 'SpellDC'});
g_profConversionMap.set('DIVINESPELLDC', {Name: 'DivineSpellDCs', Category: 'SpellDC'});

g_profConversionMap.set(VARIABLE.SKILL_ACROBATICS, {Name: 'Acrobatics', Category: 'Skill', AbilScore: 'DEX'});
g_profConversionMap.set(VARIABLE.SKILL_ARCANA, {Name: 'Arcana', Category: 'Skill', AbilScore: 'INT'});
g_profConversionMap.set(VARIABLE.SKILL_ATHLETICS, {Name: 'Athletics', Category: 'Skill', AbilScore: 'STR'});
g_profConversionMap.set(VARIABLE.SKILL_CRAFTING, {Name: 'Crafting', Category: 'Skill', AbilScore: 'INT'});
g_profConversionMap.set(VARIABLE.SKILL_DECEPTION, {Name: 'Deception', Category: 'Skill', AbilScore: 'CHA'});
g_profConversionMap.set(VARIABLE.SKILL_DIPLOMACY, {Name: 'Diplomacy', Category: 'Skill', AbilScore: 'CHA'});
g_profConversionMap.set(VARIABLE.SKILL_INTIMIDATION, {Name: 'Intimidation', Category: 'Skill', AbilScore: 'CHA'});
g_profConversionMap.set(VARIABLE.SKILL_MEDICINE, {Name: 'Medicine', Category: 'Skill', AbilScore: 'WIS'});
g_profConversionMap.set(VARIABLE.SKILL_NATURE, {Name: 'Nature', Category: 'Skill', AbilScore: 'WIS'});
g_profConversionMap.set(VARIABLE.SKILL_OCCULTISM, {Name: 'Occultism', Category: 'Skill', AbilScore: 'INT'});
g_profConversionMap.set(VARIABLE.SKILL_PERFORMANCE, {Name: 'Performance', Category: 'Skill', AbilScore: 'CHA'});
g_profConversionMap.set(VARIABLE.SKILL_RELIGION, {Name: 'Religion', Category: 'Skill', AbilScore: 'WIS'});
g_profConversionMap.set(VARIABLE.SKILL_SOCIETY, {Name: 'Society', Category: 'Skill', AbilScore: 'INT'});
g_profConversionMap.set(VARIABLE.SKILL_STEALTH, {Name: 'Stealth', Category: 'Skill', AbilScore: 'DEX'});
g_profConversionMap.set(VARIABLE.SKILL_SURVIVAL, {Name: 'Survival', Category: 'Skill', AbilScore: 'WIS'});
g_profConversionMap.set(VARIABLE.SKILL_THIEVERY, {Name: 'Thievery', Category: 'Skill', AbilScore: 'DEX'});

// Old
g_profConversionMap.set('ACROBATICS', {Name: 'Acrobatics', Category: 'Skill'});
g_profConversionMap.set('ARCANA', {Name: 'Arcana', Category: 'Skill'});
g_profConversionMap.set('ATHLETICS', {Name: 'Athletics', Category: 'Skill'});
g_profConversionMap.set('CRAFTING', {Name: 'Crafting', Category: 'Skill'});
g_profConversionMap.set('DECEPTION', {Name: 'Deception', Category: 'Skill'});
g_profConversionMap.set('DIPLOMACY', {Name: 'Diplomacy', Category: 'Skill'});
g_profConversionMap.set('INTIMIDATION', {Name: 'Intimidation', Category: 'Skill'});
g_profConversionMap.set('MEDICINE', {Name: 'Medicine', Category: 'Skill'});
g_profConversionMap.set('NATURE', {Name: 'Nature', Category: 'Skill'});
g_profConversionMap.set('OCCULTISM', {Name: 'Occultism', Category: 'Skill'});
g_profConversionMap.set('PERFORMANCE', {Name: 'Performance', Category: 'Skill'});
g_profConversionMap.set('RELIGION', {Name: 'Religion', Category: 'Skill'});
g_profConversionMap.set('SOCIETY', {Name: 'Society', Category: 'Skill'});
g_profConversionMap.set('STEALTH', {Name: 'Stealth', Category: 'Skill'});
g_profConversionMap.set('SURVIVAL', {Name: 'Survival', Category: 'Skill'});
g_profConversionMap.set('THIEVERY', {Name: 'Thievery', Category: 'Skill'});

function profConversion_convertOldNameToVarName(profName){

  let convertProfName = profConversion_convertOldName(profName);
  switch(convertProfName){
    case 'LIGHTARMOR': return VARIABLE.LIGHT_ARMOR;
    case 'MEDIUMARMOR': return VARIABLE.MEDIUM_ARMOR;
    case 'HEAVYARMOR': return VARIABLE.HEAVY_ARMOR;
    case 'UNARMOREDDEFENSE': return VARIABLE.UNARMORED_DEFENSE;

    case 'SIMPLEWEAPONS': return VARIABLE.SIMPLE_WEAPONS;
    case 'MARTIALWEAPONS': return VARIABLE.MARTIAL_WEAPONS;
    case 'ADVANCEDWEAPONS': return VARIABLE.ADVANCED_WEAPONS;
    case 'UNARMEDATTACKS': return VARIABLE.UNARMED_ATTACKS;

    case 'FORTITUDE': return VARIABLE.SAVE_FORT;
    case 'REFLEX': return VARIABLE.SAVE_REFLEX;
    case 'WILL': return VARIABLE.SAVE_WILL;

    case 'PERCEPTION': return VARIABLE.PERCEPTION;

    case 'CLASSDC': return VARIABLE.CLASS_DC;

    case 'ARCANESPELLATTACKS': return VARIABLE.ARCANE_SPELL_ATTACK;
    case 'OCCULTSPELLATTACKS': return VARIABLE.OCCULT_SPELL_ATTACK;
    case 'PRIMALSPELLATTACKS': return VARIABLE.PRIMAL_SPELL_ATTACK;
    case 'DIVINESPELLATTACKS': return VARIABLE.DIVINE_SPELL_ATTACK;

    case 'ARCANESPELLDCS': return VARIABLE.ARCANE_SPELL_DC;
    case 'OCCULTSPELLDCS': return VARIABLE.OCCULT_SPELL_DC;
    case 'PRIMALSPELLDCS': return VARIABLE.PRIMAL_SPELL_DC;
    case 'DIVINESPELLDCS': return VARIABLE.DIVINE_SPELL_DC;
    case 'ARCANESPELLDC': return VARIABLE.ARCANE_SPELL_DC;
    case 'OCCULTSPELLDC': return VARIABLE.OCCULT_SPELL_DC;
    case 'PRIMALSPELLDC': return VARIABLE.PRIMAL_SPELL_DC;
    case 'DIVINESPELLDC': return VARIABLE.DIVINE_SPELL_DC;

    case 'ACROBATICS': return VARIABLE.SKILL_ACROBATICS;
    case 'ARCANA': return VARIABLE.SKILL_ARCANA;
    case 'ATHLETICS': return VARIABLE.SKILL_ATHLETICS;
    case 'CRAFTING': return VARIABLE.SKILL_CRAFTING;
    case 'DECEPTION': return VARIABLE.SKILL_DECEPTION;
    case 'DIPLOMACY': return VARIABLE.SKILL_DIPLOMACY;
    case 'INTIMIDATION': return VARIABLE.SKILL_INTIMIDATION;
    case 'MEDICINE': return VARIABLE.SKILL_MEDICINE;
    case 'NATURE': return VARIABLE.SKILL_NATURE;
    case 'OCCULTISM': return VARIABLE.SKILL_OCCULTISM;
    case 'PERFORMANCE': return VARIABLE.SKILL_PERFORMANCE;
    case 'RELIGION': return VARIABLE.SKILL_RELIGION;
    case 'SOCIETY': return VARIABLE.SKILL_SOCIETY;
    case 'STEALTH': return VARIABLE.SKILL_STEALTH;
    case 'SURVIVAL': return VARIABLE.SKILL_SURVIVAL;
    case 'THIEVERY': return VARIABLE.SKILL_THIEVERY;

    case 'ADDLORE': return VARIABLE.ADD_LORE;

    default: break; // Break to below
  }

  if(convertProfName.endsWith('LORE')){
    let skillLoreName = convertProfName.slice(0, -4).trim();
    if(skillLoreName == ''){
      return 'SKILL_LORE';
    } else {
      return `SKILL_${skillLoreName}_LORE`;
    }
  } else {
    console.warn('Failed to convert variable: '+convertProfName);
    return '';
  }

}

function profConversion_convertOldName(profName){
  return profName.replace(/\s+/g,'').replace(/_/g,'').toUpperCase();
}

let g_expr_hasInit = false;
let g_expr_focusPoints, g_expr_senseArray, g_expr_featDataMap, g_expr_featNameArray = null;

let g_expr_baseClassAbilityArray = [];
let g_expr_classAbilityCacheMap = new Map();

function initExpressionProcessor(){

    g_expr_focusPoints = getDataAll(DATA_SOURCE.FOCUS_POINT).length;

    g_expr_senseArray = [];
    for(const senseData of getDataAll(DATA_SOURCE.SENSE)){
      let sense = g_allSenses.find(sense => {
        return sense.id == senseData.value;
      });
      if(sense != null){
        let newData = senseData;
        newData.value = sense;
        g_expr_senseArray.push(newData);
      }
    }

    // Fill class ability cache map
    for(const [classID, classData] of g_classMap.entries()){
      for(const classFeature of classData.Abilities){
        g_expr_classAbilityCacheMap.set(classFeature.id+'', classFeature.name.toUpperCase().replace(/\(|\)/g,""));
      }
    }

    const charClass = getCharClass();
    if(charClass != null){
        if(charClass.Abilities != null){
            g_expr_baseClassAbilityArray = [];
            for(let classAbility of charClass.Abilities){
                if(classAbility.level == -1) {continue;}
                if(classAbility.level <= g_char_level) {
                    if(classAbility.selectType != 'SELECT_OPTION'){
                      g_expr_baseClassAbilityArray.push(classAbility.id+'');
                    } else {
                        let choiceData = getDataAllClassChoice().find(choiceData => {
                            return classAbility.id == choiceData.OptionID;
                        });
                        if(choiceData != null){
                          g_expr_baseClassAbilityArray.push(classAbility.id+'');
                        }
                    }
                }
            }

        }
    }


    if(g_featMap != null){
      g_expr_featNameArray = [];
      g_expr_featDataMap = new Map();
      for(let feat of getDataAll(DATA_SOURCE.FEAT_CHOICE)){
        if(feat.value != null){
          const featData = g_featMap.get(feat.value+'');
          if(featData != null){
            let featName = featData.Feat.name.toUpperCase();
            g_expr_featNameArray.push(featName);
            g_expr_featDataMap.set(featName, feat);
          }
        }
      }
    }

    g_expr_hasInit = true;

}


function testExpr(wscCode, srcStruct=null){
    if(!g_expr_hasInit) {
        displayError("Expression Processor has not been init!");
        return null;
    }

    const exprStruct = readExpr(wscCode);
    if(exprStruct == null) { return wscCode; }

    let expression = exprStruct.expression;
    let statement = exprStruct.statement;
    let elseStatement = exprStruct.elseStatement;

    // If not on the character sheet, treat expression as true
    if(exprStruct.isSheetOnly && !isSheetPage()){ return statement; }

    if(expression.includes(' && ')){
        let expParts = expression.split(' && ');
        
        let allTrue = true;
        for(let expPart of expParts){
            let resultStatement = expHandleExpression(expPart, statement, elseStatement, srcStruct);
            if(resultStatement != statement){
                allTrue = false;
            }
        }

        if(allTrue) {
          return statement;
        } else {
          return elseStatement;
        }
        
    } else {

        let result = expHandleExpression(expression, statement, elseStatement, srcStruct);
        if(result != -1){
          return result;
        } else {
          displayError("Unknown expression: \'"+expression+"\'");
          return null;
        }

    }

}

function expHandleExpression(expression, statement, elseStatement, srcStruct){

    if(expression.includes('HAS-LEVEL')){ // HAS-LEVEL==13
        return expHasLevel(expression, statement, elseStatement);
    }

    if(expression.includes('HAS-FOCUS-POINTS')){ // HAS-FOCUS-POINTS==3
        return expHasFocusPoints(expression, statement, elseStatement);
    }

    if(expression.includes('HAS-HERITAGE')){ // HAS-HERITAGE==Treedweller
        return expHasHeritage(expression, statement, elseStatement);
    }

    if(expression.includes('HAS-CLASS-ABILITY')){ // HAS-CLASS-ABILITY==Cloistered Cleric
        return expHasClassAbility(expression, statement, elseStatement);
    }

    if(expression.includes('HAS-FEAT')){ // HAS-FEAT==Specialty Crafting
        return expHasFeat(expression, statement, elseStatement, srcStruct);
    }

    if(expression.includes('HAS-PROF')){ // HAS-PROF==Arcana:T
        return expHasProf(expression, statement, elseStatement, srcStruct);
    }

    if(expression.includes('HAS-VISION')){ // HAS-VISION==Darkvision
        return expHasVision(expression, statement, elseStatement, srcStruct);
    }

    if(expression.includes('HAS-ENABLED-SOURCE')){ // HAS-ENABLED-SOURCE==Advanced Player's Guide
      return expHasSource(expression, statement, elseStatement);
    }

    let variableExprMatch = expression.match(/IS-VARIABLE\(([\w]+)\)/);
    if(variableExprMatch != null){ // IS-VARIABLE(SCORE_INT)>=25
      return expIsVariable(expression, variableExprMatch[1], statement, elseStatement);
    }

    /* Sheet-Only Expressions */
    if(expression.includes('IS-UNARMORED')){ // IS-UNARMORED
      return expIsUnarmored(expression, statement, elseStatement);
    }

    if(expression.includes('IS-TOGGLED')){ // IS-TOGGLED==Rage
      return expIsToggled(expression, statement, elseStatement);
    }

    return -1;

}

function expHasLevel(expression, statement, elseStatement){
    return expHasNumberCompare(g_char_level, expression, statement, elseStatement);
}

function expHasFocusPoints(expression, statement, elseStatement){
    return expHasNumberCompare(g_expr_focusPoints, expression, statement, elseStatement);
}

function expIsVariable(expression, variableName, statement, elseStatement){
  let variable = g_variableMap.get(variableName);
  if(variable == null) {
    displayError("Expression Processing: Unknown variable \'"+variableName+"\'!");
    return elseStatement;
  }

  if(variable.Type == VAR_TYPE.INTEGER){
    return expHasNumberCompare(variables_getTotal(variableName), expression, statement, elseStatement);
  } else if(variable.Type == VAR_TYPE.STRING){
    return expHasStringCompare(variable.Value, expression, statement, elseStatement);
  } else if(variable.Type == VAR_TYPE.ABILITY_SCORE){
    return expHasNumberCompare(variables_getTotal(variableName), expression, statement, elseStatement);
  } else if(variable.Type == VAR_TYPE.LIST){
    return expHasStringCompare(variable.Value+'', expression, statement, elseStatement);
  } else if(variable.Type == VAR_TYPE.PROFICIENCY){
    return expHasStringCompare(variables_getFinalRank(variableName), expression, statement, elseStatement);
  } else {
    displayError("Expression Processing: Unknown variable type \'"+variable.Type+"\'!");
    return elseStatement;
  }

}

function expHasNumberCompare(charVarNumber, expression, statement, elseStatement){
    if(expression.includes('==')){
        let inputValue = expression.split('==')[1];
        let number = parseInt(inputValue);
        if(!isNaN(number)){
            if(charVarNumber == number){
                return statement;
            } else {
                return elseStatement;
            }
        } else {
          let varValue = getVariableValue(inputValue, false);
          if(charVarNumber == varValue){
            return statement;
          } else {
            return elseStatement;
          }
        }
    } else if(expression.includes('>=')){
        let inputValue = expression.split('>=')[1];
        let number = parseInt(inputValue);
        if(!isNaN(number)){
            if(charVarNumber >= number){
                return statement;
            } else {
                return elseStatement;
            }
        } else {
          let varValue = getVariableValue(inputValue, false);
          if(charVarNumber >= varValue){
            return statement;
          } else {
            return elseStatement;
          }
        }
    } else if(expression.includes('<=')){
        let inputValue = expression.split('<=')[1];
        let number = parseInt(inputValue);
        if(!isNaN(number)){
            if(charVarNumber <= number){
                return statement;
            } else {
                return elseStatement;
            }
        } else {
          let varValue = getVariableValue(inputValue, false);
          if(charVarNumber <= varValue){
            return statement;
          } else {
            return elseStatement;
          }
        }
    } else if(expression.includes('!=')){
      let inputValue = expression.split('!=')[1];
      let number = parseInt(inputValue);
        if(!isNaN(number)){
            if(charVarNumber != number){
                return statement;
            } else {
                return elseStatement;
            }
        } else {
          let varValue = getVariableValue(inputValue, false);
          if(charVarNumber != varValue){
            return statement;
          } else {
            return elseStatement;
          }
        }
    }
    return null;
}

function expHasStringCompare(charVarString, expression, statement, elseStatement){
  if(expression.includes('==')){
      let string = expression.split('==')[1];
      if(string != null){
          if(charVarString == string){
              return statement;
          } else {
              return elseStatement;
          }
      }
  } else if(expression.includes('!=')){
      let string = expression.split('!=')[1];
      if(string != null){
          if(charVarString != string){
              return statement;
          } else {
              return elseStatement;
          }
      }
  }
  return null;
}

function expHasHeritage(expression, statement, elseStatement){
    const currentHeritage = getCharHeritage();
    if(currentHeritage == null) { return elseStatement; }
    if(expression.includes('==')){
        let heritageName = expression.split('==')[1].toUpperCase();
        let currentHeritageName = currentHeritage.name.toUpperCase();
        if(currentHeritageName.startsWith(heritageName)){
            return statement;
        } else {
            return elseStatement;
        }
    } else if(expression.includes('!=')){
        let heritageName = expression.split('!=')[1].toUpperCase();
        let currentHeritageName = currentHeritage.name.toUpperCase();
        if(!currentHeritageName.startsWith(heritageName)){
            return statement;
        } else {
            return elseStatement;
        }
    }
}

function expHasClassAbility(expression, statement, elseStatement){
    if(expression.includes('==')){
        let classAbilityName = expression.split('==')[1].toUpperCase();
        classAbilityName = classAbilityName.replace(/_/g," ");
        let classAbilityNameArray = getCurrentClassAbilityNameArray();
        if(classAbilityNameArray == null){ return statement; }
        if(classAbilityNameArray.includes(classAbilityName)){
            return statement;
        } else {
            return elseStatement;
        }
    } else if(expression.includes('!=')){
        let classAbilityName = expression.split('!=')[1].toUpperCase();
        classAbilityName = classAbilityName.replace(/_/g," ");
        let classAbilityNameArray = getCurrentClassAbilityNameArray();
        if(classAbilityNameArray == null){ return elseStatement; }
        if(!classAbilityNameArray.includes(classAbilityName)){
            return statement;
        } else {
            return elseStatement;
        }
    }
}

function expHasFeat(expression, statement, elseStatement, srcStruct){
    if(expression.includes('==')){
        let featName = expression.split('==')[1].toUpperCase();
        featName = featName.replace(/_/g," ");
        if(g_expr_featNameArray.includes(featName) && !hasSameSrc(srcStruct, g_expr_featDataMap.get(featName))){
            return statement;
        } else {
            return elseStatement;
        }
    } else if(expression.includes('!=')){
        let featName = expression.split('!=')[1].toUpperCase();
        featName = featName.replace(/_/g," ");
        if(!g_expr_featNameArray.includes(featName)){
            return statement;
        } else {
            return elseStatement;
        }
    }
}

function expHasSource(expression, statement, elseStatement){
    if(expression.includes('==')){
        let sourceName = expression.split('==')[1].toUpperCase().trim();
        let source = g_enabledSources.find(source => {
          return source.name.toUpperCase().trim() == sourceName;
        });
        if(source != null){
          return statement;
        } else {
          return elseStatement;
        }
    } else if(expression.includes('!=')){
        let sourceName = expression.split('!=')[1].toUpperCase().trim();
        let source = g_enabledSources.find(source => {
          return source.name.toUpperCase().trim() == sourceName;
        });
        if(source != null){
          return elseStatement;
        } else {
          return statement;
        }
    }
}

function expHasVision(expression, statement, elseStatement, srcStruct){
    if(expression.includes('==')){
        let visionName = expression.split('==')[1].toUpperCase();
        visionName = visionName.replace(/_/g," ");
        let vision = g_expr_senseArray.find(senseData => {
            if(senseData.value != null && !hasSameSrc(srcStruct, senseData)){
                return visionName === senseData.value.name.toUpperCase();
            } else {
                return false;
            }
        });
        if(vision != null){
            return statement;
        } else {
            return elseStatement;
        }
    } else if(expression.includes('!=')){
        let visionName = expression.split('!=')[1].toUpperCase();
        visionName = visionName.replace(/_/g," ");
        let vision = g_expr_senseArray.find(senseData => {
            if(senseData.value != null && !hasSameSrc(srcStruct, senseData)){
                return visionName === senseData.value.name.toUpperCase();
            } else {
                return false;
            }
        });
        if(vision == null){
            return statement;
        } else {
            return elseStatement;
        }
    }
}

function expHasProf(expression, statement, elseStatement, srcStruct){
    let data;
    let boolOp;
    if(expression.includes('==')){
        data = expression.split('==')[1];
        boolOp = 'EQUALS';
    } else if(expression.includes('>=')){
        data = expression.split('>=')[1];
        boolOp = 'GREATER-EQUALS';
    } else if(expression.includes('<=')){
        data = expression.split('<=')[1];
        boolOp = 'LESSER-EQUALS';
    } else if(expression.includes('!=')){
        data = expression.split('!=')[1];
        boolOp = 'NOT-EQUALS';
    } else {
        return null;
    }

    let segments = data.split(':');

    let profName = segments[0];
    let profType = segments[1];

    profName = profName.replace(/_|\s+/g,"");
    let profData = g_profConversionMap.get(profName);

    let numUps = profToNumUp(profType);
    if(numUps === -1){return null;}

    let foundProf = false;
    for(const [profMapName, profMapDataArray] of getProfMap().entries()){
        const finalProfData = expr_getFinalProf(cleanProfDataArrayOfStatementProfs(profMapDataArray, srcStruct));
        if(finalProfData == null) { continue; }
        if(profData == null){
            let tempSkillName = finalProfData.Name.toUpperCase();
            tempSkillName = tempSkillName.replace(/_|\s+/g,"");
            if(tempSkillName === profName.toUpperCase()) {
              foundProf = true;
              if(expHasProfNumUpsCompare(finalProfData.NumUps, boolOp, numUps)) {
                return statement;
              }
            }
        } else {
            if(finalProfData.Name === profData.Name) {
              foundProf = true;
              if (expHasProfNumUpsCompare(finalProfData.NumUps, boolOp, numUps)){
                return statement;
              }
            }
        }
    }
    if(numUps === 0 && !foundProf){ return statement; }
    
    return elseStatement;
}

function expHasProfNumUpsCompare(numUpsOne, boolOp, numUpsTwo){
    switch(boolOp) {
        case 'EQUALS': return numUpsOne == numUpsTwo;
        case 'NOT-EQUALS': return numUpsOne != numUpsTwo;
        case 'GREATER-EQUALS': return numUpsOne >= numUpsTwo;
        case 'LESSER-EQUALS': return numUpsOne <= numUpsTwo;
        default: return false;
    }
}

function cleanProfDataArrayOfStatementProfs(profDataArray, srcStruct){
  if(srcStruct == null) {return profDataArray;}
  let newProfDataArray = [];
  for(let profData of profDataArray) {
    if(!hasSameSrc(srcStruct, profData)){
      newProfDataArray.push(profData);
    }
  }
  return newProfDataArray;
}

function getCurrentClassAbilityNameArray(){
  let abilityNameArray = [];
  for(let classFeatureID of g_expr_baseClassAbilityArray){
    let featureName = g_expr_classAbilityCacheMap.get(classFeatureID+'');
    if(featureName != null){
      abilityNameArray.push(featureName);
    }
  }
  for(let classAbility of getDataAllExtraClassFeature()){
    if(classAbility.FeatureID != null){
      let featureName = g_expr_classAbilityCacheMap.get(classAbility.FeatureID+'');
      if(featureName != null){
        abilityNameArray.push(featureName);
      }

      let choiceData = getDataAllClassChoice().find(choiceData => {
        return classAbility.FeatureID == choiceData.SelectorID;
      });
      if(choiceData != null){
        let choiceFeatureName = g_expr_classAbilityCacheMap.get(choiceData.OptionID+'');
        if(choiceFeatureName != null){
          abilityNameArray.push(choiceFeatureName);
        }
      }

    }
  }
  return abilityNameArray;
}

/*~ Sheet-Only Expressions ~*/

function expIsUnarmored(expression, statement, elseStatement) {
  if (typeof g_equippedArmorCategory !== 'undefined') {
    return (g_equippedArmorCategory == null || g_equippedArmorCategory == 'UNARMORED') ? statement : elseStatement;
  } else {
    return null;
  }
}

function expIsToggled(expression, statement, elseStatement) {
  if(!isSheetPage()) { return null; }
  if(expression.includes('==')){
    let sheetStateName = expression.split('==')[1].toUpperCase();
    let sheetState = getSheetStateByName(sheetStateName);
    if(sheetState != null){
      return (isSheetStateActive(sheetState.id)) ? statement : elseStatement;
    } else {
      displayError("Cannot find toggleable '"+sheetStateName+"'!");
      return null;
    }
  } else if(expression.includes('!=')){
    let sheetStateName = expression.split('!=')[1].toUpperCase();
    let sheetState = getSheetStateByName(sheetStateName);
    if(sheetState != null){
      return (isSheetStateActive(sheetState.id)) ? elseStatement : statement;
    } else {
      displayError("Cannot find toggleable '"+sheetStateName+"'!");
      return null;
    }
  }
}