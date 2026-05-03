export type AlbumSection = {
  name: string;
  code: string;
  numbers: number[];
};

export type StickerStatus = {
  owned: boolean;
  duplicates: number;
};

export type StickerKey = string;

export type StickerState = Record<StickerKey, StickerStatus>;

export type ViewMode =
  | "home"
  | "sections"
  | "section-detail"
  | "repeated"
  | "missing-sections"
  | "missing-section-detail"
  | "compare";