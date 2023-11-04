import { supabase } from "../main";

// export function isLoggedIn() {
//   return !!localStorage.getItem("wg-user-data");
// }

// export async function syncUserData() {
//   const { data, error } = await supabase.auth.getSession();
//   const user = data?.session?.user;
//   if (user) {
//     localStorage.setItem("wg-user-data", JSON.stringify(user));
//   }
// }
