import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import AudioWavePlayer from "@/components/AudioWavePlayer";

type Tab = "tracks" | "releases" | "contracts" | "stats" | "royalties" | "chat" | "distribution";

interface Stat { id: number; platform: string; track_title: string; streams: number; period: string; notes: string; created_at: string; }
interface Release { id: number; title: string; artist_name: string; upc: string | null; cover_url: string | null; status: string; genre: string | null; release_date: string | null; notes: string | null; label?: string; type?: string; }
interface DistRequest { id: number; release_id: number | null; platforms: string; message: string; lyrics: string | null; copyright: string | null; status: string; created_at: string; }
interface Royalty { id: number; period: string; platform: string; track_title: string; amount: string; currency: string; notes: string | null; created_at: string; }
interface TrackItem { id: number; title: string; file_name: string; notes: string; status: string; file_url?: string; }
interface ContractItem { id: number; title: string; type: string; status: string; amount: number; currency: string; notes: string; created_at: string; }
interface MessageItem { id: number; text: string; sender_role: string; created_at: string; }

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Загружен", in_review: "На рассмотрении", approved: "Одобрен", rejected: "Отклонён", deleted: "Удалён",
  pending: "Ожидает", signed: "Подписан", cancelled: "Отменён", unpaid: "Не оплачен", paid: "Оплачен",
  moderation: "На модерации", ready: "Готов к выпуску", published: "Опубликован",
  new: "Новая заявка", processing: "В обработке", done: "Выполнена",
};

const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-[#2a3a4a] text-slate-200", in_review: "bg-blue-500/20 text-blue-300",
  approved: "bg-green-500/20 text-green-300", rejected: "bg-red-500/20 text-red-300", deleted: "bg-red-900/40 text-red-400",
  pending: "bg-yellow-500/20 text-yellow-300", signed: "bg-green-500/20 text-green-300",
  cancelled: "bg-red-500/20 text-red-300", unpaid: "bg-orange-500/20 text-orange-300", paid: "bg-green-500/20 text-green-300",
  moderation: "bg-yellow-500/20 text-yellow-300", ready: "bg-blue-500/20 text-blue-300", published: "bg-green-500/20 text-green-300",
  new: "bg-[#2a3a4a] text-slate-200", processing: "bg-blue-500/20 text-blue-300", done: "bg-green-500/20 text-green-300",
};

const NAV_ITEMS = [
  { id: "releases", label: "Моя музыка", icon: "Music2" },
  { id: "stats", label: "Аналитика", icon: "BarChart2" },
  { id: "tracks", label: "Треки", icon: "Upload" },
  { id: "distribution", label: "Дистрибьюция", icon: "Send" },
  { id: "royalties", label: "Финансы", icon: "DollarSign" },
  { id: "contracts", label: "Договоры", icon: "FileText" },
  { id: "chat", label: "Поддержка", icon: "MessageCircle" },
];

const RELEASE_FILTERS = ["Все", "Черновики", "Выпущенные", "Удалённые"];

