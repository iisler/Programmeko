using System.Net;
using System.Net.Mail;
using System.Text;
using Microsoft.Extensions.Options;

namespace PlanMee.API.Services.Email;

public class SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger) : IAppEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var o = options.Value;
        if (string.IsNullOrWhiteSpace(o.Smtp.Host))
            throw new InvalidOperationException("Email:Smtp:Host ayarlı değil.");

        using var client = new SmtpClient(o.Smtp.Host, o.Smtp.Port) { EnableSsl = o.Smtp.EnableSsl };
        if (!string.IsNullOrEmpty(o.Smtp.Username))
            client.Credentials = new NetworkCredential(o.Smtp.Username, o.Smtp.Password);

        using var mail = new MailMessage
        {
            From = new MailAddress(o.From, o.FromName, Encoding.UTF8),
            Subject = message.Subject,
            SubjectEncoding = Encoding.UTF8,
            Body = message.TextBody,
            BodyEncoding = Encoding.UTF8,
            IsBodyHtml = false
        };
        mail.To.Add(message.To);
        mail.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(message.HtmlBody, Encoding.UTF8, "text/html"));

        await client.SendMailAsync(mail, ct);
        logger.LogInformation("E-posta gönderildi: {Subject}", message.Subject);
    }
}
