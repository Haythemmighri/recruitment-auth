using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using RecruitmentAuth.Application;
using RecruitmentAuth.Infrastructure;
using DotNetEnv;

var builder = WebApplication.CreateBuilder(args);

// Load .env file
Env.Load();
builder.Configuration.AddEnvironmentVariables();

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Clean Architecture Layer Services
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// Add caching for 2FA codes
builder.Services.AddMemoryCache();

// Add Authentication
var jwtSecret = builder.Configuration["JWT_ACCESS_SECRET"];
if (string.IsNullOrEmpty(jwtSecret))
{
    // Fallback for development if not in .env
    jwtSecret = "super_secret_jwt_key_that_is_long_enough_for_hmac_sha256";
    builder.Configuration["JWT_ACCESS_SECRET"] = jwtSecret;
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false, // Set to true and configure in production
            ValidateAudience = false, // Set to true and configure in production
            ClockSkew = TimeSpan.Zero
        };
        
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies["access_token"] ?? 
                                context.Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "");
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// Add CORS
var clientUrl = builder.Configuration["CLIENT_URL"] ?? "http://localhost:4200";
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClient", policy =>
    {
        policy.WithOrigins(clientUrl)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowClient");

app.UseAuthentication();
app.UseAuthorization();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<RecruitmentAuth.Infrastructure.Persistence.RecruitmentAuthContext>();
    await RecruitmentAuth.Infrastructure.Persistence.DbInitializer.SeedAsync(context);
}

app.MapControllers();

app.Run();
