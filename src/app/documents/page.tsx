import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { GradientDivider } from "@/components/GradientDivider";
import { DocumentUploader } from "./DocumentUploader";
import { DocumentCard } from "./DocumentCard";
import { ResetButton } from "./ResetButton";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const vehicle = await prisma.shelbyVehicle.findFirst({
        where: { userId: session.uid },
    });
    if (!vehicle) redirect("/setup");

    const documents = await prisma.shelbyDocument.findMany({
        where: { vehicleId: vehicle.id },
        orderBy: { uploadedAt: "desc" },
        include: {
            _count: { select: { serviceRecords: true } },
        },
    });

    return (
        <PageShell>
            <GradientDivider label="Documents" />

            <div className="mt-8 space-y-6">
                <DocumentUploader />

                {documents.length > 0 && (
                    <div className="space-y-3">
                        {documents.map((doc) => (
                            <DocumentCard
                                key={doc.id}
                                doc={{
                                    ...doc,
                                    status: doc.status as
                                        | "PENDING"
                                        | "PROCESSING"
                                        | "COMPLETED"
                                        | "FAILED",
                                    uploadedAt: doc.uploadedAt.toISOString(),
                                    processedAt:
                                        doc.processedAt?.toISOString() ?? null,
                                }}
                            />
                        ))}
                    </div>
                )}

                {documents.length === 0 && (
                    <p className="text-center text-xs font-mono text-muted-foreground">
                        No documents uploaded yet
                    </p>
                )}

                {documents.length > 0 && (
                    <div className="pt-4">
                        <ResetButton />
                    </div>
                )}
            </div>
        </PageShell>
    );
}
