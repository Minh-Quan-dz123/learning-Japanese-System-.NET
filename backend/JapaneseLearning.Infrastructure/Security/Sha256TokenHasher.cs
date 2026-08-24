using System.Security.Cryptography;
using System.Text;
using JapaneseLearning.Application.Common.Interfaces;

namespace JapaneseLearning.Infrastructure.Security;

// Vì sao KHÔNG dùng BCrypt cho refresh token như password?
// BCrypt sinh salt ngẫu nhiên mỗi lần gọi -> 2 lần hash cùng 1 chuỗi ra 2 kết quả khác nhau
// -> không thể WHERE token_hash = @hash để tra thẳng trong DB (phải quét hết bảng, O(n)).
// SHA256 tất định (deterministic): cùng input luôn ra cùng output -> tra bằng index, giống dùng
// HashMap<key,...> thay vì duyệt tuần tự List.
public class Sha256TokenHasher : ITokenHasher
{
    public string Hash(string plainToken)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(plainToken));
        return Convert.ToHexString(hashBytes);
    }
}