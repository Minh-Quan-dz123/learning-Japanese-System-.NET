namespace JapaneseLearning.Application.Common.Utils;

/// <summary>
/// Tách chuỗi "meaning" (nhiều nghĩa gộp trong 1 dòng, phân tách bởi ';' hoặc '/')
/// thành danh sách từng nghĩa riêng lẻ, đã trim khoảng trắng thừa 2 đầu.
/// Dùng chung cho: check-duplicate (so overlap nghĩa), practice/prepare (sau này).
/// Xem quy tắc gốc tại erd.md mục 3.7.
/// </summary>
public static class MeaningParser
{
    private static readonly char[] Separators = [';', '/'];

    /// <summary>
    /// Tách "cầu;đũa/đầu mút" -> ["cầu", "đũa", "đầu mút"]
    /// Đã trim từng phần tử, tự loại bỏ phần tử rỗng nếu có dấu phân tách thừa.
    /// </summary>
    public static List<string> Split(string meaning)
    {
        return meaning
            .Split(Separators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
    }

    /// <summary>
    /// Kiểm tra 2 chuỗi meaning có ít nhất 1 nghĩa chung không (so sánh không phân biệt hoa/thường).
    /// Dùng cho logic check-duplicate (erd.md mục 3.7).
    /// </summary>
    public static bool HasOverlap(string meaningA, string meaningB)
    {
        var setA = Split(meaningA).Select(m => m.ToLowerInvariant()).ToHashSet();
        var setB = Split(meaningB).Select(m => m.ToLowerInvariant());
        return setB.Any(setA.Contains);
    }
}