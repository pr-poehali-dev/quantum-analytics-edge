const BASE = "https://functions.poehali.dev/86efa512-bc82-4f74-adbe-2ede76c6470f";
const TRACKS = "https://functions.poehali.dev/afedf9ee-5782-4eee-8e0d-b7416b479bf2";
const AUTH = "https://functions.poehali.dev/2d79c7fb-b9fe-4b33-9d7d-c232e7c9cc4c";
const SMARTLINK_BASE = "https://functions.poehali.dev/a881dc8f-d2db-4da3-b755-0d1aa6cd08a0";
const BEATSTORE_BASE = "https://functions.poehali.dev/76bda3d9-5afb-4469-b432-9f145059aa2e";
const GENERATE_COVER_BASE = "https://functions.poehali.dev/8773f1e2-7da7-4964-abdb-2b5566495669";
const SUNO_BASE = "https://functions.poehali.dev/2747ca88-4546-49f4-99d9-add5fa468652";

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

async function safeJson(r: Response) {
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { error: `Неверный ответ сервера: ${text.slice(0, 100)}` }; }
}

export const api = {
  auth: {
    register: (data: object) => fetch(`${AUTH}?action=register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(safeJson),
    login: (data: object) => fetch(`${AUTH}?action=login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(safeJson),
    me: () => fetch(`${AUTH}?action=me`, { headers: headers() }).then(r => r.json()),
    logout: () => fetch(`${AUTH}?action=logout`, { method: "POST", headers: headers() }).then(r => r.json()),
    forgotPassword: (email: string) => fetch(`${AUTH}?action=forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).then(r => r.json()),
    changePassword: (newPassword: string) => fetch(`${AUTH}?action=change-password`, { method: "POST", headers: headers(), body: JSON.stringify({ new_password: newPassword }) }).then(r => r.json()),
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
    updateTrack: (data: object) => put("update-track", data),
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
    uploadCover: (data: object) => post("upload-cover", data),
  },
  distribution: {
    submit: (data: object) => post("distribution", data),
    myRequests: () => get("distribution"),
    list: (userId?: number) => get("distribution", userId ? `&user_id=${userId}` : ""),
    updateStatus: (id: number, status: string) => put("update-distribution", { id, status }),
  },
  royalties: {
    list: (userId?: number) => get("royalties", userId ? `&user_id=${userId}` : ""),
    create: (data: object) => post("royalties", data),
    delete: (id: number) => post("del-royalty", { id }),
  },
  users: {
    create: (data: object) => post("create-user", data),
    changePassword: (userId: number, newPassword: string) => post("change-password", { user_id: userId, new_password: newPassword }),
  },
  documents: {
    list: (userId?: number) => get("documents", userId ? `&user_id=${userId}` : ""),
    upload: (data: object) => post("upload-document", data),
    delete: (id: number) => post("del-document", { id }),
  },
  radio: {
    like: (artistName: string, sessionId: string) => post("radio-like", { artist_name: artistName, session_id: sessionId }, false),
    unlike: (artistName: string, sessionId: string) => post("radio-unlike", { artist_name: artistName, session_id: sessionId }, false),
    top: (sessionId: string) => get("radio-top", `&session_id=${sessionId}`),
    getTracks: () => fetch(`${BASE}?action=radio-tracks`).then(r => r.json()),
    getAllTracks: () => get("radio-tracks-all"),
    uploadTrack: (data: object) => post("upload-radio-track", data),
    updateTrack: (data: object) => put("update-radio-track", data),
    deleteTrack: (id: number) => post("del-radio-track", { id }),
    getArtists: () => fetch(`${BASE}?action=radio-artists`).then(r => r.json()),
  },
  smartLinks: {
    get: (releaseId: number) => fetch(`${BASE}?action=smart-link&release_id=${releaseId}`, { headers: headers() }).then(r => r.json()),
    save: (data: object) => fetch(`${BASE}?action=smart-link`, { method: "POST", headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    public: (slug: string) => fetch(`${SMARTLINK_BASE}?slug=${slug}`).then(r => r.json()),
  },
  ai: {
    generateCover: (data: { title: string; style?: string; artist_name?: string }) =>
      fetch(GENERATE_COVER_BASE, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
  },
  suno: {
    generate: (data: object) =>
      fetch(SUNO_BASE, { method: "POST", headers: headers(), body: JSON.stringify({ ...data, action: "generate" }) }).then(r => r.json()),
    status: (taskId: string) =>
      fetch(SUNO_BASE, { method: "POST", headers: headers(), body: JSON.stringify({ action: "status", task_id: taskId }) }).then(r => r.json()),
  },
  beatstore: {
    listBeats: (params?: string) => fetch(`${BEATSTORE_BASE}?action=list-beats${params || ''}`).then(r => r.json()),
    uploadBeat: (data: object) => fetch(`${BEATSTORE_BASE}?action=upload-beat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    playBeat: (id: number) => fetch(`${BEATSTORE_BASE}?action=play-beat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then(r => r.json()),
    delBeat: (id: number) => fetch(`${BEATSTORE_BASE}?action=del-beat`, { method: 'POST', headers: headers(), body: JSON.stringify({ id }) }).then(r => r.json()),
    listLabelReleases: () => fetch(`${BEATSTORE_BASE}?action=list-label-releases`).then(r => r.json()),
    adminLabelReleases: () => fetch(`${BEATSTORE_BASE}?action=admin-label-releases`, { headers: headers() }).then(r => r.json()),
    addLabelRelease: (data: object) => fetch(`${BEATSTORE_BASE}?action=add-label-release`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    updateLabelRelease: (data: object) => fetch(`${BEATSTORE_BASE}?action=update-label-release`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    delLabelRelease: (id: number) => fetch(`${BEATSTORE_BASE}?action=del-label-release`, { method: 'POST', headers: headers(), body: JSON.stringify({ id }) }).then(r => r.json()),
    adminArtists: () => fetch(`${BEATSTORE_BASE}?action=admin-artists`, { headers: headers() }).then(r => r.json()),
    addArtist: (data: object) => fetch(`${BEATSTORE_BASE}?action=add-artist`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    updateArtist: (data: object) => fetch(`${BEATSTORE_BASE}?action=update-artist`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    delArtist: (id: number) => fetch(`${BEATSTORE_BASE}?action=del-artist`, { method: 'POST', headers: headers(), body: JSON.stringify({ id }) }).then(r => r.json()),
  },
};