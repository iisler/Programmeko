using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlanMee.API.Data;
using PlanMee.API.Models;

namespace PlanMee.API.Controllers;

[ApiController]
[Route("api/subjects")]
[Authorize]
public class SubjectsController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private static readonly StringComparer TurkishIgnoreCase =
        StringComparer.Create(new System.Globalization.CultureInfo("tr-TR"), ignoreCase: true);

    private static readonly string[] DefaultSubjects =
        ["Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Türkçe", "Tarih", "Coğrafya", "Felsefe", "İngilizce"];

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var subjects = await db.Subjects
            .Where(s => s.UserId == UserId)
            .Select(s => new { s.Id, s.Name })
            .ToListAsync();

        if (subjects.Count == 0)
        {
            var defaults = DefaultSubjects.Select(n => new Subject { UserId = UserId, Name = n }).ToList();
            db.Subjects.AddRange(defaults);
            await db.SaveChangesAsync();
            subjects = defaults.Select(s => new { s.Id, s.Name }).ToList();
        }

        return Ok(subjects);
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] string name)
    {
        name = (name ?? "").Trim();
        if (string.IsNullOrEmpty(name)) return BadRequest("Ders adı boş olamaz");
        if (name.Length > 100) return BadRequest("Ders adı en fazla 100 karakter olabilir");
        // Türkçe kurallarıyla büyük/küçük harf duyarsız karşılaştırma (ör. "İngilizce" = "ingilizce")
        var existing = await db.Subjects.Where(s => s.UserId == UserId).Select(s => s.Name).ToListAsync();
        if (existing.Any(n => TurkishIgnoreCase.Equals(n.Trim(), name)))
            return Conflict($"\"{name}\" zaten ders listende var");
        var subject = new Subject { UserId = UserId, Name = name };
        db.Subjects.Add(subject);
        await db.SaveChangesAsync();
        return Ok(new { subject.Id, subject.Name });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var subject = await db.Subjects.FirstOrDefaultAsync(s => s.Id == id && s.UserId == UserId);
        if (subject == null) return NotFound();
        db.Subjects.Remove(subject);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
