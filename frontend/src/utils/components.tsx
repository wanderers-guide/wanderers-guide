import { ReactNode } from 'react';
import ReactDOM from 'react-dom';

export const renderToHtml = (Component: React.ElementType): string => {
  const tempDiv = document.createElement('div');
  ReactDOM.render(<Component />, tempDiv);
  return tempDiv.innerHTML;
};

export function nodeToString(node: ReactNode): string {
  try {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return node.toString();
    if (Array.isArray(node)) return node.map(nodeToString).join('');
    if (node && typeof node === 'object' && 'props' in node) {
      return nodeToString((node as any).props.children);
    }
    return '';
  } catch (e) {
    console.error(e);
    return '';
  }
}
