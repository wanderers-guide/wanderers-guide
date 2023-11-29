
export function getChoiceCounts(element: HTMLDivElement) {
  const selectionChoices = element.querySelectorAll('.selection-choice-base');
  const selectedChoices = element.querySelectorAll('.selection-choice-selected');
  return {
    current: selectedChoices.length,
    max: selectionChoices.length,
  }
}


