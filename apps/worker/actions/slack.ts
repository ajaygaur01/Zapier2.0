const slackBotToken = process.env.SLACK_BOT_TOKEN;
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

if (!slackBotToken && !slackWebhookUrl) {
  console.warn(
    "Slack not configured: SLACK_BOT_TOKEN or SLACK_WEBHOOK_URL must be set."
  );
}

export async function sendSlackMessage(channel: string, message: string): Promise<void> {
  try {
    if (!channel || !message) {
      throw new Error(`Invalid channel or message: channel=${channel}, message=${message}`);
    }

    // If webhook URL is configured, use it (simpler setup)
    if (slackWebhookUrl) {
      const response = await fetch(slackWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel,
          text: message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook error: ${response.statusText}`);
      }

      console.log(`✅ Slack message sent to channel ${channel}`);
      return;
    }

    // Otherwise use bot token (more flexible, can send to channels/users/DMs)
    if (slackBotToken) {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${slackBotToken}`,
        },
        body: JSON.stringify({
          channel,
          text: message,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      console.log(`✅ Slack message sent to channel ${channel}`, `ts=${result.ts}`);
      return;
    }

    throw new Error("Slack is not configured");
  } catch (err) {
    console.error(`❌ Failed to send Slack message to ${channel}:`, err);
    throw err;
  }
}
