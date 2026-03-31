import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import AudioWavePlayer from "@/components/AudioWavePlayer";
import NewReleaseForm from "@/components/cabinet/NewReleaseForm";
import SunoGenerator from "@/components/cabinet/SunoGenerator";
import DistributionForm, { STATUS_LABELS as DIST_STATUS_LABELS, STATUS_COLORS as DIST_STATUS_COLORS } from "@/components/cabinet/DistributionForm";
import ShotsPanel from "@/components/cabinet/ShotsPanel";

type Tab = "overview" | "tracks" | "releases" | "contracts" | "stats" | "royalties" | "chat" | "distribution" | "documents" | "ai-music" | "shots";

interface Stat { id: number; platform: string; track_title: string; streams: number; period: string; notes: string; created_at: string; }
interface Release { id: number; title: string; artist_name: string; upc: string | null; cover_url: string | null; status: string; genre: string | null; release_date: string | null; notes: string | null; label?: string; type?: string; }
interface DistRequest { id: number; release_id: number | null; platforms: string; message: string; lyrics: string | null; copyright: string | null; status: string; created_at: string; }
interface Royalty { id: number; period: string; platform: string; track_title: string; amount: string; currency: string; notes: string | null; created_at: string; }
interface TrackItem { id: number; title: string; file_name: string; notes: string; status: string; file_url?: string; }
interface Document { id: number; title: string; description: string; file_url: string; file_name: string; file_size: number; created_at: string; uploader: string; }
interface ContractItem { id: number; title: string; type: string; status: string; amount: number; currency: string; notes: string; created_at: string; }
interface MessageItem { id: number; text: string; sender_role: string; created_at: string; }

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Загружен", in_review: "На рассмотрении", approved: "Одобрен", rejected: "Отклонён", deleted: "Удалён",
  pending: "Ожидает", signed: "Подписан", cancelled: "Отменён", unpaid: "Не оплачен", paid: "Оплачен",
  moderation: "На модерации", ready: "Готов к выпуску", published: "Опубликован",
  new: "Новая заявка", processing: "В обработке", done: "Выполнена",
};

const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-white/10 text-slate-200", in_review: "bg-blue-500/20 text-blue-300",
  approved: "bg-emerald-500/20 text-emerald-300", rejected: "bg-red-500/20 text-red-300", deleted: "bg-red-900/40 text-red-400",
  pending: "bg-amber-500/20 text-amber-300", signed: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-red-500/20 text-red-300", unpaid: "bg-orange-500/20 text-orange-300", paid: "bg-emerald-500/20 text-emerald-300",
  moderation: "bg-amber-500/20 text-amber-300", ready: "bg-blue-500/20 text-blue-300", published: "bg-emerald-500/20 text-emerald-300",
  new: "bg-white/10 text-slate-200", processing: "bg-blue-500/20 text-blue-300", done: "bg-emerald-500/20 text-emerald-300",
};

const RELEASE_FILTERS = ["Все", "Черновики", "Выпущенные", "Удалённые"];

const NAV_SECTIONS = [
  {
    label: "ОСНОВНОЕ",
    items: [
      { id: "overview", label: "Обзор", icon: "LayoutDashboard" },
      { id: "releases", label: "Мои релизы", icon: "Disc3" },
      { id: "distribution", label: "Загрузить релиз", icon: "Upload" },
    ],
  },
  {
    label: "СТАТИСТИКА",
    items: [
      { id: "stats", label: "Аналитика", icon: "BarChart2" },
      { id: "royalties", label: "Финансы", icon: "DollarSign" },
    ],
  },
  {
    label: "ИНСТРУМЕНТЫ",
    items: [
      { id: "tracks", label: "Треки", icon: "Music2" },
      { id: "ai-music", label: "AI Музыка", icon: "Sparkles" },
      { id: "shots", label: "Видеошоты", icon: "Video" },
      { id: "documents", label: "Документы", icon: "FolderOpen" },
      { id: "contracts", label: "Договоры", icon: "FileText" },
    ],
  },
  {
    label: "АККАУНТ",
    items: [
      { id: "chat", label: "Поддержка", icon: "MessageCircle" },
    ],
  },
];

// Musical note decoration component
function MusicNotesBg() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-[0.03]">
      {["♩","♪","♫","♬","𝄞","𝄢"].map((note, i) => (
        <span
          key={i}
          className="absolute text-white select-none"
          style={{
            fontSize: `${60 + i * 20}px`,
            top: `${10 + i * 15}%`,
            left: `${5 + i * 16}%`,
            transform: `rotate(${-20 + i * 10}deg)`,
          }}
        >
          {note}
        </span>
      ))}
    </div>
  );
}

