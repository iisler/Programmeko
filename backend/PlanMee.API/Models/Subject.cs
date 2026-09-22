namespace PlanMee.API.Models;

public class Subject
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string Name { get; set; } = "";
    public User? User { get; set; }
}
