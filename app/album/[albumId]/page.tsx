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

function normalizeSearchText(value: string | number) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeAlbumCode(value: string) {
  return normalizeSearchText(value)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 24);
}

function matchesFlexibleSearch(values: Array<string | number>, query: string) {
  const cleanQuery = normalizeSearchText(query);

  if (!cleanQuery) return true;

  return values.some((value) => normalizeSearchText(value).includes(cleanQuery));
}

function matchesSectionSearch(section: AlbumSection, query: string) {
  return matchesFlexibleSearch([section.name, section.code], query);
}

function matchesStickerSearch(
  sticker: {
    sectionName: string;
    sectionCode: string;
    number: number;
  },
  query: string
) {
  return matchesFlexibleSearch(
    [
      sticker.sectionName,
      sticker.sectionCode,
      sticker.number,
      `${sticker.sectionCode} ${sticker.number}`,
      `${sticker.sectionCode}-${sticker.number}`,
      `${sticker.sectionName} ${sticker.number}`,
    ],
    query
  );
}

function getSectionFlag(sectionCode: string) {
  return albumSections.find((section) => section.code === sectionCode)?.flag ?? "🏳️";
}

function SectionFlag({ section }: { section: AlbumSection }) {
  if (!section.flagUrl) {
    return <span className="mr-2">{section.flag}</span>;
  }

  return (
    <span className="mr-2 inline-flex h-5 w-7 items-center justify-center align-middle">
      <img
        src={section.flagUrl}
        alt={section.name}
        className="h-4 w-6 rounded-[3px] object-cover"
        onError={(event) => {
          event.currentTarget.style.display = "none";
          const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = "inline";
        }}
      />
      <span className="hidden">{section.flag}</span>
    </span>
  );
}

function SectionFlagByCode({ sectionCode }: { sectionCode: string }) {
  const section = albumSections.find((item) => item.code === sectionCode);

  if (!section) {
    return <span className="mr-2">{getSectionFlag(sectionCode)}</span>;
  }

  return <SectionFlag section={section} />;
}

type StickerRow = {
  album_id: string;
  sticker_key: string;
  section_code: string;
  sticker_number: number;
  owned: boolean;
  duplicates: number;
};

