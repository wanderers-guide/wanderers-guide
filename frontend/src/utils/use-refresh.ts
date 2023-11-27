import { useState } from "react";

export default function useRefresh(): [boolean, () => void] {

  const [display, setDisplay] = useState(true);
  const refresh = () => {
    setDisplay(false);
    setTimeout(() => {
      setDisplay(true);
    }, 10);
  };

  return [display, refresh];
}
