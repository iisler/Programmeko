using Microsoft.AspNetCore.Identity;

namespace PlanMee.API.Models;

public class User : IdentityUser
{
    // Kullanıcının kendi görünen adı. Aile içindeki ad FamilyMember.DisplayName'dedir.
    public string DisplayName { get; set; } = "";
}