type CompareSticker = {
  sectionName: string;
  sectionCode: string;
  number: number;
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
  const [codeCopied, setCodeCopied] = useState(false);

  const [sectionsSearch, setSectionsSearch] = useState("");
  const [repeatedSearch, setRepeatedSearch] = useState("");
  const [missingSearch, setMissingSearch] = useState("");

  const [compareCode, setCompareCode] = useState("");
  const [comparedAlbumCode, setComparedAlbumCode] = useState("");
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareMessage, setCompareMessage] = useState("");
  const [otherRepeatedUseful, setOtherRepeatedUseful] = useState<
    CompareSticker[]
  >([]);
  const [myRepeatedUseful, setMyRepeatedUseful] = useState<CompareSticker[]>(
    []
  );

  const [newAlbumCode, setNewAlbumCode] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameMessage, setRenameMessage] = useState("");

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

  const completedPercentage =
    totalStickers === 0
      ? "0.0"
      : ((ownedCount / totalStickers) * 100).toFixed(1);

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

  const filteredSections = useMemo(() => {
    return albumSections.filter((section) =>
      matchesSectionSearch(section, sectionsSearch)
    );
  }, [sectionsSearch]);

  const filteredRepeatedStickers = useMemo(() => {
    return repeatedStickers.filter((sticker) =>
      matchesStickerSearch(sticker, repeatedSearch)
    );
  }, [repeatedStickers, repeatedSearch]);

  const filteredMissingSections = useMemo(() => {
    return albumSections.filter((section) =>
      matchesSectionSearch(section, missingSearch)
    );
  }, [missingSearch]);

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
      view === "missing-sections" ||
      view === "compare"
    ) {
      goHome();
      return;
    }

    goHome();
  }

  function getBackButtonText() {
    if (view === "section-detail") return "Países";
    if (view === "missing-section-detail") return "Faltantes";
    if (
      view === "sections" ||
      view === "repeated" ||
      view === "missing-sections" ||
      view === "compare"
    ) {
      return "Inicio";
    }

    return "Inicio";
  }

  function goToGeneralHome() {
    router.push("/");
  }

  function createAnotherAlbum() {
    const confirmed = window.confirm(
      "Vas a crear un álbum nuevo. Este álbum actual no se borra, pero entrarás a otro código. ¿Quieres continuar?"
    );

    if (!confirmed) return;

    const newCode = createAlbumCode();

    localStorage.setItem("last_album_code", newCode);
    router.push(`/album/${newCode}`);
  }

  async function copyAlbumLink() {
    const link = window.location.href;

    await navigator.clipboard.writeText(link);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  async function copyAlbumCode() {
    await navigator.clipboard.writeText(albumId);
    setCodeCopied(true);

    setTimeout(() => {
      setCodeCopied(false);
    }, 1800);
  }

  async function renameAlbumCode() {
    const cleanCode = normalizeAlbumCode(newAlbumCode);

    if (!cleanCode || cleanCode.length < 4) {
      setRenameMessage("El nuevo código debe tener al menos 4 caracteres.");
      return;
    }

    if (cleanCode === albumId) {
      setRenameMessage("Ese ya es el código actual de este álbum.");
      return;
    }

      const confirmed = window.confirm(
      `Vas a cambiar el código de este álbum a "${cleanCode}". Esto también cambiará la URL del álbum. El link anterior quedará vacío o desactualizado, así que deberás compartir el nuevo link. ¿Quieres continuar?`
      );

    if (!confirmed) return;

    setRenameLoading(true);
    setRenameMessage("");

    const { data: existingData, error: existingError } = await supabase
      .from("sticker_states_pilot")
      .select("album_id")
      .eq("album_id", cleanCode)
      .limit(1);

    if (existingError) {
      console.error(existingError);
      setRenameMessage("No se pudo validar el nuevo código.");
      setRenameLoading(false);
      return;
    }

    if (existingData && existingData.length > 0) {
      setRenameMessage("Ese código ya está en uso. Prueba con otro.");
      setRenameLoading(false);
      return;
    }

    const { error } = await supabase
      .from("sticker_states_pilot")
      .update({
        album_id: cleanCode,
        updated_at: new Date().toISOString(),
      })
      .eq("album_id", albumId);

    if (error) {
      console.error(error);
      setRenameMessage("No se pudo cambiar el código.");
      setRenameLoading(false);
      return;
    }

    localStorage.setItem("last_album_code", cleanCode);
    setRenameMessage("Código actualizado.");
    setRenameLoading(false);
    router.push(`/album/${cleanCode}`);
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

  async function compareAlbums() {
    const cleanCode = compareCode.trim().toLowerCase();

    if (!cleanCode) {
      setCompareMessage("Ingresa un código de álbum para comparar.");
      return;
    }

    if (cleanCode === albumId) {
      setCompareMessage("Ese es tu mismo álbum. Ingresa otro código.");
      return;
    }

    setCompareLoading(true);
    setCompareMessage("");
    setComparedAlbumCode(cleanCode);
    setOtherRepeatedUseful([]);
    setMyRepeatedUseful([]);

    const { data, error } = await supabase
      .from("sticker_states_pilot")
      .select(
        "album_id, sticker_key, section_code, sticker_number, owned, duplicates"
      )
      .eq("album_id", cleanCode);

    if (error) {
      console.error(error);
      setCompareMessage("No se pudo cargar el otro álbum.");
      setCompareLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setCompareMessage(
        "No se encontraron datos para ese código. Revisa que esté bien escrito."
      );
      setCompareLoading(false);
      return;
    }

    const otherState: StickerState = {};

    data.forEach((row: StickerRow) => {
      otherState[row.sticker_key] = {
        owned: row.owned,
        duplicates: row.duplicates,
      };
    });

    const usefulFromOther: CompareSticker[] = [];
    const usefulFromMe: CompareSticker[] = [];

    albumSections.forEach((section) => {
      section.numbers.forEach((number) => {
        const key = getStickerKey(section.code, number);

        const myStatus = stickers[key] ?? {
          owned: false,
          duplicates: 0,
        };

        const otherStatus = otherState[key] ?? {
          owned: false,
          duplicates: 0,
        };

        if (otherStatus.duplicates > 0 && !myStatus.owned) {
          usefulFromOther.push({
            sectionName: section.name,
            sectionCode: section.code,
            number,
            duplicates: otherStatus.duplicates,
          });
        }

        if (myStatus.duplicates > 0 && !otherStatus.owned) {
          usefulFromMe.push({
            sectionName: section.name,
            sectionCode: section.code,
            number,
            duplicates: myStatus.duplicates,
          });
        }
      });
    });

    setOtherRepeatedUseful(usefulFromOther);
    setMyRepeatedUseful(usefulFromMe);

    if (usefulFromOther.length === 0 && usefulFromMe.length === 0) {
      setCompareMessage(
        "No se encontraron coincidencias útiles entre los dos álbumes."
      );
    } else {
      setCompareMessage("Comparación lista.");
    }

    setCompareLoading(false);
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
            <p className="font-bold text-green-300">
              {completedPercentage}% completado
            </p>
            <p className="text-green-400">{syncMessage}</p>
          </div>
        </header>

        {view === "home" && (
          <section className="flex flex-1 flex-col items-center justify-center">
            <div className="w-full max-w-md space-y-4">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-green-400">
                  Mundial
                </p>

                <h1 className="mb-5 text-4xl font-black leading-tight">
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

                <h2 className="mb-3 text-lg font-black text-white">
                  Gestión del álbum
                </h2>

                <div className="grid gap-3">
                  <button
                    onClick={copyAlbumLink}
                    className="rounded-2xl bg-zinc-800 px-5 py-4 text-left text-base font-bold text-white active:scale-95"
                  >
                    {copied ? "Link copiado" : "Copiar link de este álbum"}
                  </button>

                  <button
                    onClick={copyAlbumCode}
                    className="rounded-2xl bg-zinc-800 px-5 py-4 text-left text-base font-bold text-white active:scale-95"
                  >
                    {codeCopied ? "Código copiado" : "Copiar código del álbum"}
                  </button>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                    <label className="mb-2 block text-sm font-bold text-zinc-300">
                      Personalizar código
                    </label>

                    <input
                      value={newAlbumCode}
                      onChange={(event) => setNewAlbumCode(event.target.value)}
                      placeholder="Ej: album-juan-andres"
                      className="mb-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-green-400"
                    />

                    <button
                      onClick={renameAlbumCode}
                      disabled={renameLoading}
                      className="w-full rounded-xl bg-zinc-800 px-4 py-3 font-bold text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {renameLoading ? "Actualizando..." : "Cambiar código"}
                    </button>

                    {renameMessage && (
                      <p className="mt-3 text-sm text-zinc-400">
                        {renameMessage}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={createAnotherAlbum}
                    className="rounded-2xl bg-zinc-800 px-5 py-4 text-left text-base font-bold text-white active:scale-95"
                  >
                    Crear otro álbum
                  </button>

                  <button
                    onClick={goToGeneralHome}
                    className="rounded-2xl bg-zinc-800 px-5 py-4 text-left text-base font-bold text-white active:scale-95"
                  >
                    Volver al inicio general
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                <h2 className="mb-3 text-lg font-black text-white">
                  Mi álbum
                </h2>

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

                  <button
                    onClick={() => setView("compare")}
                    className="rounded-2xl bg-zinc-800 px-5 py-4 text-left text-lg font-bold text-white active:scale-95"
                  >
                    Comparar álbum
                  </button>
                </div>
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

            <input
              value={sectionsSearch}
              onChange={(event) => setSectionsSearch(event.target.value)}
              placeholder="Buscar país o abreviatura..."
              className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-green-400"
            />

            {filteredSections.length === 0 ? (
              <EmptyState text="No se encontraron apartados con esa búsqueda." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSections.map((section) => {
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
                          <h3 className="text-lg font-bold">
                            <SectionFlag section={section} />
                            {section.name}
                          </h3>
                          <p className="text-sm text-zinc-400">
                            {section.code}
                          </p>
                        </div>

                        <p className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-bold text-green-400">
                          {sectionOwned}/{section.numbers.length}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {view === "section-detail" && selectedSection && (
          <section>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">
                  <SectionFlag section={selectedSection} />
                  {selectedSection.name}
                </h2>
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

            <input
              value={repeatedSearch}
              onChange={(event) => setRepeatedSearch(event.target.value)}
              placeholder="Buscar repetida por país, código o número..."
              className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-green-400"
            />

            {repeatedStickers.length === 0 ? (
              <EmptyState text="Todavía no tienes láminas repetidas." />
            ) : filteredRepeatedStickers.length === 0 ? (
              <EmptyState text="No se encontraron repetidas con esa búsqueda." />
            ) : (
              <div className="grid gap-3">
                {filteredRepeatedStickers.map((sticker) => (
                  <div
                    key={`${sticker.sectionCode}-${sticker.number}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                  >
                    <div>
                      <h3 className="font-bold">
                        <SectionFlagByCode sectionCode={sticker.sectionCode} />
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

            <input
              value={missingSearch}
              onChange={(event) => setMissingSearch(event.target.value)}
              placeholder="Buscar país o abreviatura..."
              className="mb-4 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-green-400"
            />

            {filteredMissingSections.length === 0 ? (
              <EmptyState text="No se encontraron apartados con esa búsqueda." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMissingSections.map((section) => {
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
                          <h3 className="text-lg font-bold">
                            <SectionFlag section={section} />
                            {section.name}
                          </h3>
                          <p className="text-sm text-zinc-400">
                            {section.code}
                          </p>
                        </div>

                        <p className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-bold text-red-400">
                          {sectionMissing}/{section.numbers.length}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {view === "missing-section-detail" && selectedSection && (
          <section>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">
                  Faltantes - <SectionFlag section={selectedSection} />
                  {selectedSection.name}
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

        {view === "compare" && (
          <section>
            <h2 className="mb-4 text-2xl font-black">Comparar álbum</h2>

            <div className="mb-4 rounded-2xl border border-green-500/40 bg-green-500/10 p-3 text-sm leading-relaxed text-green-300">
              <p className="font-bold text-green-400">Intercambio:</p>
              <p>
                Pídele a la otra persona el código con el que generó su álbum.
                Escríbelo aquí para comparar sus repetidas con tus faltantes y
                ver cuáles de tus repetidas podrían servirle.
              </p>
            </div>

            <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                Código del álbum de la otra persona
              </label>

              <input
                value={compareCode}
                onChange={(event) => setCompareCode(event.target.value)}
                placeholder="Ej: k8x4p2m9q1za"
                className="mb-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-green-400"
              />

              <button
                onClick={compareAlbums}
                disabled={compareLoading}
                className="w-full rounded-xl bg-green-500 px-4 py-3 font-bold text-zinc-950 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {compareLoading ? "Comparando..." : "Comparar"}
              </button>
            </div>

            {compareMessage && (
              <p className="mb-4 rounded-2xl bg-zinc-900 p-3 text-sm text-zinc-300">
                {compareMessage}
              </p>
            )}

            {comparedAlbumCode && (
              <div className="mb-4 rounded-2xl bg-zinc-900 p-3 text-sm text-zinc-400">
                Comparando tu álbum <strong>{albumId}</strong> con{" "}
                <strong>{comparedAlbumCode}</strong>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-lg font-black text-green-400">
                  Repetidas del otro álbum que te sirven
                </h3>

                {otherRepeatedUseful.length === 0 ? (
                  <EmptyState text="No hay repetidas del otro álbum que te falten." />
                ) : (
                  <div className="grid gap-3">
                    {otherRepeatedUseful.map((sticker) => (
                      <div
                        key={`other-${sticker.sectionCode}-${sticker.number}`}
                        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                      >
                        <h4 className="font-bold">
                          <SectionFlagByCode sectionCode={sticker.sectionCode} />
                          {sticker.sectionName} - {sticker.sectionCode}{" "}
                          {sticker.number}
                        </h4>
                        <p className="text-sm text-zinc-400">
                          Repetidas disponibles: {sticker.duplicates}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-lg font-black text-green-400">
                  Tus repetidas que podrían servirle
                </h3>

                {myRepeatedUseful.length === 0 ? (
                  <EmptyState text="No tienes repetidas que le falten al otro álbum." />
                ) : (
                  <div className="grid gap-3">
                    {myRepeatedUseful.map((sticker) => (
                      <div
                        key={`mine-${sticker.sectionCode}-${sticker.number}`}
                        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                      >
                        <h4 className="font-bold">
                          <SectionFlagByCode sectionCode={sticker.sectionCode} />
                          {sticker.sectionName} - {sticker.sectionCode}{" "}
                          {sticker.number}
                        </h4>
                        <p className="text-sm text-zinc-400">
                          Tus repetidas: {sticker.duplicates}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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