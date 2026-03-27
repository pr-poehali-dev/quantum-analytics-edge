import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminVisitStats from "@/components/admin/AdminVisitStats";
import AdminArtistTabs from "@/components/admin/AdminArtistTabs";

type Tab = "materials" | "releases" | "stats" | "royalties" | "chat" | "documents";
type SideTab = "artists" | "create-user";

interface Stat { id: number; platform: string; track_title: string; streams: number; period: string; notes: string; created_at: string; }
interface VisitStats { online: number; today: number; week: number; month: number; top_pages: {page: string; visits: number}[]; daily: {date: string; visits: number}[]; }
interface Artist { id: number; email: string; artist_name: string; created_at: string; }
interface Track { id: number; title: string; file_name: string; file_url: string; status: string; notes: string; }
interface Contract { id: number; title: string; contract_status: string; payment_status: string; amount: string; notes: string; }
interface Message { id: number; sender_role: string; text: string; created_at: string; }
interface Release { id: number; title: string; artist_name: string; upc: string | null; cover_url: string | null; status: string; genre: string | null; release_date: string | null; notes: string | null; created_at: string; }
interface Royalty { id: number; period: string; platform: string; track_title: string; amount: string; currency: string; notes: string | null; created_at: string; }
interface DistRequest { id: number; platforms: string; message: string; status: string; lyrics: string | null; copyright: string | null; created_at: string; }
interface Document { id: number; title: string; description: string; file_url: string; file_name: string; file_size: number; created_at: string; }
interface SmartLink { id?: number; release_id: number; slug: string; title: string; artist_name: string; cover_url: string; description: string; links: {platform: string; url: string; icon: string}[]; active: boolean; }

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
  const [distRequests, setDistRequests] = useState<DistRequest[]>([]);
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
  const [changePwUserId, setChangePwUserId] = useState<number | null>(null);
  const [changePwValue, setChangePwValue] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [changePwMsg, setChangePwMsg] = useState("");
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [savingTrack, setSavingTrack] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docForm, setDocForm] = useState({ title: "", description: "", file_name: "" });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState("");
  const docFileRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const [smartLinkModal, setSmartLinkModal] = useState<{release: Release} | null>(null);
  const [smartLink, setSmartLink] = useState<SmartLink | null>(null);
  const [smartLinkLoading, setSmartLinkLoading] = useState(false);
  const [smartLinkSaving, setSmartLinkSaving] = useState(false);
  const [smartLinkMsg, setSmartLinkMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (!loading && user && user.role !== "admin") navigate("/cabinet");
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    api.admin.artists().then((r) => setArtists(r.artists || []));
    api.visits.stats().then((r) => { if (!r.error) setVisitStats(r); });
  }, [user?.id]);

  useEffect(() => {
    if (!selected) return;
    api.admin.artistTracks(selected.id).then((r) => setTracks(r.tracks || []));
    api.admin.contracts(selected.id).then((r) => setContracts(r.contracts || []));
    api.admin.artistMessages(selected.id).then((r) => setMessages(r.messages || []));
    api.statistics.list(selected.id).then((r) => setStats(r.statistics || []));
    api.releases.list(selected.id).then((r) => setReleases(r.releases || []));
    api.royalties.list(selected.id).then((r) => { setRoyalties(r.royalties || []); setRoyaltiesTotal(r.total || 0); });
    api.distribution.list(selected.id).then((r) => setDistRequests(r.requests || []));
    api.documents.list(selected.id).then((r) => setDocuments(r.documents || []));
  }, [selected?.id]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages.length]);

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

  const handleChangePassword = async () => {
    if (!changePwUserId || !changePwValue.trim() || changePwValue.length < 6) return;
    setChangingPw(true);
    setChangePwMsg("");
    const res = await api.users.changePassword(changePwUserId, changePwValue);
    setChangingPw(false);
    if (res.ok) {
      setChangePwMsg("Пароль изменён");
      setChangePwValue("");
      setTimeout(() => { setChangePwUserId(null); setChangePwMsg(""); }, 2000);
    } else {
      setChangePwMsg(res.error || "Ошибка");
    }
  };

  const handleSaveTrack = async () => {
    if (!editingTrack) return;
    setSavingTrack(true);
    await api.admin.updateTrack({ id: editingTrack.id, title: editingTrack.title, status: editingTrack.status, notes: editingTrack.notes });
    setTracks((prev) => prev.map((t) => t.id === editingTrack.id ? editingTrack : t));
    setSavingTrack(false);
    setEditingTrack(null);
  };

  const openSmartLink = async (release: Release) => {
    setSmartLinkModal({ release });
    setSmartLinkLoading(true);
    setSmartLinkMsg("");
    const res = await api.smartLinks.get(release.id);
    if (res.smart_link) {
      setSmartLink(res.smart_link);
    } else {
      setSmartLink({
        release_id: release.id,
        slug: release.title.toLowerCase().replace(/[^a-z0-9а-яё]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""),
        title: release.title,
        artist_name: release.artist_name || "",
        cover_url: release.cover_url || "",
        description: "",
        links: [],
        active: true,
      });
    }
    setSmartLinkLoading(false);
  };

  const saveSmartLink = async () => {
    if (!smartLink) return;
    setSmartLinkSaving(true);
    setSmartLinkMsg("");
    const res = await api.smartLinks.save(smartLink);
    setSmartLinkSaving(false);
    if (res.ok) {
      setSmartLinkMsg(`Сохранено! Ссылка: /r/${res.slug || smartLink.slug}`);
    } else {
      setSmartLinkMsg(res.error || "Ошибка сохранения");
    }
  };

  const addSmartLinkPlatform = () => {
    if (!smartLink) return;
    setSmartLink({ ...smartLink, links: [...smartLink.links, { platform: "", url: "", icon: "Music" }] });
  };

  const removeSmartLinkPlatform = (idx: number) => {
    if (!smartLink) return;
    setSmartLink({ ...smartLink, links: smartLink.links.filter((_, i) => i !== idx) });
  };

  const updateSmartLinkPlatform = (idx: number, field: string, value: string) => {
    if (!smartLink) return;
    setSmartLink({ ...smartLink, links: smartLink.links.map((l, i) => i === idx ? { ...l, [field]: value } : l) });
  };

  if (loading || !user) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Загрузка...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex">
      <AdminSidebar
        sideTab={sideTab}
        setSideTab={(t) => { setSideTab(t); if (t === "create-user") setSelected(null); }}
        artists={artists}
        selectedId={selected?.id ?? null}
        onSelectArtist={(a) => { setSelected(a); setTab("materials"); setSideTab("artists"); }}
        onLogout={() => { logout(); navigate("/"); }}
      />

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
          <AdminVisitStats visitStats={visitStats} />
        )}

        {/* Карточка артиста */}
        {sideTab === "artists" && selected && (
          <AdminArtistTabs
            selected={selected}
            tab={tab}
            setTab={setTab}
            onBack={() => setSelected(null)}

            tracks={tracks}
            setTracks={setTracks}
            editingTrack={editingTrack}
            setEditingTrack={setEditingTrack}
            savingTrack={savingTrack}
            handleSaveTrack={handleSaveTrack}
            updateTrackStatus={updateTrackStatus}

            contracts={contracts}
            setContracts={setContracts}
            newContract={newContract}
            setNewContract={setNewContract}
            creatingContract={creatingContract}
            handleCreateContract={handleCreateContract}
            updateContractStatus={updateContractStatus}

            messages={messages}
            msgText={msgText}
            setMsgText={setMsgText}
            sending={sending}
            handleSend={handleSend}
            chatRef={chatRef}

            releases={releases}
            setReleases={setReleases}
            newRelease={newRelease}
            setNewRelease={setNewRelease}
            addingRelease={addingRelease}
            handleAddRelease={handleAddRelease}
            updateReleaseStatus={updateReleaseStatus}
            updateReleaseUpc={updateReleaseUpc}
            coverPreview={coverPreview}
            setCoverPreview={setCoverPreview}
            coverFile={coverFile}
            setCoverFile={setCoverFile}
            handleCoverChange={handleCoverChange}
            coverRef={coverRef}

            distRequests={distRequests}
            setDistRequests={setDistRequests}

            stats={stats}
            newStat={newStat}
            setNewStat={setNewStat}
            addingStat={addingStat}
            handleAddStat={handleAddStat}
            handleDeleteStat={handleDeleteStat}

            royalties={royalties}
            royaltiesTotal={royaltiesTotal}
            newRoyalty={newRoyalty}
            setNewRoyalty={setNewRoyalty}
            addingRoyalty={addingRoyalty}
            handleAddRoyalty={handleAddRoyalty}
            handleDeleteRoyalty={handleDeleteRoyalty}

            documents={documents}
            setDocuments={setDocuments}
            docForm={docForm}
            setDocForm={setDocForm}
            docFile={docFile}
            setDocFile={setDocFile}
            uploadingDoc={uploadingDoc}
            setUploadingDoc={setUploadingDoc}
            docError={docError}
            setDocError={setDocError}
            docFileRef={docFileRef}

            changePwUserId={changePwUserId}
            setChangePwUserId={setChangePwUserId}
            changePwValue={changePwValue}
            setChangePwValue={setChangePwValue}
            changingPw={changingPw}
            changePwMsg={changePwMsg}
            setChangePwMsg={setChangePwMsg}
            handleChangePassword={handleChangePassword}

            smartLinkModal={smartLinkModal}
            setSmartLinkModal={setSmartLinkModal}
            smartLink={smartLink}
            setSmartLink={setSmartLink}
            smartLinkLoading={smartLinkLoading}
            smartLinkSaving={smartLinkSaving}
            smartLinkMsg={smartLinkMsg}
            openSmartLink={openSmartLink}
            saveSmartLink={saveSmartLink}
            addSmartLinkPlatform={addSmartLinkPlatform}
            removeSmartLinkPlatform={removeSmartLinkPlatform}
            updateSmartLinkPlatform={updateSmartLinkPlatform}
          />
        )}
      </main>
    </div>
  );
}
