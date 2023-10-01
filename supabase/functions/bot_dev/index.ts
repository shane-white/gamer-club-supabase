// Sift is a small routing library that abstracts away details like starting a
// listener on a port, and provides a simple function (serve) that has an API
// to invoke a function for a specific path.
import { json, serve, validateRequest } from "sift";
// TweetNaCl is a cryptography library that we use to verify requests
// from Discord.
import nacl from "nacl";
import { nominateGame, voteForGame } from "../_shared/commands.ts";
import J from "https://esm.sh/v127/@supabase/realtime-js@2.7.3/denonext/dist/module/RealtimeChannel.js";

enum DiscordCommandType {
  Ping = 1,
  ApplicationCommand = 2,
  MessageComponent = 3,
}

// For all requests to "/" endpoint, we want to invoke home() handler.
serve({
  "/bot_dev": home,
});

// The main logic of the Discord Slash Command is defined in this function.
async function home(request: Request) {
  // validateRequest() ensures that a request is of POST method and
  // has the following headers.
  const { error } = await validateRequest(request, {
    POST: {
      headers: ["X-Signature-Ed25519", "X-Signature-Timestamp"],
    },
  });
  if (error) {
    return json({ error: error.message }, { status: error.status });
  }

  // verifySignature() verifies if the request is coming from Discord.
  // When the request's signature is not valid, we return a 401 and this is
  // important as Discord sends invalid requests to test our verification.
  const { valid, body } = await verifySignature(request);
  if (!valid) {
    console.log("Invalid request");
    return json(
      { error: "Invalid request" },
      {
        status: 401,
      }
    );
  }

  const { type = 0, data = { options: [] }, member } = JSON.parse(body);
  console.log("Type: " + type);
  // Discord performs Ping interactions to test our application.
  // Type 1 in a request implies a Ping interaction.
  if (type === DiscordCommandType.Ping) {
    console.log("Ping");
    return json({
      type: 1, // Type 1 in a response is a Ping interaction response type.
    });
  }

  // Type 2 in a request is an ApplicationCommand interaction.
  // It implies that a user has issued a command.
  if (type === DiscordCommandType.ApplicationCommand) {
    if (data.name === "nominate") {
      return await nominateGame(data, member);
    }
    if (data.name === "vote") {
      return await voteForGame(data, member);
    }
  }

  if (type === DiscordCommandType.MessageComponent) {
    if (data.custom_id === "vote_1_select") {
      return json({
        type: 7,
        data: {
          content: `${member.username} voted for ${data.values[0]}! as their top choice!`,
        },
      });
    }
    if (data.custom_id === "vote_2_select") {
      return json({
        type: 7,
        data: {
          content: `${member.username} voted for ${data.values[0]}! as their second choice!`,
        },
      });
    }
    if (data.custom_id === "vote_3_select") {
      return json({
        type: 7,
        data: {
          content: `${member.username} voted for ${data.values[0]}! as their third choice!`,
        },
      });
    }
  }

  // We will return a bad request error as a valid Discord request
  // shouldn't reach here.
  return json({ error: "bad request" }, { status: 400 });
}

/** Verify whether the request is coming from Discord. */
async function verifySignature(
  request: Request
): Promise<{ valid: boolean; body: string }> {
  const PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY")!;
  // Discord sends these headers with every request.
  const signature = request.headers.get("X-Signature-Ed25519")!;
  const timestamp = request.headers.get("X-Signature-Timestamp")!;
  const body = await request.text();
  const valid = nacl.sign.detached.verify(
    new TextEncoder().encode(timestamp + body),
    hexToUint8Array(signature),
    hexToUint8Array(PUBLIC_KEY)
  );

  return { valid, body };
}

/** Converts a hexadecimal string to Uint8Array. */
function hexToUint8Array(hex: string) {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16)));
}
