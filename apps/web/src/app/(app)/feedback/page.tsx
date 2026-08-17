import { getServerApiClient } from "@/lib/api-client";
import { FeedbackView } from "@/features/feedback/feedback-view";

export const metadata = {
  title: "Send Feedback | Pocketly",
  description: "Share your ideas, report bugs, and send feedback directly to the Pocketly team.",
};

export default async function FeedbackPage() {
  const client = await getServerApiClient();
  const feedbackRes = await client.GET("/feedback", {
    params: {
      query: {
        limit: 50,
        onlyMine: true,
      },
    },
  });

  return (
    <FeedbackView
      initialData={feedbackRes.data?.data?.items ?? []}
    />
  );
}
