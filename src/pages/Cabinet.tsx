import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import AudioWavePlayer from "@/components/AudioWavePlayer";

type Tab = "tracks" | "releases" | "contracts" | "stats" | "royalties" | "chat";

interface Stat { id: number; platform: string; track_title: string; streams: number; period: string; notes: string; created_at: string; }

interface Release { id: number; title: string; artist_name: string; upc: string | null; cover_url: string | null; status: string; genre: string | null; release_date: string | null; notes: string | null; }
interface DistRequest { id: number; release_id: number | null; platforms: string; message: string; lyrics: string | null; copyright: string | null; status: string; created_at: string; }
interface Royalty { id: number; period: string; platform: string; track_title: string; amount: string; currency: string; notes: string | null; created_at: string; }

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Загружен", in_review: "На рассмотрении", approved: "Одобрен", rejected: "Отклонён", deleted: "Удалён",
  pending: "Ожидает", signed: "Подписан", cancelled: "Отменён", unpaid: "Не оплачен", paid: "Оплачен",
  moderation: "На модерации", ready: "Готов к выпуску", published: "Опубликован",
  new: "Новая заявка", processing: "В обработке", done: "Выполнена",
};

const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-zinc-700 text-zinc-200", in_review: "bg-blue-500/20 text-blue-300",
  approved: "bg-green-500/20 text-green-300", rejected: "bg-red-500/20 text-red-300", deleted: "bg-red-900/40 text-red-500",
  pending: "bg-yellow-500/20 text-yellow-300", signed: "bg-green-500/20 text-green-300",
  cancelled: "bg-red-500/20 text-red-300", unpaid: "bg-orange-500/20 text-orange-300", paid: "bg-green-500/20 text-green-300",
  moderation: "bg-yellow-500/20 text-yellow-300", ready: "bg-blue-500/20 text-blue-300", published: "bg-green-500/20 text-green-300",
  new: "bg-zinc-700 text-zinc-200", processing: "bg-blue-500/20 text-blue-300", done: "bg-green-500/20 text-green-300",
};

