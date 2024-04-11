import ReactDOM from 'react-dom';

export const renderToHtml = (Component: React.ElementType): string => {
  const tempDiv = document.createElement('div');
  ReactDOM.render(<Component />, tempDiv);
  return tempDiv.innerHTML;
};
