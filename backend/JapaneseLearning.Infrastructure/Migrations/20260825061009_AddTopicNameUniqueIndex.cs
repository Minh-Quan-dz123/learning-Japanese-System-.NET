using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JapaneseLearning.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTopicNameUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"CREATE UNIQUE INDEX ix_topics_user_id_lower_trim_name
                  ON ""Topics"" (""UserId"", LOWER(TRIM(""Name"")));"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                @"DROP INDEX ix_topics_user_id_lower_trim_name;"
            );
        }
    }
}