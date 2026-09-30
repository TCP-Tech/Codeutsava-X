import type { Prize } from "@/types/content";

export const prizes: readonly Prize[] = [
    {
        id: "prize-participation",
        title: "For all participants",
        amount: "1 month Creator tier",
        description:
            "1 month free of our Creator tier (normally $22/month, 131k credits).",
        status: "published",
    },
    {
        id: "prize-overall",
        title: "Overall winning team",
        amount: "3 months Pro tier",
        description:
            "Each team member receives 3 months of our Pro tier ($297 value/team member, 600k credits/mo).",
        status: "published",
    },
    {
        id: "prize-elevenlabs",
        title: "Best Project Built with ElevenLabs",
        amount: "3 months Scale tier",
        description:
            "Each team member receives 3 months of our Scale tier ($897 value/team member, 1.8M credits/mo).",
        status: "published",
    },
];
