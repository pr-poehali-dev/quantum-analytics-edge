import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [artistName, setArtistName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotTempPw, setForgotTempPw] = useState("");

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
    <div className="min-h-screen bg-[#0f1923] flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a2636] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f5a623]/10 via-transparent to-transparent" />
        <div className="relative z-10 text-center">
          <a href="/" className="flex items-baseline justify-center gap-1 mb-8">
            <span className="text-5xl font-black tracking-tighter text-white">FRESH</span>
            <span className="text-5xl font-black tracking-tighter text-[#f5a623]">TUNES</span>
          </a>
          <p className="text-slate-400 text-lg max-w-xs">Платформа для дистрибьюции и продвижения вашей музыки</p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-2xl font-bold text-[#f5a623]">100+</p>
              <p className="text-slate-500 text-xs mt-1">Артистов</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-2xl font-bold text-[#f5a623]">50+</p>
              <p className="text-slate-500 text-xs mt-1">Платформ</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-2xl font-bold text-[#f5a623]">1M+</p>
              <p className="text-slate-500 text-xs mt-1">Стримов</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <a href="/" className="flex items-baseline justify-center gap-1 mb-8 lg:hidden">
            <span className="text-3xl font-black tracking-tighter text-white">FRESH</span>
            <span className="text-3xl font-black tracking-tighter text-[#f5a623]">TUNES</span>
          </a>

          {mode === "forgot" ? (
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Восстановление пароля</h2>
              <p className="text-slate-400 text-sm mb-8">Введи email — мы пришлём временный пароль</p>

              {!forgotSent ? (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <Label className="text-slate-300 text-sm mb-1.5 block">Email</Label>
                    <Input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="твой@email.com"
                      className="bg-[#1a2636] border-white/10 text-white placeholder:text-slate-600 h-11"
                      required
                    />
                  </div>
                  {forgotError && (
                    <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{forgotError}</p>
                  )}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#f5a623] text-black hover:bg-[#f5a623]/90 font-bold h-11"
                  >
                    {loading ? "Отправляем..." : "Отправить пароль"}
                  </Button>
                </form>
              ) : (
                <div className="bg-[#1a2636] border border-white/10 rounded-2xl p-6">
                  {forgotTempPw ? (
                    <>
                      <p className="text-[#f5a623] font-semibold mb-3">Временный пароль:</p>
                      <div className="bg-[#0f1923] border border-[#f5a623]/30 rounded-xl p-4 text-center mb-3">
                        <p className="text-white font-mono text-2xl font-bold tracking-widest select-all">{forgotTempPw}</p>
                      </div>
                      <p className="text-slate-400 text-sm">Скопируй и войди с ним. Смени пароль после входа.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-green-400 font-semibold mb-2">Письмо отправлено!</p>
                      <p className="text-slate-400 text-sm">Проверь почту <span className="text-white">{forgotEmail}</span> и войди с временным паролем.</p>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={() => { setMode("login"); setForgotSent(false); setForgotError(""); }}
                className="mt-6 text-slate-500 hover:text-slate-300 text-sm transition-colors flex items-center gap-1"
              >
                ← Вернуться ко входу
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {mode === "login" ? "Добро пожаловать" : "Создать аккаунт"}
              </h2>
              <p className="text-slate-400 text-sm mb-8">
                {mode === "login" ? "Войди в личный кабинет артиста" : "Зарегистрируйся как артист"}
              </p>

              {/* Toggle */}
              <div className="flex mb-6 bg-[#1a2636] rounded-xl p-1">
                <button
                  onClick={() => { setMode("login"); setError(""); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${mode === "login" ? "bg-[#f5a623] text-black" : "text-slate-400 hover:text-white"}`}
                >
                  Войти
                </button>
                <button
                  onClick={() => { setMode("register"); setError(""); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${mode === "register" ? "bg-[#f5a623] text-black" : "text-slate-400 hover:text-white"}`}
                >
                  Регистрация
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div>
                    <Label className="text-slate-300 text-sm mb-1.5 block">Имя артиста</Label>
                    <Input
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      placeholder="Твой псевдоним"
                      className="bg-[#1a2636] border-white/10 text-white placeholder:text-slate-600 h-11"
                      required
                    />
                  </div>
                )}
                <div>
                  <Label className="text-slate-300 text-sm mb-1.5 block">Email</Label>
                  <Input
                    type={mode === "login" && email === "admin" ? "text" : "email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={mode === "login" ? "email или admin" : "твой@email.com"}
                    className="bg-[#1a2636] border-white/10 text-white placeholder:text-slate-600 h-11"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm mb-1.5 block">Пароль</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-[#1a2636] border-white/10 text-white placeholder:text-slate-600 h-11"
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#f5a623] text-black hover:bg-[#f5a623]/90 font-bold h-11 text-base"
                >
                  {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Создать аккаунт"}
                </Button>
              </form>

              {mode === "login" && (
                <div className="mt-5 text-center">
                  <button
                    onClick={() => { setMode("forgot"); setForgotEmail(email); setForgotSent(false); setForgotError(""); }}
                    className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                  >
                    Забыли пароль?
                  </button>
                </div>
              )}

              <p className="mt-8 text-center text-slate-600 text-sm">
                <a href="/" className="hover:text-slate-400 transition-colors">← На главную</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
