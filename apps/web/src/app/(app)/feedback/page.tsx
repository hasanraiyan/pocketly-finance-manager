import { getServerApiClient } from "@/lib/api-client";
import { FeedbackView } from "@/features/feedback/feedback-view";

export const metadata = {
  title: "Feedback & Roadmap | Pocketly",
  description: "Share your ideas, report bugs, and vote on upcoming features for Pocketly.",
};

export default async function FeedbackPage() {
  const client = await getServerApiClient();
  const feedbackRes = await client.GET("/feedback", {
    params: {
      query: {
        limit: 50,
        sortBy: "upvotes",
      },
    },
  });

  return (
    <FeedbackView
      initialData={feedbackRes.data?.data?.items ?? []}
    />
  );
}
