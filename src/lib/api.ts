const BASE = "https://functions.poehali.dev/cf183d3e-0346-4b33-a765-9237aa819f5c";
const NEWS_BASE = "https://functions.poehali.dev/4276f97b-e1b9-4b8d-b287-bb47187d7d79";
const SHOTS_BASE = "https://functions.poehali.dev/3acf1c59-774f-424c-9a00-cae0feb7666c";
const TRACKS = "https://functions.poehali.dev/d339116b-08fa-4f52-8f11-0f0d2562f279";
const AUTH = "https://functions.poehali.dev/e6f110d8-f326-4608-8299-c73add286edd";
const SMARTLINK_BASE = "https://functions.poehali.dev/7a366c80-4902-4f1d-bd09-d77a170df95a";
const BEATSTORE_BASE = "https://functions.poehali.dev/a6dc36ea-c97a-4781-9390-c33f3b312f53";
const GENERATE_COVER_BASE = "https://functions.poehali.dev/1961a49b-358c-4097-a094-5c9a640bfa7d";
const SUNO_BASE = "https://functions.poehali.dev/4be0dc2a-52d6-484c-a0d9-17337fdacbe0";
const AI_CHAT_BASE = "https://functions.poehali.dev/c2fb26de-7844-4299-821b-15d56ac7b5e6";

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
  aiChat: {
    ask: (message: string, history: {role: string; content: string}[]) =>
      fetch(AI_CHAT_BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, history }) }).then(r => r.json()),
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
    verifyArtist: (user_id: number, verified: boolean) => post("verify-artist", { user_id, verified }),
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
    uploadAudio: (data: object) => post("upload-audio", data),
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
    listBeats: (params?: string) => fetch(`${BEATSTORE_BASE}?action=list-beats${params || ''}`, { headers: headers() }).then(r => r.json()),
    uploadBeat: (data: object) => fetch(`${BEATSTORE_BASE}?action=upload-beat`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    playBeat: (id: number) => fetch(`${BEATSTORE_BASE}?action=play-beat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then(r => r.json()),
    delBeat: (id: number) => fetch(`${BEATSTORE_BASE}?action=del-beat`, { method: 'POST', headers: headers(), body: JSON.stringify({ id }) }).then(r => r.json()),
    listLabelReleases: () => fetch(`${BEATSTORE_BASE}?action=list-label-releases`).then(r => r.json()),
    adminLabelReleases: () => fetch(`${BEATSTORE_BASE}?action=admin-label-releases`, { headers: headers() }).then(r => r.json()),
    addLabelRelease: (data: object) => fetch(`${BEATSTORE_BASE}?action=add-label-release`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    updateLabelRelease: (data: object) => fetch(`${BEATSTORE_BASE}?action=update-label-release`, { method: 'PUT', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    delLabelRelease: (id: number) => fetch(`${BEATSTORE_BASE}?action=del-label-release`, { method: 'POST', headers: headers(), body: JSON.stringify({ id }) }).then(r => r.json()),
    adminArtists: () => fetch(`${BEATSTORE_BASE}?action=admin-artists&_t=${Date.now()}`, { cache: 'no-store', headers: headers() }).then(r => r.json()),
    addArtist: (data: object) => fetch(`${BEATSTORE_BASE}?action=add-artist`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    updateArtist: (data: object) => fetch(`${BEATSTORE_BASE}?action=update-artist`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    delArtist: (id: number) => fetch(`${BEATSTORE_BASE}?action=del-artist`, { method: 'POST', headers: headers(), body: JSON.stringify({ id }) }).then(r => r.json()),
    listInterviews: () => fetch(`${BEATSTORE_BASE}?action=list-interviews&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()),
    adminInterviews: () => fetch(`${BEATSTORE_BASE}?action=admin-interviews&_t=${Date.now()}`, { cache: 'no-store', headers: headers() }).then(r => r.json()),
    addInterview: (data: object) => fetch(`${BEATSTORE_BASE}?action=add-interview`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    updateInterview: (data: object) => fetch(`${BEATSTORE_BASE}?action=update-interview`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    delInterview: (id: number) => fetch(`${BEATSTORE_BASE}?action=del-interview`, { method: 'POST', headers: headers(), body: JSON.stringify({ id }) }).then(r => r.json()),
  },
  shots: {
    feed: (params?: string) => fetch(`${SHOTS_BASE}?action=feed${params || ''}`, { headers: headers() }).then(r => r.json()),
    presign: (data: object) => fetch(`${SHOTS_BASE}?action=presign`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    save: (data: object) => fetch(`${SHOTS_BASE}?action=save`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    upload: (data: object) => fetch(`${SHOTS_BASE}?action=upload`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),
    like: (shot_id: number) => fetch(`${SHOTS_BASE}?action=like`, { method: 'POST', headers: headers(), body: JSON.stringify({ shot_id }) }).then(r => r.json()),
    comments: (shot_id: number) => fetch(`${SHOTS_BASE}?action=comments&shot_id=${shot_id}`, { headers: headers() }).then(r => r.json()),
    comment: (shot_id: number, text: string) => fetch(`${SHOTS_BASE}?action=comment`, { method: 'POST', headers: headers(), body: JSON.stringify({ shot_id, text }) }).then(r => r.json()),
    delete: (shot_id: number) => fetch(`${SHOTS_BASE}?action=delete`, { method: 'POST', headers: headers(), body: JSON.stringify({ shot_id }) }).then(r => r.json()),
    view: (shot_id: number) => fetch(`${SHOTS_BASE}?action=view`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shot_id }) }).then(r => r.json()),
    myStats: () => fetch(`${SHOTS_BASE}?action=my-stats`, { headers: headers() }).then(r => r.json()),
  },
  news: {
    list: (limit = 20, offset = 0) => fetch(`${NEWS_BASE}?action=get-news&limit=${limit}&offset=${offset}`).then(r => r.json()),
    adminList: () => fetch(`${NEWS_BASE}?action=admin-news`, { headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token() } }).then(r => r.json()),
    add: (data: object) => fetch(`${NEWS_BASE}?action=add-news`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token() }, body: JSON.stringify(data) }).then(r => r.json()),
    update: (data: object) => fetch(`${NEWS_BASE}?action=update-news`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token() }, body: JSON.stringify(data) }).then(r => r.json()),
    del: (id: number) => fetch(`${NEWS_BASE}?action=del-news`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token() }, body: JSON.stringify({ id }) }).then(r => r.json()),
  },
};