const BASE = "https://functions.poehali.dev/86efa512-bc82-4f74-adbe-2ede76c6470f";
const CHAT = "https://functions.poehali.dev/6c31944e-44d4-4a20-b201-4fc6021e25ba";
const TRACKS = "https://functions.poehali.dev/afedf9ee-5782-4eee-8e0d-b7416b479bf2";
const AUTH = "https://functions.poehali.dev/2d79c7fb-b9fe-4b33-9d7d-c232e7c9cc4c";

function token() { return localStorage.getItem("ks_token") || ""; }
function headers() { return { "Content-Type": "application/json", "X-Session-Token": token() }; }
function url(action: string, extra = "") { return `${BASE}?action=${action}${extra}`; }

async function post(action: string, body: unknown, authed = true) {
  const r = await fetch(url(action), { method: "POST", headers: authed ? headers() : { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
async function get(action: string, query = "") {
  const r = await fetch(url(action, query), { headers: headers() });
  return r.json();
}
async function put(action: string, body: unknown) {
  const r = await fetch(url(action), { method: "PUT", headers: headers(), body: JSON.stringify(body) });
  return r.json();
}

export const api = {
  auth: {
    register: (data: object) => fetch(`${AUTH}?action=register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    login: (data: object) => fetch(`${AUTH}?action=login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    me: () => fetch(`${AUTH}?action=me`, { headers: headers() }).then(r => r.json()),
    logout: () => fetch(`${AUTH}?action=logout`, { method: "POST", headers: headers() }).then(r => r.json()),
    forgotPassword: (email: string) => fetch(`${AUTH}?action=forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).then(r => r.json()),
  },
  tracks: {
    list: (userId?: number) => fetch(`${TRACKS}${userId ? `?user_id=${userId}` : ""}`, { headers: headers() }).then(r => r.json()),
    upload: (data: object) => fetch(TRACKS, { method: "POST", headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
  },
  chat: {
    messages: (userId?: number) => get("messages", userId ? `&user_id=${userId}` : ""),
    send: (text: string, userId?: number) => post("send-message", { text, ...(userId ? { user_id: userId } : {}) }),
  },
  admin: {
    artists: () => get("artists"),
    contracts: (userId?: number) => get("contracts", userId ? `&user_id=${userId}` : ""),
    createContract: (data: object) => post("contracts", data),
    update: (data: object) => put("update", data),
    artistTracks: (userId: number) => fetch(`${TRACKS}?user_id=${userId}`, { headers: headers() }).then(r => r.json()),
    artistMessages: (userId: number) => get("messages", `&user_id=${userId}`),
    sendMessage: (text: string, userId: number) => post("send-message", { text, user_id: userId }),
  },
  payment: {
    create: (contractId: number, returnUrl: string) => post("pay", { contract_id: contractId, return_url: returnUrl }),
  },
  statistics: {
    list: (userId?: number) => get("statistics", userId ? `&user_id=${userId}` : ""),
    create: (data: object) => post("statistics", data),
    delete: (id: number) => post("del-stat", { id }),
  },
  visits: {
    track: (page: string, sessionId: string) =>
      fetch(url("visit"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page, session_id: sessionId }) }).then(r => r.json()).catch(() => null),
    stats: () => get("visits"),
  },
  packages: {
    pay: async (data: object) => {
      try {
        const r = await fetch(url("paypkg"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        const text = await r.text();
        try { return JSON.parse(text); } catch { return { error: `Ошибка: ${text.slice(0, 200)}` }; }
      } catch (e: unknown) {
        return { error: e instanceof Error ? e.message : "Сетевая ошибка" };
      }
    },
  },
  releases: {
    list: (userId?: number) => get("releases", userId ? `&user_id=${userId}` : ""),
    create: (data: object) => post("releases", data),
    update: (data: object) => put("update-release", data),
    myReleases: () => get("releases"),
  },
  distribution: {
    submit: (data: object) => post("distribution", data),
    myRequests: () => get("distribution"),
    list: (userId?: number) => get("distribution", userId ? `&user_id=${userId}` : ""),
    updateStatus: (id: number, status: string) => put("update-distribution", { id, status }),
  },
  users: {
    create: (data: object) => post("create-user", data),
  },
};