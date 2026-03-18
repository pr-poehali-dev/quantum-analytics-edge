import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";

type Tab = "artists" | "chat";

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Загружен", in_review: "На рассмотрении", approved: "Одобрен", rejected: "Отклонён",
  pending: "Ожидает", signed: "Подписан", cancelled: "Отменён", unpaid: "Не оплачен", paid: "Оплачен",
};
const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-zinc-700 text-zinc-200", in_review: "bg-blue-500/20 text-blue-300",
  approved: "bg-green-500/20 text-green-300", rejected: "bg-red-500/20 text-red-300",
  pending: "bg-yellow-500/20 text-yellow-300", signed: "bg-green-500/20 text-green-300",
  cancelled: "bg-red-500/20 text-red-300", unpaid: "bg-orange-500/20 text-orange-300", paid: "bg-green-500/20 text-green-300",
};

interface Artist { id: number; email: string; artist_name: string; created_at: string; }
interface Track { id: number; title: string; file_name: string; file_url: string; status: string; notes: string; }
interface Contract { id: number; title: string; contract_status: string; payment_status: string; amount: string; notes: string; }
interface Message { id: number; sender_role: string; text: string; created_at: string; }

export default function Admin() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("artists");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selected, setSelected] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [newContract, setNewContract] = useState({ title: "", amount: "", notes: "" });
  const [creatingContract, setCreatingContract] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (!loading && user && user.role !== "admin") navigate("/cabinet");
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.admin.artists().then((r) => setArtists(r.artists || []));
  }, [user]);

  useEffect(() => {
    if (!selected) return;
    api.admin.artistTracks(selected.id).then((r) => setTracks(r.tracks || []));
    api.admin.contracts(selected.id).then((r) => setContracts(r.contracts || []));
    api.admin.artistMessages(selected.id).then((r) => setMessages(r.messages || []));
  }, [selected]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!msgText.trim() || !selected || sending) return;
    setSending(true);
    const res = await api.admin.sendMessage(msgText, selected.id);
    if (res.message) setMessages((prev) => [...prev, res.message]);
    setMsgText("");
    setSending(false);
  };

  const updateTrackStatus = async (trackId: number, status: string) => {
    await api.admin.update({ entity: "track", id: trackId, status });
    setTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, status } : t));
  };

  const updateContractStatus = async (contractId: number, field: string, value: string) => {
    await api.admin.update({ entity: "contract", id: contractId, [field]: value });
    setContracts((prev) => prev.map((c) => c.id === contractId ? { ...c, [field]: value } : c));
  };

  const handleCreateContract = async () => {
    if (!selected || !newContract.title.trim()) return;
    setCreatingContract(true);
    const res = await api.admin.createContract({
      user_id: selected.id,
      title: newContract.title,
      amount: newContract.amount ? Number(newContract.amount) : undefined,
      notes: newContract.notes,
    });
    if (res.contract) setContracts((prev) => [res.contract, ...prev]);
    setNewContract({ title: "", amount: "", notes: "" });
    setCreatingContract(false);
  };

  if (loading || !user) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Загрузка...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <a href="/" className="text-lg font-bold tracking-tighter block">Калашников Саунд</a>
          <p className="text-zinc-500 text-xs mt-1">Админ-панель</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-zinc-600 text-xs uppercase tracking-wider px-2 mb-2">Артисты</p>
          {artists.length === 0 && <p className="text-zinc-500 text-sm px-2">Нет артистов</p>}
          {artists.map((a) => (
            <button
              key={a.id}
              onClick={() => { setSelected(a); setTab("artists"); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors ${selected?.id === a.id ? "bg-white text-black" : "text-zinc-300 hover:bg-zinc-900"}`}
            >
              <p className="font-medium text-sm">{a.artist_name}</p>
              <p className={`text-xs mt-0.5 ${selected?.id === a.id ? "text-zinc-600" : "text-zinc-500"}`}>{a.email}</p>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-white/10">
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }} className="w-full text-zinc-400 hover:text-white">
            Выйти
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            Выбери артиста слева
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">{selected.artist_name}</h1>
                <p className="text-zinc-500 text-sm">{selected.email}</p>
              </div>
            </div>

            <div className="flex gap-2 mb-6 bg-zinc-900 rounded-xl p-1 max-w-xs">
              {(["artists", "chat"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                >
                  {t === "artists" ? "Материалы" : "Чат"}
                </button>
              ))}
            </div>

            {tab === "artists" && (
              <div className="space-y-6">
                {/* Треки */}
                <div>
                  <h3 className="font-semibold mb-3">Треки</h3>
                  {tracks.length === 0 && <p className="text-zinc-500 text-sm">Треков нет</p>}
                  <div className="space-y-2">
                    {tracks.map((track) => (
                      <div key={track.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{track.title}</p>
                          <p className="text-zinc-500 text-xs">{track.file_name}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={track.status}
                            onChange={(e) => updateTrackStatus(track.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[track.status] || "bg-zinc-700 text-zinc-200"}`}
                          >
                            {["uploaded", "in_review", "approved", "rejected"].map((s) => (
                              <option key={s} value={s} className="bg-zinc-900 text-white">{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
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

                {/* Договоры */}
                <div>
                  <h3 className="font-semibold mb-3">Договоры</h3>
                  <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 mb-3 space-y-2">
                    <Input value={newContract.title} onChange={(e) => setNewContract({ ...newContract, title: e.target.value })} placeholder="Название договора" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm" />
                    <div className="flex gap-2">
                      <Input value={newContract.amount} onChange={(e) => setNewContract({ ...newContract, amount: e.target.value })} placeholder="Сумма (₽)" type="number" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm" />
                      <Input value={newContract.notes} onChange={(e) => setNewContract({ ...newContract, notes: e.target.value })} placeholder="Примечание" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm" />
                    </div>
                    <Button onClick={handleCreateContract} disabled={creatingContract || !newContract.title.trim()} size="sm" className="bg-white text-black hover:bg-zinc-200">
                      Создать договор
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {contracts.length === 0 && <p className="text-zinc-500 text-sm">Договоров нет</p>}
                    {contracts.map((c) => (
                      <div key={c.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium">{c.title}</p>
                          {c.amount && <span className="text-white font-bold text-sm">{Number(c.amount).toLocaleString("ru")} ₽</span>}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <select value={c.contract_status} onChange={(e) => updateContractStatus(c.id, "contract_status", e.target.value)} className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[c.contract_status] || "bg-zinc-700 text-zinc-200"}`}>
                            {["pending", "signed", "cancelled"].map((s) => (
                              <option key={s} value={s} className="bg-zinc-900 text-white">{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                          <select value={c.payment_status} onChange={(e) => updateContractStatus(c.id, "payment_status", e.target.value)} className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[c.payment_status] || "bg-zinc-700 text-zinc-200"}`}>
                            {["unpaid", "paid"].map((s) => (
                              <option key={s} value={s} className="bg-zinc-900 text-white">{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "chat" && (
              <div className="bg-zinc-900 border border-white/10 rounded-2xl flex flex-col h-[500px] max-w-2xl">
                <div className="p-4 border-b border-white/10">
                  <p className="font-semibold">Чат с {selected.artist_name}</p>
                </div>
                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && <p className="text-zinc-500 text-center py-8">Сообщений пока нет</p>}
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${m.sender_role === "admin" ? "bg-white text-black" : "bg-zinc-800 text-white"}`}>
                        {m.sender_role === "artist" && <p className="text-xs text-zinc-400 mb-1">{selected.artist_name}</p>}
                        <p>{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-white/10 flex gap-2">
                  <Input value={msgText} onChange={(e) => setMsgText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Написать артисту..." className="bg-black border-white/10 text-white placeholder:text-zinc-600" />
                  <Button onClick={handleSend} disabled={sending || !msgText.trim()} className="bg-white text-black hover:bg-zinc-200">
                    <Icon name="Send" size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
