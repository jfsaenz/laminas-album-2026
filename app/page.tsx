"use client";

import { useEffect, useState } from "react";
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
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const hasSeenInstructions = localStorage.getItem(
        "has_seen_album_instructions"
      );

      if (!hasSeenInstructions) {
        setShowInstructions(true);
      }
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  function closeInstructions() {
    localStorage.setItem("has_seen_album_instructions", "true");
    setShowInstructions(false);
  }

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
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-green-400">
              Importante
            </p>

            <h2 className="mb-4 text-2xl font-black">
              Antes de compartir la app
            </h2>

            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <p>
                El link inicial de la app sirve para crear o entrar a un álbum,
                pero no es el link que debes compartir para editar un álbum
                específico.
              </p>

              <p>
                Primero toca <strong>Crear mi álbum</strong>. La app generará un
                código único y te llevará a un nuevo link.
              </p>

              <p>
                Comparte únicamente el link que aparece dentro de tu álbum,
                usando el botón <strong>Copiar link de este álbum</strong>. Ese
                link es el que permite que otras personas entren al mismo
                listado.
              </p>
            </div>

            <button
              onClick={closeInstructions}
              className="mt-6 w-full rounded-2xl bg-green-500 px-5 py-4 text-left text-lg font-bold text-zinc-950 active:scale-95"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

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