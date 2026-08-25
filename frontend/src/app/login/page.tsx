"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/authApi";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setAuth } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login({ username, password });
      setAuth(result.accessToken, result.user);
      router.push("/");
    } catch (err: any) {
      const message = err?.response?.data?.error?.message ?? "Đăng nhập thất bại";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-80 space-y-4 rounded border p-6">
        <h1 className="text-xl font-bold">Đăng nhập</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label className="block text-sm">Username</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm">Password</label>
          <input
            type="password"
            className="w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}