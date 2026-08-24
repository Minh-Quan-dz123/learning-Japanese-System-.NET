using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JapaneseLearning.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddForeignKeyConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Vocabularies_TopicId",
                table: "Vocabularies",
                column: "TopicId");

            migrationBuilder.CreateIndex(
                name: "IX_Topics_UserId",
                table: "Topics",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PracticeSessions_UserId",
                table: "PracticeSessions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PracticeAnswers_CharacterId",
                table: "PracticeAnswers",
                column: "CharacterId");

            migrationBuilder.CreateIndex(
                name: "IX_PracticeAnswers_SelectedCharacterId",
                table: "PracticeAnswers",
                column: "SelectedCharacterId");

            migrationBuilder.CreateIndex(
                name: "IX_PracticeAnswers_SessionId",
                table: "PracticeAnswers",
                column: "SessionId");

            migrationBuilder.AddForeignKey(
                name: "FK_PracticeAnswers_Characters_CharacterId",
                table: "PracticeAnswers",
                column: "CharacterId",
                principalTable: "Characters",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PracticeAnswers_Characters_SelectedCharacterId",
                table: "PracticeAnswers",
                column: "SelectedCharacterId",
                principalTable: "Characters",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PracticeAnswers_PracticeSessions_SessionId",
                table: "PracticeAnswers",
                column: "SessionId",
                principalTable: "PracticeSessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PracticeSessions_Users_UserId",
                table: "PracticeSessions",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RefreshTokens_Users_UserId",
                table: "RefreshTokens",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Topics_Users_UserId",
                table: "Topics",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Vocabularies_Topics_TopicId",
                table: "Vocabularies",
                column: "TopicId",
                principalTable: "Topics",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PracticeAnswers_Characters_CharacterId",
                table: "PracticeAnswers");

            migrationBuilder.DropForeignKey(
                name: "FK_PracticeAnswers_Characters_SelectedCharacterId",
                table: "PracticeAnswers");

            migrationBuilder.DropForeignKey(
                name: "FK_PracticeAnswers_PracticeSessions_SessionId",
                table: "PracticeAnswers");

            migrationBuilder.DropForeignKey(
                name: "FK_PracticeSessions_Users_UserId",
                table: "PracticeSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_RefreshTokens_Users_UserId",
                table: "RefreshTokens");

            migrationBuilder.DropForeignKey(
                name: "FK_Topics_Users_UserId",
                table: "Topics");

            migrationBuilder.DropForeignKey(
                name: "FK_Vocabularies_Topics_TopicId",
                table: "Vocabularies");

            migrationBuilder.DropIndex(
                name: "IX_Vocabularies_TopicId",
                table: "Vocabularies");

            migrationBuilder.DropIndex(
                name: "IX_Topics_UserId",
                table: "Topics");

            migrationBuilder.DropIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens");

            migrationBuilder.DropIndex(
                name: "IX_PracticeSessions_UserId",
                table: "PracticeSessions");

            migrationBuilder.DropIndex(
                name: "IX_PracticeAnswers_CharacterId",
                table: "PracticeAnswers");

            migrationBuilder.DropIndex(
                name: "IX_PracticeAnswers_SelectedCharacterId",
                table: "PracticeAnswers");

            migrationBuilder.DropIndex(
                name: "IX_PracticeAnswers_SessionId",
                table: "PracticeAnswers");
        }
    }
}
