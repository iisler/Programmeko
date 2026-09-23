using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using PlanMee.API.DTOs;
using PlanMee.API.Models;

namespace PlanMee.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(UserManager<User> userManager, IConfiguration config) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        var user = new User { UserName = dto.Username, Email = dto.Email };
        var result = await userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));
        return Ok(new { message = "Kayıt başarılı" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var user = await userManager.FindByEmailAsync(dto.Email);
        if (user == null || !await userManager.CheckPasswordAsync(user, dto.Password))
            return Unauthorized("E-posta veya şifre hatalı");

        var token = CreateToken(user);
        return Ok(new AuthResponseDto(token, user.Email!, user.UserName!));
    }

    // GEÇİCİ: Doğrulamasız şifre sıfırlama. E-postayı bilen herkes şifreyi değiştirebilir,
    // bu yüzden yalnızca Auth:AllowDirectPasswordReset=true olan ortamda (Development) açık.
    // E-posta doğrulamalı akış gelince kaldırılacak.
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)
    {
        if (!config.GetValue<bool>("Auth:AllowDirectPasswordReset"))
            return NotFound();

        var user = await userManager.FindByEmailAsync(dto.Email);
        if (user == null)
            return BadRequest("Bu e-posta ile kayıtlı hesap bulunamadı");

        var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
        var result = await userManager.ResetPasswordAsync(user, resetToken, dto.NewPassword);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok(new { message = "Şifre güncellendi" });
    }

    private string CreateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim(ClaimTypes.Name, user.UserName!)
        };
        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
