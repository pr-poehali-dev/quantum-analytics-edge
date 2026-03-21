import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

type Mode = "login" | "register" | "forgot";

function AnimatedPanel({ children, id }: { children: React.ReactNode; id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(12px)";
    const raf = requestAnimationFrame(() => {
      el.style.transition = "opacity 0.28s ease, transform 0.28s ease";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
    return () => cancelAnimationFrame(raf);
  }, [id]);
  return <div ref={ref}>{children}</div>;
}

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [artistName, setArtistName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotTempPw, setForgotTempPw] = useState("");

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setForgotError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = mode === "login"
        ? await login(email, password)
        : await register(email, password, artistName);
      if (res.error) { setError(res.error); setLoading(false); return; }
      navigate(res.role === "admin" ? "/admin" : "/cabinet");
    } catch {
      setError("Ошибка соединения, попробуй позже");
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotTempPw("");
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(forgotEmail);
      if (res.error) { setForgotError(res.error); }
      else {
        setForgotSent(true);
        if (res.temp_password) setForgotTempPw(res.temp_password);
      }
    } catch {
      setForgotError("Ошибка соединения, попробуй позже");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <a href="/" className="block text-center text-2xl font-bold text-white mb-8 tracking-tighter">
          Калашников Саунд
        </a>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8">

          {/* ── FORGOT ── */}
          {mode === "forgot" && (
            <AnimatedPanel id="forgot">
              <h2 className="text-white font-bold text-lg mb-2">Восстановление пароля</h2>
              {!forgotSent ? (
                <>
                  <p className="text-zinc-400 text-sm mb-6">Введи email — мы пришлём временный пароль.</p>
                  <form onSubmit={handleForgot} className="space-y-4">
                    <div>
                      <Label className="text-zinc-300 text-sm mb-1 block">Email</Label>
                      <Input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="твой@email.com"
                        className="bg-black border-white/10 text-white placeholder:text-zinc-600"
                        required
                        autoFocus
                      />
                    </div>
                    {forgotError && (
                      <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{forgotError}</p>
                    )}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-white text-black hover:bg-zinc-200 font-semibold"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          Отправляем...
                        </span>
                      ) : "Отправить пароль"}
                    </Button>
                  </form>
                </>
              ) : (
                <AnimatedPanel id="forgot-sent">
                  <div className="py-4">
                    {forgotTempPw ? (
                      <>
                        <div className="text-4xl mb-4 text-center">🔑</div>
                        <p className="text-yellow-400 font-medium mb-3 text-center">Временный пароль:</p>
                        <div className="bg-zinc-800 border border-yellow-500/30 rounded-xl p-4 text-center mb-3">
                          <p className="text-white font-mono text-xl font-bold tracking-widest select-all">{forgotTempPw}</p>
                        </div>
                        <p className="text-zinc-400 text-sm text-center">Скопируй и войди с ним. Смени пароль после входа.</p>
                      </>
                    ) : (
                      <>
                        <div className="text-4xl mb-4 text-center">✉️</div>
                        <p className="text-green-400 font-medium mb-2 text-center">Письмо отправлено!</p>
                        <p className="text-zinc-400 text-sm text-center">Проверь почту <span className="text-white">{forgotEmail}</span> и войди с временным паролем.</p>
                      </>
                    )}
                  </div>
                </AnimatedPanel>
              )}
              <p className="text-center text-zinc-600 text-sm mt-6">
                <button
                  onClick={() => { switchMode("login"); setForgotSent(false); }}
                  className="hover:text-zinc-400 transition-colors"
                >
                  ← Вернуться ко входу
                </button>
              </p>
            </AnimatedPanel>
          )}

          {/* ── LOGIN / REGISTER ── */}
          {mode !== "forgot" && (
            <AnimatedPanel id={mode}>
              {/* Toggle tabs */}
              <div className="flex mb-6 bg-black rounded-lg p-1 relative">
                <div
                  className="absolute top-1 bottom-1 rounded-md bg-white transition-all duration-300 ease-out"
                  style={{ width: "calc(50% - 4px)", left: mode === "login" ? "4px" : "calc(50%)" }}
                />
                <button
                  onClick={() => switchMode("login")}
                  className={`relative flex-1 py-2 rounded-md text-sm font-medium transition-colors duration-200 z-10 ${mode === "login" ? "text-black" : "text-zinc-400 hover:text-white"}`}
                >
                  Войти
                </button>
                <button
                  onClick={() => switchMode("register")}
                  className={`relative flex-1 py-2 rounded-md text-sm font-medium transition-colors duration-200 z-10 ${mode === "register" ? "text-black" : "text-zinc-400 hover:text-white"}`}
                >
                  Регистрация
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div
                  style={{
                    overflow: "hidden",
                    maxHeight: mode === "register" ? "80px" : "0px",
                    opacity: mode === "register" ? 1 : 0,
                    transition: "max-height 0.3s ease, opacity 0.25s ease",
                  }}
                >
                  <div className="pb-1">
                    <Label className="text-zinc-300 text-sm mb-1 block">Имя артиста</Label>
                    <Input
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      placeholder="Твой псевдоним"
                      className="bg-black border-white/10 text-white placeholder:text-zinc-600"
                      required={mode === "register"}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-zinc-300 text-sm mb-1 block">Email</Label>
                  <Input
                    type={mode === "login" && email === "admin" ? "text" : "email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={mode === "login" ? "email или admin" : "твой@email.com"}
                    className="bg-black border-white/10 text-white placeholder:text-zinc-600"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300 text-sm mb-1 block">Пароль</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-black border-white/10 text-white placeholder:text-zinc-600"
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </div>

                <div
                  style={{
                    overflow: "hidden",
                    maxHeight: error ? "60px" : "0px",
                    opacity: error ? 1 : 0,
                    transition: "max-height 0.25s ease, opacity 0.2s ease",
                  }}
                >
                  <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black hover:bg-zinc-200 font-semibold active:scale-[0.98] transition-all"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Загрузка...
                    </span>
                  ) : mode === "login" ? "Войти" : "Создать аккаунт"}
                </Button>
              </form>

              {mode === "login" && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => { switchMode("forgot"); setForgotEmail(email); setForgotSent(false); }}
                    className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                  >
                    Забыли пароль?
                  </button>
                </div>
              )}
            </AnimatedPanel>
          )}
        </div>

        <p className="text-center text-zinc-600 text-sm mt-6">
          <a href="/" className="hover:text-zinc-400 transition-colors">← Вернуться на сайт</a>
        </p>
      </div>
    </div>
  );
}
