// deno-lint-ignore-file no-explicit-any
import { json } from "sift";
import { createClient } from "supabase";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

const { data: monthData, error: _monthError } = await supabase
  .from("Months")
  .select("name, is_voting_open, is_noms_open")
  .eq("is_current", true);
//console.log(JSON.stringify(data));

const currentMonth = monthData![0].name;
const isVotingOpen = monthData![0].is_voting_open;
const isNominationsOpen = monthData![0].is_noms_open;

const { data: nominations, error: _gameListError } = await supabase
  .from("Game Nominations")
  .select("record_id, Name")
  .contains("Month", [currentMonth]);

const calculateVoteScores = (allVotes: any) => {
  const voteScores = nominations!.map((game: any) => ({
    gameId: game.record_id,
    gameName: game.Name,
    score: 0,
  }));

  allVotes!.forEach((vote: any) => {
    if (vote.vote1) {
      voteScores.find((score: any) => score.gameId === vote.vote1)!.score += 3;
    }
    if (vote.vote2) {
      voteScores.find((score: any) => score.gameId === vote.vote2)!.score += 2;
    }
    if (vote.vote3) {
      voteScores.find((score: any) => score.gameId === vote.vote3)!.score += 1;
    }
  });

  return voteScores;
};

export const endVote = async () => {
  const { data: allVotes, error: _allVoteError } = await supabase
    .from("new_votes")
    .select("vote1, vote2, vote3")
    .eq("vote_month", currentMonth);
  const { error: _updateMonthsError } = await supabase
    .from("Months")
    .update({ is_voting_open: false })
    .eq("name", currentMonth);

  console.log(_updateMonthsError);
  const voteScores = calculateVoteScores(allVotes!).sort(
    (a: any, b: any) => b.score - a.score
  );

  const winner = voteScores[0].gameName;

  return json({
    type: 4,
    data: {
      content: `The winner of the vote for ${currentMonth} is ${winner}!`,
    },
  });
};

