using System.ComponentModel.DataAnnotations;

namespace PlanMee.API.DTOs;

public record StudyEntryDto(int Id, string Subject, string Topic, int Minutes, string Status);
public record TrainingEntryDto(int Id, string Type, int Minutes, string Note);
public record EventDto(int Id, string Title, string Time, string Note);

public record DayDto(
    string Date,
    List<StudyEntryDto> StudyEntries,
    List<TrainingEntryDto> TrainingEntries,
    List<EventDto> Events
);

public record WeekSummaryDto(string Date, int StudyMinutes, int EntryCount, bool TrainingDone, int TrainingCount, int EventCount);

// Bir kayıt en fazla bir tam gün (1440 dk) sürebilir.
public record AddStudyEntryDto(
    [Required(ErrorMessage = "Ders seçin"), StringLength(100, ErrorMessage = "Ders adı en fazla 100 karakter olabilir")] string Subject,
    [StringLength(200, ErrorMessage = "Konu en fazla 200 karakter olabilir")] string? Topic,
    [Range(1, 1440, ErrorMessage = "Süre 1 ile 1440 dakika arasında olmalı")] int Minutes);

public record PatchStatusDto([Required] string Status);

public record AddTrainingDto(
    [Required(ErrorMessage = "Antrenman türü seçin"), StringLength(50, ErrorMessage = "Antrenman türü en fazla 50 karakter olabilir")] string Type,
    [Range(1, 1440, ErrorMessage = "Süre 1 ile 1440 dakika arasında olmalı")] int Minutes,
    [StringLength(500, ErrorMessage = "Not en fazla 500 karakter olabilir")] string? Note);

public record AddEventDto(
    [Required(ErrorMessage = "Etkinlik adı girin"), StringLength(150, ErrorMessage = "Etkinlik adı en fazla 150 karakter olabilir")] string Title,
    [StringLength(20, ErrorMessage = "Saat en fazla 20 karakter olabilir")] string? Time,
    [StringLength(500, ErrorMessage = "Not en fazla 500 karakter olabilir")] string? Note);

public record UpdateEventDto(
    [Required(ErrorMessage = "Etkinlik adı girin"), StringLength(150, ErrorMessage = "Etkinlik adı en fazla 150 karakter olabilir")] string Title,
    [StringLength(20, ErrorMessage = "Saat en fazla 20 karakter olabilir")] string? Time,
    [StringLength(500, ErrorMessage = "Not en fazla 500 karakter olabilir")] string? Note);
