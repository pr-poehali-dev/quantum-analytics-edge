import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";

type Tab = "materials" | "releases" | "stats" | "royalties" | "chat";
type SideTab = "artists" | "create-user";

interface Stat { id: number; platform: string; track_title: string; streams: number; period: string; notes: string; created_at: string; }
interface VisitStats { online: number; today: number; week: number; month: number; top_pages: {page: string; visits: number}[]; daily: {date: string; visits: number}[]; }
interface Artist { id: number; email: string; artist_name: string; created_at: string; }
interface Track { id: number; title: string; file_name: string; file_url: string; status: string; notes: string; }
interface Contract { id: number; title: string; contract_status: string; payment_status: string; amount: string; notes: string; }
interface Message { id: number; sender_role: string; text: string; created_at: string; }
interface Release { id: number; title: string; artist_name: string; upc: string | null; cover_url: string | null; status: string; genre: string | null; release_date: string | null; notes: string | null; created_at: string; }
interface Royalty { id: number; period: string; platform: string; track_title: string; amount: string; currency: string; notes: string | null; created_at: string; }

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Загружен", in_review: "На рассмотрении", approved: "Одобрен", rejected: "Отклонён",
  pending: "Ожидает", signed: "Подписан", cancelled: "Отменён", unpaid: "Не оплачен", paid: "Оплачен",
  moderation: "На модерации", ready: "Готов к выпуску", published: "Опубликован",
  new: "Новая", processing: "В обработке", done: "Выполнена",
};
const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-zinc-700 text-zinc-200", in_review: "bg-blue-500/20 text-blue-300",
  approved: "bg-green-500/20 text-green-300", rejected: "bg-red-500/20 text-red-300",
  pending: "bg-yellow-500/20 text-yellow-300", signed: "bg-green-500/20 text-green-300",
  cancelled: "bg-red-500/20 text-red-300", unpaid: "bg-orange-500/20 text-orange-300", paid: "bg-green-500/20 text-green-300",
  moderation: "bg-yellow-500/20 text-yellow-300", ready: "bg-blue-500/20 text-blue-300", published: "bg-green-500/20 text-green-300",
  new: "bg-zinc-700 text-zinc-200", processing: "bg-blue-500/20 text-blue-300", done: "bg-green-500/20 text-green-300",
};