export default function Cabinet() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("tracks");
  const [tracks, setTracks] = useState<Record<string, unknown>[]>([]);
  const [contracts, setContracts] = useState<Record<string, unknown>[]>([]);
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
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
          <button onClick={() => setShowChangePw((v) => !v)} className="text-zinc-500 hover:text-white text-xs transition-colors">
            Сменить пароль
          </button>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }} className="text-zinc-400 hover:text-white">
            Выйти
          </Button>
        </div>
      </header>

      {showChangePw && (
        <div className="border-b border-white/10 bg-zinc-950 px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <span className="text-zinc-400 text-sm shrink-0">Новый пароль:</span>
            <Input
              type="password"
              value={changePwValue}
              onChange={(e) => { setChangePwValue(e.target.value); setChangePwMsg(""); }}
              placeholder="Минимум 6 символов"
              className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm max-w-xs"
              onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
            />
            <Button onClick={handleChangePassword} disabled={changingPw || changePwValue.length < 6} size="sm" className="bg-white text-black hover:bg-zinc-200 shrink-0">
              {changingPw ? "..." : "Изменить"}
            </Button>
            <button onClick={() => { setShowChangePw(false); setChangePwMsg(""); setChangePwValue(""); }} className="text-zinc-500 hover:text-white">
              <Icon name="X" size={16} />
            </button>
            {changePwMsg && <p className={`text-xs ${changePwMsg.includes("успешно") ? "text-green-400" : "text-red-400"}`}>{changePwMsg}</p>}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-1 mb-8 bg-zinc-900 rounded-xl p-1 overflow-x-auto">
          {(["tracks", "releases", "contracts", "stats", "royalties", "chat"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === t ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
            >
              {t === "tracks" ? "Треки" : t === "releases" ? "Релизы" : t === "contracts" ? "Договоры" : t === "stats" ? "Статистика" : t === "royalties" ? "Роялти" : "Чат"}
            </button>
          ))}
        </div>

        {tab === "tracks" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Загрузить трек</h3>
              <div className="bg-zinc-800/50 border border-white/5 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Требования к файлу</p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-xs text-zinc-400"><Icon name="Music" size={12} className="text-green-400 shrink-0" /> Формат: <span className="text-white font-medium">WAV</span></li>
                  <li className="flex items-center gap-2 text-xs text-zinc-400"><Icon name="Layers" size={12} className="text-green-400 shrink-0" /> Битрейт: <span className="text-white font-medium">16 bit, 44.1 kHz</span></li>
                  <li className="flex items-center gap-2 text-xs text-zinc-400"><Icon name="Headphones" size={12} className="text-green-400 shrink-0" /> Каналы: <span className="text-white font-medium">Stereo</span></li>
                  <li className="flex items-center gap-2 text-xs text-zinc-400"><Icon name="Image" size={12} className="text-blue-400 shrink-0" /> Обложка: <span className="text-white font-medium">мин. 3000×3000 px, JPEG/PNG</span></li>
                </ul>
              </div>
              <div className="space-y-3">
                <Input
                  value={trackTitle}
                  onChange={(e) => setTrackTitle(e.target.value)}
                  placeholder="Название трека"
                  className="bg-black border-white/10 text-white placeholder:text-zinc-600"
                />
                <input ref={fileRef} type="file" accept="audio/*" onChange={handleFileSelect} className="text-zinc-400 text-sm" />
                {audioPreviewUrl && (
                  <div className="bg-black border border-white/10 rounded-xl p-4">
                    <p className="text-zinc-400 text-xs mb-2">Предпрослушивание:</p>
                    <AudioWavePlayer src={audioPreviewUrl} fileName={selectedFileName} />
                  </div>
                )}
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

        {tab === "releases" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-1">Мои релизы</h3>
              <p className="text-zinc-500 text-sm mb-4">Релизы добавляются командой лейбла. Здесь вы можете отслеживать их статус и подать заявку на дистрибьюцию.</p>
              {releases.length === 0 && <p className="text-zinc-500 py-6 text-center">Релизов пока нет</p>}
              <div className="space-y-3">
                {releases.map((rel) => (
                  <div key={rel.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex gap-4">
                    {rel.cover_url ? (
                      <img src={rel.cover_url} alt={rel.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <Icon name="Music" size={20} className="text-zinc-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold">{rel.title}</p>
                        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${STATUS_COLORS[rel.status] || "bg-zinc-700 text-zinc-200"}`}>
                          {STATUS_LABELS[rel.status] || rel.status}
                        </span>
                      </div>
                      <div className="flex gap-3 flex-wrap text-xs text-zinc-500">
                        {rel.genre && <span>{rel.genre}</span>}
                        {rel.release_date && <span>{rel.release_date}</span>}
                        {rel.upc && <span>UPC: {rel.upc}</span>}
                      </div>
                      {rel.notes && <p className="text-zinc-400 text-xs mt-1">{rel.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold mb-1">Заявка на дистрибьюцию</h3>
              <p className="text-zinc-500 text-sm mb-4">Выберите платформы и укажите детали — мы разместим ваш трек</p>
              <div className="space-y-3">
                {releases.length > 0 && (
                  <select
                    value={distForm.release_id}
                    onChange={(e) => setDistForm({ ...distForm, release_id: e.target.value })}
                    className="w-full bg-black border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Выберите релиз (необязательно)</option>
                    {releases.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select>
                )}
                <Input
                  value={distForm.platforms}
                  onChange={(e) => setDistForm({ ...distForm, platforms: e.target.value })}
                  placeholder="Платформы: Spotify, Apple Music, VK, YouTube..."
                  className="bg-black border-white/10 text-white placeholder:text-zinc-600"
                />
                <Input
                  value={distForm.copyright}
                  onChange={(e) => setDistForm({ ...distForm, copyright: e.target.value })}
                  placeholder="Копирайт: © 2025 KALASHNIKOV SOUND / Имя артиста"
                  className="bg-black border-white/10 text-white placeholder:text-zinc-600"
                />
                <textarea
                  value={distForm.lyrics}
                  onChange={(e) => setDistForm({ ...distForm, lyrics: e.target.value })}
                  placeholder="Текст трека (необязательно)..."
                  rows={5}
                  className="w-full bg-black border border-white/10 text-white placeholder:text-zinc-600 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-white/30"
                />
                <textarea
                  value={distForm.message}
                  onChange={(e) => setDistForm({ ...distForm, message: e.target.value })}
                  placeholder="Дополнительные пожелания..."
                  rows={2}
                  className="w-full bg-black border border-white/10 text-white placeholder:text-zinc-600 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-white/30"
                />
                {distError && <p className="text-red-400 text-sm">{distError}</p>}
                {distSuccess && <p className="text-green-400 text-sm">{distSuccess}</p>}
                <Button onClick={handleDistSubmit} disabled={submittingDist || !distForm.platforms.trim()} className="bg-white text-black hover:bg-zinc-200">
                  {submittingDist ? "Отправляю..." : "Подать заявку"}
                </Button>
              </div>
            </div>

            {distRequests.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Мои заявки</h3>
                <div className="space-y-2">
                  {distRequests.map((r) => (
                    <div key={r.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{r.platforms}</p>
                        {r.message && <p className="text-zinc-500 text-xs mt-0.5">{r.message}</p>}
                        <p className="text-zinc-600 text-xs mt-1">{new Date(r.created_at).toLocaleDateString("ru")}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${STATUS_COLORS[r.status] || "bg-zinc-700 text-zinc-200"}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

        {tab === "stats" && (
          <div className="space-y-4">
            {stats.length === 0 ? (
              <div className="text-center py-16">
                <Icon name="BarChart2" size={48} className="text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">Статистика прослушиваний пока не добавлена</p>
                <p className="text-zinc-600 text-sm mt-1">Лейбл добавит данные по твоим трекам</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-white">{stats.reduce((s, r) => s + r.streams, 0).toLocaleString("ru")}</p>
                    <p className="text-zinc-500 text-sm mt-1">Всего прослушиваний</p>
                  </div>
                  <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-white">{new Set(stats.map(s => s.track_title)).size}</p>
                    <p className="text-zinc-500 text-sm mt-1">Треков в отчёте</p>
                  </div>
                  <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-white">{new Set(stats.map(s => s.platform)).size}</p>
                    <p className="text-zinc-500 text-sm mt-1">Платформ</p>
                  </div>
                </div>

                {/* Визуальный бар-чарт по трекам */}
                {(() => {
                  const trackMap: Record<string, number> = {};
                  stats.forEach(s => { trackMap[s.track_title] = (trackMap[s.track_title] || 0) + s.streams; });
                  const sorted = Object.entries(trackMap).sort((a, b) => b[1] - a[1]);
                  const maxVal = sorted[0]?.[1] || 1;
                  const colors = ["bg-purple-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-pink-500", "bg-orange-500"];
                  return (
                    <div className="bg-zinc-900 border border-white/10 rounded-xl p-5 mb-4">
                      <p className="font-semibold text-sm mb-4">График по трекам</p>
                      <div className="space-y-3">
                        {sorted.slice(0, 8).map(([title, streams], i) => (
                          <div key={title}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-zinc-300 truncate max-w-[60%]">{title}</span>
                              <span className="text-xs text-zinc-400 font-medium">{streams.toLocaleString("ru")}</span>
                            </div>
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
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

                <div className="space-y-3">
                  {stats.map((s) => (
                    <div key={s.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{s.track_title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{s.platform}</span>
                          {s.period && <span className="text-zinc-500 text-xs">{s.period}</span>}
                        </div>
                        {s.notes && <p className="text-zinc-400 text-sm mt-1">{s.notes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-white">{Number(s.streams).toLocaleString("ru")}</p>
                        <p className="text-zinc-500 text-xs">прослушиваний</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "royalties" && (
          <div className="space-y-4">
            {royalties.length === 0 ? (
              <div className="text-center py-16">
                <Icon name="DollarSign" size={48} className="text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">Роялти пока не начислены</p>
                <p className="text-zinc-600 text-sm mt-1">Лейбл добавит данные после выхода релизов</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                  <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 text-center sm:col-span-1">
                    <p className="text-zinc-500 text-sm mb-1">Всего начислено</p>
                    <p className="text-3xl font-bold text-green-400">{royaltiesTotal.toLocaleString("ru", { minimumFractionDigits: 2 })} ₽</p>
                  </div>
                  <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-zinc-500 text-sm mb-1">Записей</p>
                    <p className="text-3xl font-bold text-white">{royalties.length}</p>
                  </div>
                  <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-zinc-500 text-sm mb-1">Платформ</p>
                    <p className="text-3xl font-bold text-white">{new Set(royalties.map(r => r.platform)).size}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {royalties.map((r) => (
                    <div key={r.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{r.track_title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{r.platform}</span>
                          <span className="text-zinc-500 text-xs">{r.period}</span>
                        </div>
                        {r.notes && <p className="text-zinc-500 text-xs mt-1">{r.notes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-green-400">+{Number(r.amount).toLocaleString("ru", { minimumFractionDigits: 2 })}</p>
                        <p className="text-zinc-500 text-xs">{r.currency}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
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