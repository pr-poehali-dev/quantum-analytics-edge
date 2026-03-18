import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [artistName, setArtistName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = mode === "login"
      ? await login(email, password)
      : await register(email, password, artistName);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    navigate("/cabinet");
  };

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
        </div>

        <p className="text-center text-zinc-600 text-sm mt-6">
          <a href="/" className="hover:text-zinc-400 transition-colors">← Вернуться на сайт</a>
        </p>
      </div>
    </div>
  );
}