export default function Admin() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [sideTab, setSideTab] = useState<SideTab>("artists");
  const [tab, setTab] = useState<Tab>("materials");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selected, setSelected] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [newContract, setNewContract] = useState({ title: "", amount: "", notes: "" });
  const [creatingContract, setCreatingContract] = useState(false);
  const [stats, setStats] = useState<Stat[]>([]);
  const [newStat, setNewStat] = useState({ platform: "", track_title: "", streams: "", period: "", notes: "" });
  const [addingStat, setAddingStat] = useState(false);
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [royalties, setRoyalties] = useState<Royalty[]>([]);
  const [royaltiesTotal, setRoyaltiesTotal] = useState(0);
  const [newRoyalty, setNewRoyalty] = useState({ period: "", platform: "", track_title: "", amount: "", currency: "RUB", notes: "" });
  const [addingRoyalty, setAddingRoyalty] = useState(false);
  const [newRelease, setNewRelease] = useState({ title: "", artist_name: "", upc: "", genre: "", release_date: "", notes: "", cover_url: "" });
  const [addingRelease, setAddingRelease] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [newUser, setNewUser] = useState({ email: "", artist_name: "", password: "" });
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (!loading && user && user.role !== "admin") navigate("/cabinet");
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.admin.artists().then((r) => setArtists(r.artists || []));
    api.visits.stats().then((r) => { if (!r.error) setVisitStats(r); });
  }, [user]);

  useEffect(() => {
    if (!selected) return;
    api.admin.artistTracks(selected.id).then((r) => setTracks(r.tracks || []));
    api.admin.contracts(selected.id).then((r) => setContracts(r.contracts || []));
    api.admin.artistMessages(selected.id).then((r) => setMessages(r.messages || []));
    api.statistics.list(selected.id).then((r) => setStats(r.statistics || []));
    api.releases.list(selected.id).then((r) => setReleases(r.releases || []));
    api.royalties.list(selected.id).then((r) => { setRoyalties(r.royalties || []); setRoyaltiesTotal(r.total || 0); });
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

  const updateReleaseStatus = async (releaseId: number, status: string) => {
    await api.releases.update({ id: releaseId, status });
    setReleases((prev) => prev.map((r) => r.id === releaseId ? { ...r, status } : r));
  };

  const updateReleaseUpc = async (releaseId: number, upc: string) => {
    await api.releases.update({ id: releaseId, upc });
    setReleases((prev) => prev.map((r) => r.id === releaseId ? { ...r, upc } : r));
  };

  const handleAddStat = async () => {
    if (!selected || !newStat.platform.trim() || !newStat.track_title.trim()) return;
    setAddingStat(true);
    const res = await api.statistics.create({
      user_id: selected.id, platform: newStat.platform, track_title: newStat.track_title,
      streams: Number(newStat.streams) || 0, period: newStat.period, notes: newStat.notes,
    });
    if (res.stat) setStats((prev) => [res.stat, ...prev]);
    setNewStat({ platform: "", track_title: "", streams: "", period: "", notes: "" });
    setAddingStat(false);
  };

  const handleDeleteStat = async (id: number) => {
    await api.statistics.delete(id);
    setStats((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddRoyalty = async () => {
    if (!selected || !newRoyalty.period.trim() || !newRoyalty.platform.trim() || !newRoyalty.track_title.trim() || !newRoyalty.amount) return;
    setAddingRoyalty(true);
    const res = await api.royalties.create({
      user_id: selected.id,
      period: newRoyalty.period,
      platform: newRoyalty.platform,
      track_title: newRoyalty.track_title,
      amount: Number(newRoyalty.amount),
      currency: newRoyalty.currency || "RUB",
      notes: newRoyalty.notes || undefined,
    });
    if (res.royalty) {
      setRoyalties((prev) => [res.royalty, ...prev]);
      setRoyaltiesTotal((prev) => prev + Number(newRoyalty.amount));
    }
    setNewRoyalty({ period: "", platform: "", track_title: "", amount: "", currency: "RUB", notes: "" });
    setAddingRoyalty(false);
  };

  const handleDeleteRoyalty = async (id: number, amount: string) => {
    await api.royalties.delete(id);
    setRoyalties((prev) => prev.filter((r) => r.id !== id));
    setRoyaltiesTotal((prev) => Math.max(0, prev - Number(amount)));
  };

  const handleCreateContract = async () => {
    if (!selected || !newContract.title.trim()) return;
    setCreatingContract(true);
    const res = await api.admin.createContract({
      user_id: selected.id, title: newContract.title,
      amount: newContract.amount ? Number(newContract.amount) : undefined, notes: newContract.notes,
    });
    if (res.contract) setContracts((prev) => [res.contract, ...prev]);
    setNewContract({ title: "", amount: "", notes: "" });
    setCreatingContract(false);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAddRelease = async () => {
    if (!selected || !newRelease.title.trim()) return;
    setAddingRelease(true);
    let cover_url: string | undefined = newRelease.cover_url || undefined;
    if (coverFile) {
      const reader = new FileReader();
      const b64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(coverFile);
      });
      const upRes = await api.releases.uploadCover({ file_data: b64, file_name: coverFile.name });
      if (upRes.cover_url) cover_url = upRes.cover_url;
    }
    const res = await api.releases.create({
      user_id: selected.id,
      title: newRelease.title,
      artist_name: newRelease.artist_name || selected.artist_name,
      upc: newRelease.upc || undefined,
      cover_url,
      genre: newRelease.genre || undefined,
      release_date: newRelease.release_date || undefined,
      notes: newRelease.notes || undefined,
      status: "moderation",
    });
    if (res.release) setReleases((prev) => [res.release, ...prev]);
    setNewRelease({ title: "", artist_name: "", upc: "", genre: "", release_date: "", notes: "", cover_url: "" });
    setCoverFile(null);
    setCoverPreview(null);
    if (coverRef.current) coverRef.current.value = "";
    setAddingRelease(false);
  };

  const handleCreateUser = async () => {
    if (!newUser.email.trim() || !newUser.artist_name.trim() || !newUser.password.trim()) return;
    setCreatingUser(true);
    setUserError("");
    setUserSuccess("");
    const res = await api.users.create(newUser);
    if (res.user) {
      setArtists((prev) => [res.user, ...prev]);
      setUserSuccess(`Аккаунт для ${res.user.artist_name} создан`);
      setNewUser({ email: "", artist_name: "", password: "" });
    } else {
      setUserError(res.error || "Ошибка создания аккаунта");
    }
    setCreatingUser(false);
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

        <div className="flex border-b border-white/10">
          <button onClick={() => setSideTab("artists")} className={`flex-1 py-2.5 text-xs font-medium transition-colors ${sideTab === "artists" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}>
            Артисты
          </button>
          <button onClick={() => { setSideTab("create-user"); setSelected(null); }} className={`flex-1 py-2.5 text-xs font-medium transition-colors ${sideTab === "create-user" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}>
            + Создать
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {sideTab === "artists" && (
            <>
              {artists.length === 0 && <p className="text-zinc-500 text-sm px-2 mt-2">Нет артистов</p>}
              {artists.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setSelected(a); setTab("materials"); setSideTab("artists"); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors ${selected?.id === a.id ? "bg-white text-black" : "text-zinc-300 hover:bg-zinc-900"}`}
                >
                  <p className="font-medium text-sm">{a.artist_name}</p>
                  <p className={`text-xs mt-0.5 ${selected?.id === a.id ? "text-zinc-600" : "text-zinc-500"}`}>{a.email}</p>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }} className="w-full text-zinc-400 hover:text-white">
            Выйти
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">

        {/* Создание аккаунта */}
        {sideTab === "create-user" && (
          <div className="p-6 max-w-lg">
            <h2 className="text-xl font-bold mb-2">Создать аккаунт артиста</h2>
            <p className="text-zinc-400 text-sm mb-6">Артист сможет войти с этими данными и видеть свои релизы и статистику</p>
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-5 space-y-3">
              <Input value={newUser.artist_name} onChange={(e) => setNewUser({ ...newUser, artist_name: e.target.value })} placeholder="Имя / псевдоним артиста" className="bg-black border-white/10 text-white placeholder:text-zinc-600" />
              <Input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email" type="email" className="bg-black border-white/10 text-white placeholder:text-zinc-600" />
              <Input value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Пароль" type="password" className="bg-black border-white/10 text-white placeholder:text-zinc-600" />
              {userError && <p className="text-red-400 text-sm">{userError}</p>}
              {userSuccess && <p className="text-green-400 text-sm">{userSuccess}</p>}
              <Button onClick={handleCreateUser} disabled={creatingUser || !newUser.email.trim() || !newUser.artist_name.trim() || !newUser.password.trim()} className="w-full bg-white text-black hover:bg-zinc-200">
                {creatingUser ? "Создаю..." : "Создать аккаунт"}
              </Button>
            </div>
          </div>
        )}

        {/* Главная — посещаемость */}
        {sideTab === "artists" && !selected && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">Посещаемость сайта</h2>
            {!visitStats ? (
              <p className="text-zinc-500 text-sm">Загрузка статистики...</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Онлайн (1ч)", value: visitStats.online, icon: "Wifi", color: "text-green-400" },
                    { label: "Сегодня", value: visitStats.today, icon: "Sun", color: "text-yellow-400" },
                    { label: "За 7 дней", value: visitStats.week, icon: "Calendar", color: "text-blue-400" },
                    { label: "За 30 дней", value: visitStats.month, icon: "TrendingUp", color: "text-purple-400" },
                  ].map((s) => (
                    <div key={s.label} className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon name={s.icon} size={16} className={s.color} />
                        <p className="text-zinc-400 text-xs">{s.label}</p>
                      </div>
                      <p className="text-3xl font-bold">{s.value.toLocaleString("ru")}</p>
                    </div>
                  ))}
                </div>
                {visitStats.daily.length > 0 && (
                  <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                    <p className="text-sm font-semibold mb-4 text-zinc-300">Посещения за 14 дней</p>
                    <div className="flex items-end gap-1 h-24">
                      {visitStats.daily.map((d) => {
                        const max = Math.max(...visitStats.daily.map(x => x.visits), 1);
                        const h = Math.max((d.visits / max) * 100, 4);
                        return (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                              {d.visits} — {d.date.slice(5)}
                            </div>
                            <div className="w-full bg-white/80 rounded-sm" style={{ height: `${h}%` }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {visitStats.top_pages.length > 0 && (
                  <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                    <p className="text-sm font-semibold mb-3 text-zinc-300">Топ страниц (7 дней)</p>
                    <div className="space-y-2">
                      {visitStats.top_pages.map((p) => {
                        const max = visitStats.top_pages[0]?.visits || 1;
                        return (
                          <div key={p.page} className="flex items-center gap-3">
                            <p className="text-sm text-zinc-300 w-32 shrink-0 truncate">{p.page || "/"}</p>
                            <div className="flex-1 bg-zinc-800 rounded-full h-2">
                              <div className="bg-white rounded-full h-2" style={{ width: `${(p.visits / max) * 100}%` }} />
                            </div>
                            <p className="text-sm font-medium w-10 text-right">{p.visits}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <p className="text-zinc-600 text-xs">← Выбери артиста слева для работы с его материалами</p>
              </div>
            )}
          </div>
        )}

        {/* Карточка артиста */}
        {sideTab === "artists" && selected && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white">
                <Icon name="ChevronLeft" size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{selected.artist_name}</h1>
                <p className="text-zinc-500 text-sm">{selected.email}</p>
              </div>
            </div>

            <div className="flex gap-1 mb-6 bg-zinc-900 rounded-xl p-1 max-w-2xl overflow-x-auto">
              {(["materials", "releases", "stats", "royalties", "chat"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === t ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
                >
                  {t === "materials" ? "Материалы" : t === "releases" ? "Релизы" : t === "stats" ? "Статистика" : t === "royalties" ? "Роялти" : "Чат"}
                </button>
              ))}
            </div>

            {/* Вкладка Материалы */}
            {tab === "materials" && (
              <div className="space-y-6">
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
                          <select value={track.status} onChange={(e) => updateTrackStatus(track.id, e.target.value)} className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[track.status] || "bg-zinc-700 text-zinc-200"}`}>
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

            {/* Вкладка Релизы */}
            {tab === "releases" && (
              <div className="space-y-5 max-w-2xl">
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-5 space-y-3">
                  <p className="font-semibold text-sm mb-1">Добавить релиз</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={newRelease.title} onChange={(e) => setNewRelease({ ...newRelease, title: e.target.value })} placeholder="Название релиза *" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm col-span-2" />
                    <Input value={newRelease.artist_name} onChange={(e) => setNewRelease({ ...newRelease, artist_name: e.target.value })} placeholder={`Артист (по умолч. ${selected.artist_name})`} className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm col-span-2" />
                    <Input value={newRelease.upc} onChange={(e) => setNewRelease({ ...newRelease, upc: e.target.value })} placeholder="UPC код" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm" />
                    <Input value={newRelease.genre} onChange={(e) => setNewRelease({ ...newRelease, genre: e.target.value })} placeholder="Жанр" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm" />
                    <Input value={newRelease.release_date} onChange={(e) => setNewRelease({ ...newRelease, release_date: e.target.value })} placeholder="Дата выхода" type="date" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm" />
                    <div className="col-span-1">
                      <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" id="cover-upload" />
                      <label htmlFor="cover-upload" className="flex items-center gap-2 cursor-pointer bg-black border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-400 hover:text-white hover:border-white/30 transition-colors">
                        <Icon name="ImagePlus" size={14} />
                        {coverFile ? coverFile.name.slice(0, 14) + "..." : "Обложка"}
                      </label>
                    </div>
                    {coverPreview && (
                      <div className="col-span-2 flex items-center gap-3">
                        <img src={coverPreview} alt="preview" className="w-14 h-14 rounded-lg object-cover border border-white/10" />
                        <button onClick={() => { setCoverFile(null); setCoverPreview(null); if (coverRef.current) coverRef.current.value = ""; }} className="text-zinc-500 hover:text-red-400 text-xs">Удалить</button>
                      </div>
                    )}
                    <Input value={newRelease.notes} onChange={(e) => setNewRelease({ ...newRelease, notes: e.target.value })} placeholder="Заметки" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm col-span-2" />
                  </div>
                  <Button onClick={handleAddRelease} disabled={addingRelease || !newRelease.title.trim()} size="sm" className="bg-white text-black hover:bg-zinc-200">
                    {addingRelease ? "Добавляю..." : "Добавить релиз"}
                  </Button>
                </div>

                {releases.length === 0 && <p className="text-zinc-500 text-sm">Релизов нет</p>}
                <div className="space-y-3">
                  {releases.map((rel) => (
                    <div key={rel.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                      <div className="flex gap-4">
                        {rel.cover_url && (
                          <img src={rel.cover_url} alt={rel.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                        )}
                        {!rel.cover_url && (
                          <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                            <Icon name="Music" size={20} className="text-zinc-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <p className="font-semibold">{rel.title}</p>
                              <p className="text-zinc-400 text-xs">{rel.artist_name}</p>
                            </div>
                            <select
                              value={rel.status}
                              onChange={(e) => updateReleaseStatus(rel.id, e.target.value)}
                              className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer shrink-0 ${STATUS_COLORS[rel.status] || "bg-zinc-700 text-zinc-200"}`}
                            >
                              {["moderation", "ready", "published"].map((s) => (
                                <option key={s} value={s} className="bg-zinc-900 text-white">{STATUS_LABELS[s]}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {rel.genre && <span className="text-zinc-500 text-xs">{rel.genre}</span>}
                            {rel.release_date && <span className="text-zinc-500 text-xs">{rel.release_date}</span>}
                            <div className="flex items-center gap-1">
                              <span className="text-zinc-500 text-xs">UPC:</span>
                              <input
                                defaultValue={rel.upc || ""}
                                onBlur={(e) => { if (e.target.value !== (rel.upc || "")) updateReleaseUpc(rel.id, e.target.value); }}
                                placeholder="—"
                                className="bg-transparent text-xs text-zinc-300 border-b border-zinc-700 focus:border-white outline-none w-36 py-0.5"
                              />
                            </div>
                          </div>
                          {rel.notes && <p className="text-zinc-500 text-xs mt-1">{rel.notes}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Вкладка Статистика */}
            {tab === "stats" && (
              <div className="space-y-4 max-w-2xl">
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 space-y-2">
                  <p className="font-semibold text-sm mb-1">Добавить запись</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={newStat.platform} onChange={(e) => setNewStat({ ...newStat, platform: e.target.value })} placeholder="Платформа (Spotify, VK...)" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm" />
                    <Input value={newStat.track_title} onChange={(e) => setNewStat({ ...newStat, track_title: e.target.value })} placeholder="Название трека" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm" />
                    <Input value={newStat.streams} onChange={(e) => setNewStat({ ...newStat, streams: e.target.value })} placeholder="Прослушивания" type="number" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm" />
                    <Input value={newStat.period} onChange={(e) => setNewStat({ ...newStat, period: e.target.value })} placeholder="Период (напр. Март 2026)" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm" />
                  </div>
                  <Button onClick={handleAddStat} disabled={addingStat || !newStat.platform.trim() || !newStat.track_title.trim()} size="sm" className="bg-white text-black hover:bg-zinc-200">
                    {addingStat ? "Добавляю..." : "Добавить"}
                  </Button>
                </div>
                {stats.length === 0 && <p className="text-zinc-500 text-sm">Статистики нет</p>}
                <div className="space-y-2">
                  {stats.map((s) => (
                    <div key={s.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{s.track_title}</p>
                        <p className="text-zinc-500 text-xs">{s.platform} · {s.period}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-white">{Number(s.streams).toLocaleString("ru")}</span>
                        <button onClick={() => handleDeleteStat(s.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Вкладка Роялти */}
            {tab === "royalties" && (
              <div className="space-y-4 max-w-2xl">
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 space-y-2">
                  <p className="font-semibold text-sm mb-1">Добавить начисление роялти</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={newRoyalty.track_title} onChange={(e) => setNewRoyalty({ ...newRoyalty, track_title: e.target.value })} placeholder="Название трека" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm col-span-2" />
                    <Input value={newRoyalty.platform} onChange={(e) => setNewRoyalty({ ...newRoyalty, platform: e.target.value })} placeholder="Платформа (Spotify, VK...)" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm" />
                    <Input value={newRoyalty.period} onChange={(e) => setNewRoyalty({ ...newRoyalty, period: e.target.value })} placeholder="Период (Март 2026)" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm" />
                    <Input value={newRoyalty.amount} onChange={(e) => setNewRoyalty({ ...newRoyalty, amount: e.target.value })} placeholder="Сумма (₽)" type="number" step="0.01" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm" />
                    <select value={newRoyalty.currency} onChange={(e) => setNewRoyalty({ ...newRoyalty, currency: e.target.value })} className="bg-black border border-white/10 text-white rounded-md px-3 py-2 text-sm">
                      <option value="RUB">₽ RUB</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                    </select>
                    <Input value={newRoyalty.notes} onChange={(e) => setNewRoyalty({ ...newRoyalty, notes: e.target.value })} placeholder="Примечание (необязательно)" className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm col-span-2" />
                  </div>
                  <Button onClick={handleAddRoyalty} disabled={addingRoyalty || !newRoyalty.track_title.trim() || !newRoyalty.platform.trim() || !newRoyalty.period.trim() || !newRoyalty.amount} size="sm" className="bg-white text-black hover:bg-zinc-200">
                    {addingRoyalty ? "Добавляю..." : "Добавить"}
                  </Button>
                </div>
                {royalties.length > 0 && (
                  <div className="bg-zinc-900 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
                    <p className="text-zinc-400 text-sm">Итого начислено</p>
                    <p className="text-2xl font-bold text-green-400">{royaltiesTotal.toLocaleString("ru", { minimumFractionDigits: 2 })} ₽</p>
                  </div>
                )}
                {royalties.length === 0 && <p className="text-zinc-500 text-sm">Роялти не добавлены</p>}
                <div className="space-y-2">
                  {royalties.map((r) => (
                    <div key={r.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{r.track_title}</p>
                        <p className="text-zinc-500 text-xs">{r.platform} · {r.period}</p>
                        {r.notes && <p className="text-zinc-600 text-xs mt-0.5">{r.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-green-400">+{Number(r.amount).toLocaleString("ru", { minimumFractionDigits: 2 })} {r.currency}</span>
                        <button onClick={() => handleDeleteRoyalty(r.id, r.amount)} className="text-zinc-600 hover:text-red-400 transition-colors">
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Вкладка Чат */}
            {tab === "chat" && (
              <div className="flex flex-col h-[calc(100vh-220px)] max-w-2xl">
                <div ref={chatRef} className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                  {messages.length === 0 && <p className="text-zinc-500 text-sm">Сообщений нет</p>}
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${m.sender_role === "admin" ? "bg-white text-black" : "bg-zinc-800 text-white"}`}>
                        <p>{m.text}</p>
                        <p className={`text-xs mt-1 ${m.sender_role === "admin" ? "text-zinc-500" : "text-zinc-500"}`}>{new Date(m.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={msgText} onChange={(e) => setMsgText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Сообщение..." className="flex-1 bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600" />
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