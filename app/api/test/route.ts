import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);

        const collections = await db.listCollections().toArray();

        return NextResponse.json({
            success: true,
            database: process.env.MONGODB_DB,
            collections: collections.map((collection) => collection.name),
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: "Cannot connect to MongoDB",
                error: error instanceof Error ? error.message : error,
            },
            { status: 500 }
        );
    }
}