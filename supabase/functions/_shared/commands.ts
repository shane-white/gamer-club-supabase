import { json } from "sift";
import { createClient } from "supabase";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

const { data, error } = await supabase
  .from("Months")
  .select("name")
  .eq("is_current", true);
//console.log(JSON.stringify(data));

const currentMonth = data![0].name;

export const nominateGame = async (command: any, member: any) => {
  const gameName = command.options.find(
    (option: { name: string; value: string }) => option.name === "game_name"
  );
  const trailer = command.options.find(
    (option: { name: string; value: string }) => option.name === "trailer"
  );

  let message = `${member.user.username} has nominated ${gameName.value} for ${currentMonth}!`;
  if (trailer) {
    message += ` Here's the trailer: ${trailer.value}`;
  }

  const { data, error } = await supabase
    .from("Game Nominations")
    .insert([{ Name: gameName.value, Trailer: trailer, Month: [currentMonth] }])
    .select();

  return json({
    // Type 4 responds with the below message retaining the user's
    // input at the top.
    type: 4,
    data: {
      content: message,
    },
  });
};

export const voteForGame = async (command: any, member: any) => {
  const user = member.user.username;

  const { data, error } = await supabase
    .from("Game Nominations")
    .select("Name")
    .contains("Month", [currentMonth]);

  const nominatedGameNames = data!.map((game: any) => game.Name);
  const gameOptions = nominatedGameNames.map((gameName: string) => ({
    label: gameName,
    value: gameName,
    description: "Vote for this as your top game!",
  }));

  const gameOptions2 = nominatedGameNames.map((gameName: string) => ({
    label: gameName,
    value: gameName,
    description: "Vote for this a your second game!",
  }));

  const gameOptions3 = nominatedGameNames.map((gameName: string) => ({
    label: gameName,
    value: gameName,
    description: "Vote for this as your third game!",
  }));

  // console.log(gameOptions);
  console.log("There are " + gameOptions.length + " games to vote for.");
  return json({
    // Type 4 responds with the below message retaining the user's
    // input at the top.
    type: 4,

    data: {
      content: "Vote for your top games!",
      components: [
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: "vote_1_select",
              options: gameOptions,
              placeholder: "Select your top choice",
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: "vote_2_select",
              options: gameOptions2,
              placeholder: "Select your second choice",
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: "vote_3_select",
              options: gameOptions3,
              placeholder: "Select your third choice",
            },
          ],
        },
      ],
    },
  });
};
