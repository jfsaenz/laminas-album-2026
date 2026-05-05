import { AlbumSection } from "@/types/album";

const numbers1To20 = Array.from({ length: 20 }, (_, index) => index + 1);

function flagUrl(countryCode: string) {
  return `https://flagcdn.com/${countryCode}.svg`;
}

export const albumSections: AlbumSection[] = [
  {
    name: "FWC",
    code: "FWC",
    flag: "🏆",
    numbers: Array.from({ length: 20 }, (_, index) => index),
  },
  { name: "México", code: "MEX", flag: "🇲🇽", flagUrl: flagUrl("mx"), numbers: numbers1To20 },
  { name: "Sudáfrica", code: "RSA", flag: "🇿🇦", flagUrl: flagUrl("za"), numbers: numbers1To20 },
  { name: "Corea del Sur", code: "KOR", flag: "🇰🇷", flagUrl: flagUrl("kr"), numbers: numbers1To20 },
  { name: "República checa", code: "CZE", flag: "🇨🇿", flagUrl: flagUrl("cz"), numbers: numbers1To20 },
  { name: "Canadá", code: "CAN", flag: "🇨🇦", flagUrl: flagUrl("ca"), numbers: numbers1To20 },
  { name: "Bosnia y Herzegovina", code: "BIH", flag: "🇧🇦", flagUrl: flagUrl("ba"), numbers: numbers1To20 },
  { name: "Qatar", code: "QAT", flag: "🇶🇦", flagUrl: flagUrl("qa"), numbers: numbers1To20 },
  { name: "Suiza", code: "SUI", flag: "🇨🇭", flagUrl: flagUrl("ch"), numbers: numbers1To20 },
  { name: "Brasil", code: "BRA", flag: "🇧🇷", flagUrl: flagUrl("br"), numbers: numbers1To20 },
  { name: "Marruecos", code: "MAR", flag: "🇲🇦", flagUrl: flagUrl("ma"), numbers: numbers1To20 },
  { name: "Haití", code: "HAI", flag: "🇭🇹", flagUrl: flagUrl("ht"), numbers: numbers1To20 },
  { name: "Escocia", code: "SCO", flag: "🏴", flagUrl: flagUrl("gb-sct"), numbers: numbers1To20 },
  { name: "Estados Unidos", code: "USA", flag: "🇺🇸", flagUrl: flagUrl("us"), numbers: numbers1To20 },
  { name: "Paraguay", code: "PAR", flag: "🇵🇾", flagUrl: flagUrl("py"), numbers: numbers1To20 },
  { name: "Australia", code: "AUS", flag: "🇦🇺", flagUrl: flagUrl("au"), numbers: numbers1To20 },
  { name: "Turquía", code: "TUR", flag: "🇹🇷", flagUrl: flagUrl("tr"), numbers: numbers1To20 },
  { name: "Alemania", code: "GER", flag: "🇩🇪", flagUrl: flagUrl("de"), numbers: numbers1To20 },
  { name: "Curazao", code: "CUW", flag: "🇨🇼", flagUrl: flagUrl("cw"), numbers: numbers1To20 },
  { name: "Costa de Marfil", code: "CIV", flag: "🇨🇮", flagUrl: flagUrl("ci"), numbers: numbers1To20 },
  { name: "Ecuador", code: "ECU", flag: "🇪🇨", flagUrl: flagUrl("ec"), numbers: numbers1To20 },
  { name: "Holanda / Países Bajos", code: "NED", flag: "🇳🇱", flagUrl: flagUrl("nl"), numbers: numbers1To20 },
  { name: "Japón", code: "JPM", flag: "🇯🇵", flagUrl: flagUrl("jp"), numbers: numbers1To20 },
  { name: "Suecia", code: "SWE", flag: "🇸🇪", flagUrl: flagUrl("se"), numbers: numbers1To20 },
  { name: "Túnez", code: "TUN", flag: "🇹🇳", flagUrl: flagUrl("tn"), numbers: numbers1To20 },
  { name: "Bélgica", code: "BEL", flag: "🇧🇪", flagUrl: flagUrl("be"), numbers: numbers1To20 },
  { name: "Egipto", code: "EGY", flag: "🇪🇬", flagUrl: flagUrl("eg"), numbers: numbers1To20 },
  { name: "Irán", code: "IRN", flag: "🇮🇷", flagUrl: flagUrl("ir"), numbers: numbers1To20 },
  { name: "Nueva Zelanda", code: "NZL", flag: "🇳🇿", flagUrl: flagUrl("nz"), numbers: numbers1To20 },
  { name: "España", code: "ESP", flag: "🇪🇸", flagUrl: flagUrl("es"), numbers: numbers1To20 },
  { name: "Cabo Verde", code: "CPV", flag: "🇨🇻", flagUrl: flagUrl("cv"), numbers: numbers1To20 },
  { name: "Arabia Saudita", code: "KSA", flag: "🇸🇦", flagUrl: flagUrl("sa"), numbers: numbers1To20 },
  { name: "Uruguay", code: "URU", flag: "🇺🇾", flagUrl: flagUrl("uy"), numbers: numbers1To20 },
  { name: "Francia", code: "FRA", flag: "🇫🇷", flagUrl: flagUrl("fr"), numbers: numbers1To20 },
  { name: "Senegal", code: "SEN", flag: "🇸🇳", flagUrl: flagUrl("sn"), numbers: numbers1To20 },
  { name: "Irak", code: "IRQ", flag: "🇮🇶", flagUrl: flagUrl("iq"), numbers: numbers1To20 },
  { name: "Noruega", code: "NOR", flag: "🇳🇴", flagUrl: flagUrl("no"), numbers: numbers1To20 },
  { name: "Argentina", code: "ARG", flag: "🇦🇷", flagUrl: flagUrl("ar"), numbers: numbers1To20 },
  { name: "Argelia", code: "ALG", flag: "🇩🇿", flagUrl: flagUrl("dz"), numbers: numbers1To20 },
  { name: "Austria", code: "AUT", flag: "🇦🇹", flagUrl: flagUrl("at"), numbers: numbers1To20 },
  { name: "Jordania", code: "JOR", flag: "🇯🇴", flagUrl: flagUrl("jo"), numbers: numbers1To20 },
  { name: "Portugal", code: "POR", flag: "🇵🇹", flagUrl: flagUrl("pt"), numbers: numbers1To20 },
  { name: "Congo", code: "COD", flag: "🇨🇩", flagUrl: flagUrl("cd"), numbers: numbers1To20 },
  { name: "Uzbekistán", code: "UZB", flag: "🇺🇿", flagUrl: flagUrl("uz"), numbers: numbers1To20 },
  { name: "Colombia", code: "COL", flag: "🇨🇴", flagUrl: flagUrl("co"), numbers: numbers1To20 },
  { name: "Inglaterra", code: "ENG", flag: "🏳️", flagUrl: flagUrl("gb-eng"), numbers: numbers1To20 },
  { name: "Croacia", code: "CRO", flag: "🇭🇷", flagUrl: flagUrl("hr"), numbers: numbers1To20 },
  { name: "Ghana", code: "GHA", flag: "🇬🇭", flagUrl: flagUrl("gh"), numbers: numbers1To20 },
  { name: "Panamá", code: "PAN", flag: "🇵🇦", flagUrl: flagUrl("pa"), numbers: numbers1To20 },
  {
    name: "COCA COLA",
    code: "CC",
    flag: "🥤",
    numbers: Array.from({ length: 14 }, (_, index) => index + 1),
  },
];

export function getStickerKey(sectionCode: string, number: number) {
  return `${sectionCode}-${number}`;
}