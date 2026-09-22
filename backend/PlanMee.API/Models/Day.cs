namespace PlanMee.API.Models;

public class Day
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public DateOnly Date { get; set; }
    public User? User { get; set; }
    public List<StudyEntry> StudyEntries { get; set; } = [];
    public List<TrainingEntry> TrainingEntries { get; set; } = [];
    public List<Event> Events { get; set; } = [];
}
