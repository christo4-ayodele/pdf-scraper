import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/server-utils"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const resumeHistory = await prisma.resumeHistory.findMany({
      where: { userId: user.id },
      orderBy: { uploadedAt: "desc" },
    })

    return NextResponse.json({ resumes: resumeHistory })
  } catch (error) {
    console.error("Get resumes error:", error)
    return NextResponse.json(
      { error: "Failed to fetch resumes" },
      { status: 500 }
    )
  }
}

