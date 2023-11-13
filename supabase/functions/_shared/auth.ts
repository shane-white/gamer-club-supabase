import { json } from "sift";

const admins = ["turbo_puns", "thecutout"]

export async function adminWrapper(user: string, fn: (...args: any[]) => any) {
  return async function (...args: any[]) {
    if (admins.includes(user)) {
        return await fn(...args);
      }
      return json({
        type: 4,
        data: {
          content: "You are not allowed to do that!",
        },
    });
  }
}