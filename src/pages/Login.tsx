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
    const res = mode === "login"
      ? await login(email, password)
      : await register(email, password, artistName);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    navigate(res.role === "admin" ? "/admin" : "/cabinet");
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

  if (mode === "forgot") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <a href="/" className="block text-center text-2xl font-bold text-white mb-8 tracking-tighter">
            Калашников Саунд
          </a>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8">
            <h2 className="text-white font-bold text-lg mb-2">Восстановление пароля</h2>
            {!forgotSent ? (
              <>
                <p className="text-zinc-400 text-sm mb-6">
                  Введи email — мы пришлём временный пароль.
                </p>
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
                    {loading ? "Отправляем..." : "Отправить пароль"}
                  </Button>
                </form>
              </>
            ) : (
              <div className="py-4">
                <div className="text-4xl mb-4 text-center">{forgotTempPw ? "🔑" : "✉️"}</div>
                {forgotTempPw ? (
                  <>
                    <p className="text-yellow-400 font-medium mb-3 text-center">Письмо не доставлено — вот временный пароль:</p>
                    <div className="bg-zinc-800 border border-yellow-500/30 rounded-xl p-4 text-center mb-3">
                      <p className="text-white font-mono text-xl font-bold tracking-widest select-all">{forgotTempPw}</p>
                    </div>
                    <p className="text-zinc-400 text-sm text-center">Скопируй и войди с ним. Смени пароль после входа.</p>
                  </>
                ) : (
                  <>
                    <p className="text-green-400 font-medium mb-2 text-center">Письмо отправлено!</p>
                    <p className="text-zinc-400 text-sm text-center">Проверь почту <span className="text-white">{forgotEmail}</span> и войди с временным паролем.</p>
                  </>
                )}
              </div>
            )}
          </div>
          <p className="text-center text-zinc-600 text-sm mt-6">
            <button onClick={() => { setMode("login"); setForgotSent(false); setForgotError(""); }} className="hover:text-zinc-400 transition-colors">
              ← Вернуться ко входу
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <a href="/" className="block text-center text-2xl font-bold text-white mb-8 tracking-tighter">
          Калашников Саунд
        </a>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8">
          <div className="flex mb-6 bg-black rounded-lg p-1">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === "login" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
            >
              Войти
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === "register" ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <Label className="text-zinc-300 text-sm mb-1 block">Имя артиста</Label>
                <Input
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Твой псевдоним"
                  className="bg-black border-white/10 text-white placeholder:text-zinc-600"
                  required
                />
              </div>
            )}
            <div>
              <Label className="text-zinc-300 text-sm mb-1 block">Email</Label>
              <Input
                type={mode === "login" && email === "admin" ? "text" : "email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === "login" ? "email или admin" : "твой@email.com"}
                className="bg-black border-white/10 text-white placeholder:text-zinc-600"
                required
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
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200 font-semibold"
            >
              {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Создать аккаунт"}
            </Button>
          </form>

          {mode === "login" && (
            <div className="mt-4 text-center">
              <button
                onClick={() => { setMode("forgot"); setForgotEmail(email); setForgotSent(false); setForgotError(""); }}
                className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                Забыли пароль?
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-zinc-600 text-sm mt-6">
          <a href="/" className="hover:text-zinc-400 transition-colors">← Вернуться на сайт</a>
        </p>
      </div>
    </div>
  );
}