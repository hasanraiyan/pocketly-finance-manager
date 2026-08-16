import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-heading text-3xl text-foreground">Pocketly</span>
        <p className="max-w-xs text-sm text-muted-foreground">
          A few seconds is all it takes to record where your money went.
        </p>
      </div>
      <SignUp />
    </div>
  );
}
