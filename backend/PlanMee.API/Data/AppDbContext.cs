using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PlanMee.API.Models;

namespace PlanMee.API.Data;

public class AppDbContext : IdentityDbContext<User>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Subject> Subjects => Set<Subject>();
    public DbSet<Day> Days => Set<Day>();
    public DbSet<StudyEntry> StudyEntries => Set<StudyEntry>();
    public DbSet<TrainingEntry> TrainingEntries => Set<TrainingEntry>();
    public DbSet<Event> Events => Set<Event>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Day>()
            .HasIndex(d => new { d.UserId, d.Date })
            .IsUnique();
    }
}
