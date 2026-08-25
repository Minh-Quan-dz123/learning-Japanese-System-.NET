// Tách 1 chuỗi "meaning" (VD "cầu;đũa/đầu mút") thành mảng các nghĩa riêng lẻ.
// Mirror lại đúng logic MeaningParser.cs ở Backend (Application/Common/Utils/MeaningParser.cs)
// — tách theo ";" hoặc "/", trim từng nghĩa, bỏ nghĩa rỗng sau khi trim.
export function splitMeanings(meaning: string): string[] {
  return meaning
    .split(/[;/]/)
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
}