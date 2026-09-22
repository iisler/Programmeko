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

public record AddStudyEntryDto(string Subject, string Topic, int Minutes);
public record PatchStatusDto(string Status);
public record AddTrainingDto(string Type, int Minutes, string Note);
public record AddEventDto(string Title, string Time, string Note);
public record UpdateEventDto(string Title, string Time, string Note);
