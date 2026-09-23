namespace PlanMee.API.DTOs;

public record RegisterDto(string Email, string Password, string Username);
public record LoginDto(string Email, string Password);
public record ResetPasswordDto(string Email, string NewPassword);
public record AuthResponseDto(string Token, string Email, string Username);
