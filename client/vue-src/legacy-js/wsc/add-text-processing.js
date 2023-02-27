/* Copyright (C) 2021, Wanderer's Guide, all rights reserved.
    By Aaron Cassar.
*/

function processAddText(code, locationID, centerText=false){
  if(code == null || locationID == null) {return;}

  let allStatements = code.split(/\n/);
  for(let statementRaw of allStatements){
    processStatement_AddText(statementRaw, locationID, centerText);
  }

}

function processStatement_AddText(statementRaw, locationID, centerText){
  if(statementRaw.includes("ADD-TEXT=")){ // ADD-TEXT=Anything, will be parsed like a description field

    let statement = null;

    if(typeof testExpr == "function"){

      // Test/Check Statement for Expressions //
      statement = testExpr(statementRaw);
      if(statement === null) {return false;}
      if(!statement.includes("ADD-TEXT=")){return false;}
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

      let text = statement.split('=')[1];
      let centerStyle = '';
      if(centerText) { centerStyle = 'has-text-center-justified'; }
      $('#'+locationID).append('<div class="py-1 '+centerStyle+'">'+processText(text, false, true, 'MEDIUM')+'</div>');

    } else {

      const exprData = readExpr(statementRaw);

      let expression = exprData.expression;

      expression = expression.replace(/-/g, ' ');
      expression = expression.toLowerCase();

      expression = exp_cleaner(expression);

      if (exprData.statement != null && exprData.statement.includes("ADD-TEXT=")){
        statement = exprData.statement;
        expression = 'If '+expression;
      } else if(exprData.elseStatement != null && exprData.elseStatement.includes("ADD-TEXT=")){
        statement = exprData.elseStatement;
        expression = 'If not '+expression;
      }

      let text = statement.split('=')[1];
      let centerStyle = '';
      if(centerText) { centerStyle = 'has-text-center-justified'; }

      $('#'+locationID).append(`
        <div class="box">
          <p class="is-size-5-5 is-italic">${expression}:</p>
          <hr class="mt-1 mb-2">
          <div class="py-1 ${centerStyle}">${processText(text, false, true, 'MEDIUM')}</div>
        </div>
      `);

    }

    if(centerText) {
      $('#'+locationID).find('.has-text-left').removeClass('has-text-left');
    }

    return true;

  } else {

    return false;

  }
}

function exp_cleaner(expression){

  expression = expression.replace('class ability', 'class feature');
        
  expression = exp_convertLevelTextToNumRange(expression);

  expression = expression.replace(/\s*&&\s*/g, ' and ');
  expression = expression.replace(/\s*==\s*/g, ' equal to ');
  expression = expression.replace(/\s*!=\s*/g, ' not equal to ');
  expression = expression.replace(/\s*>=\s*/g, ' greater than or equal to ');
  expression = expression.replace(/\s*<=\s*/g, ' lesser than or equal to ');

  expression = exp_makeClassFeaturePretty(expression);

  return expression;
}


function exp_convertLevelTextToNumRange(expression){

  // Hardcoded - Min and max character levels
  let lowerBound = 1;
  let upperBound = 20;

  if(expression.includes('&&')){
    // Multi condition

    // Is num range,
    let expressionParts = expression.split('&&');
    if(expressionParts.length != 2) { return expression; }
    if(expressionParts[0].trim().startsWith('has level') && expressionParts[1].trim().startsWith('has level')){
    } else { return expression; }

    // Convert,
    let expr0 = expressionParts[0].replace('has level', '');
    let expr1 = expressionParts[1].replace('has level', '');
    let expr0Num = 0;
    let expr1Num = 0;

    if(expr0.includes('>=')){
      expr0 = expr0.replace('>=','').trim();
      expr0Num = parseInt(expr0);
    }
    if(expr1.includes('>=')){
      expr1 = expr1.replace('>=','').trim();
      expr1Num = parseInt(expr1);
    }

    if(expr0.includes('<=')){
      expr0 = expr0.replace('<=','').trim();
      expr0Num = parseInt(expr0);
    }
    if(expr1.includes('<=')){
      expr1 = expr1.replace('<=','').trim();
      expr1Num = parseInt(expr1);
    }

    if(expr0.includes('==')){
      expr0 = expr0.replace('==','').trim();
      expr0Num = parseInt(expr0);
    }
    if(expr1.includes('==')){
      expr1 = expr1.replace('==','').trim();
      expr1Num = parseInt(expr1);
    }

    lowerBound = (expr0 < expr1) ? expr0 : expr1;
    upperBound = (expr0 < expr1) ? expr1 : expr0;

    if(lowerBound == upperBound) { return `is level ${lowerBound}`; }
    return `is level ${lowerBound} - ${upperBound}`;

  } else {
    // Single condition

    // Is num range,
    if(expression.startsWith('has level')){
    } else { return expression; }
    if(expression.includes('==')){
      return expression;
    }

    // Convert,
    expression = expression.replace('has level', '');

    if(expression.includes('>=')){
      expression = expression.replace('>=','').trim();
      lowerBound = parseInt(expression);
    }

    if(expression.includes('<=')){
      expression = expression.replace('<=','').trim();
      upperBound = parseInt(expression);
    }

    if(lowerBound == upperBound) { return `is level ${lowerBound}`; }
    return `is level ${lowerBound} - ${upperBound}`;
  }

}

function exp_makeClassFeaturePretty(expression){

  if(expression.startsWith('has class feature equal to')){
    expression = expression.replace('has class feature equal to', '');
    return `has ${capitalizeWords(expression)} class feature`;
  }

  return expression;
}