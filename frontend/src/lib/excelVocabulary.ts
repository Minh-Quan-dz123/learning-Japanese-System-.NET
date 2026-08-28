import * as XLSX from "xlsx";
import { VocabularyDto } from "@/types/vocabulary";

/**
 * 1 dòng dữ liệu thô đọc được từ file Excel hoặc text dán tay, CHƯA qua validate.
 * Thứ tự cột cố định: hiragana | katakana | kanji | romaji | ý nghĩa | ghi chú
 * (đúng khuôn dạng đã mô tả ở README.md).
 */
export interface RawVocabRow {
  hiragana: string;
  katakana: string;
  kanji: string;
  romaji: string;
  meaning: string;
  note: string;
}

function cellsToRawVocabRow(cells: unknown[]): RawVocabRow {
  const get = (i: number): string => {
    const value = cells[i];
    return value === undefined || value === null ? "" : String(value).trim();
  };
  return {
    hiragana: get(0),
    katakana: get(1),
    kanji: get(2),
    romaji: get(3),
    meaning: get(4),
    note: get(5),
  };
}

/**
 * Parse text dán tay — mỗi dòng 1 từ, các cột cách nhau bởi dấu `|`.
 * Không có header (khác với file Excel thật) — mọi dòng đều là dữ liệu.
 */
export function parseTextRows(text: string): RawVocabRow[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => cellsToRawVocabRow(line.split("|").map((cell) => cell.trim())));
}

/**
 * Đọc file Excel thật (.xlsx/.xls) — BỎ QUA dòng đầu tiên (header),
 * đọc dữ liệu từ dòng 2 trở đi (đã chốt với user).
 */
export async function parseExcelFile(file: File): Promise<RawVocabRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  // header: 1 => trả về mảng-của-mảng (array of arrays) theo đúng vị trí ô,
  // không cố suy luận tên cột từ dòng đầu — vì mình tự bỏ dòng đầu ở bước sau.
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  return rows.slice(1).map(cellsToRawVocabRow);
}

/**
 * 1 dòng hợp lệ khi có đủ 2 trường bắt buộc: romaji và ý nghĩa
 * (khớp ràng buộc NOT NULL ở Backend — erd.md mục 3.7).
 */
export function isRowValid(row: RawVocabRow): boolean {
  return row.romaji.trim().length > 0 && row.meaning.trim().length > 0;
}

/**
 * Xuất danh sách từ vựng ra file .xlsx — CÓ dòng header, tên file = tên chủ đề
 * (đã chốt với user). Chỉ nên gọi với danh sách ĐẦY ĐỦ (không phải 1 trang phân trang).
 */
export function exportVocabulariesToExcel(topicName: string, words: VocabularyDto[]): void {
  const header = ["Hiragana", "Katakana", "Kanji", "Romaji", "Ý nghĩa", "Ghi chú"];
  const rows = words.map((w) => [
    w.hiragana ?? "",
    w.katakana ?? "",
    w.kanji ?? "",
    w.romaji,
    w.meaning,
    w.note ?? "",
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Từ vựng");

  const safeName = topicName.trim() || "chu-de";
  XLSX.writeFile(workbook, `${safeName}.xlsx`);
}