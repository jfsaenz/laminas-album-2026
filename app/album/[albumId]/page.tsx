"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { albumSections, getStickerKey } from "@/data/album";
import { supabase } from "@/lib/supabase";
import {
  AlbumSection,
  StickerState,
  StickerStatus,
  ViewMode,
} from "@/types/album";

function createAlbumCode() {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";

  for (let index = 0; index < 12; index++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

type StickerRow = {
  album_id: string;
  sticker_key: string;
  section_code: string;
  sticker_number: number;
  owned: boolean;
  duplicates: number;
};

export default function AlbumPage() {
  const router = useRouter();
  const params = useParams();

  const albumIdParam = params.albumId;
  const albumId =
    typeof albumIdParam === "string"
      ? albumIdParam.toLowerCase()
      : "principal";

  const [view, setView] = useState<ViewMode>("home");
  const [selectedSection, setSelectedSection] = useState<AlbumSection | null>(
    null
  );
  const [lastOpenedSectionCode, setLastOpenedSectionCode] = useState<
    string | null
  >(null);
  const [stickers, setStickers] = useState<StickerState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState("Cargando datos...");
  const [copied, setCopied] = useState(false);

  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem("last_album_code", albumId);

    const loadStickerStates = async () => {
      const { data, error } = await supabase
        .from("sticker_states_pilot")
        .select(
          "album_id, sticker_key, section_code, sticker_number, owned, duplicates"
        )
        .eq("album_id", albumId);

      if (error) {
        console.error(error);
        setSyncMessage("No se pudieron cargar los datos.");
        setIsLoading(false);
        return;
      }

      const nextState: StickerState = {};

      data?.forEach((row: StickerRow) => {
        nextState[row.sticker_key] = {
          owned: row.owned,
          duplicates: row.duplicates,
        };
      });

      setStickers(nextState);
      setSyncMessage("Datos sincronizados");
      setIsLoading(false);
    };

    setTimeout(() => {
      void loadStickerStates();
    }, 0);

    const channel = supabase
      .channel(`sticker-states-pilot-changes-${albumId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sticker_states_pilot",
          filter: `album_id=eq.${albumId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as StickerRow;

            setStickers((current) => {
              const copy = { ...current };
              delete copy[oldRow.sticker_key];
              return copy;
            });

            return;
          }

          const newRow = payload.new as StickerRow;

          setStickers((current) => ({
            ...current,
            [newRow.sticker_key]: {
              owned: newRow.owned,
              duplicates: newRow.duplicates,
            },
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [albumId]);

  useEffect(() => {
    if (view !== "sections" || !lastOpenedSectionCode) return;

    const timer = setTimeout(() => {
      const sectionElement = document.getElementById(
        `section-${lastOpenedSectionCode}`
      );

      sectionElement?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [view, lastOpenedSectionCode]);

  async function saveStickerStatus(
    sectionCode: string,
    number: number,
    status: StickerStatus
  ) {
    const key = getStickerKey(sectionCode, number);

    if (!status.owned && status.duplicates === 0) {
      const { error } = await supabase
        .from("sticker_states_pilot")
        .delete()
        .eq("album_id", albumId)
        .eq("sticker_key", key);

      if (error) {
        console.error(error);
        setSyncMessage("Error guardando cambios");
        return;
      }

      setSyncMessage("Cambio guardado");
      return;
    }

    const { error } = await supabase.from("sticker_states_pilot").upsert({
      album_id: albumId,
      sticker_key: key,
      section_code: sectionCode,
      sticker_number: number,
      owned: status.owned,
      duplicates: status.duplicates,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error(error);
      setSyncMessage("Error guardando cambios");
      return;
    }

    setSyncMessage("Cambio guardado");
  }

  const totalStickers = albumSections.reduce(
    (total, section) => total + section.numbers.length,
    0
  );

  const ownedCount = useMemo(() => {
    return Object.values(stickers).filter((sticker) => sticker.owned).length;
  }, [stickers]);

  const repeatedStickers = useMemo(() => {
    return albumSections.flatMap((section) =>
      section.numbers
        .map((number) => {
          const key = getStickerKey(section.code, number);
          const status = stickers[key];

          return {
            sectionName: section.name,
            sectionCode: section.code,
            number,
            duplicates: status?.duplicates ?? 0,
          };
        })
        .filter((sticker) => sticker.duplicates > 0)
    );
  }, [stickers]);

  function goHome() {
    setSelectedSection(null);
    setView("home");
  }

  function goBack() {
    if (view === "section-detail") {
      setView("sections");
      return;
    }

    if (view === "missing-section-detail") {
      setView("missing-sections");
      return;
    }

    if (
      view === "sections" ||
      view === "repeated" ||
      view === "missing-sections"
    ) {
      goHome();
      return;
    }

    goHome();
  }

  function getBackButtonText() {
    if (view === "section-detail") {
      return "Países";
    }

    if (view === "missing-section-detail") {
      return "Faltantes";
    }

    if (
      view === "sections" ||
      view === "repeated" ||
      view === "missing-sections"
    ) {
      return "Inicio";
    }

    return "Inicio";
  }

  function createAnotherAlbum() {
    const newCode = createAlbumCode();

    localStorage.setItem("last_album_code", newCode);
    router.push(`/album/${newCode}`);
  }

  function openSection(section: AlbumSection) {
    setSelectedSection(section);
    setLastOpenedSectionCode(section.code);
    setView("section-detail");
  }

  function openMissingSection(section: AlbumSection) {
    setSelectedSection(section);
    setView("missing-section-detail");
  }

  function updateSticker(
    sectionCode: string,
    number: number,
    getNextStatus: (currentStatus: StickerStatus) => StickerStatus
  ) {
    const key = getStickerKey(sectionCode, number);

    const currentStatus = stickers[key] ?? {
      owned: false,
      duplicates: 0,
    };

    const nextStatus = getNextStatus(currentStatus);

    setStickers((current) => ({
      ...current,
      [key]: nextStatus,
    }));

    void saveStickerStatus(sectionCode, number, nextStatus);
  }

  function toggleOwned(sectionCode: string, number: number) {
    updateSticker(sectionCode, number, (currentStatus) => {
      const nextOwned = !currentStatus.owned;

      return {
        owned: nextOwned,
        duplicates: nextOwned ? currentStatus.duplicates : 0,
      };
    });
  }

  function addDuplicate(sectionCode: string, number: number) {
    updateSticker(sectionCode, number, (currentStatus) => ({
      owned: true,
      duplicates: currentStatus.duplicates + 1,
    }));
  }

  function removeDuplicate(sectionCode: string, number: number) {
    updateSticker(sectionCode, number, (currentStatus) => ({
      owned: currentStatus.owned,
      duplicates: Math.max(currentStatus.duplicates - 1, 0),
    }));
  }

  function handleStickerClick(sectionCode: string, number: number) {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      addDuplicate(sectionCode, number);
      return;
    }

    clickTimer.current = setTimeout(() => {
      toggleOwned(sectionCode, number);
      clickTimer.current = null;
    }, 250);
  }

  async function copyAlbumLink() {
    const link = window.location.href;

    await navigator.clipboard.writeText(link);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <p className="text-lg font-bold">Cargando álbum...</p>
          <p className="mt-2 text-sm text-zinc-400">
            Estamos trayendo los datos guardados.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6">
        <header className="mb-5 flex items-center justify-between gap-3">
          <button
            onClick={goBack}
            className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 active:scale-95"
          >
            {getBackButtonText()}
          </button>

          <div className="text-right text-xs text-zinc-400">
            <p>
              {ownedCount}/{totalStickers} conseguidas
            </p>
            <p>{repeatedStickers.length} tipos repetidos</p>
            <p className="text-green-400">{syncMessage}</p>
          </div>
        </header>

        {view === "home" && (
          <section className="flex flex-1 flex-col items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-green-400">
                Mundial
              </p>

              <h1 className="mb-4 text-4xl font-black leading-tight">
                Láminas Álbum 2026
              </h1>

              <div className="mb-5 rounded-2xl bg-zinc-950 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Código del álbum
                </p>
                <p className="mt-1 break-all text-xl font-black text-green-400">
                  {albumId}
                </p>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-3">
                <button
                  onClick={copyAlbumLink}
                  className="rounded-2xl bg-zinc-800 px-5 py-4 text-left text-base font-bold text-white active:scale-95"
                >
                  {copied ? "Link copiado" : "Copiar link de este álbum"}
                </button>

                <button
                  onClick={createAnotherAlbum}
                  className="rounded-2xl bg-zinc-800 px-5 py-4 text-left text-base font-bold text-white active:scale-95"
                >
                  Crear otro álbum
                </button>
              </div>

              <div className="grid gap-3">
                <button
                  onClick={() => setView("sections")}
                  className="rounded-2xl bg-green-500 px-5 py-4 text-left text-lg font-bold text-zinc-950 active:scale-95"
                >
                  Listado total
                </button>

                <button
                  onClick={() => setView("repeated")}
                  className="rounded-2xl bg-zinc-800 px-5 py-4 text-left text-lg font-bold text-white active:scale-95"
                >
                  Repetidas
                </button>

                <button
                  onClick={() => setView("missing-sections")}
                  className="rounded-2xl bg-zinc-800 px-5 py-4 text-left text-lg font-bold text-white active:scale-95"
                >
                  Faltantes
                </button>
              </div>
            </div>
          </section>
        )}

        {view === "sections" && (
          <section>
            <h2 className="mb-4 text-2xl font-black">Listado total</h2>

            <div className="mb-4 rounded-2xl border border-green-500/40 bg-green-500/10 p-3 text-sm leading-relaxed text-green-300">
              <p className="font-bold text-green-400">Funcionamiento:</p>
              <p>
                Toca una vez para seleccionar una lámina. Tócala nuevamente para
                deseleccionarla. Haz doble toque rápido para sumarla como
                repetida.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {albumSections.map((section) => {
                const sectionOwned = section.numbers.filter((number) => {
                  const key = getStickerKey(section.code, number);
                  return stickers[key]?.owned;
                }).length;

                return (
                  <button
                    id={`section-${section.code}`}
                    key={section.code}
                    onClick={() => openSection(section)}
                    className={[
                      "rounded-2xl border bg-zinc-900 p-4 text-left active:scale-95",
                      lastOpenedSectionCode === section.code
                        ? "border-green-400 shadow-[0_0_0_1px_rgba(74,222,128,0.35)]"
                        : "border-zinc-800",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">{section.name}</h3>
                        <p className="text-sm text-zinc-400">{section.code}</p>
                      </div>

                      <p className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-bold text-green-400">
                        {sectionOwned}/{section.numbers.length}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {view === "section-detail" && selectedSection && (
          <section>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">{selectedSection.name}</h2>
                <p className="text-sm text-zinc-400">{selectedSection.code}</p>
              </div>

              <button
                onClick={() => setView("sections")}
                className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-bold active:scale-95"
              >
                Volver
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10">
              {selectedSection.numbers.map((number) => {
                const key = getStickerKey(selectedSection.code, number);
                const status = stickers[key] ?? {
                  owned: false,
                  duplicates: 0,
                };

                return (
                  <button
                    key={key}
                    onClick={() =>
                      handleStickerClick(selectedSection.code, number)
                    }
                    className={[
                      "relative aspect-square rounded-2xl border text-lg font-black active:scale-95",
                      status.owned
                        ? "border-green-400 bg-green-500 text-zinc-950"
                        : "border-zinc-700 bg-zinc-900 text-zinc-300",
                    ].join(" ")}
                  >
                    {number}

                    {status.duplicates > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1 text-xs font-black text-zinc-950">
                        {status.duplicates}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {view === "repeated" && (
          <section>
            <h2 className="mb-4 text-2xl font-black">Láminas repetidas</h2>

            {repeatedStickers.length === 0 ? (
              <EmptyState text="Todavía no tienes láminas repetidas." />
            ) : (
              <div className="grid gap-3">
                {repeatedStickers.map((sticker) => (
                  <div
                    key={`${sticker.sectionCode}-${sticker.number}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                  >
                    <div>
                      <h3 className="font-bold">
                        {sticker.sectionName} - {sticker.sectionCode}{" "}
                        {sticker.number}
                      </h3>
                      <p className="text-sm text-zinc-400">
                        Repetidas: {sticker.duplicates}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        removeDuplicate(sticker.sectionCode, sticker.number)
                      }
                      className="rounded-xl bg-red-500 px-3 py-2 text-sm font-bold text-white active:scale-95"
                    >
                      Borrar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {view === "missing-sections" && (
          <section>
            <h2 className="mb-4 text-2xl font-black">Láminas faltantes</h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {albumSections.map((section) => {
                const sectionMissing = section.numbers.filter((number) => {
                  const key = getStickerKey(section.code, number);
                  return !stickers[key]?.owned;
                }).length;

                return (
                  <button
                    key={section.code}
                    onClick={() => openMissingSection(section)}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left active:scale-95"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">{section.name}</h3>
                        <p className="text-sm text-zinc-400">{section.code}</p>
                      </div>

                      <p className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-bold text-red-400">
                        {sectionMissing}/{section.numbers.length}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {view === "missing-section-detail" && selectedSection && (
          <section>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">
                  Faltantes - {selectedSection.name}
                </h2>
                <p className="text-sm text-zinc-400">{selectedSection.code}</p>
              </div>

              <button
                onClick={() => setView("missing-sections")}
                className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-bold active:scale-95"
              >
                Volver
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10">
              {selectedSection.numbers
                .filter((number) => {
                  const key = getStickerKey(selectedSection.code, number);
                  return !stickers[key]?.owned;
                })
                .map((number) => (
                  <div
                    key={`${selectedSection.code}-${number}`}
                    className="flex aspect-square items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-lg font-black text-zinc-300"
                  >
                    {number}
                  </div>
                ))}
            </div>

            {selectedSection.numbers.every((number) => {
              const key = getStickerKey(selectedSection.code, number);
              return stickers[key]?.owned;
            }) && (
              <EmptyState text="Ya tienes todas las láminas de este apartado." />
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900 p-6 text-center text-zinc-400">
      {text}
    </div>
  );
}