export const listGames = () => {
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
  if (!isNominationsOpen) {
    return json({
      // Type 4 responds with the below message retaining the user's
      type: 4,
      data: {
        content: `Nominations are currently closed for ${currentMonth}.`,
      },
    });
  }
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

  const { data: _data, error: _error } = await supabase
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

  if (!isVotingOpen) {
    return json({
      type: 7,
      data: {
        content: `Voting is currently closed for ${currentMonth}. \n\n Get outta here, ${member.user.global_name}!`,
      },
    });
  }

  // Pull the user's existing votes from the database
  const { data: existingVotes, error: _fetchError } = await supabase
    .from("new_votes")
    .select("vote1, vote2, vote3")
    .eq("vote_id", member.user.username + currentMonth)
    .single();

  if (data.custom_id === "vote_1_select") {
    // find the vote id of the game they voted for
    const voteGameId = nominations!.find(
      (game: any) => game.Name === data.values[0]
    )!.record_id;

    // Check if this game is already selected for vote2 or vote3
    if (
      (existingVotes?.vote2 && existingVotes.vote2 === voteGameId) ||
      (existingVotes?.vote3 && existingVotes.vote3 === voteGameId)
    ) {
      return json({
        type: 4,
        data: {
          content:
            "You can't vote for the same game more than once! Please select a different game.",
          flags: 64, // Ephemeral flag - only visible to the user
        },
      });
    }

    const { data: upsertObj, error: _error } = await supabase
      .from("new_votes")
      .upsert([
        {
          discord_user: member.user.username,
          vote1: voteGameId,
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
    const voteGameId = nominations!.find(
      (game: any) => game.Name === data.values[0]
    )!.record_id;

    // Check if this game is already selected for vote1 or vote3
    if (
      (existingVotes?.vote1 && existingVotes.vote1 === voteGameId) ||
      (existingVotes?.vote3 && existingVotes.vote3 === voteGameId)
    ) {
      return json({
        type: 4,
        data: {
          content:
            "You can't vote for the same game more than once! Please select a different game.",
          flags: 64, // Ephemeral flag - only visible to the user
        },
      });
    }

    const { data: upsertObj, error: _error } = await supabase
      .from("new_votes")
      .upsert([
        {
          discord_user: member.user.username,
          vote2: voteGameId,
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
    const voteGameId = nominations!.find(
      (game: any) => game.Name === data.values[0]
    )!.record_id;

    // Check if this game is already selected for vote1 or vote2
    if (
      (existingVotes?.vote1 && existingVotes.vote1 === voteGameId) ||
      (existingVotes?.vote2 && existingVotes.vote2 === voteGameId)
    ) {
      return json({
        type: 4,
        data: {
          content:
            "You can't vote for the same game more than once! Please select a different game.",
          flags: 64, // Ephemeral flag - only visible to the user
        },
      });
    }

    const { data: upsertObj, error: _error } = await supabase
      .from("new_votes")
      .upsert([
        {
          discord_user: member.user.username,
          vote3: voteGameId,
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
    const { data: allVotes, error: _allVoteError } = await supabase
      .from("new_votes")
      .select("vote1, vote2, vote3")
      .eq("vote_month", currentMonth);
    const voteScores = calculateVoteScores(allVotes!).sort(
      (a: any, b: any) => b.score - a.score
    );

    return json({
      type: 7,
      data: {
        content: `Thanks for voting, ${
          member.user.global_name
        }! \n Here are the current vote scores: \n\n${voteScores
          .map((vote) => vote.score + ": " + vote.gameName)
          .join("\n")}
          \n You can vote change your votes at any time before voting closes. Use /my-gc-votes to see your current votes.`,
      },
    });
  }
  return json({ error: "bad component interaction" }, { status: 400 });
};

export const voteForGame = async () => {
  // close nominations for current month
  await supabase
    .from("Months")
    .update({ is_noms_open: false })
    .eq("name", currentMonth);

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
      content:
        "Vote for your top games! \n Remember, choosing a game in a dropdown records that vote, but you can change it at any time.",
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
              label: "Update Vote Scores",
            },
          ],
        },
      ],
    },
  });
};

export const vetoGame = async (command: any, member: any) => {
  const gameName = command.options.find(
    (option: { name: string; value: string }) => option.name === "game_name"
  );

  const message = `${member.user.global_name} has vetoed ${gameName.value} for ${currentMonth}!`;

  const { data: deleteData, error: deleteError } = await supabase
    .from("Game Nominations")
    .delete()
    .eq("Name", gameName.value)
    .contains("Month", [currentMonth])
    .select();

  if (deleteError) {
    console.log(deleteError);
    return json({
      // Type 4 responds with the below message retaining the user's
      // input at the top.
      type: 4,
      data: {
        content: "Something went wrong!",
      },
    });
  }
  if (deleteData.length === 0) {
    return json({
      type: 4,
      data: {
        content: `${gameName.value} could not be found to be removed.`,
      },
    });
  }
  return json({
    type: 4,
    data: {
      content: message,
    },
  });
};

export const myGcVotes = async (member: any) => {
  // Fetch the user's votes for the current month
  const { data: userVotes, error: _fetchError } = await supabase
    .from("new_votes")
    .select("vote1, vote2, vote3")
    .eq("vote_id", member.user.username + currentMonth)
    .single();

  if (
    !userVotes ||
    (!userVotes.vote1 && !userVotes.vote2 && !userVotes.vote3)
  ) {
    return json({
      type: 4,
      data: {
        content: `You haven't cast any votes for ${currentMonth} yet!`,
        flags: 64, // Ephemeral flag - only visible to the user
      },
    });
  }

  // Get the game names for the votes
  const vote1Game = userVotes.vote1
    ? nominations!.find((game: any) => game.record_id === userVotes.vote1)?.Name
    : null;
  const vote2Game = userVotes.vote2
    ? nominations!.find((game: any) => game.record_id === userVotes.vote2)?.Name
    : null;
  const vote3Game = userVotes.vote3
    ? nominations!.find((game: any) => game.record_id === userVotes.vote3)?.Name
    : null;

  // Build the message
  let message = `Here are your votes for ${currentMonth}:\n\n`;
  if (vote1Game) message += `**1st Choice (3 points):** ${vote1Game}\n`;
  if (vote2Game) message += `**2nd Choice (2 points):** ${vote2Game}\n`;
  if (vote3Game) message += `**3rd Choice (1 point):** ${vote3Game}\n`;

  return json({
    type: 4,
    data: {
      content: message,
      flags: 64, // Ephemeral flag - only visible to the user
    },
  });
};
