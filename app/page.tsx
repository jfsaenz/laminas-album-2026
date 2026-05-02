"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function createAlbumCode() {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";

  for (let index = 0; index < 12; index++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

export default function Home() {
  const router = useRouter();
  const [albumCode, setAlbumCode] = useState("");

  function handleCreateAlbum() {
    const newCode = createAlbumCode();

    localStorage.setItem("last_album_code", newCode);
    router.push(`/album/${newCode}`);
  }

  function handleEnterAlbum() {
    const cleanCode = albumCode.trim().toLowerCase();

    if (!cleanCode) return;

    localStorage.setItem("last_album_code", cleanCode);
    router.push(`/album/${cleanCode}`);
  }

  function handleContinueLastAlbum() {
    const lastCode = localStorage.getItem("last_album_code");

    if (!lastCode) return;

    router.push(`/album/${lastCode}`);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-green-400">
            Mundial
          </p>

          <h1 className="mb-3 text-4xl font-black leading-tight">
            Láminas Álbum 2026
          </h1>

          <p className="mb-8 text-sm leading-relaxed text-zinc-400">
            Crea tu propio álbum o entra con un código compartido. Cada código
            tiene su propio listado independiente.
          </p>

          <div className="grid gap-3">
            <button
              onClick={handleCreateAlbum}
              className="rounded-2xl bg-green-500 px-5 py-4 text-left text-lg font-bold text-zinc-950 active:scale-95"
            >
              Crear mi álbum
            </button>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Entrar con código
              </label>

              <input
                value={albumCode}
                onChange={(event) => setAlbumCode(event.target.value)}
                placeholder="Ej: k8x4p2m9q1za"
                className="mb-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-green-400"
              />

              <button
                onClick={handleEnterAlbum}
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 font-bold text-white active:scale-95"
              >
                Entrar al álbum
              </button>
            </div>

            <button
              onClick={handleContinueLastAlbum}
              className="rounded-2xl bg-zinc-800 px-5 py-4 text-left text-lg font-bold text-white active:scale-95"
            >
              Continuar último álbum
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}