using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PlanMee.API.Data;
using PlanMee.API.Infrastructure;
using PlanMee.API.Models;
using PlanMee.API.Services;
using PlanMee.API.Services.Email;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddIdentity<User, IdentityRole>(opt =>
{
    opt.Password.RequireDigit = false;
    opt.Password.RequireUppercase = false;
    opt.Password.RequireNonAlphanumeric = false;
    opt.Password.RequiredLength = 6;
    opt.User.RequireUniqueEmail = true;
    // Yeni hesaplarda kullanıcı adı = e-posta (görünen ad ayrı DisplayName alanında).
    // Boş bırakmak karakter kısıtını kaldırır; eski hesapların Türkçe karakterli kullanıcı adları da geçerli kalır.
    opt.User.AllowedUserNameCharacters = "";
    // Giriş için e-posta doğrulaması zorunlu değil (doğrulanmamış kullanıcı token alır ama
    // aile/plan uç noktaları [RequireVerifiedEmail] ile kapalıdır, "E-postanı doğrula" ekranı gösterilir).
    opt.SignIn.RequireConfirmedEmail = false;
    opt.Lockout.MaxFailedAccessAttempts = 5;
    opt.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    opt.Lockout.AllowedForNewUsers = true;
    opt.Tokens.EmailConfirmationTokenProvider = EmailConfirmationTokenProvider<User>.ProviderName;
})
.AddErrorDescriber<TurkishIdentityErrorDescriber>()
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders()
.AddTokenProvider<EmailConfirmationTokenProvider<User>>(EmailConfirmationTokenProvider<User>.ProviderName);

// Şifre sıfırlama bağlantısı 1 saat geçerli (e-posta doğrulama belirteci ayrı: 2 gün).
builder.Services.Configure<DataProtectionTokenProviderOptions>(o => o.TokenLifespan = TimeSpan.FromHours(1));
builder.Services.Configure<EmailConfirmationTokenProviderOptions>(o => o.TokenLifespan = TimeSpan.FromDays(2));

// Uygulama ve e-posta ayarları
builder.Services.Configure<AppOptions>(builder.Configuration.GetSection(AppOptions.Section));
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.Section));
var emailProvider = builder.Configuration[$"{EmailOptions.Section}:Provider"] ?? "Log";
if (emailProvider.Equals("Smtp", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddScoped<IAppEmailSender, SmtpEmailSender>();
else
    builder.Services.AddScoped<IAppEmailSender, LogEmailSender>();

builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<SendThrottle>();
builder.Services.AddScoped<MemberContext>();
builder.Services.AddScoped<FamilyService>();
builder.Services.AddScoped<InvitationService>();
builder.Services.AddScoped<AuthTokenService>();
builder.Services.AddPlanMeeRateLimiting(builder.Configuration);

// Anahtar repoda tutulmaz: yerelde `dotnet user-secrets`, sunucuda Jwt__Key ortam değişkeni.
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrEmpty(jwtKey) || jwtKey.Length < 32)
    throw new InvalidOperationException(
        "Jwt:Key ayarlı değil veya 32 karakterden kısa. Yerelde: dotnet user-secrets set \"Jwt:Key\" \"<uzun-rastgele-değer>\"");
builder.Services.AddAuthentication(opt =>
{
    opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    opt.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(opt =>
{
    opt.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
    // Şifre değişince (security stamp yenilenir) eski token'lar geçersiz olur.
    opt.Events = new JwtBearerEvents
    {
        OnTokenValidated = async ctx =>
        {
            var userManager = ctx.HttpContext.RequestServices.GetRequiredService<UserManager<User>>();
            var userId = ctx.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            var stamp = ctx.Principal?.FindFirstValue(AuthClaims.SecurityStamp);
            var user = userId == null ? null : await userManager.FindByIdAsync(userId);
            if (user == null || stamp == null || stamp != await userManager.GetSecurityStampAsync(user))
            {
                ctx.Fail("Oturum geçersiz");
                return;
            }
            // E-posta doğrulama durumu her istekte veritabanından okunur (doğrulayınca yeni token gerekmez).
            (ctx.Principal!.Identity as ClaimsIdentity)?.AddClaim(
                new Claim(AuthClaims.EmailVerified, user.EmailConfirmed ? "true" : "false"));
        }
    };
});

builder.Services.AddAuthorization();
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false)));

var frontendOrigin = new Uri(builder.Configuration[$"{AppOptions.Section}:FrontendBaseUrl"] ?? "http://localhost:5173")
    .GetLeftPart(UriPartial.Authority);
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p =>
        p.WithOrigins(frontendOrigin)
         .AllowAnyHeader()
         .AllowAnyMethod()));

var app = builder.Build();

if (!app.Environment.IsDevelopment() && emailProvider.Equals("Log", StringComparison.OrdinalIgnoreCase))
    app.Logger.LogWarning("Email:Provider=Log: e-postalar gönderilmiyor, yalnızca loglanıyor. Üretimde Smtp kullanın.");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseCors();
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();

app.Run();
