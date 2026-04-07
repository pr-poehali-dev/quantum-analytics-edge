import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

type Tab = "materials" | "releases" | "stats" | "royalties" | "chat" | "documents" | "requests";

interface Artist { id: number; email: string; artist_name: string; created_at: string; is_verified: boolean; }
interface Track { id: number; title: string; file_name: string; file_url: string; status: string; notes: string; }
interface Contract { id: number; title: string; contract_status: string; payment_status: string; amount: string; notes: string; }
interface Message { id: number; sender_role: string; text: string; created_at: string; }
interface Release { id: number; title: string; artist_name: string; upc: string | null; cover_url: string | null; status: string; genre: string | null; release_date: string | null; notes: string | null; created_at: string; }
interface Royalty { id: number; period: string; platform: string; track_title: string; amount: string; currency: string; notes: string | null; created_at: string; }
interface DistRequest { id: number; platforms: string; message: string; status: string; lyrics: string | null; copyright: string | null; audio_url?: string | null; created_at: string; }
interface Document { id: number; title: string; description: string; file_url: string; file_name: string; file_size: number; created_at: string; }
interface Stat { id: number; platform: string; track_title: string; streams: number; period: string; notes: string; created_at: string; }
interface SmartLink { id?: number; release_id: number; slug: string; title: string; artist_name: string; cover_url: string; description: string; links: { platform: string; url: string; icon: string }[]; active: boolean; }

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Загружен", in_review: "На рассмотрении", approved: "Одобрен", rejected: "Отклонён", deleted: "Удалён",
  pending: "Ожидает", signed: "Подписан", cancelled: "Отменён", unpaid: "Не оплачен", paid: "Оплачен",
  moderation: "На модерации", ready: "Готов к выпуску", published: "Опубликован",
  new: "Новая", processing: "В обработке", done: "Выполнена",
};
const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-zinc-700 text-zinc-200", in_review: "bg-blue-500/20 text-blue-300",
  approved: "bg-green-500/20 text-green-300", rejected: "bg-red-500/20 text-red-300", deleted: "bg-red-900/40 text-red-500",
  pending: "bg-yellow-500/20 text-yellow-300", signed: "bg-green-500/20 text-green-300",
  cancelled: "bg-red-500/20 text-red-300", unpaid: "bg-orange-500/20 text-orange-300", paid: "bg-green-500/20 text-green-300",
  moderation: "bg-yellow-500/20 text-yellow-300", ready: "bg-blue-500/20 text-blue-300", published: "bg-green-500/20 text-green-300",
  new: "bg-zinc-700 text-zinc-200", processing: "bg-blue-500/20 text-blue-300", done: "bg-green-500/20 text-green-300",
};

interface Props {
  selected: Artist;
  tab: Tab;
  setTab: (t: Tab) => void;
  onBack: () => void;

  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  editingTrack: Track | null;
  setEditingTrack: React.Dispatch<React.SetStateAction<Track | null>>;
  savingTrack: boolean;
  handleSaveTrack: () => void;
  updateTrackStatus: (id: number, status: string) => void;

  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  newContract: { title: string; amount: string; notes: string };
  setNewContract: React.Dispatch<React.SetStateAction<{ title: string; amount: string; notes: string }>>;
  creatingContract: boolean;
  handleCreateContract: () => void;
  updateContractStatus: (id: number, field: string, value: string) => void;

  messages: Message[];
  msgText: string;
  setMsgText: React.Dispatch<React.SetStateAction<string>>;
  sending: boolean;
  handleSend: () => void;
  chatRef: React.RefObject<HTMLDivElement>;

  releases: Release[];
  setReleases: React.Dispatch<React.SetStateAction<Release[]>>;
  newRelease: { title: string; artist_name: string; upc: string; genre: string; release_date: string; notes: string; cover_url: string };
  setNewRelease: React.Dispatch<React.SetStateAction<{ title: string; artist_name: string; upc: string; genre: string; release_date: string; notes: string; cover_url: string }>>;
  addingRelease: boolean;
  handleAddRelease: () => void;
  updateReleaseStatus: (id: number, status: string) => void;
  updateReleaseUpc: (id: number, upc: string) => void;
  coverPreview: string | null;
  setCoverPreview: React.Dispatch<React.SetStateAction<string | null>>;
  coverFile: File | null;
  setCoverFile: React.Dispatch<React.SetStateAction<File | null>>;
  handleCoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  coverRef: React.RefObject<HTMLInputElement>;

