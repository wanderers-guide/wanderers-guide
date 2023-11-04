import { runOperations } from "@operations/operation-runner";
import { useEffect } from "react";

export default function HomePage() {

  useEffect(() => {
    runOperations();
  }, [])

  return (
    <div>
      <h1>Home Page</h1>
    </div>
  );
}
