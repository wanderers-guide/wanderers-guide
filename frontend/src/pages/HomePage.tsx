import { setPageTitle } from '@utils/document-change';
import { useEffect } from 'react';

export default function HomePage() {
  setPageTitle();

  return (
    <div>
      <h1>Home Page</h1>
    </div>
  );
}
