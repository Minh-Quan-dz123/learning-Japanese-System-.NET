// Khớp với UserDto bên Backend (JapaneseLearning.Application/Features/Auth/Dtos/UserDto.cs)
export interface UserDto {
  id: string;
  username: string;
  role: "Admin" | "User";
}

// Khớp với LoginRequest bên Backend
export interface LoginRequest {
  username: string;
  password: string;
}

// Khớp với RegisterRequest bên Backend
export interface RegisterRequest {
  username: string;
  password: string;
}

// Khớp với AuthResponse bên Backend — trả về sau khi login/register thành công
export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}