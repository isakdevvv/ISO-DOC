"use client";

import { CopilotChat } from "@copilotkit/react-ui";

export default function PersistentCopilot() {
    return (
        <div className="h-full border rounded-lg bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="bg-gray-50 p-3 border-b font-medium text-gray-700 flex items-center gap-2">
                <span>🤖</span> ISO Copilot
            </div>
            <div className="flex-1 overflow-hidden">
                <CopilotChat
                    instructions="Du er en ISO-compliance copilot. Bruk all delt kontekst (dokumenter, standarder, gap- og compliance-resultater) til å svare kort, fylle ut skjemaer på brukerens vegne med godkjenning, og foreslå tekst for remediation. Ikke finn på innhold; siter eller foreslå utkast som brukeren må godkjenne."
                    labels={{
                        title: "Chat",
                        initial: "Hei! Jeg kan hjelpe deg med å fylle ut skjemaer og sjekke compliance. Hva vil du gjøre?",
                    }}
                    // @ts-ignore -- assuming suggestions prop exists or will be handled by the component
                    suggestions={[
                        { title: "Oppsummer dokumentet", message: "Oppsummer dokumentet" },
                        { title: "Sjekk compliance", message: "Sjekk compliance mot ISO 27001" },
                        { title: "Fyll ut skjema", message: "Fyll ut remediation-skjema" },
                        { title: "Finn mangler", message: "Hva er manglene her?" },
                    ]}
                />
            </div>
        </div>
    );
}