  distRequests: DistRequest[];
  setDistRequests: React.Dispatch<React.SetStateAction<DistRequest[]>>;

  stats: Stat[];
  newStat: { platform: string; track_title: string; streams: string; period: string; notes: string };
  setNewStat: React.Dispatch<React.SetStateAction<{ platform: string; track_title: string; streams: string; period: string; notes: string }>>;
  addingStat: boolean;
  handleAddStat: () => void;
  handleDeleteStat: (id: number) => void;

  royalties: Royalty[];
  royaltiesTotal: number;
  newRoyalty: { period: string; platform: string; track_title: string; amount: string; currency: string; notes: string };
  setNewRoyalty: React.Dispatch<React.SetStateAction<{ period: string; platform: string; track_title: string; amount: string; currency: string; notes: string }>>;
  addingRoyalty: boolean;
  handleAddRoyalty: () => void;
  handleDeleteRoyalty: (id: number, amount: string) => void;

  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  docForm: { title: string; description: string; file_name: string };
  setDocForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; file_name: string }>>;
  docFile: File | null;
  setDocFile: React.Dispatch<React.SetStateAction<File | null>>;
  uploadingDoc: boolean;
  setUploadingDoc: React.Dispatch<React.SetStateAction<boolean>>;
  docError: string;
  setDocError: React.Dispatch<React.SetStateAction<string>>;
  docFileRef: React.RefObject<HTMLInputElement>;

  changePwUserId: number | null;
  setChangePwUserId: React.Dispatch<React.SetStateAction<number | null>>;
  changePwValue: string;
  setChangePwValue: React.Dispatch<React.SetStateAction<string>>;
  changingPw: boolean;
  changePwMsg: string;
  setChangePwMsg: React.Dispatch<React.SetStateAction<string>>;
  handleChangePassword: () => void;

  smartLinkModal: { release: Release } | null;
  setSmartLinkModal: React.Dispatch<React.SetStateAction<{ release: Release } | null>>;
  smartLink: SmartLink | null;
  setSmartLink: React.Dispatch<React.SetStateAction<SmartLink | null>>;
  smartLinkLoading: boolean;
  smartLinkSaving: boolean;
  smartLinkMsg: string;
  openSmartLink: (release: Release) => void;
  saveSmartLink: () => void;
  addSmartLinkPlatform: () => void;
  removeSmartLinkPlatform: (idx: number) => void;
  updateSmartLinkPlatform: (idx: number, field: string, value: string) => void;
}