export default function Cabinet() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [distRequests, setDistRequests] = useState<DistRequest[]>([]);
  const [royalties, setRoyalties] = useState<Royalty[]>([]);
  const [royaltiesTotal, setRoyaltiesTotal] = useState(0);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [msgText, setMsgText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [sending, setSending] = useState(false);

  // AI chat
  type AiMsg = { role: "user" | "assistant" | "system"; content: string };
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMode, setChatMode] = useState<"ai" | "human">("ai");
  const aiChatRef = useRef<HTMLDivElement>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [changePwValue, setChangePwValue] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [changePwMsg, setChangePwMsg] = useState("");
  const [showChangePw, setShowChangePw] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showProfileMenu) return;
    const handler = (e: MouseEvent) => {
      if (!profileMenuRef.current?.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProfileMenu]);
  const [releaseFilter, setReleaseFilter] = useState("Все");
  const [releaseSearch, setReleaseSearch] = useState("");
  const [releaseView, setReleaseView] = useState<"table" | "grid">("table");
  const [coverStyle, setCoverStyle] = useState("");
  const [generatingCover, setGeneratingCover] = useState(false);
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState<string | null>(null);
  const [coverGenError, setCoverGenError] = useState("");
  const [showNewRelease, setShowNewRelease] = useState(false);
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
    api.documents.list().then((r) => setDocuments(r.documents || []));
  }, [user]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (aiChatRef.current) aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
  }, [aiMessages, aiLoading]);

  const handleAiSend = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    const userMsg: AiMsg = { role: "user", content: text };
    const newHistory = [...aiMessages, userMsg];
    setAiMessages(newHistory);
    setAiInput("");
    setAiLoading(true);
    const res = await api.aiChat.ask(text, aiMessages);
    setAiLoading(false);
    if (res.reply) {
      setAiMessages([...newHistory, { role: "assistant", content: res.reply }]);
      if (res.needs_human) setChatMode("human");
    } else {
      setAiMessages([...newHistory, { role: "assistant", content: "Произошла ошибка. Попробуй ещё раз или напиши менеджеру." }]);
    }
  };

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
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="text-4xl animate-pulse">♪</div>
        <div className="text-white/40 text-sm">Загрузка...</div>
      </div>
    </div>
  );

  const initials = (user.artist_name || "A").slice(0, 1).toUpperCase();
  const currentTabLabel = NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === tab)?.label || "Кабинет";

  const goTab = (id: string) => { setTab(id as Tab); setSidebarOpen(false); };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex relative">
      <MusicNotesBg />

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===== SIDEBAR ===== */}
      <aside className={`fixed lg:static top-0 left-0 h-full w-64 bg-[#0d1220] border-r border-white/[0.06] z-40 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.06]">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#f5a623] rounded-lg flex items-center justify-center text-black font-bold text-sm">♪</div>
            <span className="font-bold text-white text-sm tracking-tight">Калашников <span className="text-[#f5a623]">Саунд</span></span>
          </a>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/40 hover:text-white">
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-3">
              <p className="text-[10px] font-semibold text-white/30 tracking-widest px-3 mb-1 mt-2">{section.label}</p>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => goTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    tab === item.id
                      ? "bg-[#f5a623]/10 text-[#f5a623]"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                  {item.id === "chat" && messages.filter(m => m.sender_role === "admin").length > 0 && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-[#f5a623]" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom user area */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f5a623] to-[#e8952a] flex items-center justify-center text-black font-bold text-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="text-sm font-semibold text-white truncate">{user.artist_name}</p>
                {user.is_verified && (
                  <span title="Верифицированный артист" className="flex items-center justify-center w-4 h-4 rounded-full bg-[#1DA1F2] shrink-0">
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                )}
              </div>
              <p className="text-xs text-white/30 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="text-white/30 hover:text-white transition-colors shrink-0"
              title="Выйти"
            >
              <Icon name="LogOut" size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top header */}
        <header className="bg-[#0a0e1a]/80 backdrop-blur-md border-b border-white/[0.06] px-5 lg:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white/50 hover:text-white p-1">
              <Icon name="Menu" size={20} />
            </button>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/30 hidden sm:block">Кабинет</span>
              <span className="text-white/20 hidden sm:block">/</span>
              <span className="font-semibold text-white">{currentTabLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Upload release CTA */}
            <Button
              onClick={() => goTab("distribution")}
              className="bg-[#f5a623] hover:bg-[#e8952a] text-black font-bold px-4 h-8 text-sm rounded-lg hidden sm:flex items-center gap-2"
            >
              <Icon name="Upload" size={14} />
              Загрузить релиз
            </Button>

            {/* Settings */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f5a623] to-[#e8952a] flex items-center justify-center text-black font-bold text-xs">
                  {initials}
                </div>
                <div className="hidden sm:flex items-center gap-1">
                  <span className="text-sm font-medium">{user.artist_name}</span>
                  {user.is_verified && (
                    <span title="Верифицированный артист" className="flex items-center justify-center w-4 h-4 rounded-full bg-[#1DA1F2] shrink-0">
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  )}
                </div>
                <Icon name="ChevronDown" size={14} className="text-white/40" />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-[#131929] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.06]">
                      <p className="text-sm font-semibold text-white">{user.artist_name}</p>
                      <p className="text-xs text-white/40">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setShowChangePw(v => !v); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <Icon name="Key" size={14} />
                      Сменить пароль
                    </button>
                    <button
                      onClick={() => { logout(); navigate("/login"); }}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <Icon name="LogOut" size={14} />
                      Выйти
                    </button>
                  </div>
              )}
            </div>
          </div>
        </header>

        {/* Change password bar */}
        {showChangePw && (
          <div className="bg-[#131929] border-b border-white/[0.06] px-5 lg:px-8 py-3">
            <div className="flex items-center gap-3 max-w-lg">
              <Input
                type="password"
                value={changePwValue}
                onChange={(e) => { setChangePwValue(e.target.value); setChangePwMsg(""); }}
                placeholder="Новый пароль (минимум 6 символов)"
                className="bg-[#0a0e1a] border-white/10 text-white placeholder:text-white/30 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
              />
              <Button
                onClick={handleChangePassword}
                disabled={changingPw || changePwValue.length < 6}
                size="sm"
                className="bg-[#f5a623] text-black hover:bg-[#e8952a] shrink-0 font-semibold"
              >
                {changingPw ? "..." : "Изменить"}
              </Button>
              <button onClick={() => { setShowChangePw(false); setChangePwMsg(""); setChangePwValue(""); }} className="text-white/30 hover:text-white shrink-0">
                <Icon name="X" size={16} />
              </button>
              {changePwMsg && <p className={`text-xs shrink-0 ${changePwMsg.includes("успешно") ? "text-emerald-400" : "text-red-400"}`}>{changePwMsg}</p>}
            </div>
          </div>
        )}

        {/* ===== CONTENT ===== */}
        <main className="flex-1 px-5 lg:px-8 py-6">

          {/* ===== OVERVIEW ===== */}
          {tab === "overview" && (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold">Личный <span className="text-[#f5a623]">кабинет</span></h1>
                <p className="text-white/40 text-sm mt-1">Добро пожаловать, {user.artist_name}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {/* Analytics card */}
                <div className="bg-[#131929] border border-white/[0.06] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold tracking-widest text-white/30">АНАЛИТИКА</p>
                    <button onClick={() => goTab("stats")} className="text-xs text-[#f5a623] hover:underline font-medium">Открыть аналитику</button>
                  </div>
                  {stats.length === 0 ? (
                    <>
                      <h2 className="text-3xl font-black text-white leading-tight mb-2">Аналитика<br/>пока не<br/>подключена</h2>
                      <p className="text-white/30 text-sm">После загрузки и публикации первого релиза здесь появятся прослушивания и площадки.</p>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-4xl font-black">{stats.reduce((a, s) => a + Number(s.streams), 0).toLocaleString("ru")}</p>
                      <p className="text-white/40 text-sm">прослушиваний всего</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3 mt-5">
                    {[
                      { label: "РЕЛИЗЫ", value: releases.length },
                      { label: "ОПУБЛИКОВАНО", value: releases.filter(r => r.status === "published" || r.status === "approved").length },
                      { label: "НА ПРОВЕРКЕ", value: releases.filter(r => r.status === "in_review" || r.status === "moderation").length },
                    ].map((s) => (
                      <div key={s.label} className="bg-[#0a0e1a] rounded-xl p-3">
                        <p className="text-[10px] text-white/25 font-semibold tracking-wider mb-1">{s.label}</p>
                        <p className="text-xl font-bold">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent releases */}
                <div className="bg-[#131929] border border-white/[0.06] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold tracking-widest text-white/30">ПОСЛЕДНИЕ РЕЛИЗЫ</p>
                    <button onClick={() => goTab("releases")} className="text-xs text-[#f5a623] hover:underline font-medium">Все релизы</button>
                  </div>
                  {releases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="text-5xl mb-3 opacity-20">♪</div>
                      <p className="text-white/40 text-sm">Здесь будут твои релизы</p>
                      <p className="text-white/20 text-xs mt-1">Загрузи первый релиз в кабинет</p>
                      <Button
                        onClick={() => goTab("distribution")}
                        className="mt-4 bg-[#f5a623] text-black hover:bg-[#e8952a] font-bold text-sm h-9 px-5 rounded-xl"
                      >
                        Загрузить первый релиз
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {releases.slice(0, 4).map((rel) => (
                        <div key={rel.id} className="flex items-center gap-3">
                          {rel.cover_url ? (
                            <img src={rel.cover_url} alt={rel.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#0a0e1a] flex items-center justify-center shrink-0 text-white/20">♪</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{rel.title}</p>
                            <p className="text-xs text-white/40 truncate">{rel.artist_name}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[rel.status] || "bg-white/10 text-white/60"}`}>
                            {STATUS_LABELS[rel.status] || rel.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div>
                <p className="text-xs font-semibold tracking-widest text-white/30 mb-3">БЫСТРЫЕ ДЕЙСТВИЯ</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Загрузить релиз", icon: "Upload", tab: "distribution" },
                    { label: "AI Музыка", icon: "Sparkles", tab: "ai-music" },
                    { label: "Аналитика", icon: "BarChart2", tab: "stats" },
                    { label: "Поддержка", icon: "MessageCircle", tab: "chat" },
                  ].map((a) => (
                    <button
                      key={a.tab}
                      onClick={() => goTab(a.tab)}
                      className="bg-[#131929] hover:bg-[#1a2438] border border-white/[0.06] hover:border-white/10 rounded-xl p-4 flex flex-col items-start gap-3 transition-all text-left group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#f5a623]/10 flex items-center justify-center group-hover:bg-[#f5a623]/20 transition-colors">
                        <Icon name={a.icon} size={18} className="text-[#f5a623]" />
                      </div>
                      <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== RELEASES (Мои релизы) ===== */}
          {tab === "releases" && (
            <div>
              {showNewRelease ? (
                <NewReleaseForm
                  userArtistName={user?.artist_name}
                  onCancel={() => setShowNewRelease(false)}
                  onCreated={(release) => {
                    setReleases((prev) => [release, ...prev]);
                    setShowNewRelease(false);
                  }}
                />
              ) : (
              <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Мои <span className="text-[#f5a623]">релизы</span></h2>
                  <p className="text-white/30 text-sm mt-0.5">Все твои загрузки и их статусы</p>
                </div>
                <Button
                  onClick={() => setShowNewRelease(true)}
                  className="bg-[#f5a623] text-black hover:bg-[#e8952a] font-bold h-9 px-4 rounded-xl"
                >
                  <Icon name="Plus" size={15} className="mr-1.5" />
                  Новый релиз
                </Button>
              </div>

              {/* Search + filters */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    value={releaseSearch}
                    onChange={(e) => setReleaseSearch(e.target.value)}
                    placeholder="Поиск по названию или артисту..."
                    className="w-full bg-[#131929] border border-white/[0.06] text-white placeholder:text-white/25 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {RELEASE_FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setReleaseFilter(f)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        releaseFilter === f
                          ? "bg-[#f5a623] text-black"
                          : "bg-[#131929] text-white/50 hover:text-white border border-white/[0.06]"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-white/30 ml-auto">
                  <button onClick={() => setReleaseView("table")} className={`p-2 rounded-lg transition-colors ${releaseView === "table" ? "text-white bg-white/10" : "hover:text-white"}`}>
                    <Icon name="LayoutList" size={16} />
                  </button>
                  <button onClick={() => setReleaseView("grid")} className={`p-2 rounded-lg transition-colors ${releaseView === "grid" ? "text-white bg-white/10" : "hover:text-white"}`}>
                    <Icon name="LayoutGrid" size={16} />
                  </button>
                </div>
              </div>

              {filteredReleases.length === 0 ? (
                <div className="text-center py-24 text-white/25">
                  <div className="text-6xl mb-4">♪</div>
                  <p className="text-base font-medium">Релизов пока нет</p>
                  <p className="text-sm mt-1 text-white/15">Загрузи свой первый трек!</p>
                </div>
              ) : releaseView === "table" ? (
                <div className="bg-[#131929] rounded-2xl overflow-hidden border border-white/[0.06]">
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/[0.06]">
                    <div className="col-span-5 text-[10px] text-white/25 uppercase tracking-widest font-semibold">Название</div>
                    <div className="col-span-3 text-[10px] text-white/25 uppercase tracking-widest font-semibold hidden md:block">Жанр / Лейбл</div>
                    <div className="col-span-2 text-[10px] text-white/25 uppercase tracking-widest font-semibold hidden sm:block">Дата</div>
                    <div className="col-span-2 text-[10px] text-white/25 uppercase tracking-widest font-semibold">Статус</div>
                  </div>
                  {filteredReleases.map((rel) => (
                    <div key={rel.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors items-center last:border-0">
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        {rel.cover_url ? (
                          <img src={rel.cover_url} alt={rel.title} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-[#0a0e1a] flex items-center justify-center shrink-0 text-white/20 text-lg">♪</div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{rel.title}</p>
                          <p className="text-white/40 text-xs truncate">{rel.artist_name}</p>
                        </div>
                        {rel.upc && (
                          <button onClick={() => navigator.clipboard.writeText(rel.upc || "")} className="ml-1 p-1 text-white/20 hover:text-white/60 shrink-0 hidden sm:block" title="Копировать UPC">
                            <Icon name="Copy" size={11} />
                          </button>
                        )}
                      </div>
                      <div className="col-span-3 hidden md:block min-w-0">
                        <p className="text-sm text-white/60 truncate">{rel.genre || "—"}</p>
                        <p className="text-xs text-white/30 truncate">{rel.label || "—"}</p>
                      </div>
                      <div className="col-span-2 text-sm text-white/40 hidden sm:block">{rel.release_date || "—"}</div>
                      <div className="col-span-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[rel.status] || "bg-white/10 text-white/50"}`}>
                          {STATUS_LABELS[rel.status] || rel.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredReleases.map((rel) => (
                    <div key={rel.id} className="bg-[#131929] rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/10 transition-colors">
                      {rel.cover_url ? (
                        <img src={rel.cover_url} alt={rel.title} className="w-full aspect-square object-cover" />
                      ) : (
                        <div className="w-full aspect-square bg-[#0a0e1a] flex items-center justify-center text-5xl text-white/10">♪</div>
                      )}
                      <div className="p-3">
                        <p className="font-semibold text-sm truncate">{rel.title}</p>
                        <p className="text-white/40 text-xs truncate mt-0.5">{rel.artist_name}</p>
                        <div className="mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[rel.status] || "bg-white/10 text-white/50"}`}>
                            {STATUS_LABELS[rel.status] || rel.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </>
              )}
            </div>
          )}

          {/* ===== TRACKS ===== */}
          {tab === "tracks" && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold">Треки</h2>
                <p className="text-white/30 text-sm mt-0.5">Загружай аудиофайлы для лейбла</p>
              </div>

              <div className="bg-[#131929] border border-white/[0.06] rounded-2xl p-6 mb-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-white/60 block mb-1.5">Название трека</label>
                  <Input
                    value={trackTitle}
                    onChange={(e) => setTrackTitle(e.target.value)}
                    placeholder="Введи название трека"
                    className="bg-[#0a0e1a] border-white/[0.06] text-white placeholder:text-white/20"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white/60 block mb-2">Стиль обложки (необязательно)</label>
                  <div className="flex gap-2">
                    <Input
                      value={coverStyle}
                      onChange={(e) => setCoverStyle(e.target.value)}
                      placeholder="Например: тёмный, неоновый, атмосферный"
                      className="bg-[#0a0e1a] border-white/[0.06] text-white placeholder:text-white/20"
                    />
                    <Button
                      onClick={async () => {
                        if (!coverStyle.trim() || !trackTitle.trim()) return;
                        setGeneratingCover(true);
                        setCoverGenError("");
                        try {
                          const res = await api.tracks.generateCover({ style: coverStyle, title: trackTitle });
                          if (res.cover_url) setGeneratedCoverUrl(res.cover_url);
                          else setCoverGenError("Не удалось сгенерировать обложку");
                        } catch { setCoverGenError("Ошибка генерации"); }
                        setGeneratingCover(false);
                      }}
                      disabled={generatingCover || !coverStyle.trim() || !trackTitle.trim()}
                      className="bg-[#f5a623] text-black hover:bg-[#e8952a] font-semibold shrink-0"
                    >
                      {generatingCover ? "..." : "Создать"}
                    </Button>
                  </div>
                  {coverGenError && <p className="text-red-400 text-xs mt-1">{coverGenError}</p>}
                  {generatedCoverUrl && (
                    <div className="flex items-center gap-3 mt-3">
                      <img src={generatedCoverUrl} alt="Обложка" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                      <a href={generatedCoverUrl} download="cover.jpg" target="_blank" rel="noopener noreferrer" className="text-xs text-[#f5a623] hover:underline flex items-center gap-1">
                        <Icon name="Download" size={12} />Скачать
                      </a>
                      <button onClick={() => { setGeneratedCoverUrl(null); setCoverGenError(""); }} className="text-xs text-white/30 hover:text-white">Сбросить</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-white/60 block mb-1.5">Аудиофайл</label>
                  <input ref={fileRef} type="file" accept="audio/*" onChange={handleFileSelect} className="text-white/40 text-sm" />
                </div>
                {audioPreviewUrl && (
                  <div className="bg-[#0a0e1a] border border-white/[0.06] rounded-xl p-4">
                    <p className="text-white/30 text-xs mb-2">Предпрослушивание:</p>
                    <AudioWavePlayer src={audioPreviewUrl} fileName={selectedFileName} />
                  </div>
                )}
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !trackTitle.trim()}
                  className="w-full bg-[#f5a623] text-black hover:bg-[#e8952a] font-bold"
                >
                  {uploading ? "Загружаю..." : "Загрузить трек"}
                </Button>
              </div>

              <div className="space-y-2">
                {tracks.length === 0 && (
                  <div className="text-center py-12 text-white/25">
                    <div className="text-4xl mb-3">♫</div>
                    <p>Треки ещё не загружены</p>
                  </div>
                )}
                {tracks.map((track) => (
                  <div key={track.id} className="bg-[#131929] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{track.title}</p>
                      <p className="text-white/30 text-xs mt-0.5">{track.file_name}</p>
                      {track.notes && <p className="text-white/50 text-sm mt-1">{track.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[track.status] || "bg-white/10 text-white/60"}`}>
                        {STATUS_LABELS[track.status] || track.status}
                      </span>
                      {track.file_url && (
                        <a href={track.file_url} target="_blank" rel="noopener noreferrer">
                          <Icon name="Download" size={16} className="text-white/30 hover:text-white" />
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
            <div className="max-w-2xl space-y-5">
              <div className="mb-6">
                <h2 className="text-xl font-bold">Загрузить <span className="text-[#f5a623]">релиз</span></h2>
                <p className="text-white/30 text-sm mt-0.5">Выберите платформы и укажите детали</p>
              </div>
              <div className="bg-[#131929] border border-white/[0.06] rounded-2xl p-6">
                <DistributionForm
                  releases={releases}
                  onSubmitted={(req) => setDistRequests((prev) => [req, ...prev])}
                />
              </div>
              {distRequests.length > 0 && (
                <div>
                  <p className="text-xs font-semibold tracking-widest text-white/30 mb-3">МОИ ЗАЯВКИ</p>
                  <div className="space-y-2">
                    {distRequests.map((req) => (
                      <div key={req.id} className="bg-[#131929] border border-white/[0.06] rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium">{req.platforms}</p>
                          <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 font-medium ${DIST_STATUS_COLORS[req.status] || "bg-white/10 text-white/60"}`}>
                            {DIST_STATUS_LABELS[req.status] || req.status}
                          </span>
                        </div>
                        {req.message && <p className="text-white/40 text-xs">{req.message}</p>}
                        <p className="text-white/20 text-xs mt-1">{new Date(req.created_at).toLocaleDateString("ru")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== CONTRACTS ===== */}
          {tab === "contracts" && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold">Договоры</h2>
                <p className="text-white/30 text-sm mt-0.5">Твои контракты с лейблом</p>
              </div>
              <div className="space-y-3">
                {contracts.length === 0 ? (
                  <div className="text-center py-24 text-white/25">
                    <Icon name="FileText" size={40} className="mx-auto mb-4 opacity-30" />
                    <p>Договоров пока нет</p>
                  </div>
                ) : contracts.map((c) => (
                  <div key={c.id} className="bg-[#131929] border border-white/[0.06] rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold">{c.title}</p>
                        <p className="text-white/30 text-xs mt-0.5">{c.type}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 font-medium ${STATUS_COLORS[c.status] || "bg-white/10 text-white/60"}`}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </div>
                    {c.notes && <p className="text-white/40 text-sm mb-3">{c.notes}</p>}
                    {c.amount > 0 && (
                      <div className="flex items-center justify-between">
                        <p className="text-white/40 text-sm">К оплате: <span className="text-white font-semibold">{Number(c.amount).toLocaleString("ru")} {c.currency}</span></p>
                        {c.status === "unpaid" && (
                          <Button size="sm" onClick={() => handlePay(c.id)} disabled={payingId === c.id} className="bg-[#f5a623] text-black hover:bg-[#e8952a] font-semibold">
                            {payingId === c.id ? "..." : "Оплатить"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== STATS ===== */}
          {tab === "stats" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold">Аналитика</h2>
                <p className="text-white/30 text-sm mt-0.5">Статистика релизов по платформам</p>
              </div>
              {stats.length === 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-[#131929] border border-white/[0.06] rounded-2xl p-8">
                    <p className="text-xs font-semibold tracking-widest text-white/25 mb-4">СВОДКА</p>
                    <h2 className="text-4xl font-black leading-tight mb-3">Данные<br/>появятся<br/>после<br/>импорта</h2>
                    <p className="text-white/30 text-sm">Когда статистика подгрузится, здесь появятся реальные графики, площадки и краткая сводка по релизам.</p>
                    <div className="flex gap-4 mt-5 text-xs text-white/25 font-medium">
                      <span>Все релизы</span>
                      <span>0 площадок</span>
                      <span>30 дней</span>
                    </div>
                  </div>
                  <div className="bg-[#131929] border border-white/[0.06] rounded-2xl p-8">
                    <p className="text-xs font-semibold tracking-widest text-white/25 mb-4">РЕЛИЗ</p>
                    <div className="space-y-4">
                      <select className="w-full bg-[#0a0e1a] border border-white/[0.06] text-white/40 rounded-xl px-4 py-2.5 text-sm outline-none">
                        <option>— Все релизы —</option>
                      </select>
                      <div className="flex gap-2">
                        {["7 дней","30 дней","90 дней","Год"].map(p => (
                          <button key={p} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${p === "30 дней" ? "bg-[#f5a623] text-black" : "bg-white/5 text-white/40"}`}>{p}</button>
                        ))}
                      </div>
                      <div>
                        <p className="text-white/25 text-xs mb-1">Главная площадка</p>
                        <p className="text-3xl font-bold">0</p>
                        <p className="text-white/25 text-xs mt-1">За 30 дней пока нет лидирующей площадки</p>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-2 bg-[#131929] border border-white/[0.06] rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                    <Icon name="BarChart2" size={40} className="text-white/10 mb-3" />
                    <p className="font-semibold text-white/40">Статистика появится после выхода релиза на платформах</p>
                    <p className="text-sm text-white/20 mt-1">Выберите релиз — данные обновляются ежедневно.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Всего стримов", value: stats.reduce((a, s) => a + Number(s.streams), 0).toLocaleString("ru") },
                      { label: "Треков", value: new Set(stats.map(s => s.track_title)).size },
                      { label: "Платформ", value: new Set(stats.map(s => s.platform)).size },
                      { label: "Периодов", value: new Set(stats.map(s => s.period)).size },
                    ].map((s) => (
                      <div key={s.label} className="bg-[#131929] border border-white/[0.06] rounded-xl p-5">
                        <p className="text-white/30 text-sm mb-1">{s.label}</p>
                        <p className="text-2xl font-bold">{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-[#131929] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-5 gap-4 px-6 py-3 border-b border-white/[0.06]">
                      {["Платформа","Трек","Период","Стримы","Заметки"].map(h => (
                        <div key={h} className="text-[10px] text-white/25 uppercase tracking-widest font-semibold">{h}</div>
                      ))}
                    </div>
                    {stats.map((s) => (
                      <div key={s.id} className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <div className="text-sm font-medium">{s.platform}</div>
                        <div className="text-sm text-white/60 truncate">{s.track_title}</div>
                        <div className="text-sm text-white/40">{s.period}</div>
                        <div className="text-sm font-semibold text-[#f5a623]">{Number(s.streams).toLocaleString("ru")}</div>
                        <div className="text-xs text-white/30 truncate">{s.notes || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== ROYALTIES ===== */}
          {tab === "royalties" && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold">Финансы</h2>
                <p className="text-white/30 text-sm mt-0.5">Роялти и выплаты</p>
              </div>
              {royalties.length === 0 ? (
                <div className="text-center py-24 text-white/25">
                  <Icon name="DollarSign" size={40} className="mx-auto mb-4 opacity-30" />
                  <p>Выплат пока нет</p>
                  <p className="text-sm mt-1 text-white/15">Данные появятся после публикации релизов</p>
                </div>
              ) : (
                <>
                  <div className="bg-[#131929] border border-white/[0.06] rounded-xl p-5 mb-5">
                    <p className="text-white/30 text-sm mb-1">Итого начислено</p>
                    <p className="text-3xl font-bold text-[#f5a623]">{Number(royaltiesTotal).toLocaleString("ru")} ₽</p>
                  </div>
                  <div className="space-y-2">
                    {royalties.map((r) => (
                      <div key={r.id} className="bg-[#131929] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{r.track_title}</p>
                          <p className="text-white/30 text-xs mt-0.5">{r.platform} · {r.period}</p>
                          {r.notes && <p className="text-white/40 text-xs mt-1">{r.notes}</p>}
                        </div>
                        <p className="text-[#f5a623] font-bold shrink-0 ml-4">{Number(r.amount).toLocaleString("ru")} {r.currency}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===== DOCUMENTS ===== */}
          {tab === "documents" && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold">Документы</h2>
                <p className="text-white/30 text-sm mt-0.5">Файлы от лейбла</p>
              </div>
              {documents.length === 0 ? (
                <div className="text-center py-24 text-white/25">
                  <Icon name="FolderOpen" size={40} className="mx-auto mb-4 opacity-30" />
                  <p>Документов пока нет</p>
                </div>
              ) : documents.map((doc) => (
                <div key={doc.id} className="bg-[#131929] border border-white/[0.06] rounded-xl p-4 mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{doc.title}</p>
                    {doc.description && <p className="text-white/40 text-xs mt-0.5 truncate">{doc.description}</p>}
                    <p className="text-white/20 text-xs mt-1">{doc.file_name} · {(doc.file_size / 1024).toFixed(1)} КБ</p>
                  </div>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={doc.file_name}
                    className="shrink-0 flex items-center gap-2 bg-[#f5a623] text-black hover:bg-[#e8952a] text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <Icon name="Download" size={14} />
                    Скачать
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* ===== AI MUSIC ===== */}
          {tab === "ai-music" && <SunoGenerator />}

          {/* ===== SHOTS ===== */}
          {tab === "shots" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold">Видеошоты</h2>
                <p className="text-white/30 text-sm mt-0.5">Управляй своими видео и смотри статистику</p>
              </div>
              <ShotsPanel />
            </div>
          )}

          {/* ===== CHAT ===== */}
          {tab === "chat" && (
            <div className="max-w-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Поддержка</h2>
                  <p className="text-white/30 text-sm mt-0.5">
                    {chatMode === "ai" ? "AI-ассистент лейбла" : "Чат с командой лейбла"}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-[#131929] border border-white/[0.06] rounded-xl p-1">
                  <button
                    onClick={() => setChatMode("ai")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${chatMode === "ai" ? "bg-[#f5a623] text-black" : "text-white/40 hover:text-white"}`}
                  >
                    AI-агент
                  </button>
                  <button
                    onClick={() => setChatMode("human")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${chatMode === "human" ? "bg-[#f5a623] text-black" : "text-white/40 hover:text-white"}`}
                  >
                    Менеджер
                  </button>
                </div>
              </div>

              {/* AI Chat */}
              {chatMode === "ai" && (
                <div className="bg-[#131929] border border-white/[0.06] rounded-2xl flex flex-col h-[540px]">
                  <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#f5a623]/20 flex items-center justify-center">
                      <Icon name="Sparkles" size={14} className="text-[#f5a623]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">AI-ассистент</p>
                      <p className="text-xs text-white/30">Отвечает мгновенно</p>
                    </div>
                    <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div ref={aiChatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {aiMessages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#f5a623]/10 flex items-center justify-center">
                          <Icon name="Sparkles" size={22} className="text-[#f5a623]" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Привет! Я AI-ассистент лейбла</p>
                          <p className="text-white/30 text-xs mt-1">Спроси про релизы, дистрибьюцию, роялти или статусы</p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mt-1">
                          {["Сколько ждать публикацию?", "Какой формат обложки?", "Где мои роялти?"].map(q => (
                            <button
                              key={q}
                              onClick={() => { setAiInput(q); }}
                              className="text-xs bg-white/5 hover:bg-white/10 border border-white/[0.06] rounded-full px-3 py-1.5 text-white/50 hover:text-white transition-all"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {aiMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        {m.role === "assistant" && (
                          <div className="w-6 h-6 rounded-full bg-[#f5a623]/20 flex items-center justify-center shrink-0 mr-2 mt-1">
                            <Icon name="Sparkles" size={11} className="text-[#f5a623]" />
                          </div>
                        )}
                        <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === "user" ? "bg-[#f5a623] text-black font-medium" : "bg-[#0a0e1a] text-white border border-white/[0.06]"}`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex justify-start">
                        <div className="w-6 h-6 rounded-full bg-[#f5a623]/20 flex items-center justify-center shrink-0 mr-2 mt-1">
                          <Icon name="Sparkles" size={11} className="text-[#f5a623]" />
                        </div>
                        <div className="bg-[#0a0e1a] border border-white/[0.06] rounded-2xl px-4 py-3 flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{animationDelay:"0ms"}} />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{animationDelay:"150ms"}} />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{animationDelay:"300ms"}} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t border-white/[0.06]">
                    <div className="flex gap-2">
                      <input
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAiSend()}
                        placeholder="Задай вопрос AI-ассистенту..."
                        className="flex-1 bg-[#0a0e1a] border border-white/[0.06] text-white placeholder:text-white/25 rounded-xl px-4 py-2.5 text-sm outline-none"
                      />
                      <Button
                        onClick={handleAiSend}
                        disabled={aiLoading || !aiInput.trim()}
                        className="bg-[#f5a623] text-black hover:bg-[#e8952a] shrink-0"
                      >
                        <Icon name="Send" size={16} />
                      </Button>
                    </div>
                    <button
                      onClick={() => setChatMode("human")}
                      className="mt-2 text-xs text-white/25 hover:text-white/50 transition-colors w-full text-center"
                    >
                      Нужна помощь живого менеджера →
                    </button>
                  </div>
                </div>
              )}

              {/* Human Chat */}
              {chatMode === "human" && (
                <div className="bg-[#131929] border border-white/[0.06] rounded-2xl flex flex-col h-[540px]">
                  <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                      <Icon name="Users" size={14} className="text-white/60" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Команда лейбла</p>
                      <p className="text-xs text-white/30">Отвечаем в рабочее время</p>
                    </div>
                  </div>
                  <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="text-4xl mb-3 opacity-20">💬</div>
                        <p className="text-white/30 text-sm">Напиши первое сообщение команде лейбла</p>
                      </div>
                    )}
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.sender_role === "artist" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${m.sender_role === "artist" ? "bg-[#f5a623] text-black font-medium" : "bg-[#0a0e1a] text-white border border-white/[0.06]"}`}>
                          {m.sender_role === "admin" && <p className="text-xs text-white/40 mb-1 font-semibold">Лейбл</p>}
                          <p>{m.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-white/[0.06] flex gap-2">
                    <Input
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder="Написать сообщение..."
                      className="bg-[#0a0e1a] border-white/[0.06] text-white placeholder:text-white/25"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={sending || !msgText.trim()}
                      className="bg-[#f5a623] text-black hover:bg-[#e8952a] shrink-0"
                    >
                      <Icon name="Send" size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}