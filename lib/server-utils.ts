import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth"
import { prisma } from "./prisma"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
  })

  return user
}

export async function checkCredits(userId: string, requiredCredits: number = 100): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  })

  if (!user) {
    return false
  }

  return user.credits >= requiredCredits
}

export async function deductCredits(userId: string, amount: number = 100): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      credits: {
        decrement: amount,
      },
    },
  })
}

export async function addCredits(userId: string, amount: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      credits: {
        increment: amount,
      },
    },
  })
}

