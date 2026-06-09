export const BACKEND_URL =
  typeof process.env.NEXT_PUBLIC_BACKEND_URL === "string" && process.env.NEXT_PUBLIC_BACKEND_URL.trim()
    ? process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, "")
    : ""; // Relative path to same origin (production best practice)

export const HOOKS_URL =
  typeof process.env.NEXT_PUBLIC_HOOKS_URL === "string" && process.env.NEXT_PUBLIC_HOOKS_URL.trim()
    ? process.env.NEXT_PUBLIC_HOOKS_URL.replace(/\/$/, "")
    : typeof window !== "undefined"
      ? `${window.location.origin}/hooks`
      : "";