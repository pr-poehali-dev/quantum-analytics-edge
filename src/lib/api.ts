const URLS = {
  auth: "https://functions.poehali.dev/2d79c7fb-b9fe-4b33-9d7d-c232e7c9cc4c",
  tracks: "https://functions.poehali.dev/afedf9ee-5782-4eee-8e0d-b7416b479bf2",
  chat: "https://functions.poehali.dev/6c31944e-44d4-4a20-b201-4fc6021e25ba",
  admin: "https://functions.poehali.dev/86efa512-bc82-4f74-adbe-2ede76c6470f",
};

function getToken() {
  return localStorage.getItem("ks_token") || "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Session-Token": getToken(),
  };
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; artist_name: string }) =>
      fetch(`${URLS.auth}?action=register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    login: (data: { email: string; password: string }) =>
      fetch(`${URLS.auth}?action=login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    me: () =>
      fetch(`${URLS.auth}?action=me`, { headers: authHeaders() }).then((r) => r.json()),
    logout: () =>
      fetch(`${URLS.auth}?action=logout`, { method: "POST", headers: authHeaders() }).then((r) => r.json()),
  },
  tracks: {
    list: (userId?: number) =>
      fetch(`${URLS.tracks}${userId ? `?user_id=${userId}` : ""}`, { headers: authHeaders() }).then((r) => r.json()),
    upload: (data: { title: string; file_data: string; file_name: string }) =>
      fetch(URLS.tracks, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) }).then((r) => r.json()),
  },
  chat: {
    messages: (userId?: number) =>
      fetch(`${URLS.chat}${userId ? `?user_id=${userId}` : ""}`, { headers: authHeaders() }).then((r) => r.json()),
    send: (text: string, userId?: number) =>
      fetch(URLS.chat, { method: "POST", headers: authHeaders(), body: JSON.stringify({ text, ...(userId ? { user_id: userId } : {}) }) }).then((r) => r.json()),
  },
  admin: {
    artists: () =>
      fetch(`${URLS.admin}/artists`, { headers: authHeaders() }).then((r) => r.json()),
    contracts: (userId?: number) =>
      fetch(`${URLS.admin}/contracts${userId ? `?user_id=${userId}` : ""}`, { headers: authHeaders() }).then((r) => r.json()),
    createContract: (data: { user_id: number; title: string; amount?: number; notes?: string }) =>
      fetch(`${URLS.admin}/contracts`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) }).then((r) => r.json()),
    update: (data: { entity: string; id: number; [key: string]: unknown }) =>
      fetch(`${URLS.admin}/update`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(data) }).then((r) => r.json()),
    artistTracks: (userId: number) =>
      fetch(`${URLS.tracks}?user_id=${userId}`, { headers: authHeaders() }).then((r) => r.json()),
    artistMessages: (userId: number) =>
      fetch(`${URLS.chat}?user_id=${userId}`, { headers: authHeaders() }).then((r) => r.json()),
    sendMessage: (text: string, userId: number) =>
      fetch(URLS.chat, { method: "POST", headers: authHeaders(), body: JSON.stringify({ text, user_id: userId }) }).then((r) => r.json()),
  },
  contracts: {
    list: () =>
      fetch(`${URLS.admin}/contracts`, { headers: authHeaders() }).then((r) => r.json()),
  },
  payment: {
    create: (contractId: number, returnUrl: string) =>
      fetch(`${URLS.admin}/pay`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ contract_id: contractId, return_url: returnUrl }) }).then((r) => r.json()),
  },
  statistics: {
    list: (userId?: number) =>
      fetch(`${URLS.admin}/statistics${userId ? `?user_id=${userId}` : ""}`, { headers: authHeaders() }).then((r) => r.json()),
    create: (data: { user_id: number; platform: string; track_title: string; streams: number; period?: string; notes?: string }) =>
      fetch(`${URLS.admin}/statistics`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) }).then((r) => r.json()),
    delete: (id: number) =>
      fetch(`${URLS.admin}/statistics/delete`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ id }) }).then((r) => r.json()),
  },
};