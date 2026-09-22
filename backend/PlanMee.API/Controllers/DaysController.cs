using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlanMee.API.Data;
using PlanMee.API.DTOs;
using PlanMee.API.Models;

namespace PlanMee.API.Controllers;

[ApiController]
[Route("api/days")]
[Authorize]
public class DaysController(AppDbContext db) : ControllerBase
{
    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("{date}")]
    public async Task<IActionResult> GetDay(string date)
    {
        if (!DateOnly.TryParse(date, out var d)) return BadRequest("Geçersiz tarih");
        var day = await GetOrCreateDay(d);
        return Ok(MapDay(day, date));
    }

    [HttpGet("week/{monday}")]
    public async Task<IActionResult> GetWeek(string monday)
    {
        if (!DateOnly.TryParse(monday, out var start)) return BadRequest("Geçersiz tarih");
        var dates = Enumerable.Range(0, 7).Select(i => start.AddDays(i)).ToList();
        var days = await db.Days
            .Include(d => d.StudyEntries)
            .Include(d => d.TrainingEntries)
            .Include(d => d.Events)
            .Where(d => d.UserId == UserId && dates.Contains(d.Date))
            .ToListAsync();

        var result = dates.Select(date =>
        {
            var day = days.FirstOrDefault(d => d.Date == date);
            return new WeekSummaryDto(
                date.ToString("yyyy-MM-dd"),
                day?.StudyEntries.Sum(e => e.Minutes) ?? 0,
                day?.StudyEntries.Count ?? 0,
                day?.TrainingEntries.Count > 0,
                day?.TrainingEntries.Count ?? 0,
                day?.Events.Count ?? 0
            );
        });
        return Ok(result);
    }

    [HttpPost("{date}/entries")]
    public async Task<IActionResult> AddEntry(string date, AddStudyEntryDto dto)
    {
        if (!DateOnly.TryParse(date, out var d)) return BadRequest();
        var day = await GetOrCreateDay(d);
        var entry = new StudyEntry { DayId = day.Id, Subject = dto.Subject, Topic = dto.Topic, Minutes = dto.Minutes, Status = "todo" };
        db.StudyEntries.Add(entry);
        await db.SaveChangesAsync();
        return Ok(new StudyEntryDto(entry.Id, entry.Subject, entry.Topic, entry.Minutes, entry.Status));
    }

    [HttpDelete("{date}/entries/{id}")]
    public async Task<IActionResult> DeleteEntry(string date, int id)
    {
        var entry = await db.StudyEntries.Include(e => e.Day)
            .FirstOrDefaultAsync(e => e.Id == id && e.Day!.UserId == UserId);
        if (entry == null) return NotFound();
        db.StudyEntries.Remove(entry);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{date}/entries/{id}/status")]
    public async Task<IActionResult> PatchStatus(string date, int id, PatchStatusDto dto)
    {
        var valid = new[] { "todo", "inprogress", "done" };
        if (!valid.Contains(dto.Status)) return BadRequest("Geçersiz durum");
        var entry = await db.StudyEntries.Include(e => e.Day)
            .FirstOrDefaultAsync(e => e.Id == id && e.Day!.UserId == UserId);
        if (entry == null) return NotFound();
        entry.Status = dto.Status;
        await db.SaveChangesAsync();
        return Ok(new StudyEntryDto(entry.Id, entry.Subject, entry.Topic, entry.Minutes, entry.Status));
    }

    [HttpPost("{date}/training")]
    public async Task<IActionResult> AddTraining(string date, AddTrainingDto dto)
    {
        if (!DateOnly.TryParse(date, out var d)) return BadRequest();
        var day = await GetOrCreateDay(d);
        var entry = new TrainingEntry { DayId = day.Id, Type = dto.Type, Minutes = dto.Minutes, Note = dto.Note };
        db.TrainingEntries.Add(entry);
        await db.SaveChangesAsync();
        return Ok(new TrainingEntryDto(entry.Id, entry.Type, entry.Minutes, entry.Note));
    }

    [HttpDelete("{date}/training/{id}")]
    public async Task<IActionResult> DeleteTraining(string date, int id)
    {
        var entry = await db.TrainingEntries.Include(e => e.Day)
            .FirstOrDefaultAsync(e => e.Id == id && e.Day!.UserId == UserId);
        if (entry == null) return NotFound();
        db.TrainingEntries.Remove(entry);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{date}/events")]
    public async Task<IActionResult> AddEvent(string date, AddEventDto dto)
    {
        if (!DateOnly.TryParse(date, out var d)) return BadRequest();
        var day = await GetOrCreateDay(d);
        var ev = new Event { DayId = day.Id, Title = dto.Title, Time = dto.Time, Note = dto.Note };
        db.Events.Add(ev);
        await db.SaveChangesAsync();
        return Ok(new EventDto(ev.Id, ev.Title, ev.Time, ev.Note));
    }

    [HttpPut("{date}/events/{id}")]
    public async Task<IActionResult> UpdateEvent(string date, int id, UpdateEventDto dto)
    {
        var ev = await db.Events.Include(e => e.Day)
            .FirstOrDefaultAsync(e => e.Id == id && e.Day!.UserId == UserId);
        if (ev == null) return NotFound();
        ev.Title = dto.Title; ev.Time = dto.Time; ev.Note = dto.Note;
        await db.SaveChangesAsync();
        return Ok(new EventDto(ev.Id, ev.Title, ev.Time, ev.Note));
    }

    [HttpDelete("{date}/events/{id}")]
    public async Task<IActionResult> DeleteEvent(string date, int id)
    {
        var ev = await db.Events.Include(e => e.Day)
            .FirstOrDefaultAsync(e => e.Id == id && e.Day!.UserId == UserId);
        if (ev == null) return NotFound();
        db.Events.Remove(ev);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<Day> GetOrCreateDay(DateOnly date)
    {
        var day = await db.Days
            .Include(d => d.StudyEntries)
            .Include(d => d.TrainingEntries)
            .Include(d => d.Events)
            .FirstOrDefaultAsync(d => d.UserId == UserId && d.Date == date);
        if (day != null) return day;
        day = new Day { UserId = UserId, Date = date };
        db.Days.Add(day);
        await db.SaveChangesAsync();
        return day;
    }

    private static DayDto MapDay(Day day, string dateStr) => new(
        dateStr,
        day.StudyEntries.Select(e => new StudyEntryDto(e.Id, e.Subject, e.Topic, e.Minutes, e.Status)).ToList(),
        day.TrainingEntries.Select(e => new TrainingEntryDto(e.Id, e.Type, e.Minutes, e.Note)).ToList(),
        day.Events.Select(e => new EventDto(e.Id, e.Title, e.Time, e.Note)).ToList()
    );
}
