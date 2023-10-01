import { json } from "sift";
import { createClient } from "supabase";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

const { data, error: monthEror } = await supabase
  .from("Months")
  .select("name")
  .eq("is_current", true);
//console.log(JSON.stringify(data));

const currentMonth = data![0].name;

const { data: nominations, error: gameListError } = await supabase
  .from("Game Nominations")
  .select("record_id, Name")
  .contains("Month", [currentMonth]);

export const listGames = async () => {
  const nominatedGameNames = nominations!.map((game: any) => game.Name);
  return json({
    // Type 4 responds with the below message retaining the user's
    // input at the top.
    type: 4,
    data: {
      content: `Here are the games nominated for ${currentMonth}: \n ${nominatedGameNames.join(
        ", \n"
      )}`,
    },
  });
};

export const nominateGame = async (command: any, member: any) => {
  const gameName = command.options.find(
    (option: { name: string; value: string }) => option.name === "game_name"
  );
  const trailer = command.options.find(
    (option: { name: string; value: string }) => option.name === "trailer"
  );

  let message = `${member.user.global_name} has nominated ${gameName.value} for ${currentMonth}!`;
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

export const handleVoting = async (data: any, member: any) => {
  // get game nominations for current month, and their record id

  // map those an array of games with their name and record id

  if (data.custom_id === "vote_1_select") {
    // find the vote id of the game they voted for
    const vote1GameId = nominations!.find(
      (game: any) => game.Name === data.values[0]
    )!.record_id;
    console.log(vote1GameId);
    const { data: upsertObj, error } = await supabase
      .from("new_votes")
      .upsert([
        {
          discord_user: member.user.username,
          vote1: vote1GameId,
          vote_id: member.user.username + currentMonth,
          vote_month: currentMonth,
        },
      ])
      .select();
    console.log(upsertObj);

    return json({
      type: 6,
    });
  }
  if (data.custom_id === "vote_2_select") {
    // find the vote id of the game they voted for
    const vote1GameId = nominations!.find(
      (game: any) => game.Name === data.values[0]
    )!.record_id;
    console.log(vote1GameId);
    const { data: upsertObj, error } = await supabase
      .from("new_votes")
      .upsert([
        {
          discord_user: member.user.username,
          vote2: vote1GameId,
          vote_id: member.user.username + currentMonth,
          vote_month: currentMonth,
        },
      ])
      .select();
    console.log(upsertObj);
    return json({
      type: 6,
    });
  }
  if (data.custom_id === "vote_3_select") {
    // find the vote id of the game they voted for
    const vote1GameId = nominations!.find(
      (game: any) => game.Name === data.values[0]
    )!.record_id;
    console.log(vote1GameId);
    const { data: upsertObj, error } = await supabase
      .from("new_votes")
      .upsert([
        {
          discord_user: member.user.username,
          vote3: vote1GameId,
          vote_id: member.user.username + currentMonth,
          vote_month: currentMonth,
        },
      ])
      .select();
    console.log(upsertObj);
    return json({
      type: 6,
    });
  }
  if (data.custom_id === "vote_submit") {
    return json({
      type: 7,
      data: {
        content: `Thanks for voting, ${member.user.global_name}!`,
      },
    });
  }
  return json({ error: "bad component interaction" }, { status: 400 });
};

export const voteForGame = async () => {
  const nominatedGameNames = nominations!.map((game: any) => game.Name);
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
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              custom_id: "vote_submit",
              label: "Submit Votes",
            },
          ],
        },
      ],
    },
  });
};
