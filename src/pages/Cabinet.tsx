import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";

type Tab = "tracks" | "contracts" | "chat";

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Загружен",
  in_review: "На рассмотрении",
  approved: "Одобрен",
  rejected: "Отклонён",
  pending: "Ожидает",
  signed: "Подписан",
  cancelled: "Отменён",
  unpaid: "Не оплачен",
  paid: "Оплачен",
};

const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-zinc-700 text-zinc-200",
  in_review: "bg-blue-500/20 text-blue-300",
  approved: "bg-green-500/20 text-green-300",
  rejected: "bg-red-500/20 text-red-300",
  pending: "bg-yellow-500/20 text-yellow-300",
  signed: "bg-green-500/20 text-green-300",
  cancelled: "bg-red-500/20 text-red-300",
  unpaid: "bg-orange-500/20 text-orange-300",
  paid: "bg-green-500/20 text-green-300",
};

export default function Cabinet() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("tracks");
  const [tracks, setTracks] = useState<Record<string, unknown>[]>([]);
  const [contracts, setContracts] = useState<Record<string, unknown>[]>([]);
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [msgText, setMsgText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [sending, setSending] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (!loading && user?.role === "admin") navigate("/admin");
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.tracks.list().then((r) => setTracks(r.tracks || []));
    api.chat.messages().then((r) => setMessages(r.messages || []));
    api.admin.contracts().then((r) => setContracts(r.contracts || [])).catch(() => {
      fetch(`https://functions.poehali.dev/86efa512-bc82-4f74-adbe-2ede76c6470f/contracts?user_id=${user.id}`, {
        headers: { "X-Session-Token": localStorage.getItem("ks_token") || "" }
      }).then(r => r.json()).then(r => setContracts(r.contracts || []));
    });
  }, [user]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !trackTitle.trim()) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const res = await api.tracks.upload({ title: trackTitle, file_data: base64, file_name: file.name });
      if (res.track) setTracks((prev) => [res.track, ...prev]);
      setTrackTitle("");
      if (fileRef.current) fileRef.current.value = "";
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePay = async (contractId: number) => {
    setPayingId(contractId);
    const res = await api.payment.create(contractId, window.location.origin + "/cabinet");
    setPayingId(null);
    if (res.payment_url) window.location.href = res.payment_url;
  };

  const handleSend = async () => {
    if (!msgText.trim() || sending) return;
    setSending(true);
    const res = await api.chat.send(msgText);
    if (res.message) setMessages((prev) => [...prev, res.message]);
    setMsgText("");
    setSending(false);
  };

  if (loading || !user) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Загрузка...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <a href="/" className="text-xl font-bold tracking-tighter">Калашников Саунд</a>
          <span className="text-zinc-500 text-sm ml-3">Кабинет артиста</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 text-sm">{user.artist_name}</span>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }} className="text-zinc-400 hover:text-white">
            Выйти
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8 bg-zinc-900 rounded-xl p-1">
          {(["tracks", "contracts", "chat"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
            >
              {t === "tracks" ? "Треки" : t === "contracts" ? "Договоры" : "Чат"}
            </button>
          ))}
        </div>

        {tab === "tracks" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Загрузить трек</h3>
              <div className="space-y-3">
                <Input
                  value={trackTitle}
                  onChange={(e) => setTrackTitle(e.target.value)}
                  placeholder="Название трека"
                  className="bg-black border-white/10 text-white placeholder:text-zinc-600"
                />
                <input ref={fileRef} type="file" accept="audio/*" className="text-zinc-400 text-sm" />
                <Button onClick={handleUpload} disabled={uploading || !trackTitle.trim()} className="bg-white text-black hover:bg-zinc-200">
                  {uploading ? "Загружаю..." : "Загрузить"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {tracks.length === 0 && <p className="text-zinc-500 text-center py-8">Треки ещё не загружены</p>}
              {tracks.map((track) => (
                <div key={track.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{track.title}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{track.file_name}</p>
                    {track.notes && <p className="text-zinc-400 text-sm mt-1">{track.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[track.status] || "bg-zinc-700 text-zinc-200"}`}>
                      {STATUS_LABELS[track.status] || track.status}
                    </span>
                    {track.file_url && (
                      <a href={track.file_url} target="_blank" rel="noopener noreferrer">
                        <Icon name="Download" size={16} className="text-zinc-400 hover:text-white" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "contracts" && (
          <div className="space-y-3">
            {contracts.length === 0 && <p className="text-zinc-500 text-center py-8">Договоров пока нет</p>}
            {contracts.map((c) => (
              <div key={c.id} className="bg-zinc-900 border border-white/10 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold">{c.title}</h4>
                  {c.amount && <span className="text-white font-bold">{Number(c.amount).toLocaleString("ru")} ₽</span>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[String(c.contract_status)] || "bg-zinc-700 text-zinc-200"}`}>
                    Договор: {STATUS_LABELS[String(c.contract_status)] || String(c.contract_status)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[String(c.payment_status)] || "bg-zinc-700 text-zinc-200"}`}>
                    Оплата: {STATUS_LABELS[String(c.payment_status)] || String(c.payment_status)}
                  </span>
                  {c.payment_status === "unpaid" && c.amount && (
                    <Button
                      size="sm"
                      onClick={() => handlePay(Number(c.id))}
                      disabled={payingId === Number(c.id)}
                      className="ml-auto bg-white text-black hover:bg-zinc-200 text-xs h-7"
                    >
                      {payingId === Number(c.id) ? "Перенаправляю..." : "Оплатить"}
                    </Button>
                  )}
                </div>
                {c.notes && <p className="text-zinc-400 text-sm mt-2">{String(c.notes)}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === "chat" && (
          <div className="bg-zinc-900 border border-white/10 rounded-2xl flex flex-col h-[500px]">
            <div className="p-4 border-b border-white/10">
              <p className="font-semibold">Чат с командой лейбла</p>
            </div>
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-zinc-500 text-center py-8">Напиши первое сообщение команде лейбла</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_role === "artist" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${m.sender_role === "artist" ? "bg-white text-black" : "bg-zinc-800 text-white"}`}>
                    {m.sender_role === "admin" && <p className="text-xs text-zinc-400 mb-1">Калашников Саунд</p>}
                    <p>{m.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/10 flex gap-2">
              <Input
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Написать сообщение..."
                className="bg-black border-white/10 text-white placeholder:text-zinc-600"
              />
              <Button onClick={handleSend} disabled={sending || !msgText.trim()} className="bg-white text-black hover:bg-zinc-200">
                <Icon name="Send" size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}