export default function Cabinet() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("releases");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [distRequests, setDistRequests] = useState<DistRequest[]>([]);
  const [royalties, setRoyalties] = useState<Royalty[]>([]);
  const [royaltiesTotal, setRoyaltiesTotal] = useState(0);
  const [distForm, setDistForm] = useState({ platforms: "", message: "", release_id: "", lyrics: "", copyright: "" });
  const [submittingDist, setSubmittingDist] = useState(false);
  const [distError, setDistError] = useState("");
  const [distSuccess, setDistSuccess] = useState("");
  const [msgText, setMsgText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [sending, setSending] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [changePwValue, setChangePwValue] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [changePwMsg, setChangePwMsg] = useState("");
  const [showChangePw, setShowChangePw] = useState(false);
  const [releaseFilter, setReleaseFilter] = useState("Все");
  const [releaseSearch, setReleaseSearch] = useState("");
  const [releaseView, setReleaseView] = useState<"table" | "grid">("table");
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
    api.admin.contracts().then((r) => setContracts(r.contracts || []));
    api.statistics.list(user.id).then((r) => setStats(r.statistics || []));
    api.releases.myReleases().then((r) => setReleases(r.releases || []));
    api.distribution.myRequests().then((r) => setDistRequests(r.requests || []));
    api.royalties.list(user.id).then((r) => { setRoyalties(r.royalties || []); setRoyaltiesTotal(r.total || 0); });
  }, [user]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    const url = URL.createObjectURL(file);
    setAudioPreviewUrl(url);
  };

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
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
      setSelectedFileName("");
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

  const handleChangePassword = async () => {
    if (!changePwValue.trim() || changePwValue.length < 6) return;
    setChangingPw(true);
    setChangePwMsg("");
    const res = await api.auth.changePassword(changePwValue);
    setChangingPw(false);
    if (res.ok) {
      setChangePwMsg("Пароль успешно изменён");
      setChangePwValue("");
      setTimeout(() => { setShowChangePw(false); setChangePwMsg(""); }, 2000);
    } else {
      setChangePwMsg(res.error || "Ошибка смены пароля");
    }
  };

  const handleSend = async () => {
    if (!msgText.trim() || sending) return;
    setSending(true);
    const res = await api.chat.send(msgText);
    if (res.message) setMessages((prev) => [...prev, res.message]);
    setMsgText("");
    setSending(false);
  };

  const handleDistSubmit = async () => {
    if (!distForm.platforms.trim()) { setDistError("Укажите платформы"); return; }
    setSubmittingDist(true);
    setDistError("");
    setDistSuccess("");
    const res = await api.distribution.submit({
      platforms: distForm.platforms,
      message: distForm.message,
      lyrics: distForm.lyrics || undefined,
      copyright: distForm.copyright || undefined,
      release_id: distForm.release_id ? Number(distForm.release_id) : undefined,
    });
    if (res.request) {
      setDistRequests((prev) => [res.request, ...prev]);
      setDistSuccess("Заявка отправлена! Мы свяжемся с вами.");
      setDistForm({ platforms: "", message: "", release_id: "", lyrics: "", copyright: "" });
    } else {
      setDistError(res.error || "Ошибка отправки заявки");
    }
    setSubmittingDist(false);
  };

  const filteredReleases = releases.filter((r) => {
    const matchSearch = releaseSearch === "" || 
      r.title.toLowerCase().includes(releaseSearch.toLowerCase()) ||
      (r.artist_name || "").toLowerCase().includes(releaseSearch.toLowerCase()) ||
      (r.upc || "").includes(releaseSearch);
    const matchFilter = releaseFilter === "Все" ? true :
      releaseFilter === "Выпущенные" ? r.status === "published" || r.status === "approved" :
      releaseFilter === "Черновики" ? r.status === "pending" || r.status === "moderation" || r.status === "in_review" || r.status === "ready" :
      releaseFilter === "Удалённые" ? r.status === "deleted" || r.status === "rejected" : true;
    return matchSearch && matchFilter;
  });

  if (loading || !user) return (
    <div className="min-h-screen bg-[#0f1923] flex items-center justify-center">
      <div className="text-white opacity-60">Загрузка...</div>
    </div>
  );

  const initials = (user.artist_name || "A").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0f1923] text-white flex">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static top-0 left-0 h-full w-72 bg-[#1a2636] z-40 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <a href="/" className="text-lg font-bold tracking-tighter text-white leading-tight">
            Калашников <span className="text-[#f5a623]">Саунд</span>
          </a>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {/* Создать */}
          <button
            onClick={() => { setTab("distribution"); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <div className="w-6 h-6 rounded-full border border-slate-500 flex items-center justify-center">
              <Icon name="Plus" size={14} />
            </div>
            <span className="font-medium">Создать релиз</span>
          </button>

          <div className="h-px bg-white/5 my-3" />

          <p className="text-xs text-slate-500 uppercase tracking-widest px-4 mb-2">Музыка</p>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => { setTab(item.id as Tab); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors relative ${
                tab === item.id
                  ? "text-[#f5a623] bg-[#f5a623]/10"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#f5a623] rounded-r-full" />
              )}
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Social */}
        <div className="p-5 border-t border-white/10">
          <p className="text-xs text-slate-500 mb-3 font-semibold">Подписывайтесь на нас</p>
          <div className="flex gap-2">
            <a href="#" className="w-8 h-8 bg-[#4680C2] rounded-lg flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity">В</a>
            <a href="#" className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white text-xs font-bold border border-white/10 hover:opacity-90 transition-opacity">TT</a>
            <a href="#" className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity">
              <Icon name="Youtube" size={14} />
            </a>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-[#0f1923] border-b border-white/10 px-4 lg:px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white p-1">
              <Icon name="Menu" size={22} />
            </button>
            <h1 className="text-lg font-bold hidden sm:block">
              {NAV_ITEMS.find(n => n.id === tab)?.label || "Кабинет"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Create button */}
            <Button
              onClick={() => setTab("distribution")}
              className="bg-[#f5a623] hover:bg-[#f5a623]/90 text-black font-bold px-4 h-9 rounded-xl hidden sm:flex items-center gap-2"
            >
              <Icon name="Plus" size={16} />
              Создать
            </Button>

            {/* User */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-[#f5a623]/20 border border-[#f5a623]/40 flex items-center justify-center text-[#f5a623] font-bold text-sm">
                {initials}
              </div>
              <div className="hidden sm:block">
                <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded font-medium block mb-0.5">Pro</span>
                <span className="text-sm font-medium text-white leading-none">{user.artist_name}</span>
              </div>
              <Icon name="ChevronDown" size={16} className="text-slate-400" />
            </div>

            {/* Settings dropdown */}
            <div className="relative group">
              <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                <Icon name="Settings" size={18} />
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a2636] border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => setShowChangePw((v) => !v)}
                  className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-t-xl transition-colors flex items-center gap-2"
                >
                  <Icon name="Key" size={14} />
                  Сменить пароль
                </button>
                <button
                  onClick={() => { logout(); navigate("/"); }}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 rounded-b-xl transition-colors flex items-center gap-2"
                >
                  <Icon name="LogOut" size={14} />
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Change password bar */}
        {showChangePw && (
          <div className="bg-[#1a2636] border-b border-white/10 px-4 lg:px-8 py-3">
            <div className="flex items-center gap-3 max-w-lg">
              <Input
                type="password"
                value={changePwValue}
                onChange={(e) => { setChangePwValue(e.target.value); setChangePwMsg(""); }}
                placeholder="Новый пароль (минимум 6 символов)"
                className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              />
              <Button
                onClick={handleChangePassword}
                disabled={changingPw || changePwValue.length < 6}
                size="sm"
                className="bg-[#f5a623] text-black hover:bg-[#f5a623]/90 shrink-0"
              >
                {changingPw ? "..." : "Изменить"}
              </Button>
              <button onClick={() => { setShowChangePw(false); setChangePwMsg(""); setChangePwValue(""); }} className="text-slate-500 hover:text-white shrink-0">
                <Icon name="X" size={16} />
              </button>
              {changePwMsg && <p className={`text-xs shrink-0 ${changePwMsg.includes("успешно") ? "text-green-400" : "text-red-400"}`}>{changePwMsg}</p>}
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 px-4 lg:px-8 py-6">

          {/* ===== RELEASES (Моя музыка) ===== */}
          {tab === "releases" && (
            <div>
              {/* Filters */}
              <div className="flex gap-2 mb-5 flex-wrap">
                {RELEASE_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setReleaseFilter(f)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                      releaseFilter === f
                        ? "bg-[#f5a623] text-black"
                        : "bg-[#1a2636] text-slate-300 hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Search + view toggle */}
              <div className="flex items-center gap-3 mb-5">
                <div className="relative flex-1 max-w-lg">
                  <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={releaseSearch}
                    onChange={(e) => setReleaseSearch(e.target.value)}
                    placeholder="Поиск по UPC, названию, артисту"
                    className="w-full bg-[#1a2636] border border-white/10 text-white placeholder:text-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#f5a623]/40 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <button onClick={() => setReleaseView("table")} className={`p-2 rounded-lg transition-colors ${releaseView === "table" ? "text-white bg-white/10" : "hover:text-white"}`}>
                    <Icon name="LayoutList" size={18} />
                  </button>
                  <button onClick={() => setReleaseView("grid")} className={`p-2 rounded-lg transition-colors ${releaseView === "grid" ? "text-white bg-white/10" : "hover:text-white"}`}>
                    <Icon name="LayoutGrid" size={18} />
                  </button>
                </div>
              </div>

              {filteredReleases.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <Icon name="Music2" size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Релизов пока нет</p>
                  <p className="text-sm mt-1 text-slate-600">Лейбл добавит ваши релизы здесь</p>
                </div>
              ) : releaseView === "table" ? (
                <div className="bg-[#1a2636] rounded-2xl overflow-hidden border border-white/5">
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/10">
                    <div className="col-span-5 text-xs text-slate-500 uppercase tracking-wider font-semibold">Название</div>
                    <div className="col-span-3 text-xs text-slate-500 uppercase tracking-wider font-semibold hidden md:block">Лейбл</div>
                    <div className="col-span-2 text-xs text-slate-500 uppercase tracking-wider font-semibold hidden sm:block">Тип</div>
                    <div className="col-span-2 text-xs text-slate-500 uppercase tracking-wider font-semibold hidden lg:block">Дата релиза</div>
                  </div>
                  {filteredReleases.map((rel) => (
                    <div key={rel.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/3 transition-colors items-center last:border-0">
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        {rel.cover_url ? (
                          <img src={rel.cover_url} alt={rel.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#0f1923] flex items-center justify-center shrink-0">
                            <Icon name="Music" size={16} className="text-slate-600" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{rel.title}</p>
                          <p className="text-slate-500 text-xs truncate">{rel.artist_name}</p>
                        </div>
                        {rel.upc && (
                          <button
                            onClick={() => navigator.clipboard.writeText(rel.upc || "")}
                            className="ml-1 p-1 text-slate-600 hover:text-slate-300 shrink-0 hidden sm:block"
                            title="Копировать UPC"
                          >
                            <Icon name="Copy" size={12} />
                          </button>
                        )}
                      </div>
                      <div className="col-span-3 text-sm text-slate-300 hidden md:block truncate">
                        {rel.label || rel.artist_name || "—"}
                      </div>
                      <div className="col-span-2 text-sm text-slate-300 hidden sm:block">
                        {rel.genre || "Альбом"}
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        {rel.release_date && <span className="text-sm text-slate-300 hidden lg:block">{rel.release_date}</span>}
                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[rel.status] || "bg-[#2a3a4a] text-slate-300"}`}>
                          {STATUS_LABELS[rel.status] || rel.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredReleases.map((rel) => (
                    <div key={rel.id} className="bg-[#1a2636] rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-colors">
                      {rel.cover_url ? (
                        <img src={rel.cover_url} alt={rel.title} className="w-full aspect-square object-cover" />
                      ) : (
                        <div className="w-full aspect-square bg-[#0f1923] flex items-center justify-center">
                          <Icon name="Music" size={32} className="text-slate-700" />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="font-semibold text-sm truncate">{rel.title}</p>
                        <p className="text-slate-500 text-xs truncate mt-0.5">{rel.artist_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block ${STATUS_COLORS[rel.status] || "bg-[#2a3a4a] text-slate-300"}`}>
                          {STATUS_LABELS[rel.status] || rel.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== TRACKS ===== */}
          {tab === "tracks" && (
            <div className="space-y-6 max-w-2xl">
              <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-6">
                <h3 className="font-semibold mb-4 text-lg">Загрузить трек</h3>
                <div className="bg-[#0f1923] border border-white/5 rounded-xl p-4 mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Требования к файлу</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-xs text-slate-400"><Icon name="Music" size={12} className="text-green-400 shrink-0" /> Формат: <span className="text-white font-medium">WAV</span></li>
                    <li className="flex items-center gap-2 text-xs text-slate-400"><Icon name="Layers" size={12} className="text-green-400 shrink-0" /> Битрейт: <span className="text-white font-medium">16 bit, 44.1 kHz</span></li>
                    <li className="flex items-center gap-2 text-xs text-slate-400"><Icon name="Headphones" size={12} className="text-green-400 shrink-0" /> Каналы: <span className="text-white font-medium">Stereo</span></li>
                    <li className="flex items-center gap-2 text-xs text-slate-400"><Icon name="Image" size={12} className="text-blue-400 shrink-0" /> Обложка: <span className="text-white font-medium">мин. 3000×3000 px, JPEG/PNG</span></li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <Input
                    value={trackTitle}
                    onChange={(e) => setTrackTitle(e.target.value)}
                    placeholder="Название трека"
                    className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600"
                  />
                  <input ref={fileRef} type="file" accept="audio/*" onChange={handleFileSelect} className="text-slate-400 text-sm" />
                  {audioPreviewUrl && (
                    <div className="bg-[#0f1923] border border-white/10 rounded-xl p-4">
                      <p className="text-slate-400 text-xs mb-2">Предпрослушивание:</p>
                      <AudioWavePlayer src={audioPreviewUrl} fileName={selectedFileName} />
                    </div>
                  )}
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !trackTitle.trim()}
                    className="bg-[#f5a623] text-black hover:bg-[#f5a623]/90 font-semibold"
                  >
                    {uploading ? "Загружаю..." : "Загрузить"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {tracks.length === 0 && <p className="text-slate-500 text-center py-8">Треки ещё не загружены</p>}
                {tracks.map((track) => (
                  <div key={track.id} className="bg-[#1a2636] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{track.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{track.file_name}</p>
                      {track.notes && <p className="text-slate-400 text-sm mt-1">{track.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[track.status] || "bg-[#2a3a4a] text-slate-200"}`}>
                        {STATUS_LABELS[track.status] || track.status}
                      </span>
                      {track.file_url && (
                        <a href={track.file_url} target="_blank" rel="noopener noreferrer">
                          <Icon name="Download" size={16} className="text-slate-400 hover:text-white" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== DISTRIBUTION ===== */}
          {tab === "distribution" && (
            <div className="space-y-6 max-w-2xl">
              <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-6">
                <h3 className="font-semibold mb-1 text-lg">Заявка на дистрибьюцию</h3>
                <p className="text-slate-500 text-sm mb-5">Выберите платформы и укажите детали — мы разместим ваш трек</p>
                <div className="space-y-3">
                  {releases.length > 0 && (
                    <select
                      value={distForm.release_id}
                      onChange={(e) => setDistForm({ ...distForm, release_id: e.target.value })}
                      className="w-full bg-[#0f1923] border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Выберите релиз (необязательно)</option>
                      {releases.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                    </select>
                  )}
                  <Input
                    value={distForm.platforms}
                    onChange={(e) => setDistForm({ ...distForm, platforms: e.target.value })}
                    placeholder="Платформы: Spotify, Apple Music, VK Music..."
                    className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600"
                  />
                  <textarea
                    value={distForm.message}
                    onChange={(e) => setDistForm({ ...distForm, message: e.target.value })}
                    placeholder="Дополнительная информация..."
                    rows={3}
                    className="w-full bg-[#0f1923] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-[#f5a623]/40 transition-colors"
                  />
                  <textarea
                    value={distForm.lyrics}
                    onChange={(e) => setDistForm({ ...distForm, lyrics: e.target.value })}
                    placeholder="Текст трека (необязательно)"
                    rows={4}
                    className="w-full bg-[#0f1923] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-[#f5a623]/40 transition-colors"
                  />
                  <Input
                    value={distForm.copyright}
                    onChange={(e) => setDistForm({ ...distForm, copyright: e.target.value })}
                    placeholder="Правообладатель / Copyright"
                    className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600"
                  />
                  {distError && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{distError}</p>}
                  {distSuccess && <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">{distSuccess}</p>}
                  <Button
                    onClick={handleDistSubmit}
                    disabled={submittingDist}
                    className="bg-[#f5a623] text-black hover:bg-[#f5a623]/90 font-semibold"
                  >
                    {submittingDist ? "Отправляем..." : "Отправить заявку"}
                  </Button>
                </div>
              </div>

              {distRequests.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 text-slate-300">Мои заявки</h4>
                  <div className="space-y-2">
                    {distRequests.map((req) => (
                      <div key={req.id} className="bg-[#1a2636] border border-white/5 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium">{req.platforms}</p>
                          <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${STATUS_COLORS[req.status] || "bg-[#2a3a4a] text-slate-200"}`}>
                            {STATUS_LABELS[req.status] || req.status}
                          </span>
                        </div>
                        {req.message && <p className="text-slate-400 text-xs">{req.message}</p>}
                        <p className="text-slate-600 text-xs mt-1">{new Date(req.created_at).toLocaleDateString("ru")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== CONTRACTS ===== */}
          {tab === "contracts" && (
            <div className="space-y-3 max-w-2xl">
              {contracts.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <Icon name="FileText" size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Договоров пока нет</p>
                </div>
              ) : contracts.map((c) => (
                <div key={c.id} className="bg-[#1a2636] border border-white/5 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold">{c.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{c.type}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${STATUS_COLORS[c.status] || "bg-[#2a3a4a] text-slate-200"}`}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </div>
                  {c.notes && <p className="text-slate-400 text-sm mb-3">{c.notes}</p>}
                  {c.amount > 0 && (
                    <div className="flex items-center justify-between">
                      <p className="text-slate-400 text-sm">К оплате: <span className="text-white font-semibold">{Number(c.amount).toLocaleString("ru")} {c.currency}</span></p>
                      {c.status === "unpaid" && (
                        <Button
                          size="sm"
                          onClick={() => handlePay(c.id)}
                          disabled={payingId === c.id}
                          className="bg-[#f5a623] text-black hover:bg-[#f5a623]/90 font-semibold"
                        >
                          {payingId === c.id ? "..." : "Оплатить"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ===== STATS ===== */}
          {tab === "stats" && (
            <div className="space-y-5">
              {stats.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <Icon name="BarChart2" size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Статистика пока не добавлена</p>
                  <p className="text-sm mt-1 text-slate-600">Лейбл добавит данные после выхода релизов</p>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#1a2636] border border-white/5 rounded-xl p-4">
                      <p className="text-slate-500 text-sm mb-1">Всего стримов</p>
                      <p className="text-2xl font-bold text-white">{stats.reduce((a, s) => a + Number(s.streams), 0).toLocaleString("ru")}</p>
                    </div>
                    <div className="bg-[#1a2636] border border-white/5 rounded-xl p-4">
                      <p className="text-slate-500 text-sm mb-1">Треков</p>
                      <p className="text-2xl font-bold text-white">{new Set(stats.map(s => s.track_title)).size}</p>
                    </div>
                    <div className="bg-[#1a2636] border border-white/5 rounded-xl p-4">
                      <p className="text-slate-500 text-sm mb-1">Платформ</p>
                      <p className="text-2xl font-bold text-white">{new Set(stats.map(s => s.platform)).size}</p>
                    </div>
                    <div className="bg-[#1a2636] border border-white/5 rounded-xl p-4">
                      <p className="text-slate-500 text-sm mb-1">Записей</p>
                      <p className="text-2xl font-bold text-white">{stats.length}</p>
                    </div>
                  </div>

                  {/* Chart */}
                  {(() => {
                    const byTrack = stats.reduce<Record<string, number>>((acc, s) => {
                      acc[s.track_title] = (acc[s.track_title] || 0) + Number(s.streams);
                      return acc;
                    }, {});
                    const sorted = Object.entries(byTrack).sort((a, b) => b[1] - a[1]);
                    const maxVal = sorted[0]?.[1] || 1;
                    const colors = ["bg-purple-500", "bg-blue-500", "bg-[#f5a623]", "bg-green-500", "bg-pink-500", "bg-orange-500"];
                    return (
                      <div className="bg-[#1a2636] border border-white/5 rounded-xl p-5">
                        <p className="font-semibold text-sm mb-4">По трекам</p>
                        <div className="space-y-3">
                          {sorted.slice(0, 8).map(([title, streams], i) => (
                            <div key={title}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-slate-300 truncate max-w-[60%]">{title}</span>
                                <span className="text-xs text-slate-400 font-medium">{streams.toLocaleString("ru")}</span>
                              </div>
                              <div className="h-2 bg-[#0f1923] rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-700`}
                                  style={{ width: `${Math.round((streams / maxVal) * 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    {stats.map((s) => (
                      <div key={s.id} className="bg-[#1a2636] border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{s.track_title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-[#0f1923] text-slate-300 px-2 py-0.5 rounded-full">{s.platform}</span>
                            {s.period && <span className="text-slate-500 text-xs">{s.period}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-white">{Number(s.streams).toLocaleString("ru")}</p>
                          <p className="text-slate-500 text-xs">прослушиваний</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===== ROYALTIES ===== */}
          {tab === "royalties" && (
            <div className="space-y-4">
              {royalties.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <Icon name="DollarSign" size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Роялти пока не начислены</p>
                  <p className="text-sm mt-1 text-slate-600">Лейбл добавит данные после выхода релизов</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-[#1a2636] border border-white/5 rounded-xl p-5 text-center sm:col-span-1">
                      <p className="text-slate-500 text-sm mb-1">Всего начислено</p>
                      <p className="text-3xl font-bold text-green-400">{royaltiesTotal.toLocaleString("ru", { minimumFractionDigits: 2 })} ₽</p>
                    </div>
                    <div className="bg-[#1a2636] border border-white/5 rounded-xl p-5 text-center">
                      <p className="text-slate-500 text-sm mb-1">Записей</p>
                      <p className="text-3xl font-bold text-white">{royalties.length}</p>
                    </div>
                    <div className="bg-[#1a2636] border border-white/5 rounded-xl p-5 text-center">
                      <p className="text-slate-500 text-sm mb-1">Платформ</p>
                      <p className="text-3xl font-bold text-white">{new Set(royalties.map(r => r.platform)).size}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {royalties.map((r) => (
                      <div key={r.id} className="bg-[#1a2636] border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{r.track_title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs bg-[#0f1923] text-slate-300 px-2 py-0.5 rounded-full">{r.platform}</span>
                            <span className="text-slate-500 text-xs">{r.period}</span>
                          </div>
                          {r.notes && <p className="text-slate-500 text-xs mt-1">{r.notes}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-green-400">+{Number(r.amount).toLocaleString("ru", { minimumFractionDigits: 2 })}</p>
                          <p className="text-slate-500 text-xs">{r.currency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===== CHAT ===== */}
          {tab === "chat" && (
            <div className="max-w-2xl">
              <div className="bg-[#1a2636] border border-white/5 rounded-2xl flex flex-col h-[540px]">
                <div className="p-4 border-b border-white/10">
                  <p className="font-semibold">Поддержка</p>
                  <p className="text-slate-500 text-xs mt-0.5">Чат с командой лейбла</p>
                </div>
                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-slate-500 text-center py-8">Напиши первое сообщение команде лейбла</p>
                  )}
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_role === "artist" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${m.sender_role === "artist" ? "bg-[#f5a623] text-black" : "bg-[#0f1923] text-white border border-white/5"}`}>
                        {m.sender_role === "admin" && <p className="text-xs text-slate-500 mb-1 font-medium">Лейбл</p>}
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
                    className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={sending || !msgText.trim()}
                    className="bg-[#f5a623] text-black hover:bg-[#f5a623]/90 shrink-0"
                  >
                    <Icon name="Send" size={16} />
                  </Button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}