export default function AdminArtistTabs(props: Props) {
  const {
    selected, tab, setTab, onBack,
    tracks, setTracks, editingTrack, setEditingTrack, savingTrack, handleSaveTrack, updateTrackStatus,
    contracts, setContracts, newContract, setNewContract, creatingContract, handleCreateContract, updateContractStatus,
    messages, msgText, setMsgText, sending, handleSend, chatRef,
    releases, setReleases, newRelease, setNewRelease, addingRelease, handleAddRelease,
    updateReleaseStatus, updateReleaseUpc,
    coverPreview, setCoverPreview, coverFile, setCoverFile, handleCoverChange, coverRef,
    distRequests, setDistRequests,
    stats, newStat, setNewStat, addingStat, handleAddStat, handleDeleteStat,
    royalties, royaltiesTotal, newRoyalty, setNewRoyalty, addingRoyalty, handleAddRoyalty, handleDeleteRoyalty,
    documents, setDocuments, docForm, setDocForm, docFile, setDocFile,
    uploadingDoc, setUploadingDoc, docError, setDocError, docFileRef,
    changePwUserId, setChangePwUserId, changePwValue, setChangePwValue,
    changingPw, changePwMsg, setChangePwMsg, handleChangePassword,
    smartLinkModal, setSmartLinkModal, smartLink, setSmartLink,
    smartLinkLoading, smartLinkSaving, smartLinkMsg,
    openSmartLink, saveSmartLink, addSmartLinkPlatform, removeSmartLinkPlatform, updateSmartLinkPlatform,
  } = props;

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-zinc-500 hover:text-white">
          <Icon name="ChevronLeft" size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{selected.artist_name}</h1>
            {selected.is_verified && (
              <span title="Верифицирован" className="flex items-center justify-center w-5 h-5 rounded-full bg-[#1DA1F2]">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-sm">{selected.email}</p>
        </div>
        <button
          onClick={async () => {
            const res = await api.admin.verifyArtist(selected.id, !selected.is_verified);
            if (res.ok) {
              selected.is_verified = !selected.is_verified;
              window.location.reload();
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${selected.is_verified ? "bg-[#1DA1F2]/20 text-[#1DA1F2] hover:bg-red-500/20 hover:text-red-400" : "bg-white/5 text-zinc-400 hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2]"}`}
        >
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#1DA1F2]">
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          {selected.is_verified ? "Снять верификацию" : "Верифицировать"}
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-zinc-900 rounded-xl p-1 max-w-3xl overflow-x-auto">
        {(["materials", "releases", "stats", "royalties", "documents", "requests", "chat"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === t ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
          >
            {t === "materials" ? "Материалы" : t === "releases" ? "Релизы" : t === "stats" ? "Статистика" : t === "royalties" ? "Роялти" : t === "documents" ? "Документы" : t === "requests" ? "Заявки" : "Чат"}
          </button>
        ))}
      </div>

      {/* Вкладка Материалы */}
      {tab === "materials" && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-yellow-500/20 rounded-xl p-4">
            <p className="font-semibold text-sm mb-3 text-yellow-400">Сменить пароль артиста</p>
            <div className="flex gap-2">
              <Input
                type="password"
                value={changePwUserId === selected.id ? changePwValue : ""}
                onChange={(e) => { setChangePwUserId(selected.id); setChangePwValue(e.target.value); setChangePwMsg(""); }}
                placeholder="Новый пароль (мин. 6 символов)"
                className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm flex-1"
              />
              <Button onClick={handleChangePassword} disabled={changingPw || !changePwValue || changePwValue.length < 6} size="sm" className="bg-yellow-500 text-black hover:bg-yellow-400 shrink-0">
                {changingPw ? "..." : "Изменить"}
              </Button>
            </div>
            {changePwMsg && <p className={`text-xs mt-2 ${changePwMsg.includes("изменён") ? "text-green-400" : "text-red-400"}`}>{changePwMsg}</p>}
          </div>

          <div>
            <h3 className="font-semibold mb-3">Треки</h3>
            {tracks.length === 0 && <p className="text-zinc-500 text-sm">Треков нет</p>}
            <div className="space-y-2">
              {tracks.map((track) => (
                <div key={track.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                  {editingTrack?.id === track.id ? (
                    <div className="space-y-2">
                      <Input value={editingTrack.title} onChange={(e) => setEditingTrack({ ...editingTrack, title: e.target.value })} className="bg-black border-white/10 text-white text-sm" />
                      <select value={editingTrack.status} onChange={(e) => setEditingTrack({ ...editingTrack, status: e.target.value })} className="w-full bg-black border border-white/10 text-white rounded-md px-3 py-2 text-sm">
                        {["uploaded", "in_review", "approved", "rejected", "deleted"].map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                        ))}
                      </select>
                      <Input value={editingTrack.notes || ""} onChange={(e) => setEditingTrack({ ...editingTrack, notes: e.target.value })} placeholder="Примечание" className="bg-black border-white/10 text-white text-sm" />
                      <div className="flex gap-2">
                        <Button onClick={handleSaveTrack} disabled={savingTrack} size="sm" className="bg-white text-black hover:bg-zinc-200">{savingTrack ? "..." : "Сохранить"}</Button>
                        <Button onClick={() => setEditingTrack(null)} size="sm" variant="ghost" className="text-zinc-400">Отмена</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{track.title}</p>
                        <p className="text-zinc-500 text-xs">{track.file_name}</p>
                        {track.notes && <p className="text-zinc-400 text-xs mt-0.5">{track.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={track.status}
                          onChange={(e) => updateTrackStatus(track.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[track.status] || "bg-zinc-700 text-zinc-200"}`}
                        >
                          {["uploaded", "in_review", "approved", "rejected", "deleted"].map((s) => (
                            <option key={s} value={s} className="bg-zinc-900 text-white">{STATUS_LABELS[s] || s}</option>
                          ))}
                        </select>
                        <button onClick={() => setEditingTrack(track)} className="text-zinc-500 hover:text-white">
                          <Icon name="Pencil" size={14} />
                        </button>
                        {track.file_url && (
                          <a href={track.file_url} target="_blank" rel="noopener noreferrer">
                            <Icon name="Download" size={16} className="text-zinc-400 hover:text-white" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
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

          {distRequests.length > 0 && (
            <div className="bg-zinc-900 border border-blue-500/20 rounded-xl p-4 mb-4">
              <p className="font-semibold text-sm mb-3 text-blue-400">Заявки на дистрибьюцию ({distRequests.length})</p>
              <div className="space-y-3">
                {distRequests.map((req) => (
                  <div key={req.id} className="bg-black/40 rounded-lg p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-300 font-medium">{req.platforms}</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={req.status}
                          onChange={async (e) => {
                            await api.distribution.updateStatus(req.id, e.target.value);
                            setDistRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: e.target.value } : r));
                          }}
                          className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[req.status] || "bg-zinc-700 text-zinc-200"}`}
                        >
                          {["new", "processing", "done", "cancelled"].map((s) => (
                            <option key={s} value={s} className="bg-zinc-900 text-white">{STATUS_LABELS[s] || s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {req.copyright && <p className="text-zinc-500 text-xs">© {req.copyright}</p>}
                    {req.message && <p className="text-zinc-400 text-xs mt-1">{req.message}</p>}
                    {req.lyrics && (
                      <details className="mt-2">
                        <summary className="text-zinc-500 text-xs cursor-pointer hover:text-zinc-300">Текст трека</summary>
                        <pre className="text-zinc-400 text-xs mt-1 whitespace-pre-wrap font-sans">{req.lyrics}</pre>
                      </details>
                    )}
                    <p className="text-zinc-600 text-xs mt-1">{new Date(req.created_at).toLocaleDateString("ru")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {releases.length === 0 && <p className="text-zinc-500 text-sm">Релизов нет</p>}
          <div className="space-y-3">
            {releases.map((rel) => (
              <div key={rel.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                <div className="flex gap-4">
                  {rel.cover_url ? (
                    <img src={rel.cover_url} alt={rel.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  ) : (
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
                    <div className="mt-2">
                      <button
                        onClick={() => openSmartLink(rel)}
                        className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <Icon name="Link" size={12} />
                        Смарт-линк
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Модалка смарт-линка */}
      {smartLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSmartLinkModal(null)}>
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-lg">Смарт-линк</h2>
                <p className="text-zinc-500 text-xs">{smartLinkModal.release.title}</p>
              </div>
              <button onClick={() => setSmartLinkModal(null)} className="text-zinc-500 hover:text-white">
                <Icon name="X" size={20} />
              </button>
            </div>

            {smartLinkLoading ? (
              <p className="text-zinc-500 text-sm text-center py-8">Загрузка...</p>
            ) : smartLink && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Slug (часть URL)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-xs shrink-0">/r/</span>
                    <Input
                      value={smartLink.slug}
                      onChange={(e) => setSmartLink({ ...smartLink, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                      className="bg-black border-white/10 text-white text-sm"
                      placeholder="my-release-slug"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Заголовок страницы</label>
                  <Input value={smartLink.title} onChange={(e) => setSmartLink({ ...smartLink, title: e.target.value })} className="bg-black border-white/10 text-white text-sm" />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Исполнитель</label>
                  <Input value={smartLink.artist_name} onChange={(e) => setSmartLink({ ...smartLink, artist_name: e.target.value })} className="bg-black border-white/10 text-white text-sm" />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Описание</label>
                  <Input value={smartLink.description} onChange={(e) => setSmartLink({ ...smartLink, description: e.target.value })} className="bg-black border-white/10 text-white text-sm" placeholder="Краткое описание релиза" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-zinc-400">Платформы</label>
                    <button onClick={addSmartLinkPlatform} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                      <Icon name="Plus" size={12} />
                      Добавить
                    </button>
                  </div>
                  <div className="space-y-2">
                    {smartLink.links.map((link, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          value={link.platform}
                          onChange={(e) => {
                            const pl = e.target.value;
                            const icons: Record<string, string> = { "Spotify": "Music", "Apple Music": "Music2", "YouTube Music": "Youtube", "VK Музыка": "Music", "Яндекс Музыка": "Music", "Deezer": "Music", "Другое": "ExternalLink" };
                            updateSmartLinkPlatform(idx, "platform", pl);
                            updateSmartLinkPlatform(idx, "icon", icons[pl] || "ExternalLink");
                          }}
                          className="bg-black border border-white/10 text-white rounded-md px-2 py-1.5 text-xs w-36 shrink-0"
                        >
                          <option value="">Платформа</option>
                          {["Spotify", "Apple Music", "YouTube Music", "VK Музыка", "Яндекс Музыка", "Deezer", "Другое"].map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <Input
                          value={link.url}
                          onChange={(e) => updateSmartLinkPlatform(idx, "url", e.target.value)}
                          placeholder="https://..."
                          className="bg-black border-white/10 text-white text-xs flex-1"
                        />
                        <button onClick={() => removeSmartLinkPlatform(idx)} className="text-zinc-600 hover:text-red-400 shrink-0">
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    ))}
                    {smartLink.links.length === 0 && (
                      <p className="text-zinc-600 text-xs">Добавьте ссылки на платформы</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sl-active"
                    checked={smartLink.active}
                    onChange={(e) => setSmartLink({ ...smartLink, active: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="sl-active" className="text-sm text-zinc-300">Страница активна</label>
                </div>

                {smartLinkMsg && (
                  <p className={`text-xs ${smartLinkMsg.includes("Ошибка") ? "text-red-400" : "text-green-400"}`}>
                    {smartLinkMsg}
                    {smartLinkMsg.includes("/r/") && (
                      <a href={`/r/${smartLink.slug}`} target="_blank" rel="noopener noreferrer" className="ml-2 underline">
                        Открыть
                      </a>
                    )}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button onClick={saveSmartLink} disabled={smartLinkSaving || !smartLink.slug || !smartLink.title} className="bg-purple-600 hover:bg-purple-500 text-white flex-1">
                    {smartLinkSaving ? "Сохраняю..." : "Сохранить"}
                  </Button>
                  {smartLink.slug && (
                    <a href={`/r/${smartLink.slug}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="border-white/10 text-zinc-300 hover:text-white">
                        <Icon name="ExternalLink" size={14} />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
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

      {/* Вкладка Документы */}
      {tab === "documents" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-sm">Прикрепить документ</p>
            <Input
              value={docForm.title}
              onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
              placeholder="Название (например: Договор №1)"
              className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm"
            />
            <Input
              value={docForm.description}
              onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
              placeholder="Описание (необязательно)"
              className="bg-black border-white/10 text-white placeholder:text-zinc-600 text-sm"
            />
            <div>
              <p className="text-zinc-400 text-xs mb-1">Файл (PDF, DOC, DOCX, JPG, PNG)</p>
              <input
                ref={docFileRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setDocFile(f); }}
                className="text-zinc-400 text-sm"
              />
            </div>
            {docError && <p className="text-red-400 text-sm">{docError}</p>}
            <Button
              onClick={async () => {
                if (!docFile || !docForm.title.trim() || !selected) return;
                setUploadingDoc(true);
                setDocError("");
                const reader = new FileReader();
                const b64 = await new Promise<string>((resolve) => {
                  reader.onload = () => resolve((reader.result as string).split(",")[1]);
                  reader.readAsDataURL(docFile);
                });
                const res = await api.documents.upload({
                  user_id: selected.id,
                  title: docForm.title,
                  description: docForm.description || undefined,
                  file_data: b64,
                  file_name: docFile.name,
                });
                if (res.document) {
                  setDocuments((prev) => [res.document, ...prev]);
                  setDocForm({ title: "", description: "", file_name: "" });
                  setDocFile(null);
                  if (docFileRef.current) docFileRef.current.value = "";
                } else {
                  setDocError(res.error || "Ошибка загрузки");
                }
                setUploadingDoc(false);
              }}
              disabled={uploadingDoc || !docForm.title.trim() || !docFile}
              size="sm"
              className="bg-white text-black hover:bg-zinc-200"
            >
              {uploadingDoc ? "Загружаю..." : "Загрузить документ"}
            </Button>
          </div>

          {documents.length === 0 && <p className="text-zinc-500 text-sm">Документов нет</p>}
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                  <Icon name="FileText" size={18} className="text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.title}</p>
                  {doc.description && <p className="text-zinc-400 text-xs truncate">{doc.description}</p>}
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-zinc-500 text-xs">{doc.file_name}</span>
                    {doc.file_size && <span className="text-zinc-600 text-xs">{(doc.file_size / 1024).toFixed(0)} КБ</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white">
                    <Icon name="Download" size={16} />
                  </a>
                  <button
                    onClick={async () => {
                      await api.documents.delete(doc.id);
                      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
                    }}
                    className="text-red-500 hover:text-red-400"
                  >
                    <Icon name="Trash2" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Вкладка Заявки на дистрибьюцию */}
      {tab === "requests" && (
        <div className="space-y-4 max-w-2xl">
          <h3 className="font-semibold text-base">Заявки на дистрибьюцию</h3>
          {distRequests.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <Icon name="Send" size={40} className="mx-auto mb-3 opacity-30" />
              <p>Заявок пока нет</p>
            </div>
          ) : distRequests.map((req) => (
            <div key={req.id} className="bg-zinc-900 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{req.platforms}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{new Date(req.created_at).toLocaleDateString("ru")}</p>
                </div>
                <select
                  value={req.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    await api.distribution.updateStatus(req.id, newStatus);
                    setDistRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: newStatus } : r));
                  }}
                  className={`text-xs px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${STATUS_COLORS[req.status] || "bg-zinc-700 text-zinc-200"}`}
                >
                  <option value="new">Новая</option>
                  <option value="processing">В обработке</option>
                  <option value="done">Выполнена</option>
                </select>
              </div>
              {req.message && (
                <p className="text-zinc-300 text-sm bg-zinc-800 rounded-lg px-3 py-2">{req.message}</p>
              )}
              {req.copyright && (
                <p className="text-zinc-400 text-xs">© {req.copyright}</p>
              )}
              {req.lyrics && (
                <details className="text-xs text-zinc-400">
                  <summary className="cursor-pointer text-zinc-300 hover:text-white">Текст трека</summary>
                  <pre className="mt-2 whitespace-pre-wrap font-sans bg-zinc-800 rounded-lg px-3 py-2 max-h-40 overflow-y-auto">{req.lyrics}</pre>
                </details>
              )}
              {req.audio_url && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-zinc-500">Аудиофайл</p>
                    <a
                      href={req.audio_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#f5a623] hover:text-[#f5a623]/80 transition-colors"
                    >
                      <Icon name="Download" size={12} />
                      Скачать
                    </a>
                  </div>
                  <audio controls src={req.audio_url} className="w-full h-10" style={{ colorScheme: "dark" }} />
                </div>
              )}
            </div>
          ))}
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
                  <p className="text-xs mt-1 text-zinc-500">{new Date(m.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}</p>
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
  );
}